import { createClient, Session, User } from '@supabase/supabase-js';
import { Listing, StoreProfile, UserAccount, CategoryId, ItemCondition, SellerType } from '../types';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://yzseuychjsojkkqbtbjn.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_h97VyRWzs_m7KgxgleLZzg_1cUAdAM9';

export const SUPABASE_BUCKET = 'app-uploads';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

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
// 4. LISTINGS TABLE (listings)
// ==========================================

function mapRowToListing(row: any): Listing {
  const fullImg = row.full_image_url || row.image_url || undefined;
  const thumbImg = row.thumbnail_url || undefined;
  const fallbackUrls = Array.isArray(row.media_urls) && row.media_urls.length > 0
    ? row.media_urls
    : fullImg
    ? [fullImg]
    : thumbImg
    ? [thumbImg]
    : [];

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    price: Number(row.price || 0),
    currency: row.currency || 'د.ع',
    hidePrice: Boolean(row.hide_price),
    category: (row.category || 'electronics') as CategoryId,
    condition: (row.condition || 'new') as ItemCondition,
    sellerType: (row.seller_type || 'personal') as SellerType,
    storeId: row.store_id || undefined,
    storeName: row.store_name || undefined,
    storeLocation: row.store_location || undefined,
    city: row.city || 'الموصل',
    district: row.district || 'حي الزهور',
    deliveryAvailable: Boolean(row.delivery_available),
    deliveryNotes: row.delivery_notes || undefined,
    mediaUrls: fallbackUrls,
    thumbnailUrl: thumbImg || fallbackUrls[0],
    fullImageUrl: fullImg || fallbackUrls[0],
    contactOptions: row.contact_options || { directChat: true, whatsapp: true, phoneCall: true },
    createdAt: row.created_at_label || 'اليوم',
    createdTimestamp: Number(row.created_timestamp || Date.now()),
    viewsCount: Number(row.views_count || 1),
    sellerId: row.user_id || undefined,
    sellerName: row.seller_name || '',
    sellerPhone: row.seller_phone || '',
    sellerAvatar: row.seller_avatar || undefined,
    isVerified: Boolean(row.is_verified),
  };
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

  // Also sync directly to `posts` table (with thumbnail_url & full_image_url) if present
  supabase
    .from('posts')
    .upsert(
      {
        id: listing.id,
        user_id: authUserId || listing.sellerId || null,
        title: listing.title,
        description: listing.description,
        price: Number(listing.price || 0),
        currency: listing.currency || 'د.ع',
        category: listing.category,
        thumbnail_url: thumbnailUrl,
        full_image_url: fullImageUrl,
        created_at: new Date(listing.createdTimestamp || Date.now()).toISOString(),
      },
      { onConflict: 'id' }
    )
    .then(() => {}, () => {});

  if (error) {
    console.warn('Supabase saveListing warning:', error.message);
    return false;
  }
  return true;
}

export async function deleteSupabaseListing(id: string): Promise<boolean> {
  const { error } = await supabase.from('listings').delete().eq('id', id);
  if (error) {
    console.warn('Supabase deleteListing warning:', error.message);
    return false;
  }
  return true;
}

// ==========================================
// 5. STORES TABLE (stores)
// ==========================================

function mapRowToStore(row: any): StoreProfile {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id || undefined,
    ownerPhone: row.owner_phone || '',
    description: row.description || '',
    logoUrl: row.logo_url || undefined,
    coverUrl: row.cover_url || undefined,
    district: row.district || 'حي الزهور',
    city: row.city || 'الموصل',
    address: row.address || '',
    category: (row.category || 'electronics') as CategoryId,
    whatsappNumber: row.whatsapp_number || '',
    phoneNumber: row.phone_number || '',
    socialLinks: row.social_links || undefined,
    deliveryAvailable: Boolean(row.delivery_available),
    deliveryNotes: row.delivery_notes || undefined,
    isVerified: Boolean(row.is_verified),
    totalListingsCount: Number(row.total_listings_count || 1),
    rating: row.rating ? Number(row.rating) : 5.0,
    lat: row.lat ? Number(row.lat) : undefined,
    lng: row.lng ? Number(row.lng) : undefined,
    lastActiveAt: row.last_active_at ? Number(row.last_active_at) : undefined,
    isArchived: Boolean(row.is_archived),
    createdAt: Number(row.created_at_ts || Date.now()),
  };
}

export async function fetchSupabaseStores(): Promise<StoreProfile[] | null> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('created_at_ts', { ascending: false });

  if (error) {
    console.warn('Supabase fetchStores warning:', error.message);
    return null;
  }
  return (data || []).map(mapRowToStore);
}

export async function saveSupabaseStore(store: StoreProfile, authUserId?: string): Promise<boolean> {
  const { error } = await supabase.from('stores').upsert(
    {
      id: store.id,
      owner_id: authUserId || store.ownerId || null,
      name: store.name,
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

export async function logSupabaseVisitor(params: {
  visitorId: string;
  page: string;
  city?: string;
  device?: string;
  userId?: string;
}): Promise<number | null> {
  const { error } = await supabase.from('visitor_logs').insert({
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
      visitorId: row.visitor_id,
      page: row.page,
      city: row.city,
      device: row.device,
      visitedAt: row.visited_at,
    })),
  };
}
