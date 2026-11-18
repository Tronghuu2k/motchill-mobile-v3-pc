(function () {
  const api = window.apiService || window.RosiApi || {};
  const QUALITY_ORDER = ['auto', '4k', '1080p', '720p', '480p'];
  const HUD_AUTO_HIDE_MS = 3500;
  const QUALITY_LABELS = { auto: 'Tự động', '4k': '4K Ultra', '1080p': '1080p', '720p': '720p', '480p': '480p' };
  const FIT_MODES = [
    { cls: 'fit-contain', label: 'Vừa', btnText: '⛶ Vừa' },
    { cls: 'fit-screen', label: 'Đầy', btnText: '⛶ Đầy' },
    { cls: 'fit-stretch', label: 'Kéo giãn', btnText: '⛶ Giãn' }
  ];
  const FALLBACK_IMG_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%2318181b'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2371717a' font-family='sans-serif' font-size='16'%3EROSI CINEMA%3C/text%3E%3C/svg%3E";

  const state = {
    activeTab: 'tab-home',
    catalog: { type: 'phim-moi', genre: '', country: '', page: 1, totalPages: 1 },
    libraryTab: 'favorites',
    currentMovie: null,
    player: {
      slug: '', title: '', thumb: '', backdrop: '', thumbCandidates: [], badge: '4K',
      episodeNum: '1', episodeLabel: 'Tập 1',
      quality: typeof api.getPreferredQuality === 'function' ? api.getPreferredQuality() : 'auto',
      episodes: [], sources: [], sourceIndex: 0, aspectMode: 0,
      hls: null, watchdogTimer: null, progressTimer: null, hudHideTimer: null, lastTime: -1, stuckTicks: 0
    }
  };
  let orientationGuardUntil = 0;
  let playerRequestSeq = 0;
  const els = {};

  function cacheElements() {
    [
      'mainContent', 'heroBanner', 'continueSection', 'continueRow', 'latestGrid', 'seriesRow', 'singleGrid',
      'typeChips', 'genreSelect', 'countrySelect', 'catalogGrid', 'prevPageBtn', 'nextPageBtn', 'pageIndicator',
      'searchForm', 'searchInput', 'clearSearchBtn', 'searchHistoryWrap', 'searchHistoryChips', 'searchResultsGrid',
      'libFavTab', 'libHistTab', 'favCount', 'histCount', 'clearCurrentLibBtn', 'libraryGrid',
      'detailModal', 'detailContent', 'playerModal', 'playerMovieTitle', 'playerEpLabel', 'playerStage',
      'videoViewportBox', 'videoElement', 'embedIframe', 'vietsubText', 'seekToast', 'playerMessage',
      'qualityList', 'sourceList', 'episodeList', 'toastBanner', 'hudCurrentTime', 'hudDurationTime',
      'hudSeekSlider', 'hudPlayPauseBtn', 'hudQualityCycleBtn', 'hudMuteBtn', 'quickSearchBtn'
    ].forEach((id) => { els[id] = document.getElementById(id); });
  }

  let toastTimer = null;
  function showToast(msg) {
    if (!els.toastBanner || !msg) return;
    els.toastBanner.textContent = msg;
    els.toastBanner.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toastBanner.classList.add('hidden'); }, 2000);
  }

  function escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stripHtml(str = '') {
    return String(str)
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function collectCandidates(primary, secondary = [], extraList = []) {
    const out = [];
    const seen = new Set();
    const add = (u) => {
      if (!u || typeof u !== 'string') return;
      const clean = u.trim();
      if (!clean || clean === FALLBACK_IMG_SVG || seen.has(clean)) return;
      seen.add(clean);
      out.push(clean);
    };
    if (Array.isArray(extraList)) extraList.forEach(add);
    add(primary);
    if (Array.isArray(secondary)) secondary.forEach(add);
    else add(secondary);
    return out;
  }

  function configureImageElement(imgEl, candidates = []) {
    if (!imgEl) return;
    const list = collectCandidates(candidates[0], candidates.slice(1));
    imgEl.dataset.candidates = JSON.stringify(list);
    imgEl.dataset.candIdx = '0';
    imgEl.dataset.fbApplied = '0';
    imgEl.src = list[0] || FALLBACK_IMG_SVG;
  }

  function handleImgFallback(imgEl) {
    if (!imgEl) return;
    let list = [];
    try {
      list = JSON.parse(imgEl.dataset.candidates || '[]');
    } catch (_) {
      list = [];
    }
    let idx = Number(imgEl.dataset.candIdx || '0');
    idx += 1;
    if (Array.isArray(list) && idx < list.length) {
      imgEl.dataset.candIdx = String(idx);
      imgEl.src = list[idx];
      return;
    }
    if (imgEl.dataset.fbApplied === '1') return;
    imgEl.dataset.fbApplied = '1';
    imgEl.src = FALLBACK_IMG_SVG;
  }

  function formatClock(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '00:00';
    const total = Math.floor(sec);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function currentFitObj() {
    return FIT_MODES[state.player.aspectMode % FIT_MODES.length] || FIT_MODES[0];
  }

  function updatePlayerHeaderLabel() {
    if (!els.playerEpLabel) return;
    const qLabel = QUALITY_LABELS[state.player.quality] || 'Tự động';
    const fLabel = currentFitObj().label;
    els.playerEpLabel.textContent = `${state.player.episodeLabel} • ${qLabel} • ${fLabel}`;
    if (els.hudQualityCycleBtn) {
      els.hudQualityCycleBtn.textContent = state.player.quality === 'auto' ? 'AUTO' : state.player.quality.toUpperCase();
    }
  }

  function clearHudHideTimer() {
    if (state.player.hudHideTimer) {
      clearTimeout(state.player.hudHideTimer);
      state.player.hudHideTimer = null;
    }
  }

  function showHudAndScheduleHide() {
    clearHudHideTimer();
    els.playerStage?.classList.remove('hud-hidden');
    const isOpen = els.playerModal && !els.playerModal.classList.contains('hidden');
    const vid = els.videoElement;
    const isPlayingVideo = vid && !vid.classList.contains('hidden') && !vid.paused && !vid.ended;
    if (isOpen && isPlayingVideo) {
      state.player.hudHideTimer = setTimeout(() => {
        const stillOpen = els.playerModal && !els.playerModal.classList.contains('hidden');
        const stillPlaying = vid && !vid.classList.contains('hidden') && !vid.paused && !vid.ended;
        if (stillOpen && stillPlaying) {
          els.playerStage?.classList.add('hud-hidden');
        }
      }, HUD_AUTO_HIDE_MS);
    }
  }

  function applyFitMode(index) {
    state.player.aspectMode = ((index % FIT_MODES.length) + FIT_MODES.length) % FIT_MODES.length;
    const fit = currentFitObj();
    if (els.videoViewportBox) {
      els.videoViewportBox.classList.remove('fit-contain', 'fit-screen', 'fit-stretch');
      els.videoViewportBox.classList.add(fit.cls);
    }
    const btn = document.getElementById('aspectRatioBtn');
    if (btn) btn.textContent = fit.btnText;
    updatePlayerHeaderLabel();
  }

  function applyQualityToHlsAndVideo(quality) {
    const clean = QUALITY_LABELS[quality] ? quality : 'auto';
    state.player.quality = clean;
    if (typeof api.setPreferredQuality === 'function') api.setPreferredQuality(clean);
    if (els.qualityList) {
      els.qualityList.querySelectorAll('.chip').forEach((btn) => btn.classList.toggle('active', btn.dataset.quality === clean));
    }
    const vid = els.videoElement;
    if (vid) {
      vid.classList.remove('quality-4k', 'quality-1080p', 'quality-720p', 'quality-480p');
      if (clean !== 'auto') vid.classList.add(`quality-${clean}`);
    }
    const hls = state.player.hls;
    if (hls && Array.isArray(hls.levels) && hls.levels.length > 0) {
      if (clean === 'auto') {
        hls.currentLevel = -1;
        hls.nextLevel = -1;
      } else if (clean === '4k') {
        let bestIdx = 0;
        let bestH = -1;
        hls.levels.forEach((lvl, idx) => {
          const h = Number(lvl.height || 0);
          if (h >= bestH) { bestH = h; bestIdx = idx; }
        });
        hls.currentLevel = bestIdx;
        hls.nextLevel = bestIdx;
      } else {
        const map = { '1080p': 1080, '720p': 720, '480p': 480 };
        const target = map[clean] || 720;
        let idxBest = 0;
        let diffBest = Infinity;
        hls.levels.forEach((lvl, idx) => {
          const h = Number(lvl.height || 0);
          if (h > 0) {
            const d = Math.abs(h - target);
            if (d < diffBest) { diffBest = d; idxBest = idx; }
          }
        });
        hls.currentLevel = idxBest;
        hls.nextLevel = idxBest;
      }
    }
    updatePlayerHeaderLabel();
  }

  function syncBackgroundScrollLock() {
    if (!els.mainContent) return;
    const anyOpen = (els.detailModal && !els.detailModal.classList.contains('hidden')) ||
      (els.playerModal && !els.playerModal.classList.contains('hidden'));
    els.mainContent.classList.toggle('scroll-locked', Boolean(anyOpen));
  }

  function syncCssLandscapeFallback() {
    const isLandscapeActive = document.documentElement.classList.contains('is-landscape-playing') &&
      els.playerModal && !els.playerModal.classList.contains('hidden');
    if (!isLandscapeActive) {
      document.documentElement.classList.remove('needs-css-landscape');
      return;
    }
    const isPortraitViewport = window.innerHeight > window.innerWidth;
    document.documentElement.classList.toggle('needs-css-landscape', isPortraitViewport);
  }

  async function lockPortraitWhenIdle() {
    orientationGuardUntil = Date.now() + 1500;
    document.documentElement.classList.remove('is-landscape-playing');
    document.documentElement.classList.remove('needs-css-landscape');
    els.playerModal?.classList.remove('is-landscape-mode');
    try {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl && document.exitFullscreen) await document.exitFullscreen();
    } catch (e) {}
    const capO = window.Capacitor?.Plugins?.ScreenOrientation;
    if (capO?.lock) {
      try { await capO.lock({ orientation: 'portrait' }); } catch (_) {}
    }
    if (screen.orientation && screen.orientation.lock) {
      try { await screen.orientation.lock('portrait-primary'); return; } catch (e) {
        try { await screen.orientation.lock('portrait'); return; } catch (_) {}
      }
    }
  }

  async function activateAutoLandscapeFullscreen() {
    orientationGuardUntil = Date.now() + 2000;
    document.documentElement.classList.add('is-landscape-playing');
    els.playerModal?.classList.add('is-landscape-mode');
    syncCssLandscapeFallback();

    const capO = window.Capacitor?.Plugins?.ScreenOrientation;
    if (capO?.lock) {
      try { await capO.lock({ orientation: 'landscape' }); } catch (_) {
        try { await capO.lock({ orientation: 'landscape-primary' }); } catch (_) {}
      }
    }

    if (screen.orientation && screen.orientation.lock) {
      try { await screen.orientation.lock('landscape'); } catch (_) {
        try { await screen.orientation.lock('landscape-primary'); } catch (_) {}
      }
    }

    try {
      const target = els.playerStage || els.playerModal;
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (target && !fsEl && window.innerWidth > window.innerHeight) {
        if (target.requestFullscreen) await target.requestFullscreen();
        else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
      }
    } catch (_) {}

    syncCssLandscapeFallback();
    setTimeout(syncCssLandscapeFallback, 250);
    setTimeout(syncCssLandscapeFallback, 750);

    const vid = els.videoElement;
    if (vid && !vid.classList.contains('hidden') && vid.paused && !vid.ended) vid.play().catch(() => {});
  }

  async function restorePortraitOrientation() {
    await lockPortraitWhenIdle();
    const vid = els.videoElement;
    if (vid && !vid.classList.contains('hidden') && els.playerModal && !els.playerModal.classList.contains('hidden') && vid.paused && !vid.ended) {
      vid.play().catch(() => {});
    }
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.tab-view').forEach((v) => v.classList.toggle('active', v.id === tabId));
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
    if (els.mainContent) els.mainContent.scrollTop = 0;
    if (tabId === 'tab-catalog' && els.catalogGrid.children.length === 0) loadCatalog();
    else if (tabId === 'tab-library') renderLibrary();
    else if (tabId === 'tab-search') {
      renderSearchHistory();
      setTimeout(() => els.searchInput?.focus(), 60);
    }
  }

  function createMovieCard(movie, options = {}) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const candidates = collectCandidates(movie.thumb, movie.poster, movie.thumbCandidates);
    const badgeText = options.badgeText || movie.badge || movie.status || '4K';
    const metaText = options.metaText || (movie.year ? `${movie.year}` : '');
    const progressPct = typeof options.progressPct === 'number' ? options.progressPct : null;
    card.innerHTML = `
      <div class="poster-wrap">
        <img class="poster-img" src="${escapeHtml(FALLBACK_IMG_SVG)}" alt="${escapeHtml(movie.title)}" loading="lazy" />
        <span class="poster-badge">${escapeHtml(badgeText)}</span>
        ${progressPct !== null ? `<div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, Math.max(0, progressPct))}%"></div></div>` : ''}
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(movie.title)}</div>
        ${metaText ? `<div class="card-meta">${escapeHtml(metaText)}</div>` : ''}
      </div>`;
    const pImg = card.querySelector('.poster-img');
    if (pImg) {
      configureImageElement(pImg, candidates);
      pImg.addEventListener('error', () => handleImgFallback(pImg));
    }
    card.addEventListener('click', () => (typeof options.onClick === 'function' ? options.onClick() : openMovieDetail(movie.slug)));
    return card;
  }

  function renderHero(hero) {
    if (!els.heroBanner) return;
    if (!hero) { els.heroBanner.innerHTML = `<div class="empty-state">Đang tải...</div>`; return; }
    const bgCandidates = collectCandidates(hero.backdrop, hero.thumb, hero.backdropCandidates);
    els.heroBanner.innerHTML = `
      <img class="hero-bg" src="${escapeHtml(FALLBACK_IMG_SVG)}" alt="${escapeHtml(hero.title)}" />
      <div class="hero-overlay">
        <span class="hero-tag">${escapeHtml(hero.status || '4K')}</span>
        <h1 class="hero-title">${escapeHtml(hero.title)}</h1>
        <p class="hero-sub">${escapeHtml(hero.originName || hero.year || '')}</p>
        <div class="hero-actions">
          <button id="heroWatchBtn" class="primary-btn" type="button">▶ Xem</button>
          <button id="heroDetailBtn" class="secondary-btn" type="button">Chi tiết</button>
        </div>
      </div>`;
    const hBg = els.heroBanner.querySelector('.hero-bg');
    if (hBg) {
      configureImageElement(hBg, bgCandidates);
      hBg.addEventListener('error', () => handleImgFallback(hBg));
    }
    document.getElementById('heroWatchBtn')?.addEventListener('click', () => openPlayer(hero.slug, '1', hero));
    document.getElementById('heroDetailBtn')?.addEventListener('click', () => openMovieDetail(hero.slug));
  }

  function renderContinueWatching() {
    const history = typeof api.getWatchHistory === 'function' ? api.getWatchHistory() : [];
    if (!history.length) { els.continueSection.classList.add('hidden'); return; }
    els.continueSection.classList.remove('hidden');
    els.continueRow.innerHTML = '';
    history.slice(0, 12).forEach((item) => {
      const epLabel = item.lastEpisodeLabel || `Tập ${item.lastEpisodeNum || '1'}`;
      els.continueRow.appendChild(createMovieCard(item, {
        badgeText: epLabel,
        metaText: item.progressPct ? `${item.progressPct}% • ${epLabel}` : epLabel,
        progressPct: item.progressPct || 5,
        onClick: () => openPlayer(item.slug, item.lastEpisodeNum || '1', item)
      }));
    });
  }

  async function loadHome() {
    renderContinueWatching();
    try {
      const { hero, latest, series, single } = await api.getHomeSections();
      renderHero(hero);
      els.latestGrid.innerHTML = '';
      latest.slice(0, 6).forEach((m) => els.latestGrid.appendChild(createMovieCard(m)));
      els.seriesRow.innerHTML = '';
      series.slice(0, 10).forEach((m) => els.seriesRow.appendChild(createMovieCard(m)));
      els.singleGrid.innerHTML = '';
      single.slice(0, 6).forEach((m) => els.singleGrid.appendChild(createMovieCard(m)));
    } catch (e) {
      els.latestGrid.innerHTML = `<div class="empty-state">Lỗi kết nối</div>`;
    }
  }

  async function loadCatalog() {
    els.catalogGrid.innerHTML = `<div class="empty-state">Đang tải...</div>`;
    try {
      const res = await api.getCatalog(state.catalog);
      state.catalog.page = res.currentPage;
      state.catalog.totalPages = Number(res.totalPages || 0);
      els.pageIndicator.textContent = `${state.catalog.page}`;
      els.prevPageBtn.disabled = state.catalog.page <= 1;
      els.nextPageBtn.disabled = res.items.length === 0 || (state.catalog.totalPages > 0 && state.catalog.page >= state.catalog.totalPages);
      els.catalogGrid.innerHTML = '';
      if (!res.items.length) { els.catalogGrid.innerHTML = `<div class="empty-state">Trống</div>`; return; }
      res.items.forEach((m) => els.catalogGrid.appendChild(createMovieCard(m)));
    } catch (e) { els.catalogGrid.innerHTML = `<div class="empty-state">Lỗi</div>`; }
  }

  function renderSearchHistory() {
    const list = typeof api.getSearchHistory === 'function' ? api.getSearchHistory() : [];
    if (!list.length) { els.searchHistoryWrap.classList.add('hidden'); return; }
    els.searchHistoryWrap.classList.remove('hidden');
    els.searchHistoryChips.innerHTML = '';
    list.forEach((kw) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = kw;
      b.addEventListener('click', () => { els.searchInput.value = kw; runSearch(kw); });
      els.searchHistoryChips.appendChild(b);
    });
  }

  async function runSearch(q) {
    const clean = (q || '').trim();
    if (!clean) {
      els.searchResultsGrid.innerHTML = '';
      return;
    }
    if (typeof api.addSearchHistory === 'function') api.addSearchHistory(clean);
    renderSearchHistory();
    els.searchResultsGrid.innerHTML = `<div class="empty-state">Đang tìm...</div>`;
    try {
      const res = await api.searchMovies(clean, 1);
      els.searchResultsGrid.innerHTML = '';
      if (!res.items.length) { els.searchResultsGrid.innerHTML = `<div class="empty-state">Không tìm thấy</div>`; return; }
      res.items.forEach((m) => els.searchResultsGrid.appendChild(createMovieCard(m)));
    } catch (e) { els.searchResultsGrid.innerHTML = `<div class="empty-state">Lỗi</div>`; }
  }

  function renderLibrary() {
    const favs = typeof api.getFavorites === 'function' ? api.getFavorites() : [];
    const hist = typeof api.getWatchHistory === 'function' ? api.getWatchHistory() : [];
    els.favCount.textContent = String(favs.length);
    els.histCount.textContent = String(hist.length);
    els.libFavTab.classList.toggle('active', state.libraryTab === 'favorites');
    els.libHistTab.classList.toggle('active', state.libraryTab === 'history');
    els.libraryGrid.innerHTML = '';
    const list = state.libraryTab === 'favorites' ? favs : hist;
    if (els.clearCurrentLibBtn) {
      els.clearCurrentLibBtn.classList.toggle('hidden', list.length === 0);
    }
    if (!list.length) { els.libraryGrid.innerHTML = `<div class="empty-state">Trống</div>`; return; }
    list.forEach((item) => {
      if (state.libraryTab === 'favorites') els.libraryGrid.appendChild(createMovieCard(item));
      else {
        const epLabel = item.lastEpisodeLabel || `Tập ${item.lastEpisodeNum || '1'}`;
        els.libraryGrid.appendChild(createMovieCard(item, {
          badgeText: epLabel,
          metaText: item.progressPct ? `${item.progressPct}% • ${epLabel}` : epLabel,
          progressPct: item.progressPct || 5,
          onClick: () => openPlayer(item.slug, item.lastEpisodeNum || '1', item)
        }));
      }
    });
  }

  async function openMovieDetail(slug) {
    if (!slug) return;
    els.detailContent.innerHTML = `<div class="empty-state">Đang tải...</div>`;
    els.detailModal.classList.remove('hidden');
    syncBackgroundScrollLock();
    try {
      const { movie, episodes } = await api.getMovieDetail(slug);
      state.currentMovie = movie;
      const fav = typeof api.isFavorite === 'function' ? api.isFavorite(movie.slug) : false;
      const posterCandidates = collectCandidates(movie.thumb, movie.poster, movie.thumbCandidates);
      const epHtml = (episodes.length ? episodes : [{ num: '1', label: 'Tập 1' }])
        .map((ep) => `<button class="ep-btn" type="button" data-ep="${escapeHtml(ep.num)}">${escapeHtml(ep.label)}</button>`).join('');
      els.detailContent.innerHTML = `
        <div class="detail-hero">
          <img class="detail-poster" src="${escapeHtml(FALLBACK_IMG_SVG)}" alt="${escapeHtml(movie.title)}" />
          <div>
            <h2 class="detail-title">${escapeHtml(movie.title)}</h2>
            <div class="detail-meta">${escapeHtml(movie.status || '4K')}${movie.year ? ` • ${movie.year}` : ''}</div>
            <div class="detail-actions">
              <button id="detailPlayBtn" class="primary-btn" type="button">▶ Xem</button>
              <button id="detailFavBtn" class="secondary-btn" type="button">${fav ? '♥' : '♡'}</button>
            </div>
          </div>
        </div>
        <p class="detail-desc">${escapeHtml(stripHtml(movie.description || ''))}</p>
        <div class="sub-label">${episodes.length || 1} tập</div>
        <div id="detailEpGrid" class="episode-grid">${epHtml}</div>`;
      const dPoster = els.detailContent.querySelector('.detail-poster');
      if (dPoster) {
        configureImageElement(dPoster, posterCandidates);
        dPoster.addEventListener('error', () => handleImgFallback(dPoster));
      }
      document.getElementById('detailPlayBtn')?.addEventListener('click', () => { closeDetailModal(); openPlayer(movie.slug, (episodes[0]?.num) || '1', movie); });
      document.getElementById('detailFavBtn')?.addEventListener('click', (ev) => {
        const added = typeof api.toggleFavorite === 'function' ? api.toggleFavorite(movie) : false;
        ev.currentTarget.textContent = added ? '♥' : '♡';
        showToast(added ? '♥ Đã lưu' : '♡ Đã bỏ lưu');
        if (state.activeTab === 'tab-library' && state.libraryTab === 'favorites') renderLibrary();
      });
      document.getElementById('detailEpGrid')?.addEventListener('click', (ev) => {
        const b = ev.target.closest('.ep-btn');
        if (!b) return;
        closeDetailModal();
        openPlayer(movie.slug, b.dataset.ep || '1', movie);
      });
    } catch (e) { els.detailContent.innerHTML = `<div class="empty-state">Lỗi</div>`; }
  }

  function closeDetailModal() { els.detailModal.classList.add('hidden'); syncBackgroundScrollLock(); }
  function destroyHls() { if (state.player.hls) { try { state.player.hls.destroy(); } catch (_) {} state.player.hls = null; } }
  function stopStallWatchdog() { if (state.player.watchdogTimer) { clearInterval(state.player.watchdogTimer); state.player.watchdogTimer = null; } state.player.stuckTicks = 0; }
  function stopProgressLoop() { if (state.player.progressTimer) { clearInterval(state.player.progressTimer); state.player.progressTimer = null; } }

  function persistCurrentVideoProgress() {
    if (!state.player.slug || typeof api.saveWatchProgress !== 'function') return;
    const vid = els.videoElement;
    const ok = vid && !vid.classList.contains('hidden') && Number.isFinite(vid.currentTime);
    api.saveWatchProgress({
      slug: state.player.slug,
      title: state.player.title,
      thumb: state.player.thumb,
      backdrop: state.player.backdrop,
      thumbCandidates: state.player.thumbCandidates,
      badge: state.player.badge,
      episodeNum: state.player.episodeNum,
      episodeLabel: state.player.episodeLabel,
      currentTime: ok ? vid.currentTime : 0,
      duration: ok && Number.isFinite(vid.duration) ? vid.duration : 0
    });
  }

  function syncTimelineUi() {
    const vid = els.videoElement;
    if (!vid) return;
    const cur = Number.isFinite(vid.currentTime) ? vid.currentTime : 0;
    const dur = Number.isFinite(vid.duration) ? vid.duration : 0;
    if (els.hudCurrentTime) els.hudCurrentTime.textContent = formatClock(cur);
    if (els.hudDurationTime) els.hudDurationTime.textContent = formatClock(dur);
    if (els.hudSeekSlider && dur > 0) els.hudSeekSlider.value = String(Math.round((cur / dur) * 1000));
    if (els.hudPlayPauseBtn) els.hudPlayPauseBtn.textContent = vid.paused ? '▶' : '❚❚';
  }

  function startStallWatchdog() {
    stopStallWatchdog();
    state.player.lastTime = els.videoElement.currentTime || 0;
    state.player.watchdogTimer = setInterval(() => {
      if (Date.now() < orientationGuardUntil) { state.player.lastTime = els.videoElement.currentTime || state.player.lastTime; state.player.stuckTicks = 0; return; }
      const vid = els.videoElement;
      if (!vid || vid.classList.contains('hidden') || vid.paused || vid.ended) return;
      const cur = vid.currentTime || 0;
      if (Math.abs(cur - state.player.lastTime) < 0.25) {
        state.player.stuckTicks += 1;
        if (state.player.stuckTicks >= 4 && state.player.sourceIndex + 1 < state.player.sources.length) {
          state.player.stuckTicks = 0;
          playSourceAt(state.player.sourceIndex + 1);
        }
      } else { state.player.lastTime = cur; state.player.stuckTicks = 0; }
    }, 2500);
  }

  function renderPlayerLists() {
    els.sourceList.innerHTML = '';
    state.player.sources.forEach((src, idx) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = `chip ${idx === state.player.sourceIndex ? 'active' : ''}`;
      b.textContent = src.name || `#${idx + 1}`;
      b.addEventListener('click', () => playSourceAt(idx));
      els.sourceList.appendChild(b);
    });
    els.episodeList.innerHTML = '';
    state.player.episodes.forEach((ep) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = `ep-btn ${String(ep.num) === String(state.player.episodeNum) ? 'active' : ''}`;
      b.textContent = ep.label;
      b.addEventListener('click', () => openPlayer(state.player.slug, ep.num, state.player));
      els.episodeList.appendChild(b);
    });
    if (els.qualityList) {
      els.qualityList.querySelectorAll('.chip').forEach((b) => b.classList.toggle('active', b.dataset.quality === state.player.quality));
    }
    updatePlayerHeaderLabel();
  }

  function playSourceAt(index) {
    const sources = state.player.sources || [];
    if (!sources.length) return;
    const idx = Math.max(0, Math.min(index, sources.length - 1));
    state.player.sourceIndex = idx;
    const chosen = sources[idx];
    renderPlayerLists();
    destroyHls(); stopStallWatchdog();
    els.playerMessage.textContent = 'Đang tải luồng...';
    els.playerMessage.classList.remove('hidden');
    if (els.vietsubText) els.vietsubText.textContent = `Vietsub • ${state.player.episodeLabel}`;
    const saved = typeof api.getEpisodeProgress === 'function' ? api.getEpisodeProgress(state.player.slug, state.player.episodeNum) : null;
    const resumeAt = saved && saved.currentTime > 5 ? saved.currentTime : 0;
    if (chosen.type === 'embed') {
      els.videoElement.pause(); els.videoElement.removeAttribute('src'); els.videoElement.classList.add('hidden');
      els.embedIframe.classList.remove('hidden'); els.embedIframe.src = chosen.url;
      setTimeout(() => els.playerMessage.classList.add('hidden'), 900);
      return;
    }
    els.embedIframe.removeAttribute('src'); els.embedIframe.classList.add('hidden'); els.videoElement.classList.remove('hidden');
    applyQualityToHlsAndVideo(state.player.quality);
    applyFitMode(state.player.aspectMode);
    const onReady = () => {
      if (resumeAt > 0 && Number.isFinite(els.videoElement.duration) && resumeAt < els.videoElement.duration - 5) {
        try { els.videoElement.currentTime = resumeAt; } catch (_) {}
      }
      applyQualityToHlsAndVideo(state.player.quality);
      applyFitMode(state.player.aspectMode);
      syncTimelineUi();
      els.videoElement.play().catch(() => {});
      els.playerMessage.classList.add('hidden');
      startStallWatchdog();
    };
    if (window.Hls && window.Hls.isSupported() && /\.m3u8/i.test(chosen.url)) {
      const hls = new window.Hls({ enableWorker: true, lowLatencyMode: false });
      state.player.hls = hls;
      hls.loadSource(chosen.url);
      hls.attachMedia(els.videoElement);
      hls.on(window.Hls.Events.MANIFEST_PARSED, onReady);
      hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (data?.fatal && idx + 1 < sources.length) playSourceAt(idx + 1);
      });
    } else {
      els.videoElement.src = chosen.url;
      els.videoElement.addEventListener('loadedmetadata', onReady, { once: true });
      els.videoElement.addEventListener('error', () => { if (idx + 1 < sources.length) playSourceAt(idx + 1); }, { once: true });
    }
  }

  async function openPlayer(slug, episodeNum = '1', meta = {}) {
    if (!slug) return;
    const reqId = ++playerRequestSeq;
    stopStallWatchdog(); stopProgressLoop(); persistCurrentVideoProgress();
    const epNum = String(episodeNum || '1');
    state.player.slug = slug;
    state.player.title = meta.title || state.currentMovie?.title || slug;
    state.player.thumb = meta.thumb || state.currentMovie?.thumb || '';
    state.player.backdrop = meta.backdrop || state.currentMovie?.backdrop || '';
    state.player.thumbCandidates = collectCandidates(
      state.player.thumb,
      state.player.backdrop,
      meta.thumbCandidates || state.currentMovie?.thumbCandidates
    );
    state.player.badge = meta.badge || state.currentMovie?.status || '4K';
    state.player.episodeNum = epNum;
    state.player.episodeLabel = /^\d+$/.test(epNum) ? `Tập ${epNum}` : epNum;
    els.playerMovieTitle.textContent = state.player.title;
    els.playerStage?.classList.remove('hud-hidden');
    updatePlayerHeaderLabel();
    els.playerMessage.textContent = 'Đang tải...';
    els.playerMessage.classList.remove('hidden');
    els.playerModal.classList.remove('hidden');
    syncBackgroundScrollLock();
    await activateAutoLandscapeFullscreen();
    if (typeof api.saveWatchProgress === 'function') api.saveWatchProgress(state.player);
    try {
      const streamData = await api.getStream(slug, epNum);
      if (reqId !== playerRequestSeq) return;
      state.player.sources = streamData.sources || [];
      state.player.episodes = streamData.episodes || [];
      state.player.episodeNum = streamData.currentEpisode || epNum;
      state.player.episodeLabel = /^\d+$/.test(state.player.episodeNum) ? `Tập ${state.player.episodeNum}` : state.player.episodeNum;
      renderPlayerLists();
      playSourceAt(0);
      showHudAndScheduleHide();
      state.player.progressTimer = setInterval(persistCurrentVideoProgress, 8000);
    } catch (e) {
      els.playerMessage.textContent = e.message || 'Lỗi';
      els.playerMessage.classList.remove('hidden');
    }
  }

  async function closePlayer() {
    clearHudHideTimer();
    els.playerStage?.classList.remove('hud-hidden');
    persistCurrentVideoProgress(); stopStallWatchdog(); stopProgressLoop(); destroyHls();
    try { els.videoElement.pause(); els.videoElement.removeAttribute('src'); } catch (_) {}
    try { els.embedIframe.removeAttribute('src'); } catch (_) {}
    els.playerModal.classList.add('hidden');
    syncBackgroundScrollLock();
    await restorePortraitOrientation();
    renderContinueWatching();
    if (state.activeTab === 'tab-library') renderLibrary();
  }

  function seekBy(sec) {
    const vid = els.videoElement;
    if (!vid || vid.classList.contains('hidden')) return;
    vid.currentTime = Math.max(0, Math.min(vid.duration || Infinity, (vid.currentTime || 0) + sec));
    syncTimelineUi();
    els.seekToast.textContent = sec < 0 ? `⏪ ${sec}s` : `⏩ +${sec}s`;
    els.seekToast.classList.remove('hidden');
    clearTimeout(els.seekToast._t);
    els.seekToast._t = setTimeout(() => els.seekToast.classList.add('hidden'), 600);
  }

  function cycleAspectRatio() {
    applyFitMode(state.player.aspectMode + 1);
    showToast(`⛶ ${currentFitObj().label}`);
  }

  function cycleQualityQuick() {
    const idx = QUALITY_ORDER.indexOf(state.player.quality);
    const nextQ = QUALITY_ORDER[(idx + 1) % QUALITY_ORDER.length];
    applyQualityToHlsAndVideo(nextQ);
    showToast(QUALITY_LABELS[nextQ] || nextQ);
  }

  function stepEpisode(delta) {
    const eps = state.player.episodes || [];
    const idx = eps.findIndex((ep) => String(ep.num) === String(state.player.episodeNum));
    const nextIdx = idx + delta;
    if (nextIdx >= 0 && nextIdx < eps.length) openPlayer(state.player.slug, eps[nextIdx].num, state.player);
    else showToast(delta > 0 ? '⏭' : '⏮');
  }

  function bindEvents() {
    document.querySelectorAll('.nav-btn').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    els.quickSearchBtn?.addEventListener('click', () => switchTab('tab-search'));
    document.getElementById('seeMoreLatestBtn')?.addEventListener('click', () => { state.catalog = { type: 'phim-moi', genre: '', country: '', page: 1, totalPages: 1 }; switchTab('tab-catalog'); loadCatalog(); });
    document.getElementById('seeMoreSeriesBtn')?.addEventListener('click', () => { state.catalog = { type: 'phim-bo', genre: '', country: '', page: 1, totalPages: 1 }; switchTab('tab-catalog'); loadCatalog(); });
    document.getElementById('seeMoreMoviesBtn')?.addEventListener('click', () => { state.catalog = { type: 'phim-le', genre: '', country: '', page: 1, totalPages: 1 }; switchTab('tab-catalog'); loadCatalog(); });
    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => { if (typeof api.clearWatchHistory === 'function') api.clearWatchHistory(); renderContinueWatching(); });
    els.typeChips?.addEventListener('click', (ev) => {
      const c = ev.target.closest('.chip'); if (!c) return;
      els.typeChips.querySelectorAll('.chip').forEach((x) => x.classList.remove('active')); c.classList.add('active');
      state.catalog.type = c.dataset.type || 'phim-moi'; state.catalog.page = 1; loadCatalog();
    });
    els.genreSelect?.addEventListener('change', () => { state.catalog.genre = els.genreSelect.value; state.catalog.page = 1; loadCatalog(); });
    els.countrySelect?.addEventListener('change', () => { state.catalog.country = els.countrySelect.value; state.catalog.page = 1; loadCatalog(); });
    els.prevPageBtn?.addEventListener('click', () => { if (state.catalog.page > 1) { state.catalog.page -= 1; loadCatalog(); } });
    els.nextPageBtn?.addEventListener('click', () => { state.catalog.page += 1; loadCatalog(); });
    els.searchForm?.addEventListener('submit', (ev) => { ev.preventDefault(); runSearch(els.searchInput.value); });
    els.clearSearchBtn?.addEventListener('click', () => {
      if (els.searchInput) els.searchInput.value = '';
      if (els.searchResultsGrid) els.searchResultsGrid.innerHTML = '';
      els.searchInput?.focus();
    });
    document.getElementById('clearSearchHistoryBtn')?.addEventListener('click', () => { if (typeof api.clearSearchHistory === 'function') api.clearSearchHistory(); renderSearchHistory(); });
    els.libFavTab?.addEventListener('click', () => { state.libraryTab = 'favorites'; renderLibrary(); });
    els.libHistTab?.addEventListener('click', () => { state.libraryTab = 'history'; renderLibrary(); });
    els.clearCurrentLibBtn?.addEventListener('click', () => {
      if (state.libraryTab === 'favorites') {
        try { window.localStorage.removeItem('rosi_cinema_favorites_v1'); } catch (_) {}
        showToast('Đã xóa danh sách yêu thích');
      } else {
        if (typeof api.clearWatchHistory === 'function') api.clearWatchHistory();
        renderContinueWatching();
        showToast('Đã xóa lịch sử xem');
      }
      renderLibrary();
    });
    document.getElementById('closeDetailBtn')?.addEventListener('click', closeDetailModal);
    els.detailModal?.addEventListener('click', (ev) => { if (ev.target === els.detailModal) closeDetailModal(); });
    els.qualityList?.addEventListener('click', (ev) => {
      const c = ev.target.closest('.chip'); if (!c?.dataset.quality) return;
      applyQualityToHlsAndVideo(c.dataset.quality);
      showToast(QUALITY_LABELS[c.dataset.quality] || c.dataset.quality);
    });
    document.getElementById('closePlayerBtn')?.addEventListener('click', closePlayer);
    document.getElementById('toggleOrientationBtn')?.addEventListener('click', () => (els.playerModal?.classList.contains('is-landscape-mode') ? restorePortraitOrientation() : activateAutoLandscapeFullscreen()));
    document.getElementById('exitLandscapeBtn')?.addEventListener('click', (ev) => { ev.stopPropagation(); restorePortraitOrientation(); });
    document.getElementById('rewind10Btn')?.addEventListener('click', () => seekBy(-10));
    document.getElementById('forward10Btn')?.addEventListener('click', () => seekBy(10));
    document.getElementById('aspectRatioBtn')?.addEventListener('click', cycleAspectRatio);
    document.getElementById('hudQualityCycleBtn')?.addEventListener('click', cycleQualityQuick);
    document.getElementById('prevEpBtn')?.addEventListener('click', () => stepEpisode(-1));
    document.getElementById('nextEpBtn')?.addEventListener('click', () => stepEpisode(1));
    els.hudPlayPauseBtn?.addEventListener('click', () => {
      const vid = els.videoElement;
      if (!vid || vid.classList.contains('hidden')) return;
      if (vid.paused) vid.play().catch(() => {}); else vid.pause();
      syncTimelineUi();
    });
    els.hudMuteBtn?.addEventListener('click', () => {
      const vid = els.videoElement;
      if (!vid) return;
      vid.muted = !vid.muted;
      els.hudMuteBtn.textContent = vid.muted ? '🔇' : '🔊';
    });
    els.hudSeekSlider?.addEventListener('input', () => {
      const vid = els.videoElement;
      if (!vid || !Number.isFinite(vid.duration) || vid.duration <= 0) return;
      vid.currentTime = (Number(els.hudSeekSlider.value) / 1000) * vid.duration;
      syncTimelineUi();
    });
    els.videoElement?.addEventListener('timeupdate', syncTimelineUi);
    els.videoElement?.addEventListener('play', () => { syncTimelineUi(); showHudAndScheduleHide(); });
    els.videoElement?.addEventListener('pause', () => { syncTimelineUi(); clearHudHideTimer(); els.playerStage?.classList.remove('hud-hidden'); });
    els.videoElement?.addEventListener('ended', () => {
      syncTimelineUi();
      clearHudHideTimer();
      els.playerStage?.classList.remove('hud-hidden');
      const eps = state.player.episodes || [];
      const curIdx = eps.findIndex((ep) => String(ep.num) === String(state.player.episodeNum));
      if (curIdx >= 0 && curIdx + 1 < eps.length) {
        showToast('Đang chuyển sang tập tiếp theo...');
        setTimeout(() => {
          if (els.playerModal && !els.playerModal.classList.contains('hidden')) {
            openPlayer(state.player.slug, eps[curIdx + 1].num, state.player);
          }
        }, 1200);
      }
    });
    els.videoViewportBox?.addEventListener('click', (ev) => {
      if (ev.target.closest('button, input')) {
        showHudAndScheduleHide();
        return;
      }
      if (els.playerStage?.classList.contains('hud-hidden')) {
        showHudAndScheduleHide();
      } else {
        clearHudHideTimer();
        els.playerStage?.classList.add('hud-hidden');
      }
    });
    ['#playerTopHud', '#playerBottomHud'].forEach((sel) => {
      const hudEl = document.querySelector(sel);
      hudEl?.addEventListener('pointerdown', showHudAndScheduleHide, { passive: true });
      hudEl?.addEventListener('touchstart', showHudAndScheduleHide, { passive: true });
    });
    const onOrient = () => {
      orientationGuardUntil = Date.now() + 1800;
      const open = els.playerModal && !els.playerModal.classList.contains('hidden');
      const vid = els.videoElement;
      if (!open) { lockPortraitWhenIdle(); return; }
      syncCssLandscapeFallback();
      if (vid && !vid.classList.contains('hidden') && vid.paused && !vid.ended) {
        setTimeout(() => { if (!vid.ended && els.playerModal && !els.playerModal.classList.contains('hidden')) vid.play().catch(() => {}); }, 140);
      }
    };
    window.addEventListener('orientationchange', onOrient);
    window.addEventListener('resize', onOrient);
    window.addEventListener('offline', () => {
      showToast('Mất kết nối mạng — đang dùng dữ liệu bộ nhớ đệm');
    });
    window.addEventListener('online', () => {
      showToast('Đã kết nối mạng trở lại');
      if (state.activeTab === 'tab-home' && els.latestGrid && els.latestGrid.children.length === 0) {
        loadHome();
      }
    });
    window.addEventListener('unhandledrejection', (ev) => {
      if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
    });
    window.addEventListener('error', (ev) => {
      if (ev && ev.target && ev.target.tagName === 'IMG') {
        handleImgFallback(ev.target);
      }
    }, true);
    window.addEventListener('keydown', (ev) => {
      if (!ev) return;
      const isPlayerOpen = els.playerModal && !els.playerModal.classList.contains('hidden');
      const isDetailOpen = els.detailModal && !els.detailModal.classList.contains('hidden');
      if (ev.key === 'Escape') {
        if (isPlayerOpen) { ev.preventDefault(); closePlayer(); }
        else if (isDetailOpen) { ev.preventDefault(); closeDetailModal(); }
        return;
      }
      if (isPlayerOpen && document.activeElement !== els.searchInput) {
        if (ev.code === 'Space') {
          const vid = els.videoElement;
          if (vid && !vid.classList.contains('hidden')) {
            ev.preventDefault();
            if (vid.paused) vid.play().catch(() => {}); else vid.pause();
            syncTimelineUi();
          }
        } else if (ev.key === 'ArrowLeft') {
          ev.preventDefault();
          seekBy(-10);
        } else if (ev.key === 'ArrowRight') {
          ev.preventDefault();
          seekBy(10);
        }
      }
    });
  }
  document.addEventListener('DOMContentLoaded', async () => {
    cacheElements(); applyFitMode(0); syncBackgroundScrollLock(); bindEvents(); await lockPortraitWhenIdle(); loadHome();
  });
})();
