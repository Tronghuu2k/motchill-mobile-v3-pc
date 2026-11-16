window.appStorage = {
  getFavorites() {
    try { return JSON.parse(localStorage.getItem('motchill_favs') || '[]'); } catch { return []; }
  },
  toggleFavorite(movie) {
    const list = this.getFavorites();
    const idx = list.findIndex(m => m.slug === movie.slug);
    if (idx > -1) list.splice(idx, 1);
    else list.unshift({ slug: movie.slug, title: movie.title, poster: movie.poster, badge: movie.badge || 'HD' });
    localStorage.setItem('motchill_favs', JSON.stringify(list));
    return idx === -1;
  },
  isFavorite(slug) {
    return this.getFavorites().some(m => m.slug === slug);
  },
  saveHistory(movie, epNum) {
    try {
      const list = JSON.parse(localStorage.getItem('motchill_history') || '[]').filter(m => m.slug !== movie.slug);
      list.unshift({ slug: movie.slug, title: movie.title, poster: movie.poster, ep: epNum, updatedAt: Date.now() });
      localStorage.setItem('motchill_history', JSON.stringify(list.slice(0, 30)));
    } catch {}
  },
  getHistory() {
    try { return JSON.parse(localStorage.getItem('motchill_history') || '[]'); } catch { return []; }
  }
};
