const FAVORITES_STORAGE_KEY = 'balahza_favorites';

export function getFavoriteIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveFavoriteIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage quota errors
  }
}

export function toggleFavoriteId(postId: string): { favorites: string[]; added: boolean } {
  const current = getFavoriteIds();
  const exists = current.includes(postId);
  const next = exists ? current.filter((id) => id !== postId) : [postId, ...current];
  saveFavoriteIds(next);
  return { favorites: next, added: !exists };
}
