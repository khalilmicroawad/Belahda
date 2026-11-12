import { Listing, StoreProfile } from '../types';

export const REQUIRED_POSTS_FOR_STORE = 30;

export interface PostValidationDetails {
  isValid: boolean;
  reasonAr?: string;
  reasonEn?: string;
}

/**
 * Validates whether a post is genuine and non-spam:
 * - Title minimum 8 characters
 * - Description minimum 15 characters
 * - Has at least 1 image attached
 * - Not an exact duplicate title of another post by the same user
 */
export function validatePostForStoreUnlock(
  post: Listing,
  allUserPosts: Listing[]
): PostValidationDetails {
  const title = (post.title || '').trim();
  const desc = (post.description || '').trim();

  if (title.length < 8) {
    return {
      isValid: false,
      reasonAr: 'عنوان الإعلان قصير جداً (أقل من 8 أحرف)',
      reasonEn: 'Title is too short (min 8 chars)'
    };
  }

  if (desc.length < 15) {
    return {
      isValid: false,
      reasonAr: 'تفاصيل الإعلان مختصرة جداً (أقل من 15 حرفاً)',
      reasonEn: 'Description too short (min 15 chars)'
    };
  }

  if (!Array.isArray(post.mediaUrls) || post.mediaUrls.length === 0) {
    return {
      isValid: false,
      reasonAr: 'يجب إرفاق صورة واحدة حقيقية على الأقل',
      reasonEn: 'At least 1 photo required'
    };
  }

  // Anti-repetitive duplicate spam check
  const duplicate = allUserPosts.find(
    (other) =>
      other.id !== post.id &&
      other.title.trim().toLowerCase() === title.toLowerCase()
  );

  if (duplicate) {
    return {
      isValid: false,
      reasonAr: 'إعلان مكرر بنفس العنوان لتجنب استغلال شرط الـ 30 إعلاناً',
      reasonEn: 'Duplicate title detected'
    };
  }

  return { isValid: true };
}

/**
 * Calculates genuine non-spam posts count for a seller toward the 30-post requirement.
 */
export function calculateStoreUnlockProgress(userPosts: Listing[]): {
  totalCount: number;
  validCount: number;
  spamCount: number;
  isUnlocked: boolean;
  remainingCount: number;
  percentage: number;
  validListings: Listing[];
  spamListings: { listing: Listing; reasonAr: string }[];
} {
  const totalCount = userPosts.length;
  const validListings: Listing[] = [];
  const spamListings: { listing: Listing; reasonAr: string }[] = [];
  const seenTitles = new Set<string>();

  for (const post of userPosts) {
    const titleNorm = (post.title || '').trim().toLowerCase();
    const isDup = seenTitles.has(titleNorm);
    const isShortTitle = (post.title || '').trim().length < 8;
    const isShortDesc = (post.description || '').trim().length < 15;
    const hasMedia = Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0;

    if (isDup) {
      spamListings.push({
        listing: post,
        reasonAr: 'إعلان مكرر بعنوان مطابق'
      });
    } else if (isShortTitle || isShortDesc) {
      spamListings.push({
        listing: post,
        reasonAr: 'إعلان يفتقر للمواصفات أو التفاصيل الكافية'
      });
    } else if (!hasMedia) {
      spamListings.push({
        listing: post,
        reasonAr: 'إعلان بدون صور مرفقة'
      });
    } else {
      seenTitles.add(titleNorm);
      validListings.push(post);
    }
  }

  const validCount = validListings.length;
  const spamCount = spamListings.length;
  const isUnlocked = validCount >= REQUIRED_POSTS_FOR_STORE;
  const remainingCount = Math.max(0, REQUIRED_POSTS_FOR_STORE - validCount);
  const percentage = Math.min(100, Math.round((validCount / REQUIRED_POSTS_FOR_STORE) * 100));

  return {
    totalCount,
    validCount,
    spamCount,
    isUnlocked,
    remainingCount,
    percentage,
    validListings,
    spamListings
  };
}

/**
 * Store Inactivity & Auto-Archive check:
 * Inactive for over 30 days flags or archives the store.
 */
export function getStoreActivityStatus(store: StoreProfile): {
  isActive: boolean;
  statusLabelAr: string;
  statusLabelEn: string;
  daysSinceActive: number;
} {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const lastActive = store.lastActiveAt || store.createdAt || now;
  const diffMs = now - lastActive;
  const daysSinceActive = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (store.isArchived || diffMs > THIRTY_DAYS_MS) {
    return {
      isActive: false,
      statusLabelAr: 'متجر غير نشط (مؤرشف تلقائياً > 30 يوم)',
      statusLabelEn: 'Inactive (>30 days)',
      daysSinceActive
    };
  }

  if (daysSinceActive <= 3) {
    return {
      isActive: true,
      statusLabelAr: 'متجر نشط حالياً بالموصل',
      statusLabelEn: 'Active Now',
      daysSinceActive
    };
  }

  return {
    isActive: true,
    statusLabelAr: `نشط منذ ${daysSinceActive} أيام`,
    statusLabelEn: `Active ${daysSinceActive}d ago`,
    daysSinceActive
  };
}
