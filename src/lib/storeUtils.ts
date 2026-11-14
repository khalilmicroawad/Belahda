import { Listing, StoreProfile } from '../types';

export function getStoreBio(store: StoreProfile, isAr: boolean): string {
  const customBio = (store as StoreProfile & { bio?: string }).bio || store.description;
  if (customBio && customBio.trim().length > 0) {
    return customBio.trim();
  }
  const city = store.city || (isAr ? 'الموصل' : 'Mosul');
  return isAr
    ? `متجر تجاري موثوق في ${city} على سوق بلحظة`
    : `Trusted merchant in ${city} on Souq Belahdha`;
}

export function getStoreLocationLabel(store: StoreProfile, isAr: boolean): string {
  const district = (store.district || '').trim();
  const city = (store.city || '').trim();
  if (district && city && district !== city) {
    return `${district}، ${city}`;
  }
  return district || city || (isAr ? 'الموصل' : 'Mosul');
}

export function isStoreActiveTrusted(store: StoreProfile, postsCount: number): boolean {
  return Boolean(
    postsCount >= 30 ||
      (store.totalListingsCount || 0) >= 30 ||
      store.isVerified ||
      Boolean(store.id)
  );
}

export function getStorePostsForStore(store: StoreProfile, listings: Listing[]): Listing[] {
  return listings.filter((item) => {
    const matchesByStoreId = item.storeId && String(item.storeId) === String(store.id);
    const matchesByOwner =
      store.ownerId &&
      item.sellerId === store.ownerId &&
      (item.adType === 'commercial' || item.sellerType === 'commercial');
    return Boolean(matchesByStoreId || matchesByOwner);
  });
}

export function getStoreActivityLabel(posts: Listing[], isAr: boolean): string {
  if (!posts || posts.length === 0) {
    return isAr ? 'متجر مسجل في سوق بلحظة' : 'Registered store';
  }

  let latestTs = 0;
  for (const post of posts) {
    const ts = Number(post.createdTimestamp || 0);
    if (ts > latestTs) latestTs = ts;
  }

  if (!latestTs) {
    return isAr ? 'نشط على سوق بلحظة' : 'Active on Souq Belahdha';
  }

  const now = new Date();
  const latest = new Date(latestTs);
  const diffMs = Math.max(0, now.getTime() - latestTs);
  const isSameDay =
    now.getFullYear() === latest.getFullYear() &&
    now.getMonth() === latest.getMonth() &&
    now.getDate() === latest.getDate();

  if (isSameDay || diffMs < 24 * 60 * 60 * 1000) {
    return isAr ? 'نشر إعلاناً اليوم' : 'Posted today';
  }

  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 1) {
    return isAr ? 'نشر إعلاناً أمس' : 'Posted yesterday';
  }
  if (diffDays < 7) {
    return isAr ? `نشر إعلاناً منذ ${diffDays} أيام` : `Posted ${diffDays}d ago`;
  }

  const formatted = latest.toLocaleDateString(isAr ? 'ar-IQ' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
  return isAr ? `آخر إعلان: ${formatted}` : `Last post: ${formatted}`;
}

export function getStoreWhatsAppUrl(
  phone: string | undefined,
  storeName: string,
  isAr: boolean
): string | null {
  if (!phone) return null;
  const clean = phone.replace(/[^0-9]/g, '');
  if (!clean) return null;
  const formatted = clean.startsWith('0') ? `964${clean.slice(1)}` : clean;
  const message = isAr
    ? `السلام عليكم، أتواصل معكم بخصوص منتجات متجر "${storeName}" على سوق بلحظة.`
    : `Hello, I'm reaching out regarding products from "${storeName}" on Souq Belahdha.`;
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

export function buildStoreShareUrl(storeId: string): string {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('store', storeId);
    return url.toString();
  } catch {
    return `${window.location.origin}/?store=${encodeURIComponent(storeId)}`;
  }
}
