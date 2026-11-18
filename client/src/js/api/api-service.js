(function () {
  const APP_VERSION = '1.5.1';
  const PRIMARY_API = 'https://phimapi.com';
  const IMG_CDNS = [
    'https://phimimg.com',
    'https://img.phimapi.com',
    'https://img.ophim1.com',
    'https://ophim17.cc'
  ];
  const FAST_CDN_KEY = 'rosi_cinema_fast_cdn_v1';
  let preferredCdnOrigin = readStorage(FAST_CDN_KEY, '') || '';
  const STORAGE_KEYS = {
    FAVORITES: 'rosi_cinema_favorites_v1',
    HISTORY: 'rosi_cinema_history_v1',
    SEARCH_HISTORY: 'rosi_cinema_search_history_v1',
    QUALITY: 'rosi_cinema_quality_v1',
    CACHE_PREFIX: 'rosi_cinema_cache_v1_'
  };
  const memoryFallback = new Map();
  const inflightRequests = new Map();

  function readStorage(key, fallback = null) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw);
    } catch (e) {}
    return memoryFallback.has(key) ? memoryFallback.get(key) : fallback;
  }

  function writeStorage(key, value) {
    memoryFallback.set(key, value);
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function removeStorageByPrefix(prefix) {
    memoryFallback.forEach((_, k) => {
      if (k.startsWith(prefix)) memoryFallback.delete(k);
    });
    try {
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      keys.forEach((k) => window.localStorage.removeItem(k));
    } catch (e) {}
  }

  function toHttps(url) {
    if (!url || typeof url !== 'string') return '';
    const t = url.trim().replace(/\\/g, '/');
    if (!t) return '';
    if (t.startsWith('data:image/')) return t;
    if (t.startsWith('https://')) return t;
    if (t.startsWith('http://')) return 'https://' + t.slice('http://'.length);
    if (t.startsWith('//')) return 'https:' + t;
    return t;
  }

  function getOrderedCdns() {
    if (!preferredCdnOrigin) return IMG_CDNS;
    const rest = IMG_CDNS.filter((c) => c !== preferredCdnOrigin);
    return [preferredCdnOrigin, ...rest];
  }

  function buildImageCandidates(rawUrls = []) {
    const out = [];
    const seen = new Set();
    const cdns = getOrderedCdns();
    const pushUrl = (u) => {
      if (!u || typeof u !== 'string') return;
      const clean = toHttps(u).trim();
      if (!clean || seen.has(clean)) return;
      seen.add(clean);
      out.push(clean);
    };

    rawUrls.forEach((u) => {
      if (!u || typeof u !== 'string') return;
      const t = toHttps(u);
      if (!t) return;

      if (/^https?:\/\//i.test(t)) {
        try {
          const parsed = new URL(t);
          const pathAndQuery = `${parsed.pathname}${parsed.search || ''}`;
          if (preferredCdnOrigin) {
            pushUrl(`${preferredCdnOrigin}${pathAndQuery.startsWith('/') ? '' : '/'}${pathAndQuery}`);
          }
          pushUrl(t);
          cdns.forEach((cdn) => {
            pushUrl(`${cdn}${pathAndQuery.startsWith('/') ? '' : '/'}${pathAndQuery}`);
          });
          if (!parsed.pathname.includes('/upload/')) {
            const rel = parsed.pathname.replace(/^\/+/, '');
            cdns.forEach((cdn) => {
              pushUrl(`${cdn}/upload/vod/${rel}${parsed.search || ''}`);
            });
          }
        } catch (_) {
          pushUrl(t);
        }
      } else {
        const rel = t.replace(/^\/+/, '');
        cdns.forEach((cdn) => {
          pushUrl(`${cdn}/${rel}`);
          if (!rel.startsWith('upload/')) {
            pushUrl(`${cdn}/upload/vod/${rel}`);
          }
        });
        pushUrl(`${PRIMARY_API}/${rel}`);
      }
    });

    return out;
  }

  function normalizeMovieItem(raw = {}) {
    const slug = raw.slug || raw._id || '';
    const rawThumb = raw.thumb_url || raw.thumb || raw.poster_url || raw.poster || '';
    const rawBackdrop = raw.poster_url || raw.poster || raw.thumb_url || raw.thumb || '';
    const thumbCandidates = buildImageCandidates([rawThumb, rawBackdrop]);
    const backdropCandidates = buildImageCandidates([rawBackdrop, rawThumb]);
    const thumb = thumbCandidates[0] || '';
    const backdrop = backdropCandidates[0] || thumb;
    return {
      slug,
      title: raw.name || raw.title || 'Rosi Cinema',
      originName: raw.origin_name || raw.originName || '',
      thumb,
      poster: backdrop,
      backdrop,
      thumbCandidates,
      backdropCandidates,
      year: raw.year || (raw.modified && raw.modified.year) || '',
      status: raw.episode_current || raw.status || raw.quality || '4K',
      type: raw.type || 'single',
      description: raw.content || raw.description || ''
    };
  }

  async function fetchJsonWithTimeout(url, timeoutMs = 6500) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const res = await fetch(url, { signal: controller ? controller.signal : undefined });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function cachedFetch(cacheKey, url, ttlMs = 1000 * 60 * 30) {
    const fullKey = STORAGE_KEYS.CACHE_PREFIX + cacheKey;
    const cached = readStorage(fullKey);
    const hasCachedData = Boolean(cached && cached.data);
    const isFresh = hasCachedData && (Date.now() - cached.ts < ttlMs);
    if (isFresh) return cached.data;

    if (!inflightRequests.has(fullKey)) {
      const reqPromise = (async () => {
        try {
          const data = await fetchJsonWithTimeout(url, 5500);
          writeStorage(fullKey, { ts: Date.now(), data });
          return data;
        } catch (err) {
          if (hasCachedData) return cached.data;
          throw err;
        } finally {
          inflightRequests.delete(fullKey);
        }
      })();
      inflightRequests.set(fullKey, reqPromise);
    }

    // Stale-while-revalidate: return cached list immediately (0ms) while updating in background
    if (hasCachedData) return cached.data;
    return inflightRequests.get(fullKey);
  }

  function extractMovieArray(payload) {
    if (!payload) return [];
    if (Array.isArray(payload.items)) return payload.items;
    if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data)) return payload.data;
    return [];
  }

  async function getHomeSections() {
    const [latestRes, seriesRes, singleRes] = await Promise.allSettled([
      cachedFetch('home_latest', `${PRIMARY_API}/danh-sach/phim-moi-cap-nhat?page=1`),
      cachedFetch('home_series', `${PRIMARY_API}/v1/api/danh-sach/phim-bo?page=1&limit=12`),
      cachedFetch('home_single', `${PRIMARY_API}/v1/api/danh-sach/phim-le?page=1&limit=12`)
    ]);
    const latest = latestRes.status === 'fulfilled' ? extractMovieArray(latestRes.value).map(normalizeMovieItem) : [];
    const series = seriesRes.status === 'fulfilled' ? extractMovieArray(seriesRes.value).map(normalizeMovieItem) : [];
    const single = singleRes.status === 'fulfilled' ? extractMovieArray(singleRes.value).map(normalizeMovieItem) : [];
    return { hero: latest[0] || series[0] || single[0] || null, latest, series, single };
  }

  async function getCatalog({ type = 'phim-moi', genre = '', country = '', page = 1 } = {}) {
    let url = '';
    if (genre) {
      url = `${PRIMARY_API}/v1/api/the-loai/${encodeURIComponent(genre)}?page=${page}&limit=18${country ? `&country=${encodeURIComponent(country)}` : ''}`;
    } else if (country) {
      url = `${PRIMARY_API}/v1/api/quoc-gia/${encodeURIComponent(country)}?page=${page}&limit=18`;
    } else if (type === 'phim-moi') {
      url = `${PRIMARY_API}/danh-sach/phim-moi-cap-nhat?page=${page}`;
    } else {
      url = `${PRIMARY_API}/v1/api/danh-sach/${encodeURIComponent(type)}?page=${page}&limit=18`;
    }
    const data = await cachedFetch(`cat_${type}_${genre}_${country}_${page}`, url);
    const items = extractMovieArray(data).map(normalizeMovieItem);
    const pagination = (data && data.data && data.data.params && data.data.params.pagination) ||
      (data && data.pagination) ||
      { currentPage: page, totalPages: items.length ? page + 1 : page };
    return {
      items,
      currentPage: Number(pagination.currentPage || page),
      totalPages: Number(pagination.totalPages || (items.length ? page + 1 : 1))
    };
  }

  async function searchMovies(keyword, page = 1) {
    const q = (keyword || '').trim();
    if (!q) return { items: [], currentPage: 1, totalPages: 1 };
    const data = await fetchJsonWithTimeout(`${PRIMARY_API}/v1/api/tim-kiem?keyword=${encodeURIComponent(q)}&page=${page}&limit=18`);
    return { items: extractMovieArray(data).map(normalizeMovieItem), currentPage: page, totalPages: page + 1 };
  }

  async function getMovieDetail(slug) {
    const data = await cachedFetch(`detail_${slug}`, `${PRIMARY_API}/phim/${encodeURIComponent(slug)}`);
    const rawMovie = data.movie || (data.data && data.data.item) || {};
    const movie = normalizeMovieItem({ ...rawMovie, slug: rawMovie.slug || slug, content: rawMovie.content || '' });
    movie.category = Array.isArray(rawMovie.category) ? rawMovie.category.map((c) => c.name).join(', ') : '';
    movie.country = Array.isArray(rawMovie.country) ? rawMovie.country.map((c) => c.name).join(', ') : '';
    const servers = data.episodes || (data.data && data.data.item && data.data.item.episodes) || [];
    const episodes = [];
    const seen = new Set();
    servers.forEach((srv, sIdx) => {
      (Array.isArray(srv.server_data) ? srv.server_data : []).forEach((ep, idx) => {
        const epNum = String(ep.slug || ep.name || idx + 1).replace(/^tap-?/i, '') || String(idx + 1);
        if (!seen.has(epNum)) {
          seen.add(epNum);
          episodes.push({ num: epNum, label: ep.name || `Tập ${epNum}`, key: `${epNum}_${sIdx}` });
        }
      });
    });
    return { movie, episodes, servers };
  }

  async function getStream(slug, episodeNum = '1') {
    const detail = await getMovieDetail(slug);
    const episodes = detail.episodes.length ? detail.episodes : [{ num: String(episodeNum || '1'), label: `Tập ${episodeNum || '1'}` }];
    const cleanTarget = String(episodeNum).toLowerCase().trim();
    const foundIdx = episodes.findIndex(
      (ep) => String(ep.num).toLowerCase() === cleanTarget || String(ep.label).toLowerCase().includes(cleanTarget)
    );
    const epIndex = foundIdx >= 0 ? foundIdx : 0;
    const activeEp = episodes[epIndex];
    const sources = [];
    detail.servers.forEach((srv) => {
      const serverName = srv.server_name || 'Server';
      const list = Array.isArray(srv.server_data) ? srv.server_data : [];
      const matched =
        list.find((item) => String(item.slug || item.name || '').replace(/^tap-?/i, '') === activeEp.num) ||
        list[epIndex] ||
        list[0];
      if (matched) {
        if (matched.link_m3u8) sources.push({ name: `${serverName} (HLS)`, type: 'hls', url: matched.link_m3u8 });
        if (matched.link_embed) sources.push({ name: `${serverName} (Embed)`, type: 'embed', url: matched.link_embed });
      }
    });
    if (!sources.length) throw new Error('Không tìm thấy nguồn phát.');
    const deprioritizedHosts = readStorage('rosi_cinema_slow_hosts_v1', {});
    const sortedSources = sources.slice().sort((a, b) => {
      const aHls = a.type === 'hls' ? 0 : 1;
      const bHls = b.type === 'hls' ? 0 : 1;
      if (aHls !== bHls) return aHls - bHls;
      let aPen = 0;
      let bPen = 0;
      try { aPen = Number(deprioritizedHosts[new URL(a.url).host] || 0); } catch (_) {}
      try { bPen = Number(deprioritizedHosts[new URL(b.url).host] || 0); } catch (_) {}
      return aPen - bPen;
    });
    return {
      slug,
      title: detail.movie.title,
      movie: detail.movie,
      currentEpisode: activeEp.num,
      episodes,
      sources: sortedSources
    };
  }


  const warmedPosterUrls = new Set();
  const resolvedPosterMap = new Map();

  function rankUrlByPreferredCdn(url) {
    if (!preferredCdnOrigin || !url) return url;
    try {
      const u = new URL(url);
      if (IMG_CDNS.includes(u.origin) && u.origin !== preferredCdnOrigin) {
        return `${preferredCdnOrigin}${u.pathname}${u.search || ''}`;
      }
    } catch (_) {}
    return url;
  }

  function markWorkingCdn(url) {
    try {
      const u = new URL(url);
      if (u.protocol === 'https:' && IMG_CDNS.includes(u.origin) && preferredCdnOrigin !== u.origin) {
        preferredCdnOrigin = u.origin;
        writeStorage(FAST_CDN_KEY, preferredCdnOrigin);
      }
    } catch (_) {}
  }

  function rememberResolvedPoster(key, url) {
    if (key && url && !url.startsWith('data:')) {
      resolvedPosterMap.set(key, url);
      markWorkingCdn(url);
    }
  }

  function getResolvedPoster(key) {
    return key ? resolvedPosterMap.get(key) || '' : '';
  }

  function warmPosterCache(urls = []) {
    if (typeof Image === 'undefined' || !Array.isArray(urls)) return;
    let queued = 0;
    for (let i = 0; i < urls.length && queued < 24; i++) {
      const u = rankUrlByPreferredCdn(toHttps(urls[i]));
      if (!u || u.startsWith('data:') || warmedPosterUrls.has(u)) continue;
      warmedPosterUrls.add(u);
      queued += 1;
      const pre = new Image();
      pre.decoding = 'async';
      pre.onload = () => {
        markWorkingCdn(u);
        if (typeof pre.decode === 'function') pre.decode().catch(() => {});
      };
      pre.src = u;
    }
  }

  function preloadDefaultCatalogs() {
    const tasks = [
      getCatalog({ type: 'phim-moi', page: 1 }),
      getCatalog({ type: 'phim-bo', page: 1 }),
      getCatalog({ type: 'phim-le', page: 1 }),
      getCatalog({ type: 'hoat-hinh', page: 1 })
    ];
    Promise.allSettled(tasks).then((results) => {
      const warmUrls = [];
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value && Array.isArray(r.value.items)) {
          r.value.items.slice(0, 6).forEach((m) => {
            if (m.thumb) warmUrls.push(m.thumb);
          });
        }
      });
      warmPosterCache(warmUrls);
    });
  }


  function penalizeSlowStreamUrl(url) {
    try {
      const host = new URL(url).host;
      if (!host) return;
      const map = readStorage('rosi_cinema_slow_hosts_v1', {});
      map[host] = Math.min(10, Number(map[host] || 0) + 1);
      writeStorage('rosi_cinema_slow_hosts_v1', map);
    } catch (_) {}
  }

  function rewardFastStreamUrl(url) {
    try {
      const host = new URL(url).host;
      if (!host) return;
      const map = readStorage('rosi_cinema_slow_hosts_v1', {});
      if (map[host]) {
        map[host] = Math.max(0, Number(map[host]) - 1);
        writeStorage('rosi_cinema_slow_hosts_v1', map);
      }
    } catch (_) {}
  }

  function prefetchMovie(slug) {
    if (!slug) return;
    getMovieDetail(slug).catch(() => {});
  }

  function getPreferredQuality() {
    const val = readStorage(STORAGE_KEYS.QUALITY, 'auto');
    return ['auto', '4k', '1080p', '720p', '480p'].includes(val) ? val : 'auto';
  }

  function setPreferredQuality(quality) {
    const clean = ['auto', '4k', '1080p', '720p', '480p'].includes(quality) ? quality : 'auto';
    writeStorage(STORAGE_KEYS.QUALITY, clean);
    return clean;
  }

  function getFavorites() {
    return readStorage(STORAGE_KEYS.FAVORITES, []);
  }

  function isFavorite(slug) {
    return Boolean(slug) && getFavorites().some((i) => i.slug === slug);
  }

  function toggleFavorite(movie) {
    if (!movie || !movie.slug) return false;
    const list = getFavorites();
    const idx = list.findIndex((i) => i.slug === movie.slug);
    if (idx >= 0) {
      list.splice(idx, 1);
      writeStorage(STORAGE_KEYS.FAVORITES, list);
      return false;
    }
    const candidates = Array.isArray(movie.thumbCandidates) && movie.thumbCandidates.length
      ? movie.thumbCandidates
      : buildImageCandidates([movie.thumb, movie.poster]);
    list.unshift({
      slug: movie.slug,
      title: movie.title,
      thumb: candidates[0] || movie.thumb || '',
      poster: movie.poster || candidates[0] || '',
      thumbCandidates: candidates,
      badge: movie.status || '4K',
      year: movie.year || ''
    });
    writeStorage(STORAGE_KEYS.FAVORITES, list);
    return true;
  }

  function getWatchHistory() {
    return readStorage(STORAGE_KEYS.HISTORY, []);
  }

  function getEpisodeProgress(slug, episodeNum) {
    const entry = getWatchHistory().find((i) => i.slug === slug);
    return entry && entry.episodesProgress ? entry.episodesProgress[String(episodeNum)] || null : null;
  }

  function saveWatchProgress(payload = {}) {
    if (!payload.slug) return;
    const history = getWatchHistory();
    const epKey = String(payload.episodeNum || '1');
    const currentTime = Number(payload.currentTime || 0);
    const duration = Number(payload.duration || 0);
    const progressPct = duration > 0 ? Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100))) : 0;
    const idx = history.findIndex((i) => i.slug === payload.slug);
    const existing = idx >= 0 ? history[idx] : {};
    const episodesProgress = { ...(existing.episodesProgress || {}) };
    const prevEp = episodesProgress[epKey] || {};
    episodesProgress[epKey] = {
      episodeNum: epKey,
      episodeLabel: payload.episodeLabel || prevEp.episodeLabel || `Tập ${epKey}`,
      currentTime: currentTime > 0 ? currentTime : prevEp.currentTime || 0,
      duration: duration > 0 ? duration : prevEp.duration || 0,
      progressPct: duration > 0 ? progressPct : prevEp.progressPct || 0,
      updatedAt: Date.now()
    };
    const candidates = Array.isArray(payload.thumbCandidates) && payload.thumbCandidates.length
      ? payload.thumbCandidates
      : Array.isArray(existing.thumbCandidates) && existing.thumbCandidates.length
      ? existing.thumbCandidates
      : buildImageCandidates([payload.thumb, payload.backdrop, existing.thumb, existing.backdrop]);
    const item = {
      slug: payload.slug,
      title: payload.title || existing.title || payload.slug,
      thumb: payload.thumb || existing.thumb || candidates[0] || '',
      backdrop: payload.backdrop || existing.backdrop || candidates[0] || '',
      thumbCandidates: candidates,
      badge: payload.badge || existing.badge || '4K',
      lastEpisodeNum: epKey,
      lastEpisodeLabel: payload.episodeLabel || existing.lastEpisodeLabel || `Tập ${epKey}`,
      progressPct: duration > 0 ? progressPct : existing.progressPct || 0,
      currentTime: currentTime > 0 ? currentTime : existing.currentTime || 0,
      duration: duration > 0 ? duration : existing.duration || 0,
      episodesProgress,
      updatedAt: Date.now()
    };
    if (idx >= 0) history.splice(idx, 1);
    history.unshift(item);
    writeStorage(STORAGE_KEYS.HISTORY, history.slice(0, 40));
  }

  function clearWatchHistory() {
    writeStorage(STORAGE_KEYS.HISTORY, []);
  }

  function getSearchHistory() {
    return readStorage(STORAGE_KEYS.SEARCH_HISTORY, []);
  }

  function addSearchHistory(keyword) {
    const clean = (keyword || '').trim();
    if (!clean) return;
    const list = getSearchHistory().filter((k) => k.toLowerCase() !== clean.toLowerCase());
    list.unshift(clean);
    writeStorage(STORAGE_KEYS.SEARCH_HISTORY, list.slice(0, 10));
  }

  function clearSearchHistory() {
    writeStorage(STORAGE_KEYS.SEARCH_HISTORY, []);
  }

  function clearCache() {
    removeStorageByPrefix(STORAGE_KEYS.CACHE_PREFIX);
  }

  const methods = {
    version: APP_VERSION,
    getHomeSections,
    getCatalog,
    searchMovies,
    getMovieDetail,
    getStream,
    prefetchMovie,
    getPreferredQuality,
    setPreferredQuality,
    getFavorites,
    isFavorite,
    toggleFavorite,
    getWatchHistory,
    getEpisodeProgress,
    saveWatchProgress,
    clearWatchHistory,
    getSearchHistory,
    addSearchHistory,
    clearSearchHistory,
    clearCache
  };
  methods.warmPosterCache = warmPosterCache;
  methods.rankUrlByPreferredCdn = rankUrlByPreferredCdn;
  methods.markWorkingCdn = markWorkingCdn;
  methods.rememberResolvedPoster = rememberResolvedPoster;
  methods.getResolvedPoster = getResolvedPoster;
  methods.preloadDefaultCatalogs = preloadDefaultCatalogs;
  methods.penalizeSlowStreamUrl = penalizeSlowStreamUrl;
  methods.rewardFastStreamUrl = rewardFastStreamUrl;
  window.RosiApi = methods;
  window.apiService = Object.assign(window.apiService || {}, methods);
})();
