(function () {
  let hlsInstance = null;
  let currentMovie = null;

  const mainView = () => document.getElementById('main-view');
  const detailModal = () => document.getElementById('detail-modal');

  function setActiveTab(tab) {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('text-red-500', active);
      btn.classList.toggle('text-zinc-400', !active);
    });
  }

  async function renderHome() {
    setActiveTab('home');
    mainView().innerHTML = `<div class="p-6 text-center text-zinc-400 text-sm animate-pulse">Đang tải kho phim...</div>`;
    try {
      const data = await window.movieApi.getHome();
      let html = '';

      if (data.hero) {
        html += `
          <div class="relative w-full aspect-[4/5] max-h-[430px] overflow-hidden">
            <img src="${data.hero.poster}" class="w-full h-full object-cover" onerror="this.src='assets/placeholder.svg'" />
            <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent"></div>
            <div class="absolute bottom-4 left-4 right-4">
              <span class="inline-block bg-red-600 text-[10px] font-bold px-2 py-0.5 rounded mb-1.5">ĐỀ CỬ HOT</span>
              <h2 class="text-xl font-extrabold text-white line-clamp-2">${data.hero.title}</h2>
              <p class="text-xs text-zinc-300 mt-1 line-clamp-2">${data.hero.genre || 'Phim Mới'} • ${data.hero.year || '2026'}</p>
              <div class="flex gap-2.5 mt-3">
                <button onclick="window.appRouter.openDetail('${data.hero.slug}', true)"
                        class="flex-1 bg-red-600 active:scale-95 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg">
                  ▶ Xem Ngay
                </button>
                <button onclick="window.appRouter.openDetail('${data.hero.slug}')"
                        class="px-4 bg-zinc-800/90 active:scale-95 text-white font-semibold text-xs py-2.5 rounded-xl border border-zinc-700">
                  Chi tiết
                </button>
              </div>
            </div>
          </div>
        `;
      }

      for (const sec of data.sections) {
        html += `
          <section class="mt-5 px-4">
            <div class="flex items-center justify-between mb-2.5">
              <h3 class="text-sm font-bold text-white">${sec.icon} ${sec.title}</h3>
              <button onclick="window.appRouter.openCategory('danh-sach', '${sec.id}', '${sec.title}')"
                      class="text-xs text-red-400 font-medium">Xem thêm</button>
            </div>
            <div class="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              ${sec.items.map(it => window.renderMovieCard(it, false)).join('')}
            </div>
          </section>
        `;
      }
      mainView().innerHTML = html;
    } catch (err) {
      mainView().innerHTML = `<div class="p-6 text-center text-red-400 text-sm">${err.message}</div>`;
    }
  }

  async function renderExplore() {
    setActiveTab('explore');
    const categories = [
      { type: 'danh-sach', slug: 'phim-bo', label: 'Phim Bộ' },
      { type: 'danh-sach', slug: 'phim-le', label: 'Phim Lẻ' },
      { type: 'danh-sach', slug: 'hoat-hinh', label: 'Hoạt Hình' },
      { type: 'the-loai', slug: 'hanh-dong', label: 'Hành Động' },
      { type: 'the-loai', slug: 'tinh-cam', label: 'Tình Cảm' },
      { type: 'quoc-gia', slug: 'han-quoc', label: 'Hàn Quốc' },
      { type: 'quoc-gia', slug: 'trung-quoc', label: 'Trung Quốc' },
      { type: 'quoc-gia', slug: 'au-my', label: 'Âu Mỹ' }
    ];

    mainView().innerHTML = `
      <div class="p-4">
        <div class="relative">
          <input id="search-input" type="search" placeholder="Nhập tên phim, diễn viên..."
                 class="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500" />
        </div>
        <div class="flex gap-2 overflow-x-auto no-scrollbar mt-3 pb-1">
          ${categories.map(c => `
            <button onclick="window.appRouter.openCategory('${c.type}', '${c.slug}', '${c.label}')"
                    class="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 whitespace-nowrap active:scale-95">
              ${c.label}
            </button>
          `).join('')}
        </div>
        <div id="explore-results" class="mt-4 grid grid-cols-3 gap-3"></div>
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
        box.innerHTML = `<div class="col-span-3 text-center text-xs text-zinc-400 py-4">Đang tìm "${q}"...</div>`;
        const items = await window.movieApi.search(q);
        box.innerHTML = items.length
          ? items.map(it => window.renderMovieCard(it, true)).join('')
          : `<div class="col-span-3 text-center text-xs text-zinc-500 py-6">Không tìm thấy phim phù hợp</div>`;
      }, 400);
    });
  }

  async function openCategory(type, slug, title) {
    mainView().innerHTML = `
      <div class="p-4">
        <div class="flex items-center gap-2 mb-4">
          <button onclick="window.appRouter.go('home')" class="px-2.5 py-1 bg-zinc-900 rounded-lg text-xs">←</button>
          <h2 class="text-base font-bold">${title}</h2>
        </div>
        <div id="cat-grid" class="grid grid-cols-3 gap-3">
          <div class="col-span-3 text-center text-xs text-zinc-400 py-6">Đang tải...</div>
        </div>
      </div>
    `;
    const res = await window.movieApi.getCategory(type, slug, 1);
    document.getElementById('cat-grid').innerHTML = res.items.map(it => window.renderMovieCard(it, true)).join('');
  }

  function renderLibrary() {
    setActiveTab('library');
    const favs = window.appStorage.getFavorites();
    const history = window.appStorage.getHistory();

    mainView().innerHTML = `
      <div class="p-4 space-y-6">
        <div>
          <h3 class="text-sm font-bold mb-3">🕒 Lịch Sử Đã Xem</h3>
          ${history.length
            ? `<div class="grid grid-cols-3 gap-3">${history.map(it => window.renderMovieCard({ ...it, badge: 'Tập ' + it.ep }, true)).join('')}</div>`
            : `<p class="text-xs text-zinc-500">Chưa có lịch sử xem phim.</p>`}
        </div>
        <div>
          <h3 class="text-sm font-bold mb-3">❤️ Phim Yêu Thích</h3>
          ${favs.length
            ? `<div class="grid grid-cols-3 gap-3">${favs.map(it => window.renderMovieCard(it, true)).join('')}</div>`
            : `<p class="text-xs text-zinc-500">Danh sách yêu thích đang trống.</p>`}
        </div>
      </div>
    `;
  }

  async function openDetail(slug, autoPlay = false) {
    const modal = detailModal();
    modal.classList.remove('hidden');
    modal.innerHTML = `<div class="p-8 text-center text-sm text-zinc-400">Đang tải thông tin phim...</div>`;

    try {
      const movie = await window.movieApi.getMovieDetail(slug);
      currentMovie = movie;
      const isFav = window.appStorage.isFavorite(slug);

      modal.innerHTML = `
        <div class="flex flex-col h-full bg-zinc-950">
          <!-- Sticky Portrait Video Player (16:9 Top Box) -->
          <div class="sticky top-0 z-20 bg-black w-full aspect-video relative border-b border-zinc-800">
            <div id="player-container" class="w-full h-full flex items-center justify-center relative">
              <img src="${movie.backdrop}" class="w-full h-full object-cover opacity-50" />
              <button onclick="window.appRouter.playEpisode('${movie.slug}', '${movie.episodes[0].number}')"
                      class="absolute bg-red-600 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-xl active:scale-95">
                ▶ Phát ${movie.episodes[0].name}
              </button>
            </div>
            <button onclick="window.appRouter.closeDetail()"
                    class="absolute top-3 left-3 z-30 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full border border-white/15">
              ✕ Đóng
            </button>
          </div>

          <!-- Scrollable Portrait Metadata & Episodes -->
          <div class="flex-1 overflow-y-auto p-4 pb-12 space-y-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h1 class="text-lg font-extrabold text-white leading-snug">${movie.title}</h1>
                <p class="text-xs text-zinc-400 mt-0.5">${movie.originalTitle} • ${movie.year}</p>
              </div>
              <button id="fav-btn" onclick="window.appRouter.toggleFav()"
                      class="px-3 py-2 rounded-xl text-xs font-semibold border ${isFav ? 'bg-red-600/20 border-red-500 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}">
                ${isFav ? '❤️ Đã lưu' : '🤍 Lưu'}
              </button>
            </div>

            <div class="flex flex-wrap gap-1.5 text-[11px] text-zinc-300">
              <span class="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">${movie.status}</span>
              <span class="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">${movie.country}</span>
              <span class="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">${movie.duration}</span>
            </div>

            <div id="server-bar" class="flex gap-2 overflow-x-auto no-scrollbar"></div>

            <div>
              <h3 class="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Danh Sách Tập (${movie.episodes.length})</h3>
              <div class="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
                ${movie.episodes.map(ep => `
                  <button data-ep="${ep.number}" onclick="window.appRouter.playEpisode('${movie.slug}', '${ep.number}')"
                          class="ep-btn py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-200 active:scale-95">
                    ${ep.number}
                  </button>
                `).join('')}
              </div>
            </div>

            <div>
              <h3 class="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Nội Dung</h3>
              <p class="text-xs text-zinc-400 leading-relaxed">${movie.description}</p>
            </div>
          </div>
        </div>
      `;

      if (autoPlay && movie.episodes.length > 0) {
        playEpisode(movie.slug, movie.episodes[0].number);
      }
    } catch (err) {
      modal.innerHTML = `
        <div class="p-6 text-center">
          <p class="text-red-400 text-sm mb-4">${err.message}</p>
          <button onclick="window.appRouter.closeDetail()" class="px-4 py-2 bg-zinc-800 rounded-xl text-xs">Quay lại</button>
        </div>
      `;
    }
  }

  async function playEpisode(slug, epNum) {
    const container = document.getElementById('player-container');
    const serverBar = document.getElementById('server-bar');
    if (!container) return;

    document.querySelectorAll('.ep-btn').forEach(b => {
      const isCur = b.dataset.ep === String(epNum);
      b.classList.toggle('bg-red-600', isCur);
      b.classList.toggle('border-red-500', isCur);
    });

    container.innerHTML = `<div class="text-xs text-zinc-300 animate-pulse">Đang kết nối luồng phát Tập ${epNum}...</div>`;

    try {
      const streamData = await window.movieApi.getStream(slug, epNum);
      if (currentMovie) window.appStorage.saveHistory(currentMovie, epNum);

      serverBar.innerHTML = streamData.sources.map((src, idx) => `
        <button onclick="window.appRouter.switchSource(${idx})"
                class="src-btn px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap border ${idx === 0 ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}">
          ${src.label}
        </button>
      `).join('');

      window._currentSources = streamData.sources;
      switchSource(0);
    } catch (err) {
      container.innerHTML = `<div class="text-xs text-red-400 px-4 text-center">${err.message}</div>`;
    }
  }

  function switchSource(idx) {
    const src = window._currentSources?.[idx];
    const container = document.getElementById('player-container');
    if (!src || !container) return;

    document.querySelectorAll('.src-btn').forEach((b, i) => {
      b.classList.toggle('bg-red-600', i === idx);
      b.classList.toggle('border-red-500', i === idx);
    });

    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    if (src.isHls) {
      container.innerHTML = `<video id="hls-video" controls autoplay playsinline class="w-full h-full bg-black"></video>`;
      const video = document.getElementById('hls-video');
      if (window.Hls && window.Hls.isSupported()) {
        hlsInstance = new window.Hls();
        hlsInstance.loadSource(src.url);
        hlsInstance.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src.url;
      }
    } else {
      container.innerHTML = `<iframe src="${src.url}" allowfullscreen class="w-full h-full border-0"></iframe>`;
    }
  }

  function closeDetail() {
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
    const btn = document.getElementById('fav-btn');
    if (btn) {
      btn.textContent = saved ? '❤️ Đã lưu' : '🤍 Lưu';
      btn.className = `px-3 py-2 rounded-xl text-xs font-semibold border ${saved ? 'bg-red-600/20 border-red-500 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`;
    }
  }

  window.appRouter = {
    go(tab) {
      if (tab === 'home') renderHome();
      else if (tab === 'explore') renderExplore();
      else if (tab === 'library') renderLibrary();
    },
    openCategory,
    openDetail,
    closeDetail,
    playEpisode,
    switchSource,
    toggleFav
  };

  document.addEventListener('DOMContentLoaded', () => {
    // Lock Portrait Orientation if running inside Capacitor APK
    if (window.Capacitor?.Plugins?.ScreenOrientation) {
      window.Capacitor.Plugins.ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
    }
    renderHome();
  });
})();
