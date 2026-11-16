/**
 * Motchill Mobile - Unified Movie API & Data Service (Portrait APK Edition)
 */
(function () {
  const PHIM_API_BASE = 'https://phimapi.com';
  const DEFAULT_CDN_IMAGE = 'https://phimimg.com';

  const cache = new Map();
  const CACHE_TTL = 3 * 60 * 1000;

  function getCache(key) {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.exp) {
      cache.delete(key);
      return null;
    }
    return item.data;
  }

  function setCache(key, data, ttl = CACHE_TTL) {
    if (cache.size > 30) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(key, { data, exp: Date.now() + ttl });
  }

  function getImageUrl(url, cdnBase = DEFAULT_CDN_IMAGE) {
    if (!url) return 'assets/placeholder.svg';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const cleanCdn = cdnBase.replace(/\/+$/, '');
    const cleanPath = url.replace(/^\/+/, '');
    return `${cleanCdn}/${cleanPath}`;
  }

  function normalizeCardItem(raw, cdnBase = DEFAULT_CDN_IMAGE) {
    if (!raw) return null;
    const slug = raw.slug || '';
    const title = raw.name || raw.title || '';
    const rawPoster = raw.poster_url || raw.thumb_url || raw.poster || raw.thumb || '';
    const poster = getImageUrl(rawPoster, cdnBase);
    const rawThumb = raw.thumb_url || raw.poster_url || raw.thumb || raw.poster || '';
    const thumb = getImageUrl(rawThumb, cdnBase);

    let badge = raw.episode_current || raw.quality || raw.badge || '';
    if (raw.lang && !badge.includes(raw.lang)) {
      badge = badge ? `${badge} - ${raw.lang}` : raw.lang;
    }

    return {
      slug,
      title,
      thumb: poster,
      poster: poster,
      backdrop: thumb,
      year: raw.year || '',
      badge: badge || 'HD'
    };
  }

  class MovieApiService {
    constructor() {
      this.primaryServer = '';
      this.backupServer = '';
      this.bothServersFailed = false;
      this.activeServer = '';

      try {
        this.primaryServer = localStorage.getItem('motchill_server_primary') || '';
        this.backupServer = localStorage.getItem('motchill_server_backup') || '';
        this.bothServersFailed = localStorage.getItem('motchill_both_failed') === 'true';
        this.activeServer = this.primaryServer || this.backupServer || '';
      } catch (e) {}
    }

    setServerEndpoints(primaryUrl, backupUrl, bothFailed = false) {
      this.primaryServer = (primaryUrl || '').trim().replace(/\/+$/, '');
      this.backupServer = (backupUrl || '').trim().replace(/\/+$/, '');
      this.bothServersFailed = Boolean(bothFailed);

      try {
        localStorage.setItem('motchill_server_primary', this.primaryServer);
        localStorage.setItem('motchill_server_backup', this.backupServer);
        localStorage.setItem('motchill_both_failed', this.bothServersFailed ? 'true' : 'false');
      } catch (e) {}

      this.activeServer = !this.bothServersFailed ? (this.primaryServer || this.backupServer || '') : '';
    }

    async fetchServer(endpoint) {
      if (this.bothServersFailed) return null;
      const candidates = [];
      if (this.activeServer) candidates.push(this.activeServer);
      if (this.primaryServer && !candidates.includes(this.primaryServer)) candidates.push(this.primaryServer);
      if (this.backupServer && !candidates.includes(this.backupServer)) candidates.push(this.backupServer);
      if (candidates.length === 0) return null;

      for (const base of candidates) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(`${base}${endpoint}`, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (base && this.activeServer !== base) this.activeServer = base;
            return data;
          }
        } catch (e) {}
      }
      return null;
    }

    async getHome(forceRefresh = false) {
      const cacheKey = 'home_data';
      if (!forceRefresh) {
        const cached = getCache(cacheKey);
        if (cached) return cached;
      }

      const serverData = await this.fetchServer(`/api/home${forceRefresh ? '?refresh=true' : ''}`);
      if (serverData && serverData.success && serverData.data?.sections?.length > 0) {
        setCache(cacheKey, serverData.data);
        return serverData.data;
      }

      const [resHot, resBo, resLe, resRap, resAnime] = await Promise.allSettled([
        fetch(`${PHIM_API_BASE}/danh-sach/phim-moi-cap-nhat?page=1`).then(r => r.json()),
        fetch(`${PHIM_API_BASE}/v1/api/danh-sach/phim-bo?page=1`).then(r => r.json()),
        fetch(`${PHIM_API_BASE}/v1/api/danh-sach/phim-le?page=1`).then(r => r.json()),
        fetch(`${PHIM_API_BASE}/v1/api/danh-sach/phim-chieu-rap?page=1`).then(r => r.json()),
        fetch(`${PHIM_API_BASE}/v1/api/danh-sach/hoat-hinh?page=1`).then(r => r.json())
      ]);

      const sections = [];
      const pushSection = (res, id, title, icon, isRootItems = false) => {
        if (res.status === 'fulfilled') {
          const payload = isRootItems ? res.value : res.value?.data;
          if (payload?.items) {
            const cdn = payload.APP_DOMAIN_CDN_IMAGE || DEFAULT_CDN_IMAGE;
            const items = payload.items.map(it => normalizeCardItem(it, cdn)).filter(Boolean);
            if (items.length > 0) sections.push({ id, title, icon, items: items.slice(0, 20) });
          }
        }
      };

      pushSection(resHot, 'featured', 'Thịnh Hành Hôm Nay', '🔥', true);
      pushSection(resBo, 'phim-bo', 'Phim Bộ Mới Cập Nhật', '📺');
      pushSection(resLe, 'phim-le', 'Phim Lẻ Tuyển Chọn', '🎬');
      pushSection(resRap, 'phim-chieu-rap', 'Phim Chiếu Rạp', '🍿');
      pushSection(resAnime, 'hoat-hinh', 'Anime & Hoạt Hình', '✨');

      const topCandidate = sections[0]?.items[0] || null;
      let hero = topCandidate;
      if (topCandidate) {
        try { hero = await this.getMovieDetail(topCandidate.slug); } catch (e) {}
      }

      const result = { hero, sections, timestamp: Date.now() };
      setCache(cacheKey, result);
      return result;
    }

    async getCategory(type, slug, page = 1) {
      const p = Math.max(1, parseInt(page, 10) || 1);
      const cacheKey = `cat_${type}_${slug}_p${p}`;
      const cached = getCache(cacheKey);
      if (cached) return cached;

      const endpoint = type === 'the-loai'
        ? `${PHIM_API_BASE}/v1/api/the-loai/${slug}?page=${p}`
        : type === 'quoc-gia'
          ? `${PHIM_API_BASE}/v1/api/quoc-gia/${slug}?page=${p}`
          : `${PHIM_API_BASE}/v1/api/danh-sach/${slug}?page=${p}`;

      const res = await fetch(endpoint);
      const json = await res.json();
      const dataObj = json.data || json;
      const cdn = dataObj.APP_DOMAIN_CDN_IMAGE || DEFAULT_CDN_IMAGE;
      const items = (dataObj.items || []).map(it => normalizeCardItem(it, cdn)).filter(Boolean);

      const result = {
        title: dataObj.titlePage || slug,
        type,
        slug,
        page: p,
        hasNext: items.length >= 12,
        items
      };
      setCache(cacheKey, result);
      return result;
    }

    async search(query) {
      if (!query || !query.trim()) return [];
      const q = query.trim();
      const cacheKey = `search_${encodeURIComponent(q.toLowerCase())}`;
      const cached = getCache(cacheKey);
      if (cached) return cached;

      const url = `${PHIM_API_BASE}/v1/api/tim-kiem?keyword=${encodeURIComponent(q)}&limit=24`;
      const res = await fetch(url);
      const json = await res.json();
      const cdn = json.data?.APP_DOMAIN_CDN_IMAGE || DEFAULT_CDN_IMAGE;
      const items = (json.data?.items || []).map(it => normalizeCardItem(it, cdn)).filter(Boolean);

      setCache(cacheKey, items, 2 * 60 * 1000);
      return items;
    }

    async getMovieDetail(slug) {
      const cacheKey = `movie_${slug}`;
      const cached = getCache(cacheKey);
      if (cached) return cached;

      const url = `${PHIM_API_BASE}/phim/${slug}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.status || !json.movie) throw new Error('Không tìm thấy phim.');

      const m = json.movie;
      const episodes = [];
      const seenEps = new Set();

      if (Array.isArray(json.episodes)) {
        for (const s of json.episodes) {
          if (!s.server_data) continue;
          for (const ep of s.server_data) {
            const rawNum = String(ep.name).replace(/^tập\s*/i, '').trim();
            const num = rawNum || String(episodes.length + 1);
            if (!seenEps.has(num)) {
              seenEps.add(num);
              episodes.push({
                number: num,
                name: isNaN(num) ? num : `Tập ${num}`,
                slug: ep.slug || `tap-${num}`,
                url: ep.link_m3u8 || ep.link_embed || ''
              });
            }
          }
        }
      }

      if (episodes.length === 0) {
        episodes.push({ number: '1', name: 'Full', slug: 'full', url: '' });
      }

      const result = {
        slug: m.slug || slug,
        title: m.name || slug,
        originalTitle: m.origin_name || '',
        poster: getImageUrl(m.poster_url || m.thumb_url),
        backdrop: getImageUrl(m.thumb_url || m.poster_url),
        description: (m.content || 'Đang cập nhật...').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim(),
        year: String(m.year || '2026'),
        duration: m.time || 'N/A',
        country: Array.isArray(m.country) ? m.country.map(c => c.name).join(', ') : 'Quốc Tế',
        genre: Array.isArray(m.category) ? m.category.map(c => c.name).join(', ') : 'Phim Hay',
        status: m.episode_current || `${episodes.length} Tập`,
        episodes
      };

      setCache(cacheKey, result);
      return result;
    }

    async getStream(slug, episodeNum = '1') {
      const targetEp = String(episodeNum).toLowerCase().replace(/^tập\s*/i, '').replace(/^tap[-_]?/i, '').trim();
      const cacheKey = `stream_${slug}_ep${targetEp}`;
      const cached = getCache(cacheKey);
      if (cached) return cached;

      const url = `${PHIM_API_BASE}/phim/${slug}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.status || !json.episodes?.length) throw new Error('Không tìm thấy nguồn phát.');

      const sources = [];
      const seenUrls = new Set();
      const cleanEp = (val) => {
        if (!val) return '';
        const s = String(val).toLowerCase().replace(/^tập\s*/i, '').replace(/^tap[-_]?/i, '').trim();
        const num = parseInt(s, 10);
        return (!isNaN(num) && num > 0) ? String(num) : s;
      };
      const normTarget = cleanEp(targetEp);

      for (const server of json.episodes) {
        const sName = server.server_name || 'VIP Server';
        if (!server.server_data) continue;
        const isSingle = server.server_data.length === 1;

        for (const ep of server.server_data) {
          const epNorm = cleanEp(ep.name);
          const slugNorm = cleanEp(ep.slug);
          const isMatch = epNorm === normTarget || slugNorm === normTarget || isSingle ||
                          (normTarget === '1' && (epNorm === 'full' || slugNorm === 'full'));
          if (isMatch) {
            if (ep.link_m3u8 && !seenUrls.has(ep.link_m3u8)) {
              seenUrls.add(ep.link_m3u8);
              sources.push({ label: `${sName} (HLS)`, type: 'm3u8', url: ep.link_m3u8, isHls: true });
            }
            if (ep.link_embed && !seenUrls.has(ep.link_embed)) {
              seenUrls.add(ep.link_embed);
              sources.push({ label: `${sName} (Embed)`, type: 'embed', url: ep.link_embed, isHls: false });
            }
          }
        }
      }

      sources.sort((a, b) => (b.isHls ? 1 : 0) - (a.isHls ? 1 : 0));
      if (!sources.length) throw new Error('Chưa có link phát cho tập này.');

      const result = { success: true, slug, currentEpisode: targetEp, sources };
      setCache(cacheKey, result);
      return result;
    }
  }

  window.movieApi = new MovieApiService();
})();
