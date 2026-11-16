window.showToast = function (message) {
  let toast = document.getElementById('mobile-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'mobile-toast';
    toast.className = 'fixed top-16 left-1/2 -translate-x-1/2 z-[110] glass-panel text-white text-xs font-bold px-4 py-2.5 rounded-full border border-amber-500/30 shadow-2xl pointer-events-none transition-all duration-200 opacity-0 -translate-y-2 whitespace-nowrap';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('opacity-0', '-translate-y-2');
  toast.classList.add('opacity-100', 'translate-y-0');

  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', '-translate-y-2');
  }, 2200);
};

window.renderSkeletonGrid = function (count = 6) {
  return Array.from({ length: count }).map(() => `
    <div class="w-full">
      <div class="aspect-[2/3] rounded-2xl skeleton-box border border-slate-800/70"></div>
      <div class="h-3 w-4/5 rounded-full skeleton-box mt-2"></div>
      <div class="h-2.5 w-1/2 rounded-full skeleton-box mt-1.5"></div>
    </div>
  `).join('');
};

window.renderTopRankCard = function (item, rank) {
  return `
    <div tabindex="0" role="button"
         onclick="window.appRouter.openDetail('${item.slug}')"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.appRouter.openDetail('${item.slug}');}"
         class="tv-focusable relative flex items-end w-40 md:w-48 flex-shrink-0 cursor-pointer rounded-2xl group transition-all duration-150 pl-6">
      <span class="rank-number absolute left-0 -bottom-2 text-7xl md:text-8xl font-black leading-none select-none z-10 pointer-events-none">
        ${rank}
      </span>
      <div class="relative w-32 md:w-36 aspect-[2/3] rounded-2xl overflow-hidden bg-slate-900 border border-amber-500/25 shadow-2xl shadow-black/80">
        <img src="${item.poster}" alt="${item.title}" loading="lazy"
             onerror="this.onerror=null; this.src='assets/placeholder.svg';"
             class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#07090e] via-[#07090e]/50 to-transparent"></div>
        <span class="absolute top-2 right-2 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded shadow">
          TOP ${rank}
        </span>
        <p class="absolute bottom-2 left-2.5 right-2 text-[11px] font-extrabold text-white line-clamp-2 leading-tight drop-shadow">
          ${item.title}
        </p>
      </div>
    </div>
  `;
};

window.renderMovieCard = function (item, isGrid = false) {
  const widthClass = isGrid ? 'w-full' : 'w-32 md:w-40 flex-shrink-0';
  return `
    <div tabindex="0" role="button"
         onclick="window.appRouter.openDetail('${item.slug}')"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.appRouter.openDetail('${item.slug}');}"
         class="${widthClass} tv-focusable group transition-all duration-150 cursor-pointer rounded-2xl">
      <div class="relative aspect-[2/3] rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-xl shadow-black/75">
        <img src="${item.poster}" alt="${item.title}" loading="lazy"
             onerror="this.onerror=null; this.src='assets/placeholder.svg';"
             class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 group-focus:scale-105" />
        <div class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#07090e] via-[#07090e]/35 to-transparent"></div>
        <span class="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-md shadow">
          ${item.badge || 'FHD'}
        </span>
        ${item.isToday ? `<span class="absolute top-2 right-2 bg-emerald-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded shadow">MỚI</span>` : ''}
        ${item.year ? `<span class="absolute bottom-1.5 right-2 text-[10px] font-bold text-slate-300">${item.year}</span>` : ''}
      </div>
      <p class="mt-2 text-xs font-semibold text-slate-100 line-clamp-2 leading-snug tracking-tight">${item.title}</p>
    </div>
  `;
};
