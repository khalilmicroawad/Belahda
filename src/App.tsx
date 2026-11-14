/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  User,
  AlertTriangle,
  Eye,
  Heart,
  ShoppingBag,
  Store,
  Check
} from 'lucide-react';
import { getFavoriteIds, toggleFavoriteId } from './lib/favorites';
import { Listing, AppView, StoreProfile, UserAccount } from './types';
import {
  getStoredUser,
  saveUserAccount,
  clearUserAccount
} from './data/mockListings';
import {
  supabase,
  getSupabaseConfigStatus,
  fetchUserProfile,
  mapAuthUserToAccount,
  fetchSupabasePosts,
  fetchSupabaseStores,
  fetchStoreById,
  fetchPostsByRepresentativeId,
  subscribeToSupabasePosts,
  trackSessionVisitor,
  updatePostSoldOutStatus,
  deleteSupabasePost
} from './lib/supabase';
import { getQualifiedRepresentativeIds } from './lib/storeUtils';
import { GeoCoords } from './lib/geoUtils';
import { ListingWizard } from './components/listing-wizard/ListingWizard';
import { MarketplaceFeed } from './components/marketplace/MarketplaceFeed';
import { ListingDetailModal } from './components/marketplace/ListingDetailModal';
import { StoresDirectoryView } from './components/stores/StoresDirectoryView';
import { StorefrontView } from './components/stores/StorefrontView';
import { RepresentativeCornerView } from './components/stores/RepresentativeCornerView';
import { ChatModal } from './components/chat/ChatModal';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { AuthModal } from './components/auth/AuthModal';

export default function App() {
  const [lang] = useState<'ar' | 'en'>('ar');
  const isAr = lang === 'ar';

  const supabaseConfig = getSupabaseConfigStatus();
  const [currentView, setCurrentView] = useState<AppView>('feed');
  const [listings, setListings] = useState<Listing[]>([]);
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState<boolean>(true);
  const [isStoresLoading, setIsStoresLoading] = useState<boolean>(true);
  const [feedError, setFeedError] = useState<{ message: string; code?: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [newlyPublishedId, setNewlyPublishedId] = useState<string | null>(null);
  const [resetFeedTrigger, setResetFeedTrigger] = useState<number>(0);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteIds());
  const [appToast, setAppToast] = useState<{
    id: number;
    message: string;
    kind: 'favorite' | 'share' | 'info';
    added?: boolean;
  } | null>(null);

  // Detail, Storefront, Representative Corner, Chat, Profile & Auth Modals
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreProfile | null>(null);
  const [storeReturnView, setStoreReturnView] = useState<'feed' | 'stores'>('stores');
  const [isResolvingSharedStore, setIsResolvingSharedStore] = useState<boolean>(false);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [repReturnView, setRepReturnView] = useState<'feed' | 'stores'>('feed');
  const [isResolvingSharedRep, setIsResolvingSharedRep] = useState<boolean>(false);
  const [updatingSoldOutId, setUpdatingSoldOutId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [chatListing, setChatListing] = useState<Listing | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authPurposeMessage, setAuthPurposeMessage] = useState<string | undefined>(undefined);
  const [pendingActionAfterAuth, setPendingActionAfterAuth] = useState<(() => void) | null>(null);

  // Browser geolocation for distance badges & Nearest sorting
  const [userLocation, setUserLocation] = useState<GeoCoords | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'granted' | 'denied' | 'unsupported'>('idle');

  const qualifiedRepIds = useMemo(() => getQualifiedRepresentativeIds(listings), [listings]);

  const showToastNotification = (
    message: string,
    kind: 'favorite' | 'share' | 'info' = 'info',
    added?: boolean
  ) => {
    setAppToast({
      id: Date.now(),
      message,
      kind,
      added,
    });
  };

  useEffect(() => {
    if (!appToast) return;
    const timer = window.setTimeout(() => {
      setAppToast(null);
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [appToast]);

  const handleToggleFavorite = (postId: string) => {
    const { favorites, added } = toggleFavoriteId(postId);
    setFavoriteIds(favorites);
    showToastNotification(
      added
        ? isAr
          ? 'تمت الإضافة إلى المفضلة'
          : 'Added to favorites'
        : isAr
        ? 'تمت الإزالة من المفضلة'
        : 'Removed from favorites',
      'favorite',
      added
    );
  };

  const handleToggleSoldOut = async (listing: Listing, nextSoldOut: boolean) => {
    setUpdatingSoldOutId(listing.id);
    try {
      const res = await updatePostSoldOutStatus(listing.id, nextSoldOut);
      if (!res.ok) {
        showToastNotification(
          isAr ? 'تعذر تحديث حالة التوفر' : 'Failed to update availability',
          'info'
        );
        return;
      }

      const updatedItem: Listing = res.savedListing
        ? { ...res.savedListing, isSoldOut: nextSoldOut }
        : { ...listing, isSoldOut: nextSoldOut };

      setListings((prev) =>
        prev.map((item) => (item.id === listing.id ? updatedItem : item))
      );
      setSelectedListing((prev) =>
        prev && prev.id === listing.id ? updatedItem : prev
      );
      showToastNotification(
        nextSoldOut
          ? isAr
            ? 'تم تحديد الإعلان كـ نفدت الكمية'
            : 'Marked as Sold Out'
          : isAr
          ? 'تم تحديث الإعلان كـ متوفر'
          : 'Marked as Available',
        'share'
      );
    } finally {
      setUpdatingSoldOutId(null);
    }
  };

  const handleDeleteAd = async (listing: Listing): Promise<boolean> => {
    const isOwner = Boolean(
      currentUser?.id &&
        ((listing.sellerId && String(listing.sellerId) === String(currentUser.id)) ||
          (currentUser.customStoreId &&
            listing.storeId &&
            String(listing.storeId) === String(currentUser.customStoreId)))
    );

    if (!isOwner) {
      showToastNotification(
        isAr ? 'لا يمكنك حذف إعلان لا يخص حسابك' : 'You can only delete your own ads',
        'info'
      );
      return false;
    }

    setDeletingPostId(listing.id);
    try {
      const deleted = await deleteSupabasePost(listing.id);
      if (!deleted) {
        showToastNotification(
          isAr ? 'تعذر حذف الإعلان، يرجى المحاولة مرة أخرى' : 'Failed to delete ad',
          'info'
        );
        return false;
      }

      setListings((prev) => prev.filter((item) => item.id !== listing.id));
      setSelectedListing((prev) => (prev && prev.id === listing.id ? null : prev));
      setChatListing((prev) => (prev && prev.id === listing.id ? null : prev));
      showToastNotification(
        isAr ? 'تم حذف الإعلان بنجاح' : 'Ad deleted successfully',
        'share'
      );
      return true;
    } finally {
      setDeletingPostId(null);
    }
  };

  const loadPublicPosts = async () => {
    setIsFeedLoading(true);
    setFeedError(null);
    try {
      const res = await fetchSupabasePosts();
      if (res.error) {
        setFeedError({ message: res.error, code: res.errorCode || undefined });
      } else {
        setListings(res.posts);
      }
    } finally {
      setIsFeedLoading(false);
    }
  };

  const loadPublicStores = async () => {
    setIsStoresLoading(true);
    try {
      const data = await fetchSupabaseStores();
      if (data) {
        setStores(data);
      }
    } finally {
      setIsStoresLoading(false);
    }
  };

  useEffect(() => {
    // 1. Fetch public posts & stores
    loadPublicPosts();
    loadPublicStores();

    // Check for deep-linked storefront (?store=STORE_ID) or representative corner (?rep=USER_ID)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedStoreId = urlParams.get('store');
      const sharedRepId = urlParams.get('rep');
      if (sharedStoreId) {
        setIsResolvingSharedStore(true);
        fetchStoreById(sharedStoreId)
          .then((fetched) => {
            if (fetched) {
              setStores((prev) => [fetched, ...prev.filter((s) => s.id !== fetched.id)]);
              setSelectedStore(fetched);
              setStoreReturnView('feed');
              setCurrentView('store_detail');
            }
          })
          .finally(() => {
            setIsResolvingSharedStore(false);
          });
      } else if (sharedRepId) {
        setIsResolvingSharedRep(true);
        fetchPostsByRepresentativeId(sharedRepId)
          .then((repPosts) => {
            if (repPosts.length > 0) {
              setListings((prev) => {
                const map = new Map(prev.map((p) => [p.id, p]));
                repPosts.forEach((p) => map.set(p.id, p));
                return Array.from(map.values());
              });
            }
            setSelectedRepId(sharedRepId);
            setRepReturnView('feed');
            setCurrentView('rep_corner');
          })
          .finally(() => {
            setIsResolvingSharedRep(false);
          });
      }
    } catch {
      // Ignore URL parse issues in restricted frames
    }

    // 2. Track visitor once per browser session via sessionStorage
    trackSessionVisitor().then((count) => {
      if (typeof count === 'number') setVisitorCount(count);
    });

    // 2b. Silently fetch user GPS coordinates if geolocation permission was already granted
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      if (navigator.permissions?.query) {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then((status) => {
            if (status.state === 'granted') {
              setLocationStatus('granted');
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setUserLocation({
                    lat: Number(pos.coords.latitude.toFixed(6)),
                    lng: Number(pos.coords.longitude.toFixed(6)),
                  });
                },
                () => {},
                { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 }
              );
            } else if (status.state === 'denied') {
              setLocationStatus('denied');
            }
          })
          .catch(() => {});
      }
    } else {
      setLocationStatus('unsupported');
    }

    // 3. Subscribe to Supabase Realtime changes (INSERT, UPDATE, DELETE) on `posts`
    const unsubscribePosts = subscribeToSupabasePosts({
      onInsert: (newPost) => {
        setListings((prev) => [newPost, ...prev.filter((item) => item.id !== newPost.id)]);
      },
      onUpdate: (updatedPost) => {
        setListings((prev) =>
          prev.map((item) => (item.id === updatedPost.id ? updatedPost : item))
        );
      },
      onDelete: (deletedId) => {
        setListings((prev) => prev.filter((item) => item.id !== deletedId));
      },
    });

    // 4. Restore Supabase Auth Session & subscribe to auth state changes
    const storedUser = getStoredUser();
    if (storedUser) {
      setCurrentUser(storedUser);
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const authUser = data.session?.user;
      if (authUser) {
        const profile = await fetchUserProfile(authUser.id);
        const mapped = mapAuthUserToAccount(authUser, profile);
        setCurrentUser(mapped);
        saveUserAccount(mapped);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        clearUserAccount();
        setCurrentUser(null);
      } else if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        const mapped = mapAuthUserToAccount(session.user, profile);
        setCurrentUser(mapped);
        saveUserAccount(mapped);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      unsubscribePosts();
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  }, [lang, isAr]);

  const handleRequestUserLocation = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationStatus('unsupported');
      showToastNotification(
        isAr ? 'المتصفح لا يدعم تحديد الموقع' : 'Geolocation is unsupported',
        'info'
      );
      return;
    }

    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setLocationStatus('granted');
        setIsLocatingUser(false);
        showToastNotification(
          isAr ? 'تم تحديد موقعك لعرض الأقرب إليك' : 'Location updated for nearby results',
          'share'
        );
      },
      (err) => {
        setIsLocatingUser(false);
        if (err?.code === 1) {
          setLocationStatus('denied');
        }
        showToastNotification(
          isAr
            ? 'تعذر الوصول للموقع، يمكنك التصفية حسب الحي'
            : 'Unable to access location; neighborhood filter still works',
          'info'
        );
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
    );
  };

  const syncEntityQueryParams = (params: { storeId?: string | null; repId?: string | null }) => {
    try {
      const url = new URL(window.location.href);
      if (params.storeId) {
        url.searchParams.set('store', params.storeId);
      } else {
        url.searchParams.delete('store');
      }
      if (params.repId) {
        url.searchParams.set('rep', params.repId);
      } else {
        url.searchParams.delete('rep');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Safe fallback in restricted frames
    }
  };

  const openStorefrontView = (store: StoreProfile, returnTo: 'feed' | 'stores' = 'stores') => {
    setSelectedRepId(null);
    setStoreReturnView(returnTo);
    setSelectedStore(store);
    setCurrentView('store_detail');
    syncEntityQueryParams({ storeId: store.id, repId: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseStorefront = () => {
    setSelectedStore(null);
    setCurrentView(storeReturnView);
    syncEntityQueryParams({});
  };

  const openRepresentativeCorner = (repId: string, returnTo: 'feed' | 'stores' = 'feed') => {
    setSelectedStore(null);
    setRepReturnView(returnTo);
    setSelectedRepId(repId);
    setCurrentView('rep_corner');
    syncEntityQueryParams({ repId, storeId: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseRepresentativeCorner = () => {
    setSelectedRepId(null);
    setCurrentView(repReturnView);
    syncEntityQueryParams({});
  };

  const handleSelectBuy = async () => {
    setSelectedStore(null);
    setSelectedRepId(null);
    syncEntityQueryParams({});
    setCurrentView('feed');
    setResetFeedTrigger((prev) => prev + 1);
    await loadPublicPosts();
  };

  const handleSelectStoresTab = async () => {
    setSelectedStore(null);
    setSelectedRepId(null);
    syncEntityQueryParams({});
    setCurrentView('stores');
    await loadPublicStores();
  };

  // Restricted "أضف إعلان" (Add Post): Requires authenticated Supabase user
  const handleSelectSell = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      setCurrentView('create');
      return;
    }

    setPendingActionAfterAuth(() => () => setCurrentView('create'));
    setAuthPurposeMessage(
      isAr
        ? 'يرجى تسجيل الدخول أو إنشاء حساب لنشر إعلان جديد'
        : 'Please sign in or create an account to publish a new post'
    );
    setShowAuthModal(true);
  };

  const handleListingPublished = (newListing: Listing) => {
    setListings((prev) => [newListing, ...prev.filter((item) => item.id !== newListing.id)]);
    setNewlyPublishedId(newListing.id);
    setSelectedRepId(null);
    setSelectedStore(null);
    syncEntityQueryParams({});
    setCurrentView('feed');

    setTimeout(() => {
      setNewlyPublishedId(null);
    }, 6000);
  };

  const handleOpenStoreById = async (storeId: string, returnTo: 'feed' | 'stores' = 'feed') => {
    const localMatch = stores.find((s) => String(s.id) === String(storeId));
    if (localMatch) {
      openStorefrontView(localMatch, returnTo);
      return;
    }
    const fetched = await fetchStoreById(storeId);
    if (fetched) {
      setStores((prev) => [fetched, ...prev.filter((s) => s.id !== fetched.id)]);
      openStorefrontView(fetched, returnTo);
    }
  };

  const handleStoreCreated = (newStore: StoreProfile) => {
    setStores((prev) => [newStore, ...prev.filter((s) => s.id !== newStore.id)]);
    loadPublicPosts();
  };

  const handleRequireAuth = (action: () => void, message?: string) => {
    if (currentUser) {
      action();
    } else {
      setPendingActionAfterAuth(() => action);
      setAuthPurposeMessage(message);
      setShowAuthModal(true);
    }
  };

  const handleAuthSuccess = (registeredUser: UserAccount) => {
    setCurrentUser(registeredUser);
    setShowAuthModal(false);
    if (pendingActionAfterAuth) {
      const act = pendingActionAfterAuth;
      setPendingActionAfterAuth(null);
      act();
    }
  };

  return (
    <div
      className={`min-h-screen w-full max-w-full bg-[#FFE4C4] text-[#1E293B] flex flex-col ${
        isAr ? 'text-right' : 'text-left'
      }`}
    >
      {/* Clean 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E8C5A0]/80 shadow-[0_2px_12px_rgba(13,148,136,0.05)]">
        <div className="w-full max-w-6xl mx-auto px-4 h-15 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={handleSelectBuy}
            className="text-base sm:text-lg font-extrabold tracking-tight text-[#0F766E] hover:text-[#0D9488] transition-colors whitespace-nowrap shrink-0 min-h-[40px] flex items-center"
          >
            سوق بلحظة
          </button>

          {/* Zone 2: Clean Segmented Tabs */}
          <nav
            aria-label={isAr ? 'التنقل الرئيسي' : 'Primary navigation'}
            className="flex items-center gap-1 bg-[#FFE4C4] border border-[#E8C5A0] p-1 rounded-xl shrink-0"
          >
            <button
              type="button"
              onClick={handleSelectBuy}
              className={`group px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all duration-200 active:scale-95 inline-flex items-center gap-1.5 ${
                currentView === 'feed'
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'text-[#1E293B] hover:bg-white/60 hover:text-[#0F766E]'
              }`}
            >
              <ShoppingBag
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform duration-200 ${
                  currentView === 'feed'
                    ? 'text-white scale-105'
                    : 'text-[#0D9488] group-hover:scale-110 group-hover:-rotate-6'
                }`}
              />
              <span>{isAr ? 'شراء' : 'Buy'}</span>
            </button>
            <button
              type="button"
              onClick={handleSelectStoresTab}
              className={`group px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all duration-200 active:scale-95 inline-flex items-center gap-1.5 ${
                currentView === 'stores'
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'text-[#1E293B] hover:bg-white/60 hover:text-[#0F766E]'
              }`}
            >
              <Store
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform duration-200 ${
                  currentView === 'stores'
                    ? 'text-white scale-105'
                    : 'text-[#0D9488] group-hover:scale-110 group-hover:rotate-3'
                }`}
              />
              <span>{isAr ? 'المتاجر' : 'Stores'}</span>
            </button>
          </nav>

          {/* Zone 3: Account / Sign In Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                if (currentUser) {
                  setShowProfileModal(true);
                } else {
                  setAuthPurposeMessage(undefined);
                  setShowAuthModal(true);
                }
              }}
              className="group min-h-[40px] px-3 sm:px-3.5 rounded-xl bg-white hover:bg-[#FFE4C4]/70 active:scale-95 border border-[#E8C5A0] text-xs font-semibold text-[#1E293B] transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs"
            >
              <User className="w-4 h-4 text-[#0D9488] shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span className="truncate max-w-[90px] sm:max-w-[130px]">
                {currentUser ? currentUser.name : (isAr ? 'دخول' : 'Sign In')}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 w-full ${currentView !== 'create' ? 'pb-24' : 'pb-10'}`}>
        {!supabaseConfig.isValid && (
          <div className="max-w-6xl mx-auto px-4 pt-4">
            <div className="p-3.5 rounded-2xl bg-white border border-[#E8C5A0] text-[#7C4A21] text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
              <div className="text-xs break-words" dir="ltr">
                {supabaseConfig.message}
              </div>
            </div>
          </div>
        )}

        {currentView === 'create' ? (
          <ListingWizard
            currentUser={currentUser}
            onUserCreated={(usr) => setCurrentUser(usr)}
            onCancel={() => setCurrentView('feed')}
            onPublished={handleListingPublished}
            lang={lang}
          />
        ) : (isResolvingSharedStore && !selectedStore) || (isResolvingSharedRep && !selectedRepId) ? (
          <div className="w-full max-w-6xl mx-auto px-4 py-5 space-y-5">
            <div className="h-44 rounded-3xl skeleton-shimmer border border-[#E8C5A0]/80" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white rounded-2xl border border-[#E8C5A0]/80 overflow-hidden">
                  <div className="aspect-[4/3] skeleton-shimmer" />
                  <div className="p-3.5 space-y-2">
                    <div className="h-4 skeleton-shimmer rounded-lg w-4/5" />
                    <div className="h-4 skeleton-shimmer rounded-lg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : currentView === 'rep_corner' && selectedRepId ? (
          <RepresentativeCornerView
            repId={selectedRepId}
            listings={listings}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onBack={handleCloseRepresentativeCorner}
            onSelectListing={(item) => setSelectedListing(item)}
            onNotifyToast={showToastNotification}
            backLabel={
              repReturnView === 'stores'
                ? (isAr ? 'رجوع للمتاجر' : 'Back to Stores')
                : (isAr ? 'رجوع للسوق' : 'Back to Market')
            }
            lang={lang}
          />
        ) : currentView === 'store_detail' && selectedStore ? (
          <StorefrontView
            store={selectedStore}
            listings={listings}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onBack={handleCloseStorefront}
            onSelectListing={(item) => setSelectedListing(item)}
            onNotifyToast={showToastNotification}
            backLabel={
              storeReturnView === 'stores'
                ? (isAr ? 'رجوع للمتاجر' : 'Back to Stores')
                : (isAr ? 'رجوع للسوق' : 'Back to Market')
            }
            lang={lang}
          />
        ) : currentView === 'stores' ? (
          <StoresDirectoryView
            stores={stores}
            listings={listings}
            currentUser={currentUser}
            onSelectStore={(st) => openStorefrontView(st, 'stores')}
            userLocation={userLocation}
            isLocatingUser={isLocatingUser}
            locationStatus={locationStatus}
            onRequestLocation={handleRequestUserLocation}
            isLoading={isStoresLoading}
            lang={lang}
          />
        ) : (
          <MarketplaceFeed
            listings={listings}
            stores={stores}
            currentUser={currentUser}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onSelectListing={(item) => setSelectedListing(item)}
            onOpenStore={(storeId) => handleOpenStoreById(storeId, 'feed')}
            onOpenRepresentative={(repId) => openRepresentativeCorner(repId, 'feed')}
            qualifiedRepIds={qualifiedRepIds}
            onOpenChat={(item) => setChatListing(item)}
            onOpenCreate={handleSelectSell}
            onRequireAuth={handleRequireAuth}
            userLocation={userLocation}
            isLocatingUser={isLocatingUser}
            locationStatus={locationStatus}
            onRequestLocation={handleRequestUserLocation}
            newlyPublishedId={newlyPublishedId}
            resetTrigger={resetFeedTrigger}
            isLoading={isFeedLoading}
            feedError={feedError}
            onRetryFetch={loadPublicPosts}
            lang={lang}
          />
        )}
      </main>

      {/* Subtle Toast Notification (Favorites & Share Store) */}
      {appToast && (
        <div
          key={appToast.id}
          role="status"
          aria-live="polite"
          className="fixed top-18 inset-x-0 z-[70] pointer-events-none flex justify-center px-4"
        >
          <div className="animate-toast-in px-4 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E8C5A0] shadow-[0_10px_28px_rgba(13,148,136,0.16)] flex items-center gap-2 text-xs font-bold text-[#1E293B]">
            {appToast.kind === 'favorite' ? (
              <Heart
                className={`w-4 h-4 shrink-0 ${
                  appToast.added
                    ? 'fill-rose-500 text-rose-500 animate-heart-pop'
                    : 'text-[#64748B]'
                }`}
              />
            ) : (
              <Check className="w-4 h-4 shrink-0 text-[#0D9488] animate-heart-pop" />
            )}
            <span>{appToast.message}</span>
          </div>
        </div>
      )}

      {/* Clean Minimalist Footer with Automatic Visitor Counter */}
      <footer className={`border-t border-[#E8C5A0]/80 bg-white py-4 px-4 ${currentView !== 'create' ? 'pb-24' : ''}`}>
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs text-[#64748B]">
          <span className="font-bold text-[#0F766E]">سوق بلحظة</span>
          {visitorCount !== null && (
            <span className="inline-flex items-center gap-1.5 tabular-nums text-[#1E293B] font-medium">
              <Eye className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>
                {isAr
                  ? `الزوار: ${visitorCount.toLocaleString()}`
                  : `Visitors: ${visitorCount.toLocaleString()}`}
              </span>
            </span>
          )}
        </div>
      </footer>

      {/* Prominent Fixed Bottom Floating "أضف إعلان" Button (Thumb-Friendly, Zero Scroll) */}
      {currentView !== 'create' && (
        <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none pb-safe px-4 flex justify-center">
          <button
            type="button"
            onClick={handleSelectSell}
            className="group pointer-events-auto animate-fab-glow h-12 px-7 rounded-2xl bg-[#0D9488] hover:bg-[#0F766E] hover:-translate-y-0.5 active:scale-95 text-white font-bold text-sm border border-teal-300/45 flex items-center justify-center gap-2 transition-all duration-200 whitespace-nowrap"
          >
            <Plus className="w-5 h-5 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90 group-active:rotate-90" />
            <span>{isAr ? 'أضف إعلان' : 'Add Ad'}</span>
          </button>
        </div>
      )}

      {/* Post Details Modal */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          currentUser={currentUser}
          isFavorite={favoriteIds.includes(selectedListing.id)}
          onToggleFavorite={handleToggleFavorite}
          onToggleSoldOut={handleToggleSoldOut}
          isUpdatingSoldOut={updatingSoldOutId === selectedListing.id}
          onClose={() => setSelectedListing(null)}
          onOpenChat={(item) => setChatListing(item)}
          onOpenStore={(storeId) =>
            handleOpenStoreById(storeId, currentView === 'stores' ? 'stores' : 'feed')
          }
          onOpenRepresentative={(repId) =>
            openRepresentativeCorner(repId, currentView === 'stores' ? 'stores' : 'feed')
          }
          isRepresentativeQualified={Boolean(
            selectedListing.sellerId && qualifiedRepIds.has(String(selectedListing.sellerId))
          )}
          onRequireAuth={handleRequireAuth}
          lang={lang}
        />
      )}

      {/* Direct Chat Modal */}
      {chatListing && (
        <ChatModal
          listing={chatListing}
          currentUser={currentUser}
          onClose={() => setChatListing(null)}
          lang={lang}
        />
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <UserProfileModal
          user={currentUser}
          listings={listings}
          onToggleSoldOut={handleToggleSoldOut}
          onDeleteAd={handleDeleteAd}
          updatingPostId={updatingSoldOutId}
          deletingPostId={deletingPostId}
          onSelectListing={(item) => setSelectedListing(item)}
          onUpdateUser={(usr) => setCurrentUser(usr)}
          onOpenAuth={() => {
            setAuthPurposeMessage(undefined);
            setShowAuthModal(true);
          }}
          onOpenStore={(st) => openStorefrontView(st, 'stores')}
          onOpenRepresentative={(repId) => openRepresentativeCorner(repId, 'feed')}
          onStoreCreated={handleStoreCreated}
          onClose={() => setShowProfileModal(false)}
          lang={lang}
        />
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          purposeMessage={authPurposeMessage}
          onSuccess={handleAuthSuccess}
          onClose={() => {
            setShowAuthModal(false);
            setPendingActionAfterAuth(null);
          }}
          lang={lang}
        />
      )}
    </div>
  );
}
