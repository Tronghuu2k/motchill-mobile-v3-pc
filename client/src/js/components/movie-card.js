window.showToast = function (message) {
  let toast = document.getElementById('mobile-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'mobile-toast';
    toast.className = 'fixed top-16 left-1/2 -translate-x-1/2 z-[140] nf-glass text-white text-xs font-bold px-4 py-2.5 rounded border border-neutral-700 shadow-2xl pointer-events-none transition-all duration-200 opacity-0 -translate-y-2 whitespace-nowrap';
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
      <div class="aspect-[2/3] rounded skeleton-box"></div>
      <div class="h-3 w-4/5 rounded skeleton-box mt-2"></div>
    </div>
  `).join('');
};

window.renderTopRankCard = function (item, rank) {
  return `
    <div onclick="window.appRouter.openDetail('${item.slug}')"
         class="relative flex items-end w-36 flex-shrink-0 cursor-pointer group pl-5">
      <span class="rank-number absolute left-0 -bottom-2 text-7xl font-black leading-none select-none z-10 pointer-events-none">
        ${rank}
      </span>
      <div class="relative w-28 aspect-[2/3] rounded overflow-hidden bg-neutral-900 border border-neutral-800 shadow-xl">
        <img src="${item.poster}" alt="${item.title}" loading="lazy"
             onerror="this.onerror=null; this.src='assets/placeholder.svg';"
             class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <div class="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent"></div>
        <span class="absolute top-1.5 right-1.5 bg-[#e50914] text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm">
          TOP ${rank}
        </span>
      </div>
    </div>
  `;
};

window.renderMovieCard = function (item, isGrid = false) {
  const widthClass = isGrid ? 'w-full' : 'w-32 flex-shrink-0';
  return `
    <div onclick="window.appRouter.openDetail('${item.slug}')"
         class="${widthClass} group cursor-pointer">
      <div class="relative aspect-[2/3] rounded overflow-hidden bg-neutral-900 border border-neutral-800/80 shadow-lg">
        <img src="${item.poster}" alt="${item.title}" loading="lazy"
             onerror="this.onerror=null; this.src='assets/placeholder.svg';"
             class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <div class="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#141414] via-[#141414]/30 to-transparent"></div>
        <span class="absolute top-1.5 left-1.5 bg-[#e50914] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm">
          ${item.badge || 'HD'}
        </span>
        ${item.isToday ? `<span class="absolute top-1.5 right-1.5 bg-white text-black text-[8px] font-black px-1.5 py-0.5 rounded-sm">MỚI</span>` : ''}
      </div>
      <p class="mt-1.5 text-xs font-medium text-neutral-200 line-clamp-1 leading-snug">${item.title}</p>
    </div>
  `;
};
