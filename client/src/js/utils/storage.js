window.appStorage = {
  getFavorites() {
    try { return JSON.parse(localStorage.getItem('rosi_favs') || '[]'); } catch { return []; }
  },
  toggleFavorite(movie) {
    const list = this.getFavorites();
    const idx = list.findIndex(m => m.slug === movie.slug);
    if (idx > -1) list.splice(idx, 1);
    else {
      list.unshift({
        slug: movie.slug,
        title: movie.title,
        poster: movie.poster,
        badge: movie.badge || movie.status || 'HD',
        genre: movie.genre || '',
        lastKnownStatus: movie.status || movie.badge || ''
      });
    }
    localStorage.setItem('rosi_favs', JSON.stringify(list));
    return idx === -1;
  },
  updateFavoriteStatus(slug, newStatus) {
    const list = this.getFavorites();
    const item = list.find(m => m.slug === slug);
    if (item && newStatus) {
      item.lastKnownStatus = newStatus;
      item.badge = newStatus;
      localStorage.setItem('rosi_favs', JSON.stringify(list));
    }
  },
  isFavorite(slug) {
    return this.getFavorites().some(m => m.slug === slug);
  },
  saveHistory(movie, epNum) {
    try {
      const list = JSON.parse(localStorage.getItem('rosi_history') || '[]').filter(m => m.slug !== movie.slug);
      list.unshift({
        slug: movie.slug,
        title: movie.title,
        poster: movie.poster,
        ep: epNum,
        genre: movie.genre || '',
        updatedAt: Date.now()
      });
      localStorage.setItem('rosi_history', JSON.stringify(list.slice(0, 30)));
    } catch {}
  },
  getHistory() {
    try { return JSON.parse(localStorage.getItem('rosi_history') || '[]'); } catch { return []; }
  },
  clearHistory() {
    localStorage.removeItem('rosi_history');
  },
  saveProgress(slug, epNum, seconds) {
    try {
      if (seconds > 5) localStorage.setItem(`rosi_prog_${slug}_${epNum}`, Math.floor(seconds));
    } catch {}
  },
  getProgress(slug, epNum) {
    try { return parseInt(localStorage.getItem(`rosi_prog_${slug}_${epNum}`) || '0', 10); } catch { return 0; }
  },
  getAspectMode() {
    try { return localStorage.getItem('rosi_aspect_mode') || '16:9'; } catch { return '16:9'; }
  },
  setAspectMode(mode) {
    try { localStorage.setItem('rosi_aspect_mode', mode); } catch {}
  },
  getLastDailySyncDate() {
    try { return localStorage.getItem('rosi_last_daily_sync') || ''; } catch { return ''; }
  },
  setLastDailySyncDate(dateStr) {
    try { localStorage.setItem('rosi_last_daily_sync', dateStr); } catch {}
  }
};
