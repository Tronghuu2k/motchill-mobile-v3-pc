(function () {
  let hlsInstance = null;
  let currentMovie = null;
  let latestHomeData = null;
  let isLandscapeMode = false;

  const mainView = () => document.getElementById('main-view');
  const detailModal = () => document.getElementById('detail-modal');

  function setActiveTab(tab) {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('text-[#E50914]', active);
      btn.classList.toggle('text-zinc-400', !active);
      const pill = btn.querySelector('.nav-pill');
      if (pill) {
        pill.classList.toggle('bg-[#E50914]/20', active);
        pill.classList.toggle('scale-105', active);
      }
    });
  }

  function renderHomeSkeleton() {
    return `
      <div class="animate-screen">
        <div class="w-full h-[460px] skeleton-box"></div>
        <div class="px-4 mt-5 space-y-6">
          <div>
            <div class="h-4 w-48 rounded-full skeleton-box mb-3"></div>
            <div class="flex gap-3 overflow-hidden">
              ${Array.from({ length: 4 }).map(() => `<div class="w-32 flex-shrink-0 aspect-[2/3] rounded-xl skeleton-box"></div>`).join('')}
            </div>
          </div>
          <div>
            <div class="h-4 w-40 rounded-full skeleton-box mb-3"></div>
            <div class="flex gap-3 overflow-hidden">
              ${Array.from({ length: 4 }).map(() => `<div class="w-32 flex-shrink-0 aspect-[2/3] rounded-xl skeleton-box"></div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function renderHome(force = false) {
    setActiveTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mainView().innerHTML = renderHomeSkeleton();

    try {
      const data = await window.movieApi.getHome(force);
      latestHomeData = data;

      const badgeEl = document.getElementById('daily-nav-badge');
      if (badgeEl && data.dailyMovies?.length > 0) {
        badgeEl.textContent = data.dailyMovies.length > 99 ? '99+' : data.dailyMovies.length;
        badgeEl.classList.remove('hidden');
      }

      if (data.favUpdates?.length > 0) {
        const first = data.favUpdates[0];
        window.showToast(`🔔 "${first.title}" vừa cập nhật ${first.newEp}!`);
      }

      let html = '<div class="animate-screen">';

      // Netflix-style Billboard Hero
      if (data.hero) {
        html += `
          <div class="relative w-full aspect-[4/5] md:aspect-[16/8] max-h-[490px] overflow-hidden bg-zinc-950">
            <img src="${data.hero.poster}" class="w-full h-full object-cover scale-105" onerror="this.onerror=null; this.src='assets/placeholder.svg';" />
            <div class="absolute inset-0 bg-gradient-to-t from-[#0b0b0f] via-[#0b0b0f]/45 to-black/30"></div>
            <div class="absolute inset-0 bg-gradient-to-r from-[#0b0b0f]/85 via-transparent to-transparent"></div>
            <div class="absolute bottom-5 left-4 right-4 md:max-w-xl">
              <div class="flex items-center gap-2 mb-2">
                <span class="bg-[#E50914] text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow">
                  R SERIES • TOP 1
                </span>
                <span class="text-emerald-400 text-[11px] font-extrabold">99% Phù hợp</span>
                <span class="text-zinc-300 text-[11px] font-bold border border-white/20 px-1.5 rounded">
                  ${data.hero.year || '2026'}
                </span>
              </div>
              <h2 class="text-2xl md:text-4xl font-black text-white line-clamp-2 leading-tight tracking-tight drop-shadow-lg">${data.hero.title}</h2>
              <p class="text-xs text-zinc-300 mt-1.5 line-clamp-1 font-medium">${data.hero.genre || 'Phim Tuyển Chọn'} • ${data.hero.status || 'FHD'}</p>
              <div class="flex gap-2.5 mt-4">
                <button tabindex="0" onclick="window.appRouter.openDetail('${data.hero.slug}', true)"
                        class="tv-focusable flex-1 bg-white hover:bg-zinc-200 active:scale-95 transition text-black font-black text-xs py-3.5 rounded-xl shadow-xl flex items-center justify-center gap-2">
                  <span>▶</span> <span>Phát Ngay</span>
                </button>
                <button tabindex="0" onclick="window.appRouter.openDetail('${data.hero.slug}')"
                        class="tv-focusable flex-1 bg-zinc-800/85 hover:bg-zinc-700 active:scale-95 transition text-white font-bold text-xs py-3.5 rounded-xl border border-white/15 flex items-center justify-center gap-1.5">
                  <span>ⓘ</span> <span>Thông Tin</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }

      for (const sec of data.sections) {
        html += `
          <section class="mt-6 px-4">
            <div class="flex items-center justify-between mb-2.5">
              <h3 class="text-sm md:text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                <span>${sec.icon}</span>
                <span>${sec.title}</span>
              </h3>
              <button tabindex="0" onclick="window.appRouter.openCategory('danh-sach', '${sec.id}', '${sec.title}')"
                      class="tv-focusable text-xs font-bold text-zinc-400 hover:text-white px-2 py-1 rounded-lg">
                Xem thêm ›
              </button>
            </div>
            <div class="flex gap-3 overflow-x-auto no-scrollbar py-1 px-0.5">
              ${sec.items.map(it => window.renderMovieCard(it, false)).join('')}
            </div>
          </section>
        `;
      }

      html += '</div>';
      mainView().innerHTML = html;
    } catch (err) {
      mainView().innerHTML = `
        <div class="p-8 text-center space-y-3 animate-screen">
          <div class="text-3xl">📡</div>
          <p class="text-red-400 text-sm font-medium">${err.message}</p>
          <button tabindex="0" onclick="window.appRouter.renderHome(true)" class="tv-focusable px-5 py-2.5 bg-[#E50914] rounded-xl text-xs font-bold">
            Thử lại ngay
          </button>
        </div>
      `;
    }
  }

  async function renderDailyUpdates(force = false) {
    setActiveTab('daily');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mainView().innerHTML = `<div class="p-4 grid grid-cols-3 md:grid-cols-6 gap-3">${window.renderSkeletonGrid(12)}</div>`;

    try {
      const data = (!force && latestHomeData) ? latestHomeData : await window.movieApi.getHome(force);
      latestHomeData = data;
      const items = data.dailyMovies || [];

      mainView().innerHTML = `
        <div class="p-4 animate-screen">
          <div class="bg-gradient-to-r from-[#E50914]/25 via-zinc-900 to-zinc-900 border border-[#E50914]/30 rounded-2xl p-4 mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-black text-white">🔥 Phim Mới Cập Nhật Hôm Nay</h2>
              <p class="text-[11px] text-zinc-400 mt-1">Tự động đồng bộ ngày ${data.syncedDate} • ${items.length} phim mới</p>
            </div>
            <button tabindex="0" onclick="window.appRouter.renderDailyUpdates(true); window.showToast('Đang quét phim mới...')"
                    class="tv-focusable px-3.5 py-2 bg-[#E50914] text-white rounded-xl text-xs font-bold shadow active:scale-95 transition">
              🔄 Quét mới
            </button>
          </div>
          <div class="grid grid-cols-3 md:grid-cols-6 gap-3">
            ${items.map(it => window.renderMovieCard(it, true)).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      mainView().innerHTML = `<div class="p-8 text-center text-xs text-red-400">${err.message}</div>`;
    }
  }

  async function renderExplore() {
    setActiveTab('explore');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const categories = [
      { type: 'danh-sach', slug: 'phim-bo', label: '📺 Phim Bộ' },
      { type: 'danh-sach', slug: 'phim-le', label: '🎬 Phim Lẻ' },
      { type: 'danh-sach', slug: 'hoat-hinh', label: '✨ Hoạt Hình' },
      { type: 'the-loai', slug: 'hanh-dong', label: '⚔️ Hành Động' },
      { type: 'the-loai', slug: 'tinh-cam', label: '💘 Tình Cảm' },
      { type: 'the-loai', slug: 'kinh-di', label: '👻 Kinh Dị' },
      { type: 'quoc-gia', slug: 'han-quoc', label: '🇰🇷 Hàn Quốc' },
      { type: 'quoc-gia', slug: 'trung-quoc', label: '🇨🇳 Trung Quốc' },
      { type: 'quoc-gia', slug: 'au-my', label: '🇺🇸 Âu Mỹ' }
    ];

    mainView().innerHTML = `
      <div class="p-4 animate-screen">
        <div class="relative">
          <input tabindex="0" id="search-input" type="search" placeholder="Tìm phim, series, diễn viên trên Rosi Cinema..."
                 class="tv-focusable w-full bg-zinc-900 border border-zinc-800 focus:border-[#E50914] rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition" />
        </div>

        <div class="flex gap-2 overflow-x-auto no-scrollbar mt-3.5 py-1">
          ${categories.map(c => `
            <button tabindex="0" onclick="window.appRouter.openCategory('${c.type}', '${c.slug}', '${c.label}')"
                    class="tv-focusable px-3.5 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 whitespace-nowrap active:scale-95 transition">
              ${c.label}
            </button>
          `).join('')}
        </div>

        <div id="explore-results" class="mt-4 grid grid-cols-3 md:grid-cols-6 gap-3"></div>
      </div>
    `;

    const input = document.getElementById('search-input');
    let timer = null;
    input.addEventListener('input', (e) => {
      clearTimeout(timer);
      const q = e.target.value.trim();
      timer = setTimeout(async () => {
        const box = document.getElementById('explore-results');
        if (!q) { box.innerHTML = ''; return; }
        box.innerHTML = window.renderSkeletonGrid(6);
        try {
          const items = await window.movieApi.search(q);
          box.innerHTML = items.length
            ? items.map(it => window.renderMovieCard(it, true)).join('')
            : `<div class="col-span-3 md:col-span-6 text-center text-xs text-zinc-500 py-8">Không tìm thấy phim nào khớp với "${q}"</div>`;
        } catch (err) {
          box.innerHTML = `<div class="col-span-3 md:col-span-6 text-center text-xs text-red-400 py-6">${err.message}</div>`;
        }
      }, 360);
    });
  }

  async function openCategory(type, slug, title, page = 1) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mainView().innerHTML = `
      <div class="p-4 animate-screen">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2.5">
            <button tabindex="0" onclick="window.appRouter.go('home')" class="tv-focusable w-9 h-9 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl text-sm">←</button>
            <h2 class="text-base font-extrabold text-white line-clamp-1">${title}</h2>
          </div>
          <span class="text-xs font-semibold text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 whitespace-nowrap">Trang ${page}</span>
        </div>
        <div id="cat-grid" class="grid grid-cols-3 md:grid-cols-6 gap-3">${window.renderSkeletonGrid(12)}</div>
        <div id="cat-pagination" class="flex justify-center gap-3 mt-6"></div>
      </div>
    `;
    try {
      const res = await window.movieApi.getCategory(type, slug, page);
      document.getElementById('cat-grid').innerHTML = res.items.map(it => window.renderMovieCard(it, true)).join('');
      const pagBox = document.getElementById('cat-pagination');
      pagBox.innerHTML = `
        ${page > 1 ? `<button tabindex="0" onclick="window.appRouter.openCategory('${type}', '${slug}', '${title}', ${page - 1})" class="tv-focusable px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold">← Trước</button>` : ''}
        ${res.hasNext ? `<button tabindex="0" onclick="window.appRouter.openCategory('${type}', '${slug}', '${title}', ${page + 1})" class="tv-focusable px-5 py-2.5 bg-[#E50914] rounded-xl text-xs font-bold shadow">Trang sau →</button>` : ''}
      `;
    } catch (err) {
      document.getElementById('cat-grid').innerHTML = `<div class="col-span-3 md:col-span-6 text-center text-xs text-red-400 py-6">${err.message}</div>`;
    }
  }

  function renderLibrary() {
    setActiveTab('library');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const favs = window.appStorage.getFavorites();
    const history = window.appStorage.getHistory();
    const lastSync = window.appStorage.getLastDailySyncDate() || 'Hôm nay';

    mainView().innerHTML = `
      <div class="p-4 space-y-5 animate-screen">
        <div class="bg-zinc-900/75 border border-white/10 rounded-2xl p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-extrabold text-white">🕒 Tiếp Tục Xem (${history.length})</h3>
            ${history.length ? `<button tabindex="0" onclick="window.appStorage.clearHistory(); window.showToast('Đã xóa lịch sử'); window.appRouter.go('library')" class="tv-focusable text-[11px] font-semibold text-red-400 px-2 py-1 rounded">Xóa hết</button>` : ''}
          </div>
          ${history.length
            ? `<div class="grid grid-cols-3 md:grid-cols-6 gap-3">${history.map(it => window.renderMovieCard({ ...it, badge: 'Tập ' + it.ep }, true)).join('')}</div>`
            : `<p class="text-xs text-zinc-500 py-2">Bạn chưa xem bộ phim nào gần đây.</p>`}
        </div>

        <div class="bg-zinc-900/75 border border-white/10 rounded-2xl p-4">
          <h3 class="text-sm font-extrabold text-white mb-3">❤️ Danh Sách Của Tôi (${favs.length})</h3>
          ${favs.length
            ? `<div class="grid grid-cols-3 md:grid-cols-6 gap-3">${favs.map(it => window.renderMovieCard(it, true)).join('')}</div>`
            : `<p class="text-xs text-zinc-500 py-2">Nhấn "+ Danh sách" ở trang phim để lưu và tự động nhận thông báo tập mới.</p>`}
        </div>

        <div class="bg-zinc-900/75 border border-white/10 rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-extrabold text-white">📺 Rosi Cinema • Phone & Android TV Box</h3>
              <p class="text-[11px] text-zinc-400 mt-0.5">Đồng bộ gần nhất: ${lastSync} • Hỗ trợ Remote D-Pad & Nhấp đúp tua 10s</p>
            </div>
            <span class="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">READY</span>
          </div>
          <button tabindex="0" onclick="window.movieApi.clearCache(); window.showToast('Đang đồng bộ kho phim Rosi Cinema...'); window.appRouter.renderHome(true)"
                  class="tv-focusable w-full py-3 bg-[#E50914] rounded-xl text-xs font-extrabold text-white shadow active:scale-95 transition">
            ⚡ Cập Nhật Phim Mới Ngay Bây Giờ
          </button>
        </div>
      </div>
    `;
  }

  function applyAspectMode(mode) {
    const stage = document.getElementById('player-stage');
    if (!stage) return;
    stage.classList.remove('aspect-16-9', 'aspect-4-3', 'aspect-21-9', 'aspect-fill', 'aspect-stretch');
    const map = {
      '16:9': 'aspect-16-9',
      '4:3': 'aspect-4-3',
      '21:9': 'aspect-21-9',
      'fill': 'aspect-fill',
      'stretch': 'aspect-stretch'
    };
    stage.classList.add(map[mode] || 'aspect-16-9');
    window.appStorage.setAspectMode(mode);

    document.querySelectorAll('.aspect-btn').forEach(btn => {
      const active = btn.dataset.aspect === mode;
      btn.classList.toggle('bg-[#E50914]', active);
      btn.classList.toggle('text-white', active);
      btn.classList.toggle('border-[#E50914]', active);
      btn.classList.toggle('bg-zinc-900', !active);
      btn.classList.toggle('text-zinc-300', !active);
      btn.classList.toggle('border-zinc-800', !active);
    });
  }

  async function toggleLandscapeWatch() {
    const stage = document.getElementById('player-stage');
    const rotateBtn = document.getElementById('rotate-watch-btn');
    if (!stage) return;

    isLandscapeMode = !isLandscapeMode;
    stage.classList.toggle('landscape-player', isLandscapeMode);

    if (rotateBtn) {
      rotateBtn.innerHTML = isLandscapeMode ? '📱 Thu nhỏ dọc' : '🔄 Xoay ngang toàn màn hình';
    }

    try {
      if (window.Capacitor?.Plugins?.ScreenOrientation) {
        await window.Capacitor.Plugins.ScreenOrientation.lock({
          orientation: isLandscapeMode ? 'landscape' : 'portrait'
        });
      } else if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock(isLandscapeMode ? 'landscape' : 'portrait');
      }
    } catch (e) {}

    window.showToast(isLandscapeMode ? 'Đã bật chế độ Xoay Ngang Toàn Màn Hình' : 'Đã quay về màn hình dọc');
  }

  function seekVideoBy(deltaSeconds) {
    const video = document.getElementById('hls-video');
    if (!video || isNaN(video.duration)) {
      window.showToast('Chế độ dự phòng không hỗ trợ tua nhanh');
      return;
    }
    const target = Math.max(0, Math.min(video.duration, video.currentTime + deltaSeconds));
    video.currentTime = target;
    showSeekOverlay(deltaSeconds);
  }

  function showSeekOverlay(deltaSeconds) {
    const stage = document.getElementById('player-stage');
    if (!stage) return;
    const existing = document.getElementById('seek-feedback-badge');
    if (existing) existing.remove();

    const isForward = deltaSeconds > 0;
    const badge = document.createElement('div');
    badge.id = 'seek-feedback-badge';
    badge.className = `seek-badge-anim absolute top-1/2 -translate-y-1/2 ${isForward ? 'right-8' : 'left-8'} z-40 glass-bar text-white text-xs font-black px-4 py-2.5 rounded-full border border-white/20 shadow-2xl pointer-events-none`;
    badge.textContent = isForward ? `⏩ +${deltaSeconds}s` : `⏪ ${deltaSeconds}s`;
    stage.appendChild(badge);

    setTimeout(() => badge.remove(), 680);
  }

  function attachDoubleTapGestures() {
    const leftZone = document.getElementById('tap-zone-left');
    const rightZone = document.getElementById('tap-zone-right');
    let lastTapLeft = 0;
    let lastTapRight = 0;

    if (leftZone) {
      leftZone.addEventListener('click', () => {
        const now = Date.now();
        if (now - lastTapLeft < 320) {
          seekVideoBy(-10);
          lastTapLeft = 0;
        } else {
          lastTapLeft = now;
        }
      });
    }

    if (rightZone) {
      rightZone.addEventListener('click', () => {
        const now = Date.now();
        if (now - lastTapRight < 320) {
          seekVideoBy(10);
          lastTapRight = 0;
        } else {
          lastTapRight = now;
        }
      });
    }
  }

  function setQualityLevel(levelIndex) {
    if (!hlsInstance) {
      window.showToast('Nguồn dự phòng không hỗ trợ đổi độ phân giải');
      return;
    }
    hlsInstance.currentLevel = levelIndex;
    document.querySelectorAll('.quality-btn').forEach(btn => {
      const active = parseInt(btn.dataset.qlevel, 10) === levelIndex;
      btn.classList.toggle('bg-emerald-500', active);
      btn.classList.toggle('text-zinc-950', active);
      btn.classList.toggle('border-emerald-400', active);
      btn.classList.toggle('bg-zinc-900', !active);
      btn.classList.toggle('text-zinc-300', !active);
      btn.classList.toggle('border-zinc-800', !active);
    });
    const label = levelIndex === -1 ? 'Tự động (Auto)' : (hlsInstance.levels?.[levelIndex]?.height ? `${hlsInstance.levels[levelIndex].height}p` : `Mức ${levelIndex + 1}`);
    window.showToast(`Chất lượng phát: ${label}`);
  }

  function renderQualityControls(levels = []) {
    const qBar = document.getElementById('quality-bar');
    if (!qBar) return;
    if (!levels || levels.length === 0) {
      qBar.innerHTML = `<span class="text-[11px] font-semibold text-zinc-400 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">Auto HD</span>`;
      return;
    }
    const buttons = [
      `<button tabindex="0" data-qlevel="-1" onclick="window.appRouter.setQuality(-1)" class="tv-focusable quality-btn px-2.5 py-1 rounded-lg text-[11px] font-extrabold border bg-emerald-500 text-zinc-950 border-emerald-400 active:scale-95 transition">Auto</button>`
    ];
    levels.forEach((lvl, idx) => {
      const heightLabel = lvl.height ? `${lvl.height}p` : `HD ${idx + 1}`;
      buttons.push(
        `<button tabindex="0" data-qlevel="${idx}" onclick="window.appRouter.setQuality(${idx})" class="tv-focusable quality-btn px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-zinc-900 text-zinc-300 border-zinc-800 active:scale-95 transition">${heightLabel}</button>`
      );
    });
    qBar.innerHTML = buttons.join('');
  }

  async function openDetail(slug, autoPlay = false) {
    isLandscapeMode = false;
    const modal = detailModal();
    modal.classList.remove('hidden');
    modal.innerHTML = `
      <div class="flex flex-col h-full bg-[#0b0b0f] animate-modal">
        <div class="w-full aspect-video skeleton-box"></div>
        <div class="p-4 space-y-3">
          <div class="h-6 w-3/4 rounded-full skeleton-box"></div>
          <div class="h-3 w-1/2 rounded-full skeleton-box"></div>
          <div class="grid grid-cols-5 gap-2 pt-3">
            ${Array.from({ length: 10 }).map(() => `<div class="h-9 rounded-xl skeleton-box"></div>`).join('')}
          </div>
        </div>
      </div>
    `;

    try {
      const movie = await window.movieApi.getMovieDetail(slug);
      currentMovie = movie;
      const isFav = window.appStorage.isFavorite(slug);
      const savedAspect = window.appStorage.getAspectMode();

      const aspectModes = [
        { id: '16:9', label: '16:9 Chuẩn' },
        { id: 'fill', label: 'Zoom Đầy' },
        { id: 'stretch', label: 'Kéo Giãn' },
        { id: '21:9', label: '21:9 Rạp' },
        { id: '4:3', label: '4:3 Cổ Điển' }
      ];

      modal.innerHTML = `
        <div class="flex flex-col h-full bg-[#0b0b0f] animate-modal">
          <div class="sticky top-0 z-20 bg-black w-full border-b border-zinc-800/90 shadow-2xl">
            <div id="player-stage" class="w-full aspect-16-9 relative overflow-hidden bg-black transition-all duration-200">
              <div id="player-container" class="w-full h-full flex items-center justify-center relative overflow-hidden">
                <img src="${movie.backdrop}" class="w-full h-full object-cover opacity-45" onerror="this.onerror=null; this.src='assets/placeholder.svg';" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/45"></div>
                <button tabindex="0" onclick="window.appRouter.playEpisode('${movie.slug}', '${movie.episodes[0].number}')"
                        class="tv-focusable relative z-20 bg-[#E50914] text-white font-black text-xs px-6 py-3 rounded-full shadow-xl shadow-red-600/40 active:scale-95 transition flex items-center gap-1.5">
                  <span>▶</span> <span>Phát ${movie.episodes[0].name}</span>
                </button>
              </div>

              <!-- Double-Tap Left/Right Seek Zones (Mobile) -->
              <div id="tap-zone-left" class="absolute inset-y-12 left-0 w-1/3 z-10"></div>
              <div id="tap-zone-right" class="absolute inset-y-12 right-0 w-1/3 z-10"></div>

              <!-- Top Floating Player Actions: Close + Landscape Rotate -->
              <div class="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
                <button tabindex="0" onclick="window.appRouter.closeDetail()"
                        class="tv-focusable pointer-events-auto glass-bar text-white text-xs font-bold px-3.5 py-1.5 rounded-full border border-white/15 active:scale-95 transition">
                  ✕ Đóng
                </button>
                <button tabindex="0" id="rotate-watch-btn" onclick="window.appRouter.toggleLandscape()"
                        class="tv-focusable pointer-events-auto glass-bar text-white text-xs font-bold px-3.5 py-1.5 rounded-full border border-white/15 active:scale-95 transition">
                  🔄 Xoay ngang toàn màn hình
                </button>
              </div>
            </div>

            <!-- Player Controls: Seek Buttons, Quality & Screen Aspect Ratio -->
            <div class="bg-[#0b0b0f] border-t border-white/10 px-3 py-2 space-y-2">
              <div class="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                <div class="flex items-center gap-1.5">
                  <button tabindex="0" onclick="window.appRouter.seekBy(-10)" class="tv-focusable px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-200 active:scale-95">⏪ -10s</button>
                  <button tabindex="0" onclick="window.appRouter.seekBy(10)" class="tv-focusable px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-200 active:scale-95">⏩ +10s</button>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-extrabold text-zinc-400 uppercase whitespace-nowrap">🎬 Chất lượng:</span>
                  <div id="quality-bar" class="flex items-center gap-1.5">
                    <span class="text-[11px] font-semibold text-zinc-400 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">Auto HD</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span class="text-[10px] font-extrabold text-zinc-400 uppercase whitespace-nowrap">📐 Tỉ lệ khung:</span>
                <div class="flex items-center gap-1.5">
                  ${aspectModes.map(m => `
                    <button tabindex="0" data-aspect="${m.id}" onclick="window.appRouter.setAspect('${m.id}')"
                            class="tv-focusable aspect-btn px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap border active:scale-95 transition ${savedAspect === m.id ? 'bg-[#E50914] text-white border-[#E50914]' : 'bg-zinc-900 text-zinc-300 border-zinc-800'}">
                      ${m.label}
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 pb-14 space-y-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h1 class="text-lg font-black text-white leading-snug">${movie.title}</h1>
                <p class="text-xs text-zinc-400 mt-0.5">${movie.originalTitle || movie.genre} • ${movie.year}</p>
              </div>
              <button tabindex="0" id="fav-btn" onclick="window.appRouter.toggleFav()"
                      class="tv-focusable px-3.5 py-2 rounded-xl text-xs font-bold border whitespace-nowrap active:scale-95 transition ${isFav ? 'bg-[#E50914]/20 border-[#E50914] text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-200'}">
                ${isFav ? '✓ Đã thêm' : '+ Danh sách'}
              </button>
            </div>

            <div class="flex flex-wrap gap-1.5 text-[11px] font-semibold text-zinc-300">
              <span class="bg-[#E50914]/15 text-red-300 border border-[#E50914]/30 px-2.5 py-1 rounded-full">${movie.status}</span>
              <span class="bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">${movie.country}</span>
              <span class="bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">${movie.duration}</span>
              <span class="bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full text-zinc-400">Nhấp 2 lần trái/phải video để tua 10s</span>
            </div>

            <div id="server-bar" class="flex gap-2 overflow-x-auto no-scrollbar"></div>

            <div class="bg-zinc-900/65 border border-white/10 rounded-2xl p-3.5">
              <div class="flex items-center justify-between mb-2.5">
                <h3 class="text-xs font-extrabold text-zinc-200 uppercase tracking-wider">Danh Sách Tập (${movie.episodes.length})</h3>
                <span id="now-playing-label" class="text-[11px] font-semibold text-[#E50914]"></span>
              </div>
              <div class="grid grid-cols-5 md:grid-cols-10 gap-2 max-h-48 overflow-y-auto pr-1">
                ${movie.episodes.map(ep => `
                  <button tabindex="0" data-ep="${ep.number}" onclick="window.appRouter.playEpisode('${movie.slug}', '${ep.number}')"
                          class="tv-focusable ep-btn py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-bold text-zinc-200 active:scale-95 transition">
                    ${ep.number}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="bg-zinc-900/65 border border-white/10 rounded-2xl p-3.5">
              <h3 class="text-xs font-extrabold text-zinc-200 uppercase tracking-wider mb-1.5">Tóm Tắt Nội Dung</h3>
              <p class="text-xs text-zinc-400 leading-relaxed">${movie.description}</p>
            </div>
          </div>
        </div>
      `;

      applyAspectMode(savedAspect);
      attachDoubleTapGestures();

      if (autoPlay && movie.episodes.length > 0) {
        playEpisode(movie.slug, movie.episodes[0].number);
      }
    } catch (err) {
      modal.innerHTML = `
        <div class="p-8 text-center space-y-3 animate-modal">
          <p class="text-red-400 text-sm">${err.message}</p>
          <button tabindex="0" onclick="window.appRouter.closeDetail()" class="tv-focusable px-5 py-2.5 bg-zinc-800 rounded-xl text-xs font-bold">Quay lại</button>
        </div>
      `;
    }
  }

  async function playEpisode(slug, epNum) {
    const container = document.getElementById('player-container');
    const serverBar = document.getElementById('server-bar');
    const nowLabel = document.getElementById('now-playing-label');
    if (!container) return;

    if (nowLabel) nowLabel.textContent = `Đang phát: Tập ${epNum}`;

    document.querySelectorAll('.ep-btn').forEach(b => {
      const isCur = b.dataset.ep === String(epNum);
      b.classList.toggle('bg-[#E50914]', isCur);
      b.classList.toggle('text-white', isCur);
      b.classList.toggle('border-[#E50914]', isCur);
    });

    container.innerHTML = `
      <div class="flex flex-col items-center gap-2 text-xs text-zinc-300">
        <div class="w-7 h-7 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin"></div>
        <span>Đang tải luồng phát Tập ${epNum}...</span>
      </div>
    `;

    try {
      const streamData = await window.movieApi.getStream(slug, epNum);
      if (currentMovie) window.appStorage.saveHistory(currentMovie, epNum);

      serverBar.innerHTML = streamData.sources.map((src, idx) => `
        <button tabindex="0" onclick="window.appRouter.switchSource(${idx})"
                class="tv-focusable src-btn px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border active:scale-95 transition ${idx === 0 ? 'bg-[#E50914] border-[#E50914] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}">
          ${src.label}
        </button>
      `).join('');

      window._currentSources = streamData.sources;
      window._currentEp = epNum;
      switchSource(0);
    } catch (err) {
      container.innerHTML = `<div class="text-xs text-red-400 px-4 text-center font-medium">${err.message}</div>`;
    }
  }

  function switchSource(idx) {
    const src = window._currentSources?.[idx];
    const container = document.getElementById('player-container');
    if (!src || !container) return;

    document.querySelectorAll('.src-btn').forEach((b, i) => {
      b.classList.toggle('bg-[#E50914]', i === idx);
      b.classList.toggle('text-white', i === idx);
      b.classList.toggle('border-[#E50914]', i === idx);
    });

    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    if (src.isHls) {
      container.innerHTML = `<video id="hls-video" controls autoplay playsinline class="w-full h-full bg-black"></video>`;
      const video = document.getElementById('hls-video');
      const savedSec = currentMovie ? window.appStorage.getProgress(currentMovie.slug, window._currentEp) : 0;

      const resumeIfSaved = () => {
        if (savedSec > 5 && video.duration > savedSec + 10) {
          video.currentTime = savedSec;
          window.showToast(`Tiếp tục xem từ ${Math.floor(savedSec / 60)}:${String(savedSec % 60).padStart(2, '0')}`);
        }
      };

      video.addEventListener('timeupdate', () => {
        if (currentMovie && Math.floor(video.currentTime) % 5 === 0) {
          window.appStorage.saveProgress(currentMovie.slug, window._currentEp, video.currentTime);
        }
      });

      video.addEventListener('ended', () => {
        if (!currentMovie?.episodes?.length) return;
        const idxEp = currentMovie.episodes.findIndex(e => String(e.number) === String(window._currentEp));
        if (idxEp > -1 && idxEp + 1 < currentMovie.episodes.length) {
          const nextEp = currentMovie.episodes[idxEp + 1].number;
          window.showToast(`Tự động chuyển sang Tập ${nextEp}...`);
          playEpisode(currentMovie.slug, nextEp);
        }
      });

      if (window.Hls && window.Hls.isSupported()) {
        hlsInstance = new window.Hls({ enableWorker: true, lowLatencyMode: false });
        hlsInstance.loadSource(src.url);
        hlsInstance.attachMedia(video);
        hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, (_, data) => {
          renderQualityControls(data?.levels || hlsInstance.levels || []);
          resumeIfSaved();
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src.url;
        renderQualityControls([]);
        video.addEventListener('loadedmetadata', resumeIfSaved, { once: true });
      }
    } else {
      renderQualityControls([]);
      container.innerHTML = `<iframe src="${src.url}" allowfullscreen allow="autoplay; fullscreen" class="w-full h-full border-0"></iframe>`;
    }
  }

  async function closeDetail() {
    if (isLandscapeMode) {
      isLandscapeMode = false;
      try {
        if (window.Capacitor?.Plugins?.ScreenOrientation) {
          await window.Capacitor.Plugins.ScreenOrientation.lock({ orientation: 'portrait' });
        }
      } catch (e) {}
    }
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    const modal = detailModal();
    modal.innerHTML = '';
    modal.classList.add('hidden');
  }

  function toggleFav() {
    if (!currentMovie) return;
    const saved = window.appStorage.toggleFavorite(currentMovie);
    window.showToast(saved ? 'Đã thêm vào Danh sách của tôi' : 'Đã gỡ khỏi Danh sách');
    const btn = document.getElementById('fav-btn');
    if (btn) {
      btn.textContent = saved ? '✓ Đã thêm' : '+ Danh sách';
      btn.className = `tv-focusable px-3.5 py-2 rounded-xl text-xs font-bold border whitespace-nowrap active:scale-95 transition ${saved ? 'bg-[#E50914]/20 border-[#E50914] text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-200'}`;
    }
  }

  // Android TV Box Remote D-Pad Arrow Navigation & Video Seek
  function initTvRemoteNavigation() {
    document.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isTyping = activeTag === 'input' || activeTag === 'textarea';
      if (isTyping) return;

      const modalOpen = !detailModal().classList.contains('hidden');
      const video = document.getElementById('hls-video');

      // When watching in landscape or focused directly on video, Left/Right arrows seek 10s
      if (modalOpen && video && (isLandscapeMode || document.activeElement === video)) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          seekVideoBy(-10);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          seekVideoBy(10);
          return;
        }
        if (e.key === 'Enter' || e.key === 'MediaPlayPause') {
          e.preventDefault();
          if (video.paused) video.play();
          else video.pause();
          return;
        }
      }

      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') {
        if (isLandscapeMode) {
          e.preventDefault();
          toggleLandscapeWatch();
          return;
        }
        if (modalOpen) {
          e.preventDefault();
          closeDetail();
          return;
        }
      }

      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

      const scope = modalOpen ? detailModal() : document.body;
      const focusables = Array.from(scope.querySelectorAll('[tabindex="0"], button, input')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && !el.disabled;
      });

      if (focusables.length === 0) return;

      const current = document.activeElement;
      if (!current || !focusables.includes(current)) {
        e.preventDefault();
        focusables[0].focus();
        return;
      }

      const curRect = current.getBoundingClientRect();
      const curCx = curRect.left + curRect.width / 2;
      const curCy = curRect.top + curRect.height / 2;

      let bestCandidate = null;
      let bestScore = Infinity;

      for (const el of focusables) {
        if (el === current) continue;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = cx - curCx;
        const dy = cy - curCy;

        let validDir = false;
        let primaryDist = 0;
        let crossDist = 0;

        if (e.key === 'ArrowRight' && dx > 12) {
          validDir = true; primaryDist = dx; crossDist = Math.abs(dy);
        } else if (e.key === 'ArrowLeft' && dx < -12) {
          validDir = true; primaryDist = -dx; crossDist = Math.abs(dy);
        } else if (e.key === 'ArrowDown' && dy > 12) {
          validDir = true; primaryDist = dy; crossDist = Math.abs(dx);
        } else if (e.key === 'ArrowUp' && dy < -12) {
          validDir = true; primaryDist = -dy; crossDist = Math.abs(dx);
        }

        if (validDir) {
          const score = primaryDist + crossDist * 2.5;
          if (score < bestScore) {
            bestScore = score;
            bestCandidate = el;
          }
        }
      }

      if (bestCandidate) {
        e.preventDefault();
        bestCandidate.focus();
        bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
  }

  window.appRouter = {
    go(tab) {
      if (tab === 'home') renderHome();
      else if (tab === 'daily') renderDailyUpdates();
      else if (tab === 'explore') renderExplore();
      else if (tab === 'library') renderLibrary();
    },
    renderHome,
    renderDailyUpdates,
    openCategory,
    openDetail,
    closeDetail,
    playEpisode,
    switchSource,
    setQuality: setQualityLevel,
    setAspect: applyAspectMode,
    toggleLandscape: toggleLandscapeWatch,
    seekBy: seekVideoBy,
    toggleFav
  };

  document.addEventListener('DOMContentLoaded', () => {
    initTvRemoteNavigation();
    if (window.Capacitor?.Plugins?.App) {
      window.Capacitor.Plugins.App.addListener('backButton', () => {
        if (isLandscapeMode) {
          toggleLandscapeWatch();
        } else if (!detailModal().classList.contains('hidden')) {
          closeDetail();
        } else {
          window.Capacitor.Plugins.App.exitApp();
        }
      });
    }
    renderHome();
  });
})();
