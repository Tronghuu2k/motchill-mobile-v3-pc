window.showToast = function (message) {
  let toast = document.getElementById('mobile-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'mobile-toast';
    toast.className = 'fixed top-16 left-1/2 -translate-x-1/2 z-[110] glass-bar text-white text-xs font-bold px-4 py-2.5 rounded-full border border-white/15 shadow-2xl pointer-events-none transition-all duration-200 opacity-0 -translate-y-2 whitespace-nowrap';
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
      <div class="aspect-[2/3] rounded-xl skeleton-box border border-zinc-800/60"></div>
      <div class="h-3 w-4/5 rounded-full skeleton-box mt-2"></div>
      <div class="h-2.5 w-1/2 rounded-full skeleton-box mt-1.5"></div>
    </div>
  `).join('');
};

window.renderMovieCard = function (item, isGrid = false) {
  const widthClass = isGrid ? 'w-full' : 'w-32 md:w-40 flex-shrink-0';
  return `
    <div tabindex="0" role="button"
         onclick="window.appRouter.openDetail('${item.slug}')"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.appRouter.openDetail('${item.slug}');}"
         class="${widthClass} tv-focusable group active:scale-95 transition-all duration-150 cursor-pointer rounded-xl">
      <div class="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shadow-xl shadow-black/70">
        <img src="${item.poster}" alt="${item.title}" loading="lazy"
             onerror="this.onerror=null; this.src='assets/placeholder.svg';"
             class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 group-focus:scale-105" />
        <div class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/95 via-black/35 to-transparent"></div>
        <span class="absolute top-1.5 left-1.5 bg-[#E50914] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
          ${item.badge || 'FHD'}
        </span>
        ${item.isToday ? `<span class="absolute top-1.5 right-1.5 bg-emerald-500 text-zinc-950 text-[8px] font-black px-1.5 py-0.5 rounded shadow">MỚI</span>` : ''}
        ${item.year ? `<span class="absolute bottom-1.5 right-2 text-[10px] font-bold text-zinc-300/95">${item.year}</span>` : ''}
      </div>
      <p class="mt-1.5 text-xs font-semibold text-zinc-100 line-clamp-2 leading-snug tracking-tight">${item.title}</p>
    </div>
  `;
};
