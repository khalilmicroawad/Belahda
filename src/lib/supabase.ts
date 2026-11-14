import { createClient, Session, User } from '@supabase/supabase-js';
import { Listing, StoreProfile, UserAccount, CategoryId, ItemCondition, SellerType } from '../types';

export const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL || 'https://yzseuychjsojkkqbtbjn.supabase.co'
).trim();
export const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_h97VyRWzs_m7KgxgleLZzg_1cUAdAM9'
).trim();

export const SUPABASE_BUCKET = 'app-uploads';

export function getSupabaseConfigStatus(): {
  isValid: boolean;
  missing: string[];
  message: string;
} {
  const missing: string[] = [];
  if (!SUPABASE_URL || !SUPABASE_URL.startsWith('https://')) {
    missing.push('VITE_SUPABASE_URL');
  }
  if (!SUPABASE_ANON_KEY) {
    missing.push('VITE_SUPABASE_ANON_KEY');
  }
  return {
    isValid: missing.length === 0,
    missing,
    message:
      missing.length > 0
        ? `Missing or invalid Supabase configuration: ${missing.join(', ')}`
        : '',
  };
}

export const supabase = createClient(
  SUPABASE_URL || 'https://invalid.supabase.co',
  SUPABASE_ANON_KEY || 'missing-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// ==========================================
// 1. AUTHENTICATION (Email / Password)
// ==========================================

export async function signUpWithEmail(params: {
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  isSeller?: boolean;
}) {
  const { email, password, name, phoneNumber, isSeller = false } = params;
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        name: name.trim(),
        phone_number: phoneNumber.trim(),
        is_seller: isSeller,
      },
    },
  });

  if (error) throw error;

  if (data.user) {
    // Upsert profile row (will succeed when session is active or RLS allows)
    await upsertUserProfile({
      id: data.user.id,
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim(),
      isSeller,
      createdAt: Date.now(),
    }).catch(() => {});
  }

  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function mapAuthUserToAccount(authUser: User, profileRow?: any): UserAccount {
  const meta = authUser.user_metadata || {};
  return {
    id: authUser.id,
    name: profileRow?.name || meta.name || authUser.email?.split('@')[0] || 'مستخدم سوق بلحظة',
    phoneNumber: profileRow?.phone_number || meta.phone_number || '',
    email: profileRow?.email || authUser.email || '',
    avatarUrl: profileRow?.avatar_url || undefined,
    isSeller: Boolean(profileRow?.is_seller ?? meta.is_seller ?? false),
    hasCustomStore: Boolean(profileRow?.has_custom_store ?? false),
    customStoreId: profileRow?.custom_store_id || undefined,
    createdAt: profileRow?.created_at
      ? new Date(profileRow.created_at).getTime()
      : new Date(authUser.created_at).getTime(),
  };
}

// ==========================================
// 2. USER PROFILES TABLE (profiles)
// ==========================================

export async function fetchUserProfile(userId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Supabase fetchUserProfile error:', error.message);
    return null;
  }
  return data;
}

export async function upsertUserProfile(account: UserAccount): Promise<boolean> {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: account.id,
      name: account.name,
      phone_number: account.phoneNumber,
      email: account.email || null,
      avatar_url: account.avatarUrl || null,
      is_seller: Boolean(account.isSeller),
      has_custom_store: Boolean(account.hasCustomStore),
      custom_store_id: account.customStoreId || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.warn('Supabase upsertUserProfile error:', error.message);
    return false;
  }
  return true;
}

// ==========================================
// 3. STORAGE BUCKET (app-uploads)
// ==========================================

export async function uploadFileToStorage(
  file: File | Blob,
  folder: 'listings' | 'avatars' | 'store-logos' | 'store-covers' = 'listings',
  fileNameOverride?: string
): Promise<string> {
  const ext =
    file instanceof File && file.name.includes('.')
      ? file.name.split('.').pop()?.toLowerCase() || 'jpg'
      : 'jpg';
  const safeName =
    fileNameOverride ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const filePath = `${folder}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

// ==========================================
// 4. POSTS & LISTINGS TABLES (posts / listings)
// ==========================================

function formatPostDateLabel(isoDate?: string): string {
  if (!isoDate) return 'اليوم';
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return 'اليوم';
  const diffMins = Math.floor((Date.now() - ts) / 60000);
  if (diffMins < 2) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} د`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `اليوم · منذ ${diffHours} س`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  return new Date(ts).toLocaleDateString('ar-IQ');
}

export function mapPostRowToListing(row: any): Listing {
  const fullImg = row.full_image_url || row.image_url || undefined;
  const thumbImg = row.thumbnail_url || undefined;
  const fallbackUrls =
    Array.isArray(row.media_urls) && row.media_urls.length > 0
      ? row.media_urls
      : fullImg
      ? [fullImg]
      : thumbImg
      ? [thumbImg]
      : [];

  const createdTs = row.created_timestamp
    ? Number(row.created_timestamp)
    : row.created_at
    ? new Date(row.created_at).getTime()
    : Date.now();

  const sellerPhone = row.seller_phone || '';
  const resolvedAdType = (row.ad_type || row.seller_type || 'personal') as SellerType;
  const latNum =
    row.latitude != null && !Number.isNaN(Number(row.latitude))
      ? Number(row.latitude)
      : row.store_location?.lat != null
      ? Number(row.store_location.lat)
      : undefined;
  const lngNum =
    row.longitude != null && !Number.isNaN(Number(row.longitude))
      ? Number(row.longitude)
      : row.store_location?.lng != null
      ? Number(row.store_location.lng)
      : undefined;
  const resolvedMapsUrl =
    row.maps_url ||
    (latNum !== undefined && lngNum !== undefined
      ? `https://www.google.com/maps?q=${latNum},${lngNum}`
      : undefined);

  return {
    id: String(row.id),
    title: row.title || '',
    description: row.description || '',
    price: Number(row.price || 0),
    currency: row.currency || 'د.ع',
    hidePrice: Boolean(row.hide_price),
    category: (row.category || 'electronics') as CategoryId,
    condition: (row.condition || 'new') as ItemCondition,
    sellerType: resolvedAdType,
    adType: resolvedAdType,
    storeId: row.store_id ? String(row.store_id) : undefined,
    storeName: row.store_name || undefined,
    storeLocation: row.store_location || undefined,
    latitude: latNum,
    longitude: lngNum,
    mapsUrl: resolvedMapsUrl,
    city: row.city || 'الموصل',
    district: row.district || 'حي الزهور',
    deliveryAvailable: row.delivery_available !== undefined ? Boolean(row.delivery_available) : true,
    deliveryNotes: row.delivery_notes || undefined,
    mediaUrls: fallbackUrls,
    thumbnailUrl: thumbImg || fallbackUrls[0] || undefined,
    fullImageUrl: fullImg || fallbackUrls[0] || undefined,
    contactOptions:
      row.contact_options && typeof row.contact_options === 'object'
        ? {
            directChat: Boolean(row.contact_options.directChat ?? true),
            whatsapp: Boolean(row.contact_options.whatsapp ?? Boolean(sellerPhone)),
            phoneCall: Boolean(row.contact_options.phoneCall ?? Boolean(sellerPhone)),
            whatsappNumber: row.contact_options.whatsappNumber || sellerPhone || undefined,
            phoneNumber: row.contact_options.phoneNumber || sellerPhone || undefined,
          }
        : {
            directChat: true,
            whatsapp: Boolean(sellerPhone),
            phoneCall: Boolean(sellerPhone),
            whatsappNumber: sellerPhone || undefined,
            phoneNumber: sellerPhone || undefined,
          },
    createdAt: row.created_at_label || formatPostDateLabel(row.created_at),
    createdTimestamp: createdTs,
    viewsCount: Number(row.views_count || 1),
    sellerId: row.user_id || undefined,
    sellerName: row.seller_name || 'بائع في سوق بلحظة',
    sellerPhone,
    sellerAvatar: row.seller_avatar || undefined,
    isVerified: Boolean(row.is_verified),
    isSoldOut: Boolean(row.is_sold_out),
  };
}

export interface FetchPostsResult {
  posts: Listing[];
  error: string | null;
  errorCode: string | null;
}

/**
 * Publicly fetches all posts directly from Supabase `posts` table ordered newest first (`created_at` descending).
 * Never hides database errors behind mock arrays or localStorage.
 */
export async function fetchSupabasePosts(): Promise<FetchPostsResult> {
  const cfg = getSupabaseConfigStatus();
  if (!cfg.isValid) {
    return {
      posts: [],
      error: cfg.message,
      errorCode: 'MISSING_CONFIG',
    };
  }

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetchSupabasePosts error:', error);
    return {
      posts: [],
      error: error.message || 'Failed to load posts from Supabase.',
      errorCode: error.code || 'SUPABASE_SELECT_ERROR',
    };
  }

  return {
    posts: (data || []).map(mapPostRowToListing),
    error: null,
    errorCode: null,
  };
}

/**
 * Subscribes to Supabase Realtime changes (INSERT, UPDATE, DELETE) on the public `posts` table.
 */
export function subscribeToSupabasePosts(callbacks: {
  onInsert?: (listing: Listing) => void;
  onUpdate?: (listing: Listing) => void;
  onDelete?: (id: string) => void;
}): () => void {
  const channel = supabase
    .channel(`public-posts-feed-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      (payload) => {
        if (payload.eventType === 'INSERT' && payload.new && callbacks.onInsert) {
          callbacks.onInsert(mapPostRowToListing(payload.new));
        } else if (payload.eventType === 'UPDATE' && payload.new && callbacks.onUpdate) {
          callbacks.onUpdate(mapPostRowToListing(payload.new));
        } else if (payload.eventType === 'DELETE' && payload.old?.id && callbacks.onDelete) {
          callbacks.onDelete(String(payload.old.id));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

function sanitizeUndefinedToNull(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeUndefinedToNull);
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      out[key] = sanitizeUndefinedToNull(val);
    } else {
      out[key] = null;
    }
  }
  return out;
}

export interface SavePostResult {
  ok: boolean;
  savedListing?: Listing;
  error?: string;
  errorCode?: string;
  errorDetails?: string;
  errorHint?: string;
}

/**
 * Inserts a newly created post directly into Supabase `posts` table using `.insert([...]).select().single()`.
 * Verifies user via `supabase.auth.getUser()` so `user_id` is only attached if valid (otherwise `null`).
 * Returns exact Supabase `error.message` and `error.code` if anything fails.
 */
export async function saveSupabasePost(listing: Listing): Promise<SavePostResult> {
  const cfg = getSupabaseConfigStatus();
  if (!cfg.isValid) {
    return {
      ok: false,
      error: cfg.message,
      errorCode: 'MISSING_CONFIG',
    };
  }

  // Only attach user_id if Supabase Auth returns a verified logged-in user; otherwise null
  const { data: userRes, error: authErr } = await supabase.auth.getUser();
  const validUserId: string | null = !authErr && userRes?.user?.id ? userRes.user.id : null;

  const cleanMediaUrls = Array.isArray(listing.mediaUrls)
    ? listing.mediaUrls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    : [];

  const thumbnailUrl = listing.thumbnailUrl || cleanMediaUrls[0] || null;
  const fullImageUrl = listing.fullImageUrl || cleanMediaUrls[0] || null;
  const createdIso = new Date(listing.createdTimestamp || Date.now()).toISOString();

  const resolvedAdType: SellerType = listing.adType || listing.sellerType || 'personal';
  let resolvedStoreId: string | null = listing.storeId || null;
  let resolvedStoreName: string | null = listing.storeName || null;

  // Automatically attach owner's store_id if user owns a store and selected Commercial
  if (validUserId && resolvedAdType === 'commercial' && !resolvedStoreId) {
    const ownedStore = await fetchUserOwnedStore(validUserId).catch(() => null);
    if (ownedStore) {
      resolvedStoreId = String(ownedStore.id);
      resolvedStoreName = ownedStore.name || resolvedStoreName;
    }
  }

  const latVal = listing.latitude ?? listing.storeLocation?.lat ?? null;
  const lngVal = listing.longitude ?? listing.storeLocation?.lng ?? null;
  const mapsUrlVal =
    listing.mapsUrl ||
    (latVal !== null && lngVal !== null ? `https://www.google.com/maps?q=${latVal},${lngVal}` : null);

  const rawPayload = {
    id: listing.id,
    user_id: validUserId,
    title: (listing.title || '').trim(),
    description: (listing.description || '').trim(),
    price: Number.isFinite(Number(listing.price)) ? Number(listing.price) : 0,
    currency: listing.currency || 'د.ع',
    hide_price: Boolean(listing.hidePrice),
    category: listing.category || 'electronics',
    condition: listing.condition || 'new',
    seller_type: resolvedAdType,
    ad_type: resolvedAdType,
    store_id: resolvedStoreId,
    store_name: resolvedStoreName,
    store_location: listing.storeLocation ? sanitizeUndefinedToNull(listing.storeLocation) : null,
    latitude: latVal,
    longitude: lngVal,
    maps_url: mapsUrlVal,
    city: listing.city || 'الموصل',
    district: listing.district || 'حي الزهور',
    delivery_available: Boolean(listing.deliveryAvailable),
    delivery_notes: listing.deliveryNotes || null,
    media_urls: cleanMediaUrls.length > 0 ? cleanMediaUrls : fullImageUrl ? [fullImageUrl] : [],
    thumbnail_url: thumbnailUrl,
    full_image_url: fullImageUrl,
    contact_options: sanitizeUndefinedToNull({
      directChat: Boolean(listing.contactOptions?.directChat ?? true),
      whatsapp: Boolean(listing.contactOptions?.whatsapp ?? false),
      phoneCall: Boolean(listing.contactOptions?.phoneCall ?? false),
      whatsappNumber: listing.contactOptions?.whatsappNumber || listing.sellerPhone || null,
      phoneNumber: listing.contactOptions?.phoneNumber || listing.sellerPhone || null,
    }),
    seller_name: (listing.sellerName || '').trim(),
    seller_phone: (listing.sellerPhone || '').trim(),
    seller_avatar: listing.sellerAvatar || null,
    is_verified: Boolean(listing.isVerified || resolvedStoreId),
    views_count: Number(listing.viewsCount || 1),
    created_at: createdIso,
  };

  let attemptPayload: Record<string, any> = sanitizeUndefinedToNull(rawPayload);
  let data: any = null;
  let error: any = null;
  let triedImageUrlFallback = false;

  for (let attempt = 0; attempt < 30; attempt++) {
    const res = await supabase
      .from('posts')
      .insert([attemptPayload])
      .select()
      .single();

    data = res.data;
    error = res.error;

    if (!error && data) {
      break;
    }

    // Handle schema cache mismatch (column does not exist in user's existing posts table)
    if (error?.code === 'PGRST204' && typeof error?.message === 'string') {
      const match = error.message.match(/Could not find the '([^']+)' column/i);
      const missingCol = match?.[1];
      if (missingCol && missingCol in attemptPayload) {
        delete attemptPayload[missingCol];
        if (missingCol === 'full_image_url' && !triedImageUrlFallback && fullImageUrl) {
          attemptPayload.image_url = fullImageUrl;
          triedImageUrlFallback = true;
        }
        continue;
      }
    }

    // Handle type mismatch (e.g. existing posts.id is bigint/serial or uuid instead of text)
    if (error?.code === '22P02' && typeof error?.message === 'string') {
      const lowerMsg = error.message.toLowerCase();
      const badValueMatch = error.message.match(/:\s*"([^"]+)"/);
      const badValue = badValueMatch?.[1];

      if (lowerMsg.includes('uuid')) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (attemptPayload.id && !uuidRegex.test(String(attemptPayload.id))) {
          attemptPayload.id =
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : undefined;
          if (!attemptPayload.id) delete attemptPayload.id;
          continue;
        }
      }

      if (
        lowerMsg.includes('bigint') ||
        lowerMsg.includes('integer') ||
        lowerMsg.includes('int8') ||
        lowerMsg.includes('int4')
      ) {
        if ('id' in attemptPayload && (!badValue || String(attemptPayload.id) === badValue)) {
          delete attemptPayload.id;
          continue;
        }
        if (badValue) {
          const matchingKey = Object.keys(attemptPayload).find(
            (k) => String(attemptPayload[k]) === badValue
          );
          if (matchingKey) {
            delete attemptPayload[matchingKey];
            continue;
          }
        }
      }
    }

    // Handle pre-existing NOT NULL constraints (e.g. id without default or image_url)
    if (error?.code === '23502' && typeof error?.message === 'string') {
      const notNullMatch = error.message.match(/null value in column "([^"]+)"/i);
      const col = notNullMatch?.[1];
      if (col === 'id' && !('id' in attemptPayload)) {
        attemptPayload.id = Date.now() * 100 + Math.floor(Math.random() * 100);
        continue;
      }
      if (col === 'image_url' && !triedImageUrlFallback && fullImageUrl) {
        attemptPayload.image_url = fullImageUrl;
        triedImageUrlFallback = true;
        continue;
      }
    }

    break;
  }

  if (error || !data) {
    console.error('Supabase posts.insert error:', error);
    return {
      ok: false,
      error:
        error?.message ||
        'Supabase insert returned no saved row (verify RLS INSERT/SELECT policies on posts).',
      errorCode: error?.code || 'INSERT_FAILED',
      errorDetails: error?.details || undefined,
      errorHint: error?.hint || undefined,
    };
  }

  return {
    ok: true,
    savedListing: mapPostRowToListing(data),
  };
}

export async function deleteSupabasePost(id: string): Promise<boolean> {
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) {
    console.warn('Supabase deletePost warning:', error.message);
    return false;
  }
  return true;
}

export async function updatePostSoldOutStatus(
  postId: string,
  isSoldOut: boolean
): Promise<{ ok: boolean; savedListing?: Listing; error?: string }> {
  const numericId = /^\d+$/.test(String(postId)) ? Number(postId) : postId;
  const { data, error } = await supabase
    .from('posts')
    .update({ is_sold_out: isSoldOut })
    .eq('id', numericId)
    .select()
    .maybeSingle();

  if (error) {
    console.warn('Supabase updatePostSoldOutStatus error:', error.message);
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    savedListing: data ? mapPostRowToListing(data) : undefined,
  };
}

function mapRowToListing(row: any): Listing {
  return mapPostRowToListing(row);
}

export async function fetchSupabaseListings(): Promise<Listing[] | null> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .order('created_timestamp', { ascending: false });

  if (error) {
    console.warn('Supabase fetchListings warning:', error.message);
    return null;
  }
  return (data || []).map(mapRowToListing);
}

export async function saveSupabaseListing(listing: Listing, authUserId?: string): Promise<boolean> {
  const thumbnailUrl = listing.thumbnailUrl || listing.mediaUrls?.[0] || null;
  const fullImageUrl = listing.fullImageUrl || listing.mediaUrls?.[0] || null;

  const { error } = await supabase.from('listings').upsert(
    {
      id: listing.id,
      user_id: authUserId || listing.sellerId || null,
      title: listing.title,
      description: listing.description,
      price: Number(listing.price || 0),
      currency: listing.currency || 'د.ع',
      hide_price: Boolean(listing.hidePrice),
      category: listing.category,
      condition: listing.condition,
      seller_type: listing.sellerType,
      store_id: listing.storeId || null,
      store_name: listing.storeName || null,
      store_location: listing.storeLocation || null,
      city: listing.city || 'الموصل',
      district: listing.district || 'حي الزهور',
      delivery_available: Boolean(listing.deliveryAvailable),
      delivery_notes: listing.deliveryNotes || null,
      media_urls: listing.mediaUrls || [],
      thumbnail_url: thumbnailUrl,
      full_image_url: fullImageUrl,
      contact_options: listing.contactOptions || {},
      created_at_label: listing.createdAt || 'الآن',
      created_timestamp: Number(listing.createdTimestamp || Date.now()),
      views_count: Number(listing.viewsCount || 1),
      seller_name: listing.sellerName || '',
      seller_phone: listing.sellerPhone || '',
      seller_avatar: listing.sellerAvatar || null,
      is_verified: Boolean(listing.isVerified),
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.warn('Supabase saveListing warning:', error.message);
    return false;
  }
  return true;
}

export async function deleteSupabaseListing(id: string): Promise<boolean> {
  return deleteSupabasePost(id);
}

// ==========================================
// 5. STORES TABLE (stores)
// ==========================================

function mapRowToStore(row: any): StoreProfile {
  const storeName = row.store_name || row.name || 'متجر في سوق بلحظة';
  const storePhone = row.phone || row.phone_number || row.owner_phone || row.whatsapp_number || '';
  return {
    id: String(row.id),
    name: storeName,
    ownerId: row.owner_id || undefined,
    ownerPhone: row.owner_phone || storePhone,
    description: row.description || '',
    logoUrl: row.logo_url || undefined,
    coverUrl: row.cover_url || undefined,
    district: row.district || 'الموصل',
    city: row.city || 'الموصل',
    address: row.address || '',
    category: (row.category || 'electronics') as CategoryId,
    whatsappNumber: row.whatsapp_number || storePhone,
    phoneNumber: storePhone,
    socialLinks: row.social_links || undefined,
    deliveryAvailable: Boolean(row.delivery_available),
    deliveryNotes: row.delivery_notes || undefined,
    isVerified: row.is_verified !== undefined ? Boolean(row.is_verified) : true,
    totalListingsCount: Number(row.total_listings_count || 0),
    rating: row.rating ? Number(row.rating) : 5.0,
    lat: row.lat ? Number(row.lat) : undefined,
    lng: row.lng ? Number(row.lng) : undefined,
    lastActiveAt: row.last_active_at ? Number(row.last_active_at) : undefined,
    isArchived: Boolean(row.is_archived),
    createdAt: Number(row.created_at_ts || (row.created_at ? new Date(row.created_at).getTime() : Date.now())),
  };
}

export async function fetchSupabaseStores(): Promise<StoreProfile[] | null> {
  let { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    const fallback = await supabase.from('stores').select('*');
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.warn('Supabase fetchStores warning:', error.message);
    return null;
  }
  return (data || []).map(mapRowToStore);
}

export async function fetchUserOwnedStore(ownerId: string): Promise<StoreProfile | null> {
  if (!ownerId) return null;
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', ownerId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapRowToStore(data);
}

export async function fetchStoreById(storeId: string): Promise<StoreProfile | null> {
  if (!storeId) return null;
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapRowToStore(data);
}

export async function fetchPostsByStoreId(storeId: string): Promise<Listing[]> {
  if (!storeId) return [];
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Supabase fetchPostsByStoreId warning:', error.message);
    return [];
  }
  return (data || []).map(mapPostRowToListing);
}

export async function fetchUserCommercialStats(userId: string): Promise<{
  commercialCount: number;
  userStore: StoreProfile | null;
}> {
  if (!userId) return { commercialCount: 0, userStore: null };

  const [storeRes, adTypeCountRes] = await Promise.all([
    fetchUserOwnedStore(userId),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('ad_type', 'commercial'),
  ]);

  let commercialCount = 0;
  if (!adTypeCountRes.error && typeof adTypeCountRes.count === 'number') {
    commercialCount = adTypeCountRes.count;
  } else {
    // Fallback if ad_type column is not yet in schema cache
    const sellerTypeRes = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('seller_type', 'commercial');
    commercialCount = typeof sellerTypeRes.count === 'number' ? sellerTypeRes.count : 0;
  }

  return {
    commercialCount,
    userStore: storeRes,
  };
}

export async function createUserFreeStore(params: {
  ownerId: string;
  storeName: string;
  phone: string;
}): Promise<{ ok: boolean; store?: StoreProfile; error?: string }> {
  const { ownerId, storeName, phone } = params;
  const cleanName = storeName.trim();
  const cleanPhone = phone.trim();

  if (!ownerId || !cleanName || !cleanPhone) {
    return { ok: false, error: 'Missing owner, store name, or phone number.' };
  }

  let payload: Record<string, any> = {
    id: `store-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    owner_id: ownerId,
    store_name: cleanName,
    name: cleanName,
    phone: cleanPhone,
    phone_number: cleanPhone,
    owner_phone: cleanPhone,
    whatsapp_number: cleanPhone,
    is_verified: true,
    created_at_ts: Date.now(),
  };

  let insertedRow: any = null;
  let lastError: any = null;

  for (let i = 0; i < 15; i++) {
    const res = await supabase.from('stores').insert([payload]).select().single();
    insertedRow = res.data;
    lastError = res.error;

    if (!lastError && insertedRow) break;

    if (lastError?.code === 'PGRST204' && typeof lastError.message === 'string') {
      const m = lastError.message.match(/Could not find the '([^']+)' column/i);
      const col = m?.[1];
      if (col && col in payload) {
        delete payload[col];
        continue;
      }
    }

    if (lastError?.code === '22P02' && typeof lastError.message === 'string') {
      const lower = lastError.message.toLowerCase();
      if (lower.includes('bigint') || lower.includes('integer')) {
        delete payload.id;
        continue;
      }
      if (lower.includes('uuid')) {
        payload.id =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : undefined;
        if (!payload.id) delete payload.id;
        continue;
      }
    }

    break;
  }

  if (lastError || !insertedRow) {
    return {
      ok: false,
      error: lastError?.message || 'Failed to create store in Supabase.',
    };
  }

  const createdStore = mapRowToStore(insertedRow);

  // Link all existing commercial posts of this user to the newly created store
  const linkByAdType = await supabase
    .from('posts')
    .update({ store_id: createdStore.id, store_name: createdStore.name })
    .eq('user_id', ownerId)
    .eq('ad_type', 'commercial');

  if (linkByAdType.error?.code === 'PGRST204') {
    await supabase
      .from('posts')
      .update({ store_id: createdStore.id })
      .eq('user_id', ownerId)
      .eq('seller_type', 'commercial');
  }

  return { ok: true, store: createdStore };
}

export async function saveSupabaseStore(store: StoreProfile, authUserId?: string): Promise<boolean> {
  const { error } = await supabase.from('stores').upsert(
    {
      id: store.id,
      owner_id: authUserId || store.ownerId || null,
      name: store.name,
      store_name: store.name,
      phone: store.phoneNumber || store.ownerPhone || '',
      owner_phone: store.ownerPhone || '',
      description: store.description || '',
      logo_url: store.logoUrl || null,
      cover_url: store.coverUrl || null,
      district: store.district || 'حي الزهور',
      city: store.city || 'الموصل',
      address: store.address || '',
      category: store.category || 'electronics',
      whatsapp_number: store.whatsappNumber || '',
      phone_number: store.phoneNumber || '',
      social_links: store.socialLinks || null,
      delivery_available: Boolean(store.deliveryAvailable),
      delivery_notes: store.deliveryNotes || null,
      is_verified: Boolean(store.isVerified),
      total_listings_count: Number(store.totalListingsCount || 1),
      rating: Number(store.rating || 5.0),
      lat: store.lat ?? null,
      lng: store.lng ?? null,
      last_active_at: Number(store.lastActiveAt || Date.now()),
      is_archived: Boolean(store.isArchived),
      created_at_ts: Number(store.createdAt || Date.now()),
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.warn('Supabase saveStore warning:', error.message);
    return false;
  }
  return true;
}

// ==========================================
// 6. VISITOR LOGS TABLE (visitor_logs)
// ==========================================

const SESSION_VISITOR_KEY = 'souq_visitor_session_id';

/**
 * Inserts one visitor record per browser session (guarded via sessionStorage)
 * and returns the total visitor count from Supabase `visitor_logs`.
 */
export async function trackSessionVisitor(): Promise<number | null> {
  if (typeof window === 'undefined') return null;

  let sessionId = '';
  let shouldInsert = false;
  try {
    const existing = window.sessionStorage.getItem(SESSION_VISITOR_KEY);
    if (existing) {
      sessionId = existing;
    } else {
      sessionId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem(SESSION_VISITOR_KEY, sessionId);
      shouldInsert = true;
    }
  } catch {
    sessionId = `sess-${Date.now()}`;
    shouldInsert = true;
  }

  if (shouldInsert) {
    let payload: Record<string, any> = {
      session_id: sessionId,
      visitor_id: sessionId,
      page: 'home',
      city: 'الموصل',
      device: window.innerWidth < 640 ? 'mobile' : 'desktop',
    };

    for (let i = 0; i < 6; i++) {
      const { error } = await supabase.from('visitor_logs').insert([payload]);
      if (!error) break;
      if (error.code === 'PGRST204' && typeof error.message === 'string') {
        const m = error.message.match(/Could not find the '([^']+)' column/i);
        const col = m?.[1];
        if (col && col in payload) {
          delete payload[col];
          continue;
        }
      }
      break;
    }
  }

  const { count, error: countErr } = await supabase
    .from('visitor_logs')
    .select('*', { count: 'exact', head: true });

  if (countErr) return null;
  return typeof count === 'number' ? count : null;
}

export async function logSupabaseVisitor(params: {
  visitorId: string;
  page: string;
  city?: string;
  device?: string;
  userId?: string;
}): Promise<number | null> {
  const { error } = await supabase.from('visitor_logs').insert({
    session_id: params.visitorId,
    visitor_id: params.visitorId,
    page: params.page || 'home',
    city: params.city || 'الموصل',
    device: params.device || 'mobile',
    user_id: params.userId || null,
  });

  if (error) {
    console.warn('Supabase logVisitor warning:', error.message);
    return null;
  }

  const { count } = await supabase
    .from('visitor_logs')
    .select('*', { count: 'exact', head: true });

  return typeof count === 'number' ? count : null;
}

export async function fetchSupabaseVisitors(): Promise<{
  totalVisitors: number;
  recentVisitors: any[];
} | null> {
  const { data, count, error } = await supabase
    .from('visitor_logs')
    .select('*', { count: 'exact' })
    .order('visited_at', { ascending: false })
    .limit(15);

  if (error) {
    console.warn('Supabase fetchVisitors warning:', error.message);
    return null;
  }

  return {
    totalVisitors: count || (data?.length ?? 0),
    recentVisitors: (data || []).map((row: any) => ({
      id: row.id,
      visitorId: row.visitor_id || row.session_id,
      page: row.page,
      city: row.city,
      device: row.device,
      visitedAt: row.visited_at,
    })),
  };
}
