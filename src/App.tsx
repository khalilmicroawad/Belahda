/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  PlusCircle,
  ListOrdered,
  Smartphone,
  Maximize2,
  Globe,
  Home,
  User,
  MapPin,
  Store,
  Sparkles
} from 'lucide-react';
import { Listing, AppView, UserAccount, StoreProfile } from './types';
import { getStoredListings, saveListings, getStoredUser, saveUserAccount } from './data/mockListings';
import { getStoredStores, saveStores, addOrUpdateStore } from './data/mockStores';
import { ZeroBarrierEntry } from './components/onboarding/ZeroBarrierEntry';
import { ListingWizard } from './components/listing-wizard/ListingWizard';
import { MarketplaceFeed } from './components/marketplace/MarketplaceFeed';
import { ListingDetailModal } from './components/marketplace/ListingDetailModal';
import { ChatModal } from './components/chat/ChatModal';
import { MyListingsModal } from './components/profile/MyListingsModal';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { AuthModal } from './components/auth/AuthModal';
import { StoresDirectoryView } from './components/stores/StoresDirectoryView';
import { StoreDetailModal } from './components/stores/StoreDetailModal';
import { CreateStoreModal } from './components/stores/CreateStoreModal';

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const isAr = lang === 'ar';

  // Device Simulator Mode: 'mobile_frame' vs 'full_screen'
  const [simulatorMode, setSimulatorMode] = useState<'mobile_frame' | 'full_screen'>('mobile_frame');

  // Core App Flow State
  const [currentView, setCurrentView] = useState<AppView>('onboarding');
  const [listings, setListings] = useState<Listing[]>([]);
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [newlyPublishedId, setNewlyPublishedId] = useState<string | null>(null);

  // Active Modals & Selected Entities
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreProfile | null>(null);
  const [chatListing, setChatListing] = useState<Listing | null>(null);
  const [showMyListings, setShowMyListings] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showCreateStoreModal, setShowCreateStoreModal] = useState<boolean>(false);

  // Buyer Auth Gate state
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authPurposeMessage, setAuthPurposeMessage] = useState<string | undefined>(undefined);
  const [pendingActionAfterAuth, setPendingActionAfterAuth] = useState<(() => void) | null>(null);

  // Sync with persistent storage on mount
  useEffect(() => {
    const storedListings = getStoredListings();
    setListings(storedListings);

    const storedStores = getStoredStores();
    setStores(storedStores);

    const storedUser = getStoredUser();
    if (storedUser) {
      setCurrentUser(storedUser);
    }
  }, []);

  // Update HTML dir and lang attributes
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  }, [lang, isAr]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  // 1. "تفعيل زر شراء لعرض الإعلانات المضافة"
  // Ensures switching to the BUY marketplace feed refreshes the listings from storage and displays all items
  const handleSelectBuy = () => {
    const latest = getStoredListings();
    setListings(latest);
    setCurrentView('feed');
  };

  const handleSelectSell = () => {
    setCurrentView('create');
  };

  const handleSelectStores = () => {
    const latestStores = getStoredStores();
    setStores(latestStores);
    setCurrentView('stores');
  };

  // When seller publishes listing:
  const handleListingPublished = (newListing: Listing) => {
    setListings((prev) => [newListing, ...prev.filter((item) => item.id !== newListing.id)]);
    setNewlyPublishedId(newListing.id);
    setCurrentView('feed');

    setTimeout(() => {
      setNewlyPublishedId(null);
    }, 8000);
  };

  // Fast-seed 10 sample listings for the current user to easily test unlocking and creating their store:
  // "عندما يقوم البائع باضافة أكثر من ١٠ اعلانات يستطيع صنع store خاص به. لعرض كل منتجاته."
  const handleFastSeedListings = () => {
    const phone = currentUser?.phoneNumber || '07701234567';
    const sampleItems: Listing[] = Array.from({ length: 10 }).map((_, i) => ({
      id: `item-seed-${Date.now()}-${i}`,
      title: `منتج تجريبي رقم ${i + 1} - متجر الموصل`,
      description: 'سلعة أصلية ومضمونة متوفرة للاستلام الفوري في الموصل.',
      price: (i + 1) * 25000,
      currency: 'د.ع',
      hidePrice: false,
      category: 'electronics',
      condition: 'new',
      sellerType: 'commercial',
      sellerName: currentUser?.name || 'عمر الموصلي',
      sellerPhone: phone,
      city: 'الموصل',
      district: 'حي الزهور',
      deliveryAvailable: true,
      deliveryNotes: 'توصيل مجاني داخل الموصل',
      mediaUrls: ['/src/assets/images/listing_iphone_pro_1794306234850.jpg'],
      contactOptions: {
        directChat: true,
        whatsapp: true,
        phoneCall: true,
        whatsappNumber: phone,
        phoneNumber: phone
      },
      createdAt: 'اليوم',
      createdTimestamp: Date.now() - i * 1000 * 60,
      viewsCount: 15 + i
    }));

    const updated = [...sampleItems, ...listings];
    setListings(updated);
    saveListings(updated);

    // If user has no account, create one
    if (!currentUser) {
      const newAcc: UserAccount = {
        id: `user-${Date.now()}`,
        name: 'عمر الموصلي',
        phoneNumber: phone,
        isSeller: true,
        createdAt: Date.now()
      };
      saveUserAccount(newAcc);
      setCurrentUser(newAcc);
    }
  };

  // Require Buyer Authentication before contacting seller:
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

  const handleDeleteListing = (id: string) => {
    const updated = listings.filter((item) => item.id !== id);
    setListings(updated);
    saveListings(updated);
  };

  const handleStoreCreated = (newStore: StoreProfile) => {
    setStores((prev) => [newStore, ...prev.filter((s) => s.id !== newStore.id)]);
    setShowCreateStoreModal(false);
    setSelectedStore(newStore);

    if (currentUser) {
      const updatedAcc: UserAccount = {
        ...currentUser,
        hasCustomStore: true,
        customStoreId: newStore.id
      };
      setCurrentUser(updatedAcc);
      saveUserAccount(updatedAcc);
    }
  };

  // Filter listings of current user
  const userPhone = currentUser?.phoneNumber;
  const userListings = listings.filter((it) => it.sellerPhone === userPhone);

  return (
    <div className={`min-h-screen bg-slate-200/90 flex flex-col items-center justify-center font-sans ${isAr ? 'text-right' : 'text-left'}`}>
      {/* Top Simulator Header */}
      <header className="w-full max-w-4xl px-3 py-1.5 flex items-center justify-between text-xs text-slate-700 bg-white/85 backdrop-blur-md border-b border-slate-300 shadow-2xs z-30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentView('feed')}
            className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs hover:text-emerald-700 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>سوق بلحظة</span>
          </button>
          <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
            <MapPin className="w-2.5 h-2.5 text-emerald-600" />
            الموصل
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Account / Control Panel */}
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition-all shadow-2xs"
            title="لوحة التحكم وتعديل الحساب"
          >
            <User className="w-3 h-3 text-emerald-700" />
            <span>
              {currentUser ? currentUser.name.slice(0, 14) : (isAr ? 'حسابي' : 'Account')}
            </span>
          </button>

          {/* Viewport Frame Mode Toggle */}
          <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setSimulatorMode('mobile_frame')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                simulatorMode === 'mobile_frame'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>{isAr ? 'هاتف' : 'Mobile'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSimulatorMode('full_screen')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                simulatorMode === 'full_screen'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>{isAr ? 'كامل' : 'Full'}</span>
            </button>
          </div>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
          >
            <Globe className="w-3 h-3 text-slate-500" />
            <span>{isAr ? 'EN' : 'عربي'}</span>
          </button>
        </div>
      </header>

      {/* Main Container / Mobile App Shell */}
      <main className="w-full flex-1 flex items-center justify-center p-0 sm:p-2 md:p-3 overflow-hidden">
        <div
          className={`bg-white shadow-2xl transition-all duration-300 flex flex-col overflow-hidden ${
            simulatorMode === 'mobile_frame'
              ? 'w-full max-w-[400px] h-[92vh] max-h-[860px] sm:rounded-[38px] sm:border-[8px] sm:border-slate-800 sm:ring-1 sm:ring-black/20'
              : 'w-full max-w-3xl h-[92vh] rounded-2xl border border-slate-300'
          }`}
        >
          {/* Mobile Top Status Bar */}
          {simulatorMode === 'mobile_frame' && (
            <div className="h-5 bg-slate-900 text-white px-5 flex items-center justify-between text-[10px] font-mono select-none shrink-0">
              <span className="font-bold">9:41</span>
              <div className="w-20 h-3 bg-black rounded-full mx-auto my-0.5"></div>
              <div className="flex items-center gap-1 text-[9px]">
                <span>5G</span>
                <span className="w-3.5 h-1.5 rounded-2xs border border-white flex items-center p-0.5">
                  <span className="w-full h-full bg-white rounded-2xs"></span>
                </span>
              </div>
            </div>
          )}

          {/* ACTIVE SCREEN DISPLAY */}
          <div className="flex-1 overflow-y-auto relative flex flex-col bg-slate-50">
            {/* View 1: Zero-Barrier Entrance */}
            {currentView === 'onboarding' && (
              <ZeroBarrierEntry
                onSelectBuy={handleSelectBuy}
                onSelectSell={handleSelectSell}
                onSelectStores={handleSelectStores}
                onToggleLang={toggleLanguage}
                lang={lang}
              />
            )}

            {/* View 2: Marketplace Feed (The "BUY" Path - تفعيل زر شراء لعرض الإعلانات المضافة) */}
            {currentView === 'feed' && (
              <MarketplaceFeed
                listings={listings}
                currentUser={currentUser}
                onSelectListing={(item) => setSelectedListing(item)}
                onOpenChat={(item) => setChatListing(item)}
                onOpenCreate={() => setCurrentView('create')}
                onRequireAuth={handleRequireAuth}
                newlyPublishedId={newlyPublishedId}
                lang={lang}
              />
            )}

            {/* View 3: Stores Directory (المتاجر المعتمدة في الموصل - إضافة زر متاجر للقائمة الرئيسية) */}
            {currentView === 'stores' && (
              <StoresDirectoryView
                stores={stores}
                listings={listings}
                currentUser={currentUser}
                onSelectStore={(st) => setSelectedStore(st)}
                onOpenCreateStore={() => setShowCreateStoreModal(true)}
                onRequireAuth={handleRequireAuth}
                lang={lang}
              />
            )}

            {/* View 4: Step-by-Step Listing Wizard (The "SELL" Path) */}
            {currentView === 'create' && (
              <ListingWizard
                currentUser={currentUser}
                onUserCreated={(usr) => setCurrentUser(usr)}
                onCancel={() => setCurrentView('feed')}
                onPublished={handleListingPublished}
                lang={lang}
              />
            )}
          </div>

          {/* PERSISTENT BOTTOM TAB BAR WITH STORES & BUY */}
          {currentView !== 'onboarding' && currentView !== 'create' && (
            <nav className="h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 items-center px-1 select-none shrink-0 z-30 pb-safe">
              {/* Tab 1: Home / Feed (BUY / شراء) */}
              <button
                type="button"
                onClick={handleSelectBuy}
                className={`flex flex-col items-center justify-center py-1 transition-colors ${
                  currentView === 'feed'
                    ? 'text-emerald-700 font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <ShoppingBag className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] tracking-tight">
                  {isAr ? 'شراء' : 'Buy'}
                </span>
              </button>

              {/* Tab 2: Stores Directory (متاجر / Stores) - CRITICAL NEW FEATURE */}
              <button
                type="button"
                onClick={handleSelectStores}
                className={`flex flex-col items-center justify-center py-1 transition-colors ${
                  currentView === 'stores'
                    ? 'text-emerald-700 font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Store className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] tracking-tight">
                  {isAr ? 'متاجر' : 'Stores'}
                </span>
              </button>

              {/* Tab 3: Primary SELL Center CTA (بيع) */}
              <button
                type="button"
                onClick={() => setCurrentView('create')}
                className="flex flex-col items-center justify-center -mt-3 group active:scale-95 transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-600/30 flex items-center justify-center border-2 border-white group-hover:bg-emerald-700 transition-colors">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-bold text-emerald-800 mt-0.5">
                  {isAr ? 'بيع' : 'Sell'}
                </span>
              </button>

              {/* Tab 4: My Listings (إعلاناتي) */}
              <button
                type="button"
                onClick={() => setShowMyListings(true)}
                className="flex flex-col items-center justify-center py-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ListOrdered className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] tracking-tight">
                  {isAr ? 'إعلاناتي' : 'My Items'}
                </span>
              </button>

              {/* Tab 5: Control Panel / Profile (حسابي) */}
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="flex flex-col items-center justify-center py-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <User className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] tracking-tight">
                  {isAr ? 'حسابي' : 'Profile'}
                </span>
              </button>
            </nav>
          )}

          {/* Home Indicator */}
          {simulatorMode === 'mobile_frame' && (
            <div className="h-3 bg-white flex items-center justify-center shrink-0">
              <div className="w-20 h-1 bg-slate-300 rounded-full"></div>
            </div>
          )}
        </div>
      </main>

      {/* POPUP MODALS */}

      {/* 1. Full Listing Detail Modal */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          currentUser={currentUser}
          onClose={() => setSelectedListing(null)}
          onOpenChat={(item) => setChatListing(item)}
          onRequireAuth={handleRequireAuth}
          lang={lang}
        />
      )}

      {/* 2. Store Catalog & Single Store Showcase Modal */}
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

      {/* 3. In-App Direct Messaging Modal */}
      {chatListing && (
        <ChatModal
          listing={chatListing}
          currentUser={currentUser}
          onClose={() => setChatListing(null)}
          lang={lang}
        />
      )}

      {/* 4. My Listings & Store Unlock Progress Modal */}
      {showMyListings && (
        <MyListingsModal
          listings={userListings.length > 0 ? userListings : listings}
          onClose={() => setShowMyListings(false)}
          onOpenCreate={() => {
            setShowMyListings(false);
            setCurrentView('create');
          }}
          onOpenCreateStore={() => {
            setShowMyListings(false);
            setShowCreateStoreModal(true);
          }}
          onDeleteListing={handleDeleteListing}
          onSelectListing={(item) => setSelectedListing(item)}
          onFastSeedListings={handleFastSeedListings}
          lang={lang}
        />
      )}

      {/* 5. Custom Store Creation Modal (When Seller has > 10 listings) */}
      {showCreateStoreModal && (
        <CreateStoreModal
          currentUser={currentUser}
          listingsCount={Math.max(userListings.length, listings.length)}
          onStoreCreated={handleStoreCreated}
          onClose={() => setShowCreateStoreModal(false)}
          onFastSeedListings={handleFastSeedListings}
          lang={lang}
        />
      )}

      {/* 6. User Profile & Control Panel Modal */}
      {showProfileModal && (
        <UserProfileModal
          user={currentUser}
          onUpdateUser={(usr) => setCurrentUser(usr)}
          onClose={() => setShowProfileModal(false)}
          lang={lang}
        />
      )}

      {/* 7. Buyer Registration Gate Modal */}
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
