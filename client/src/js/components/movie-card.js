window.renderMovieCard = function (item, isGrid = false) {
  const widthClass = isGrid ? 'w-full' : 'w-32 flex-shrink-0';
  return `
    <div onclick="window.appRouter.openDetail('${item.slug}')"
         class="${widthClass} active:scale-95 transition-transform duration-150 cursor-pointer">
      <div class="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80 shadow-md">
        <img src="${item.poster}" alt="${item.title}" loading="lazy"
             onerror="this.src='assets/placeholder.svg'"
             class="w-full h-full object-cover" />
        <span class="absolute top-1.5 left-1.5 bg-red-600/95 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
          ${item.badge || 'HD'}
        </span>
      </div>
      <p class="mt-1.5 text-xs font-medium text-zinc-100 line-clamp-2 leading-snug">${item.title}</p>
    </div>
  `;
};
