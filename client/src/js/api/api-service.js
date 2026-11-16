(function () {
  const PHIM_API_BASE = 'https://phimapi.com';
  const DEFAULT_CDN_IMAGE = 'https://phimimg.com';

  const cache = new Map();
  const CACHE_TTL = 4 * 60 * 1000;

  function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

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
    if (cache.size > 60) {
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

    const modifiedTime = raw.modified?.time || '';
    const isToday = modifiedTime ? modifiedTime.startsWith(getTodayKey()) : false;

    return {
      slug,
      title,
      thumb: poster,
      poster,
      backdrop: thumb,
      year: raw.year || '2026',
      badge: badge || 'HD',
      modifiedTime,
      isToday
    };
  }

  async function safeFetchJson(url, timeoutMs = 8500) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  class MovieApiService {
    clearCache() {
      cache.clear();
    }

    async getHome(forceRefresh = false) {
      const today = getTodayKey();
      const lastSync = window.appStorage?.getLastDailySyncDate?.() || '';
      const needDailyAutoSync = lastSync !== today;

      const cacheKey = `home_nf_v6_${today}`;
      if (!forceRefresh && !needDailyAutoSync) {
        const cached = getCache(cacheKey);
        if (cached) return cached;
      }

      const [resHotP1, resHotP2, resBo, resLe, resRap, resAnime, resTopView] = await Promise.allSettled([
        safeFetchJson(`${PHIM_API_BASE}/danh-sach/phim-moi-cap-nhat?page=1`),
        safeFetchJson(`${PHIM_API_BASE}/danh-sach/phim-moi-cap-nhat?page=2`),
        safeFetchJson(`${PHIM_API_BASE}/v1/api/danh-sach/phim-bo?page=1`),
        safeFetchJson(`${PHIM_API_BASE}/v1/api/danh-sach/phim-le?page=1`),
        safeFetchJson(`${PHIM_API_BASE}/v1/api/danh-sach/phim-chieu-rap?page=1`),
        safeFetchJson(`${PHIM_API_BASE}/v1/api/danh-sach/hoat-hinh?page=1`),
        safeFetchJson(`${PHIM_API_BASE}/v1/api/danh-sach/phim-bo?sort_field=view&limit=12`)
      ]);

      const extractItems = (res, isRoot = false) => {
        if (res.status !== 'fulfilled') return [];
        const payload = isRoot ? res.value : res.value?.data;
        if (!payload?.items) return [];
        const cdn = payload.APP_DOMAIN_CDN_IMAGE || DEFAULT_CDN_IMAGE;
        return payload.items.map(it => normalizeCardItem(it, cdn)).filter(Boolean);
      };

      const hotP1 = extractItems(resHotP1, true);
      const hotP2 = extractItems(resHotP2, true);
      const boItems = extractItems(resBo);
      const leItems = extractItems(resLe);
      const rapItems = extractItems(resRap);
      const animeItems = extractItems(resAnime);
      const topViewRaw = extractItems(resTopView);

      const mergedHot = [...hotP1, ...hotP2];
      const uniqueHot = [];
      const seenSlugs = new Set();
      for (const item of mergedHot) {
        if (!seenSlugs.has(item.slug)) {
          seenSlugs.add(item.slug);
          uniqueHot.push(item);
        }
      }

      const topWeeklySource = topViewRaw.length >= 10 ? topViewRaw : [...rapItems.slice(0, 4), ...boItems.slice(0, 4), ...leItems.slice(0, 4)];
      const topWeekly = [];
      const seenTop = new Set();
      for (const item of topWeeklySource) {
        if (!seenTop.has(item.slug) && topWeekly.length < 10) {
          seenTop.add(item.slug);
          topWeekly.push({ ...item, rank: topWeekly.length + 1 });
        }
      }

      const history = window.appStorage?.getHistory?.() || [];
      const favs = window.appStorage?.getFavorites?.() || [];
      const watchedSlugs = new Set([...history.map(h => h.slug), ...favs.map(f => f.slug)]);
      const recPool = [...rapItems, ...boItems, ...leItems, ...animeItems].filter(it => !watchedSlugs.has(it.slug));
      const recommended = [];
      const seenRec = new Set();
      for (const item of recPool) {
        if (!seenRec.has(item.slug) && recommended.length < 16) {
          seenRec.add(item.slug);
          recommended.push(item);
        }
      }

      const dailyMovies = uniqueHot.filter(it => it.isToday);
      const dailyList = dailyMovies.length > 0 ? dailyMovies : uniqueHot.slice(0, 18);

      const sections = [];
      if (recommended.length > 0) {
        sections.push({
          id: 'phim-chieu-rap',
          title: 'Đề Xuất Phim Hay Dành Cho Bạn',
          items: recommended
        });
      }
      if (dailyList.length > 0) {
        sections.push({
          id: 'phim-moi-cap-nhat',
          title: `Mới Cập Nhật Hôm Nay (${dailyList.length})`,
          items: dailyList.slice(0, 20)
        });
      }

      const pushSec = (items, id, title) => {
        if (items.length > 0) sections.push({ id, title, items: items.slice(0, 20) });
      };

      pushSec(boItems, 'phim-bo', 'Phim Bộ Đang Thịnh Hành');
      pushSec(leItems, 'phim-le', 'Phim Lẻ Tuyển Chọn');
      pushSec(rapItems, 'phim-chieu-rap', 'Siêu Phẩm Chiếu Rạp');
      pushSec(animeItems, 'hoat-hinh', 'Anime & Hoạt Hình');

      if (sections.length === 0) {
        throw new Error('Không thể kết nối kho phim Rosi Cinema. Vui lòng kiểm tra kết nối mạng.');
      }

      const topCandidate = topWeekly[0] || dailyList[0] || hotP1[0] || null;
      let hero = topCandidate;
      if (topCandidate) {
        try { hero = await this.getMovieDetail(topCandidate.slug); } catch (e) {}
      }

      const favUpdates = [];
      for (const fav of favs) {
        const matched = uniqueHot.find(m => m.slug === fav.slug);
        if (matched && matched.badge && fav.lastKnownStatus && matched.badge !== fav.lastKnownStatus) {
          favUpdates.push({ slug: fav.slug, title: fav.title, newEp: matched.badge });
          window.appStorage.updateFavoriteStatus(fav.slug, matched.badge);
        }
      }

      if (window.appStorage?.setLastDailySyncDate) {
        window.appStorage.setLastDailySyncDate(today);
      }

      const result = {
        hero,
        topWeekly,
        recommended,
        sections,
        dailyMovies: dailyList,
        favUpdates,
        syncedDate: today
      };
      setCache(cacheKey, result);
      return result;
    }

    async getCategory(type, slug, page = 1) {
      const p = Math.max(1, parseInt(page, 10) || 1);
      const cacheKey = `cat_${type}_${slug}_p${p}`;
      const cached = getCache(cacheKey);
      if (cached) return cached;

      let endpoint = '';
      if (slug === 'phim-moi-cap-nhat') {
        endpoint = `${PHIM_API_BASE}/danh-sach/phim-moi-cap-nhat?page=${p}`;
      } else if (type === 'the-loai') {
        const mappedSlug = slug === 'phim-hai' ? 'hai-huoc' : slug;
        endpoint = `${PHIM_API_BASE}/v1/api/the-loai/${mappedSlug}?page=${p}`;
      } else if (type === 'quoc-gia') {
        const mappedCountry = slug === 'phim-thai-lan' ? 'thai-lan' : slug;
        endpoint = `${PHIM_API_BASE}/v1/api/quoc-gia/${mappedCountry}?page=${p}`;
      } else {
        endpoint = `${PHIM_API_BASE}/v1/api/danh-sach/${slug}?page=${p}`;
      }

      const json = await safeFetchJson(endpoint);
      const dataObj = json.data || json;
      const cdn = dataObj.APP_DOMAIN_CDN_IMAGE || DEFAULT_CDN_IMAGE;
      const items = (dataObj.items || []).map(it => normalizeCardItem(it, cdn)).filter(Boolean);

      const totalItems = dataObj.params?.pagination?.totalItems || 0;
      const totalPerPage = dataObj.params?.pagination?.totalItemsPerPage || 24;
      const hasNext = (p * totalPerPage < totalItems) || items.length >= 12;

      const result = { title: dataObj.titlePage || slug, type, slug, page: p, hasNext, items };
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
      const json = await safeFetchJson(url);
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
      const json = await safeFetchJson(url);
      if (!json.status || !json.movie) throw new Error('Không tìm thấy thông tin phim.');

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
        description: (m.content || 'Đang cập nhật nội dung phim...').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim(),
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
      const json = await safeFetchJson(url);
      if (!json.status || !json.episodes?.length) throw new Error('Không tìm thấy nguồn video phát.');

      const sources = [];
      const seenUrls = new Set();
      const allEpisodes = [];
      const seenAllEps = new Set();

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
          const rawNum = String(ep.name).replace(/^tập\s*/i, '').trim();
          const epNum = rawNum || '1';
          const epNorm = cleanEp(ep.name);
          const slugNorm = cleanEp(ep.slug);

          if (!seenAllEps.has(epNum)) {
            seenAllEps.add(epNum);
            allEpisodes.push({
              number: epNum,
              name: isNaN(epNum) ? epNum : `Tập ${epNum}`,
              slug: ep.slug,
              isCurrent: epNorm === normTarget
            });
          }

          const isMatch = epNorm === normTarget || slugNorm === normTarget || isSingle ||
                          (ep.slug === `tap-${normTarget}`) || (ep.slug === `tap-0${normTarget}`) ||
                          (normTarget === '1' && (epNorm === 'full' || slugNorm === 'full')) ||
                          (normTarget === 'full' && (epNorm === '1' || slugNorm === '1'));
          if (isMatch) {
            if (ep.link_m3u8 && !seenUrls.has(ep.link_m3u8)) {
              seenUrls.add(ep.link_m3u8);
              sources.push({ label: `${sName} (HLS Siêu Tốc)`, type: 'm3u8', url: ep.link_m3u8, isHls: true });
            }
            if (ep.link_embed && !seenUrls.has(ep.link_embed)) {
              seenUrls.add(ep.link_embed);
              sources.push({ label: `${sName} (Dự Phòng)`, type: 'embed', url: ep.link_embed, isHls: false });
            }
          }
        }
      }

      if (sources.length === 0) {
        for (const server of json.episodes) {
          if (!server.server_data?.length) continue;
          const sName = server.server_name || 'VIP Server';
          const firstEp = server.server_data[0];
          if (firstEp.link_m3u8 && !seenUrls.has(firstEp.link_m3u8)) {
            seenUrls.add(firstEp.link_m3u8);
            sources.push({ label: `${sName} (HLS Siêu Tốc)`, type: 'm3u8', url: firstEp.link_m3u8, isHls: true });
          }
          if (firstEp.link_embed && !seenUrls.has(firstEp.link_embed)) {
            seenUrls.add(firstEp.link_embed);
            sources.push({ label: `${sName} (Dự Phòng)`, type: 'embed', url: firstEp.link_embed, isHls: false });
          }
        }
      }

      sources.sort((a, b) => (b.isHls ? 1 : 0) - (a.isHls ? 1 : 0));
      if (!sources.length) throw new Error(`Chưa có link xem cho Tập ${episodeNum}.`);

      const result = {
        success: true,
        slug,
        currentEpisode: targetEp,
        sources,
        episodes: allEpisodes.length > 0 ? allEpisodes : [{ number: targetEp, name: `Tập ${targetEp}`, isCurrent: true }]
      };
      setCache(cacheKey, result);
      return result;
    }
  }

  window.movieApi = new MovieApiService();
})();
