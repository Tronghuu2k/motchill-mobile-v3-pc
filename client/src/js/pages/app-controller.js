(function () {
  let hlsInstance = null;
  let currentMovie = null;
  let latestHomeData = null;
  let isLandscapeMode = false;

  const mainView = () => document.getElementById('main-view');
  const detailModal = () => document.getElementById('detail-modal');

  function setFullscreenScrollLock(locked) {
    document.documentElement.classList.toggle('fullscreen-lock', locked);
    document.body.classList.toggle('fullscreen-lock', locked);
    const detailScroll = document.getElementById('detail-scroll-area');
    if (detailScroll) {
      detailScroll.style.overflowY = locked ? 'hidden' : 'auto';
      detailScroll.style.touchAction = locked ? 'none' : 'pan-y';
    }
  }

  function setActiveTab(tab) {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('text-white', active);
      btn.classList.toggle('text-neutral-400', !active);
      const bar = btn.querySelector('.nav-indicator');
      if (bar) {
        bar.classList.toggle('bg-[#e50914]', active);
        bar.classList.toggle('bg-transparent', !active);
      }
    });
  }

  function renderHomeSkeleton() {
    return `
      <div class="animate-screen">
        <div class="w-full h-[430px] skeleton-box"></div>
        <div class="px-4 mt-5 space-y-6">
          <div>
            <div class="h-4 w-48 rounded skeleton-box mb-3"></div>
            <div class="flex gap-3 overflow-hidden">
              ${Array.from({ length: 4 }).map(() => `<div class="w-32 flex-shrink-0 aspect-[2/3] rounded skeleton-box"></div>`).join('')}
            </div>
          </div>
          <div>
            <div class="h-4 w-40 rounded skeleton-box mb-3"></div>
            <div class="flex gap-3 overflow-hidden">
              ${Array.from({ length: 4 }).map(() => `<div class="w-32 flex-shrink-0 aspect-[2/3] rounded skeleton-box"></div>`).join('')}
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

      if (data.favUpdates?.length > 0) {
        const first = data.favUpdates[0];
        window.showToast(`"${first.title}" vừa có ${first.newEp}!`);
      }

      let html = '<div class="animate-screen">';

      if (data.hero) {
        html += `
          <div class="relative w-full aspect-[4/5] max-h-[470px] overflow-hidden bg-[#141414]">
            <img src="${data.hero.poster}"
                 class="w-full h-full object-cover"
                 onerror="this.onerror=null; this.src='assets/placeholder.svg';" />
            <div class="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/45 to-black/35"></div>
            <div class="absolute bottom-5 left-4 right-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="bg-[#e50914] text-white text-[10px] font-black px-2 py-0.5 rounded-sm tracking-wider">R ORIGINALS</span>
                <span class="text-xs font-bold text-neutral-200">${data.hero.year || '2026'}</span>
              </div>
              <h2 class="text-2xl font-black text-white line-clamp-2 leading-tight tracking-tight">${data.hero.title}</h2>
              <p class="text-xs text-neutral-300 mt-1 line-clamp-1">${data.hero.genre || 'Phim Hay'} - ${data.hero.status || 'HD'}</p>
              <div class="flex gap-3 mt-4">
                <button onclick="window.appRouter.openDetail('${data.hero.slug}', true)"
                        class="flex-1 bg-white hover:bg-neutral-200 active:scale-[0.98] transition text-black font-black text-xs py-3 rounded flex items-center justify-center gap-2 shadow">
                  <span class="w-2.5 h-2.5 bg-black rounded-full inline-block"></span>
                  <span>Phát</span>
                </button>
                <button onclick="window.appRouter.openDetail('${data.hero.slug}')"
                        class="flex-1 bg-neutral-700/85 hover:bg-neutral-700 active:scale-[0.98] transition text-white font-bold text-xs py-3 rounded flex items-center justify-center gap-2">
                  <span>Danh sách &amp; Chi tiết</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }

      if (data.topWeekly?.length > 0) {
        html += `
          <section class="mt-5 px-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-black text-white tracking-tight">Top 10 Phim Hôm Nay</h3>
              <button onclick="window.appRouter.go('topweek')"
                      class="text-xs font-bold text-neutral-400 hover:text-white">
                Xem tất cả &gt;
              </button>
            </div>
            <div class="flex gap-3 overflow-x-auto no-scrollbar py-2">
              ${data.topWeekly.map(it => window.renderTopRankCard(it, it.rank)).join('')}
            </div>
          </section>
        `;
      }

      for (const sec of data.sections) {
        html += `
          <section class="mt-6 px-4">
            <div class="flex items-center justify-between mb-2.5">
              <h3 class="text-sm font-extrabold text-white tracking-tight">${sec.title}</h3>
              <button onclick="window.appRouter.openCategory('danh-sach', '${sec.id}', '${sec.title}')"
                      class="text-xs font-bold text-neutral-400 hover:text-white">
                Tất cả &gt;
              </button>
            </div>
            <div class="flex gap-3 overflow-x-auto no-scrollbar py-1">
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
          <p class="text-red-400 text-sm font-medium">${err.message}</p>
          <button onclick="window.appRouter.renderHome(true)" class="px-5 py-2.5 bg-[#e50914] text-white rounded text-xs font-black">
            Thử lại
          </button>
        </div>
      `;
    }
  }

  async function renderTopWeekly(force = false) {
    setActiveTab('topweek');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mainView().innerHTML = `<div class="p-4 grid grid-cols-3 gap-3">${window.renderSkeletonGrid(9)}</div>`;

    try {
      const data = (!force && latestHomeData) ? latestHomeData : await window.movieApi.getHome(force);
      latestHomeData = data;
      const topList = data.topWeekly || [];
      const recList = data.recommended || [];

      mainView().innerHTML = `
        <div class="p-4 space-y-6 animate-screen">
          <div class="bg-[#181818] border border-neutral-800 rounded p-4 flex items-center justify-between">
            <div>
              <h2 class="text-base font-black text-white">Top 10 Thịnh Hành Tuần</h2>
              <p class="text-[11px] text-neutral-400 mt-0.5">Bảng xếp hạng phim được xem nhiều nhất</p>
            </div>
            <button onclick="window.appRouter.renderTopWeekly(true); window.showToast('Đã làm mới bảng xếp hạng.')"
                    class="px-3.5 py-2 bg-[#e50914] text-white rounded text-xs font-black">
              Làm mới
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3.5">
            ${topList.map(it => `
              <div onclick="window.appRouter.openDetail('${it.slug}')"
                   class="bg-[#181818] border border-neutral-800 rounded p-2 flex flex-col gap-2 cursor-pointer">
                <div class="relative aspect-[2/3] rounded overflow-hidden">
                  <img src="${it.poster}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='assets/placeholder.svg';" />
                  <span class="absolute top-2 left-2 bg-[#e50914] text-white font-black text-xs px-2 py-0.5 rounded-sm">
                    #${it.rank}
                  </span>
                </div>
                <p class="text-xs font-bold text-white line-clamp-1">${it.title}</p>
              </div>
            `).join('')}
          </div>

          <div>
            <h3 class="text-sm font-extrabold text-white mb-3">Đề Xuất Phim Hay</h3>
            <div class="grid grid-cols-3 gap-3">
              ${recList.map(it => window.renderMovieCard(it, true)).join('')}
            </div>
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
      { type: 'danh-sach', slug: 'phim-moi-cap-nhat', label: 'Mới Hôm Nay' },
      { type: 'danh-sach', slug: 'phim-bo', label: 'Phim Bộ' },
      { type: 'danh-sach', slug: 'phim-le', label: 'Phim Lẻ' },
      { type: 'danh-sach', slug: 'hoat-hinh', label: 'Hoạt Hình' },
      { type: 'the-loai', slug: 'hanh-dong', label: 'Hành Động' },
      { type: 'the-loai', slug: 'tinh-cam', label: 'Tình Cảm' },
      { type: 'the-loai', slug: 'kinh-di', label: 'Kinh Dị' },
      { type: 'quoc-gia', slug: 'han-quoc', label: 'Hàn Quốc' },
      { type: 'quoc-gia', slug: 'trung-quoc', label: 'Trung Quốc' },
      { type: 'quoc-gia', slug: 'au-my', label: 'Âu Mỹ' }
    ];

    const initialRec = latestHomeData?.recommended || [];

    mainView().innerHTML = `
      <div class="p-4 animate-screen">
        <div class="relative">
          <input id="search-input" type="search" placeholder="Tìm phim, chương trình, diễn viên..."
                 class="w-full bg-[#242424] border border-neutral-700 focus:border-white rounded px-4 py-3 text-sm text-white placeholder-neutral-400 focus:outline-none transition" />
        </div>

        <div class="flex gap-2 overflow-x-auto no-scrollbar mt-3 py-1">
          ${categories.map(c => `
            <button onclick="window.appRouter.openCategory('${c.type}', '${c.slug}', '${c.label}')"
                    class="px-3.5 py-1.5 rounded bg-[#1f1f1f] hover:bg-neutral-700 border border-neutral-800 text-xs font-semibold text-neutral-200 whitespace-nowrap transition">
              ${c.label}
            </button>
          `).join('')}
        </div>

        <div id="explore-header" class="mt-5 mb-3 text-xs font-extrabold text-neutral-300 uppercase tracking-wider">
          ${initialRec.length ? 'Đề Xuất Phim Hay' : ''}
        </div>
        <div id="explore-results" class="grid grid-cols-3 gap-3">
          ${initialRec.map(it => window.renderMovieCard(it, true)).join('')}
        </div>
      </div>
    `;

    const input = document.getElementById('search-input');
    let timer = null;
    input.addEventListener('input', (e) => {
      clearTimeout(timer);
      const q = e.target.value.trim();
      timer = setTimeout(async () => {
        const box = document.getElementById('explore-results');
        const head = document.getElementById('explore-header');
        if (!q) {
          head.textContent = initialRec.length ? 'Đề Xuất Phim Hay' : '';
          box.innerHTML = initialRec.map(it => window.renderMovieCard(it, true)).join('');
          return;
        }
        head.textContent = `Kết quả cho "${q}"`;
        box.innerHTML = window.renderSkeletonGrid(6);
        try {
          const items = await window.movieApi.search(q);
          box.innerHTML = items.length
            ? items.map(it => window.renderMovieCard(it, true)).join('')
            : `<div class="col-span-3 text-center text-xs text-neutral-400 py-8">Không tìm thấy phim nào khớp với "${q}"</div>`;
        } catch (err) {
          box.innerHTML = `<div class="col-span-3 text-center text-xs text-red-400 py-6">${err.message}</div>`;
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
            <button onclick="window.appRouter.go('home')" class="w-8 h-8 flex items-center justify-center bg-[#222222] border border-neutral-800 rounded text-xs font-bold">&lt;</button>
            <h2 class="text-base font-extrabold text-white line-clamp-1">${title}</h2>
          </div>
          <span class="text-xs font-semibold text-neutral-400 bg-[#1f1f1f] px-3 py-1 rounded border border-neutral-800 whitespace-nowrap">Trang ${page}</span>
        </div>
        <div id="cat-grid" class="grid grid-cols-3 gap-3">${window.renderSkeletonGrid(9)}</div>
        <div id="cat-pagination" class="flex justify-center gap-3 mt-6"></div>
      </div>
    `;
    try {
      const res = await window.movieApi.getCategory(type, slug, page);
      document.getElementById('cat-grid').innerHTML = res.items.map(it => window.renderMovieCard(it, true)).join('');
      const pagBox = document.getElementById('cat-pagination');
      pagBox.innerHTML = `
        ${page > 1 ? `<button onclick="window.appRouter.openCategory('${type}', '${slug}', '${title}', ${page - 1})" class="px-4 py-2 bg-[#222222] border border-neutral-700 rounded text-xs font-semibold">Trang trước</button>` : ''}
        ${res.hasNext ? `<button onclick="window.appRouter.openCategory('${type}', '${slug}', '${title}', ${page + 1})" class="px-5 py-2 bg-[#e50914] text-white rounded text-xs font-black">Trang sau</button>` : ''}
      `;
    } catch (err) {
      document.getElementById('cat-grid').innerHTML = `<div class="col-span-3 text-center text-xs text-red-400 py-6">${err.message}</div>`;
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
        <div class="bg-[#181818] border border-neutral-800 rounded p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-extrabold text-white">Tiếp Tục Xem (${history.length})</h3>
            ${history.length ? `<button onclick="window.appStorage.clearHistory(); window.showToast('Đã xóa lịch sử'); window.appRouter.go('library')" class="text-[11px] font-semibold text-red-400 px-2 py-1">Xóa hết</button>` : ''}
          </div>
          ${history.length
            ? `<div class="grid grid-cols-3 gap-3">${history.map(it => window.renderMovieCard({ ...it, badge: 'Tập ' + it.ep }, true)).join('')}</div>`
            : `<p class="text-xs text-neutral-400 py-2">Bạn chưa xem bộ phim nào gần đây.</p>`}
        </div>

        <div class="bg-[#181818] border border-neutral-800 rounded p-4">
          <h3 class="text-sm font-extrabold text-white mb-3">Danh Sách Của Tôi (${favs.length})</h3>
          ${favs.length
            ? `<div class="grid grid-cols-3 gap-3">${favs.map(it => window.renderMovieCard(it, true)).join('')}</div>`
            : `<p class="text-xs text-neutral-400 py-2">Nhấn "+ Danh sách" ở trang phim để lưu phim yêu thích.</p>`}
        </div>

        <div class="bg-[#181818] border border-neutral-800 rounded p-4 space-y-3">
          <p class="text-[11px] text-neutral-400">Đồng bộ kho phim: ${lastSync}</p>
          <button onclick="window.movieApi.clearCache(); window.showToast('Đang cập nhật kho phim...'); window.appRouter.renderHome(true)"
                  class="w-full py-3 bg-[#e50914] rounded text-xs font-black text-white">
            Làm Mới Danh Sách Phim
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
      btn.classList.toggle('bg-white', active);
      btn.classList.toggle('text-black', active);
      btn.classList.toggle('border-white', active);
      btn.classList.toggle('bg-[#222222]', !active);
      btn.classList.toggle('text-neutral-300', !active);
      btn.classList.toggle('border-neutral-800', !active);
    });
  }

  async function toggleLandscapeWatch() {
    const stage = document.getElementById('player-stage');
    const rotateBtn = document.getElementById('rotate-watch-btn');
    if (!stage) return;

    isLandscapeMode = !isLandscapeMode;
    stage.classList.toggle('landscape-player', isLandscapeMode);
    setFullscreenScrollLock(isLandscapeMode);

    if (rotateBtn) {
      rotateBtn.innerHTML = isLandscapeMode ? 'Thoát toàn màn hình' : 'Toàn màn hình ngang';
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

    window.showToast(isLandscapeMode ? 'Đã khóa cuộn & mở toàn màn hình' : 'Đã thoát toàn màn hình');
  }

  function seekVideoBy(deltaSeconds) {
    const video = document.getElementById('hls-video');
    if (!video || isNaN(video.duration)) {
      window.showToast('Nguồn dự phòng không hỗ trợ tua nhanh');
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
    badge.className = `seek-badge-anim absolute top-1/2 -translate-y-1/2 ${isForward ? 'right-8' : 'left-8'} z-[130] nf-glass text-white text-xs font-black px-4 py-2.5 rounded border border-neutral-600 shadow-2xl pointer-events-none`;
    badge.textContent = isForward ? `+${deltaSeconds}s` : `${deltaSeconds}s`;
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
      btn.classList.toggle('bg-[#e50914]', active);
      btn.classList.toggle('text-white', active);
      btn.classList.toggle('border-[#e50914]', active);
      btn.classList.toggle('bg-[#222222]', !active);
      btn.classList.toggle('text-neutral-300', !active);
      btn.classList.toggle('border-neutral-800', !active);
    });
    const label = levelIndex === -1 ? 'Tự động' : (hlsInstance.levels?.[levelIndex]?.height ? `${hlsInstance.levels[levelIndex].height}p` : `Mức ${levelIndex + 1}`);
    window.showToast(`Chất lượng: ${label}`);
  }

  function renderQualityControls(levels = []) {
    const qBar = document.getElementById('quality-bar');
    if (!qBar) return;
    if (!levels || levels.length === 0) {
      qBar.innerHTML = `<span class="text-[11px] font-semibold text-neutral-400 px-2.5 py-1 rounded bg-[#222222] border border-neutral-800">Auto HD</span>`;
      return;
    }
    const buttons = [
      `<button data-qlevel="-1" onclick="window.appRouter.setQuality(-1)" class="quality-btn px-2.5 py-1 rounded text-[11px] font-extrabold border bg-[#e50914] text-white border-[#e50914] transition">Auto</button>`
    ];
    levels.forEach((lvl, idx) => {
      const heightLabel = lvl.height ? `${lvl.height}p` : `HD ${idx + 1}`;
      buttons.push(
        `<button data-qlevel="${idx}" onclick="window.appRouter.setQuality(${idx})" class="quality-btn px-2.5 py-1 rounded text-[11px] font-bold border bg-[#222222] text-neutral-300 border-neutral-800 transition">${heightLabel}</button>`
      );
    });
    qBar.innerHTML = buttons.join('');
  }

  async function openDetail(slug, autoPlay = false) {
    isLandscapeMode = false;
    setFullscreenScrollLock(false);
    const modal = detailModal();
    modal.classList.remove('hidden');
    modal.innerHTML = `
      <div class="flex flex-col h-full bg-[#141414] animate-modal">
        <div class="w-full aspect-video skeleton-box"></div>
        <div class="p-4 space-y-3">
          <div class="h-6 w-3/4 rounded skeleton-box"></div>
          <div class="h-3 w-1/2 rounded skeleton-box"></div>
          <div class="grid grid-cols-5 gap-2 pt-3">
            ${Array.from({ length: 10 }).map(() => `<div class="h-9 rounded skeleton-box"></div>`).join('')}
          </div>
        </div>
      </div>
    `;

    try {
      const movie = await window.movieApi.getMovieDetail(slug);
      currentMovie = movie;
      const isFav = window.appStorage.isFavorite(slug);
      const savedAspect = window.appStorage.getAspectMode();
      const relatedMovies = (latestHomeData?.recommended || []).filter(m => m.slug !== slug).slice(0, 10);

      const aspectModes = [
        { id: '16:9', label: '16:9' },
        { id: 'fill', label: 'Zoom' },
        { id: 'stretch', label: 'Kéo giãn' },
        { id: '21:9', label: '21:9' },
        { id: '4:3', label: '4:3' }
      ];

      modal.innerHTML = `
        <div class="flex flex-col h-full bg-[#141414] animate-modal">
          <div class="sticky top-0 z-20 bg-black w-full border-b border-neutral-800">
            <div id="player-stage" class="w-full aspect-16-9 max-h-[52vh] relative overflow-hidden bg-black transition-all duration-150">
              <div id="player-container" class="w-full h-full flex items-center justify-center relative overflow-hidden">
                <img src="${movie.backdrop}" class="w-full h-full object-cover opacity-45" onerror="this.onerror=null; this.src='assets/placeholder.svg';" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/45"></div>
                <button onclick="window.appRouter.playEpisode('${movie.slug}', '${movie.episodes[0].number}')"
                        class="relative z-20 bg-white text-black font-black text-xs px-6 py-2.5 rounded shadow-lg transition flex items-center gap-2">
                  <span class="w-2.5 h-2.5 bg-black rounded-full inline-block"></span>
                  <span>Phát ${movie.episodes[0].name}</span>
                </button>
              </div>

              <div id="tap-zone-left" class="absolute inset-y-12 left-0 w-1/3 z-10"></div>
              <div id="tap-zone-right" class="absolute inset-y-12 right-0 w-1/3 z-10"></div>

              <div class="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
                <button onclick="window.appRouter.closeDetail()"
                        class="pointer-events-auto nf-glass text-white text-xs font-bold px-3.5 py-1.5 rounded border border-neutral-700 transition">
                  Đóng
                </button>
                <button id="rotate-watch-btn" onclick="window.appRouter.toggleLandscape()"
                        class="pointer-events-auto nf-glass text-white text-xs font-bold px-3.5 py-1.5 rounded border border-neutral-700 transition">
                  Toàn màn hình ngang
                </button>
              </div>
            </div>

            <div class="bg-[#141414] border-t border-neutral-800 px-3 py-2 space-y-2">
              <div class="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                <div class="flex items-center gap-1.5">
                  <button onclick="window.appRouter.seekBy(-10)" class="px-2.5 py-1 rounded text-[11px] font-bold bg-[#222222] border border-neutral-800 text-neutral-200">-10s</button>
                  <button onclick="window.appRouter.seekBy(10)" class="px-2.5 py-1 rounded text-[11px] font-bold bg-[#222222] border border-neutral-800 text-neutral-200">+10s</button>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-extrabold text-neutral-400 uppercase whitespace-nowrap">Chất lượng:</span>
                  <div id="quality-bar" class="flex items-center gap-1.5">
                    <span class="text-[11px] font-semibold text-neutral-400 px-2.5 py-1 rounded bg-[#222222] border border-neutral-800">Auto HD</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span class="text-[10px] font-extrabold text-neutral-400 uppercase whitespace-nowrap">Khung hình:</span>
                <div class="flex items-center gap-1.5">
                  ${aspectModes.map(m => `
                    <button data-aspect="${m.id}" onclick="window.appRouter.setAspect('${m.id}')"
                            class="aspect-btn px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap border transition ${savedAspect === m.id ? 'bg-white text-black border-white' : 'bg-[#222222] text-neutral-300 border-neutral-800'}">
                      ${m.label}
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <div id="detail-scroll-area" class="flex-1 overflow-y-auto overscroll-contain p-4 pb-16 space-y-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h1 class="text-lg font-black text-white leading-snug">${movie.title}</h1>
                <p class="text-xs text-neutral-400 mt-0.5">${movie.originalTitle || movie.genre} - ${movie.year}</p>
              </div>
              <button id="fav-btn" onclick="window.appRouter.toggleFav()"
                      class="px-3.5 py-2 rounded text-xs font-bold border whitespace-nowrap transition ${isFav ? 'bg-[#e50914] border-[#e50914] text-white' : 'bg-[#222222] border-neutral-700 text-neutral-200'}">
                ${isFav ? 'Đã lưu' : '+ Danh sách'}
              </button>
            </div>

            <div class="flex flex-wrap gap-1.5 text-[11px] font-semibold text-neutral-300">
              <span class="bg-[#222222] border border-neutral-800 px-2.5 py-1 rounded">${movie.status}</span>
              <span class="bg-[#222222] border border-neutral-800 px-2.5 py-1 rounded">${movie.country}</span>
              <span class="bg-[#222222] border border-neutral-800 px-2.5 py-1 rounded">${movie.duration}</span>
            </div>

            <div id="server-bar" class="flex gap-2 overflow-x-auto no-scrollbar"></div>

            <div class="bg-[#181818] border border-neutral-800 rounded p-3.5">
              <div class="flex items-center justify-between mb-2.5">
                <h3 class="text-xs font-extrabold text-neutral-200 uppercase tracking-wider">Danh Sách Tập (${movie.episodes.length})</h3>
                <span id="now-playing-label" class="text-[11px] font-bold text-[#e50914]"></span>
              </div>
              <div class="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
                ${movie.episodes.map(ep => `
                  <button data-ep="${ep.number}" onclick="window.appRouter.playEpisode('${movie.slug}', '${ep.number}')"
                          class="ep-btn py-2.5 rounded bg-[#141414] border border-neutral-800 text-xs font-bold text-neutral-200 transition">
                    ${ep.number}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="bg-[#181818] border border-neutral-800 rounded p-3.5">
              <h3 class="text-xs font-extrabold text-neutral-200 uppercase tracking-wider mb-1.5">Nội Dung Phim</h3>
              <p class="text-xs text-neutral-400 leading-relaxed">${movie.description}</p>
            </div>

            ${relatedMovies.length ? `
              <div class="pt-1">
                <h3 class="text-xs font-extrabold text-white uppercase tracking-wider mb-2.5">Đề Xuất Phim Hay Tương Tự</h3>
                <div class="flex gap-3 overflow-x-auto no-scrollbar py-1">
                  ${relatedMovies.map(it => window.renderMovieCard(it, false)).join('')}
                </div>
              </div>
            ` : ''}
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
          <button onclick="window.appRouter.closeDetail()" class="px-5 py-2.5 bg-[#222222] rounded text-xs font-bold">Quay lại</button>
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
      b.classList.toggle('bg-[#e50914]', isCur);
      b.classList.toggle('text-white', isCur);
      b.classList.toggle('border-[#e50914]', isCur);
    });

    container.innerHTML = `
      <div class="flex flex-col items-center gap-2 text-xs text-neutral-300">
        <div class="w-7 h-7 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin"></div>
        <span>Đang tải luồng phát Tập ${epNum}...</span>
      </div>
    `;

    try {
      const streamData = await window.movieApi.getStream(slug, epNum);
      if (currentMovie) window.appStorage.saveHistory(currentMovie, epNum);

      serverBar.innerHTML = streamData.sources.map((src, idx) => `
        <button onclick="window.appRouter.switchSource(${idx})"
                class="src-btn px-3.5 py-1.5 rounded text-[11px] font-bold whitespace-nowrap border transition ${idx === 0 ? 'bg-[#e50914] border-[#e50914] text-white' : 'bg-[#222222] border-neutral-800 text-neutral-300'}">
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
      b.classList.toggle('bg-[#e50914]', i === idx);
      b.classList.toggle('text-white', i === idx);
      b.classList.toggle('border-[#e50914]', i === idx);
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
        } else if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('portrait');
        }
      } catch (e) {}
    }
    setFullscreenScrollLock(false);
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
      btn.textContent = saved ? 'Đã lưu' : '+ Danh sách';
      btn.className = `px-3.5 py-2 rounded text-xs font-bold border whitespace-nowrap transition ${saved ? 'bg-[#e50914] border-[#e50914] text-white' : 'bg-[#222222] border-neutral-700 text-neutral-200'}`;
    }
  }

  window.appRouter = {
    go(tab) {
      if (tab === 'home') renderHome();
      else if (tab === 'topweek') renderTopWeekly();
      else if (tab === 'explore') renderExplore();
      else if (tab === 'library') renderLibrary();
    },
    renderHome,
    renderTopWeekly,
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
