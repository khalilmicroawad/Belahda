/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  User,
  AlertTriangle,
  Eye
} from 'lucide-react';
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
  subscribeToSupabasePosts,
  trackSessionVisitor
} from './lib/supabase';
import { ListingWizard } from './components/listing-wizard/ListingWizard';
import { MarketplaceFeed } from './components/marketplace/MarketplaceFeed';
import { ListingDetailModal } from './components/marketplace/ListingDetailModal';
import { StoresDirectoryView } from './components/stores/StoresDirectoryView';
import { StoreDetailModal } from './components/stores/StoreDetailModal';
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

  // Detail, Store, Chat, Profile & Auth Modals
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreProfile | null>(null);
  const [chatListing, setChatListing] = useState<Listing | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authPurposeMessage, setAuthPurposeMessage] = useState<string | undefined>(undefined);
  const [pendingActionAfterAuth, setPendingActionAfterAuth] = useState<(() => void) | null>(null);

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

    // 2. Track visitor once per browser session via sessionStorage
    trackSessionVisitor().then((count) => {
      if (typeof count === 'number') setVisitorCount(count);
    });

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

  const handleSelectBuy = async () => {
    setCurrentView('feed');
    setResetFeedTrigger((prev) => prev + 1);
    await loadPublicPosts();
  };

  const handleSelectStoresTab = async () => {
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
    setCurrentView('feed');

    setTimeout(() => {
      setNewlyPublishedId(null);
    }, 6000);
  };

  const handleOpenStoreById = async (storeId: string) => {
    const localMatch = stores.find((s) => String(s.id) === String(storeId));
    if (localMatch) {
      setSelectedStore(localMatch);
      return;
    }
    const fetched = await fetchStoreById(storeId);
    if (fetched) {
      setStores((prev) => [fetched, ...prev.filter((s) => s.id !== fetched.id)]);
      setSelectedStore(fetched);
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
      className={`min-h-screen w-full max-w-full bg-[#FDFBF7] text-[#1E293B] flex flex-col ${
        isAr ? 'text-right' : 'text-left'
      }`}
    >
      {/* Clean 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#FFFDF9]/92 backdrop-blur-md border-b border-amber-200/70 shadow-[0_2px_12px_rgba(13,148,136,0.04)]">
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
            className="flex items-center gap-1 bg-[#FEF9E7] border border-amber-200/80 p-1 rounded-xl shrink-0"
          >
            <button
              type="button"
              onClick={handleSelectBuy}
              className={`px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all duration-200 ${
                currentView === 'feed'
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'text-[#1E293B] hover:bg-amber-100/70'
              }`}
            >
              {isAr ? 'شراء' : 'Buy'}
            </button>
            <button
              type="button"
              onClick={handleSelectStoresTab}
              className={`px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all duration-200 ${
                currentView === 'stores'
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'text-[#1E293B] hover:bg-amber-100/70'
              }`}
            >
              {isAr ? 'المتاجر' : 'Stores'}
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
              className="min-h-[40px] px-3 sm:px-3.5 rounded-xl bg-white hover:bg-[#FEF9E7] border border-amber-200/80 text-xs font-semibold text-[#1E293B] transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs"
            >
              <User className="w-4 h-4 text-[#0D9488] shrink-0" />
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
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
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
        ) : currentView === 'stores' ? (
          <StoresDirectoryView
            stores={stores}
            listings={listings}
            currentUser={currentUser}
            onSelectStore={(st) => setSelectedStore(st)}
            isLoading={isStoresLoading}
            lang={lang}
          />
        ) : (
          <MarketplaceFeed
            listings={listings}
            currentUser={currentUser}
            onSelectListing={(item) => setSelectedListing(item)}
            onOpenChat={(item) => setChatListing(item)}
            onOpenCreate={handleSelectSell}
            onRequireAuth={handleRequireAuth}
            newlyPublishedId={newlyPublishedId}
            resetTrigger={resetFeedTrigger}
            isLoading={isFeedLoading}
            feedError={feedError}
            onRetryFetch={loadPublicPosts}
            lang={lang}
          />
        )}
      </main>

      {/* Clean Minimalist Footer with Automatic Visitor Counter */}
      <footer className={`border-t border-amber-200/70 bg-[#FFFDF9] py-4 px-4 ${currentView !== 'create' ? 'pb-24' : ''}`}>
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
            className="pointer-events-auto h-12 px-7 rounded-2xl bg-[#0D9488] hover:bg-[#0F766E] active:scale-[0.97] text-white font-bold text-sm shadow-[0_10px_28px_rgba(13,148,136,0.34)] border border-teal-400/40 flex items-center justify-center gap-2 transition-all duration-200 whitespace-nowrap"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>{isAr ? 'أضف إعلان' : 'Add Ad'}</span>
          </button>
        </div>
      )}

      {/* Post Details Modal */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          currentUser={currentUser}
          onClose={() => setSelectedListing(null)}
          onOpenChat={(item) => setChatListing(item)}
          onOpenStore={handleOpenStoreById}
          onRequireAuth={handleRequireAuth}
          lang={lang}
        />
      )}

      {/* Store Detail Modal */}
      {selectedStore && (
        <StoreDetailModal
          store={selectedStore}
          listings={listings}
          currentUser={currentUser}
          onClose={() => setSelectedStore(null)}
          onSelectListing={(item) => setSelectedListing(item)}
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
          onUpdateUser={(usr) => setCurrentUser(usr)}
          onOpenAuth={() => {
            setAuthPurposeMessage(undefined);
            setShowAuthModal(true);
          }}
          onOpenStore={(st) => setSelectedStore(st)}
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
