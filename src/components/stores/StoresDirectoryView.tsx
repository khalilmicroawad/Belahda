import React, { useState, useMemo } from 'react';
import {
  Store,
  MapPin,
  Search,
  Truck,
  MessageCircle,
  Phone,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Star,
  PlusCircle,
  Package
} from 'lucide-react';
import { StoreProfile, Listing, UserAccount } from '../../types';
import { MOSUL_DISTRICTS } from '../../data/categories';

interface StoresDirectoryViewProps {
  stores: StoreProfile[];
  listings: Listing[];
  currentUser: UserAccount | null;
  onSelectStore: (store: StoreProfile) => void;
  onOpenCreateStore: () => void;
  onRequireAuth: (action: () => void, message?: string) => void;
  lang?: 'ar' | 'en';
}

export const StoresDirectoryView: React.FC<StoresDirectoryViewProps> = ({
  stores,
  listings,
  currentUser,
  onSelectStore,
  onOpenCreateStore,
  onRequireAuth,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');

  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesDesc = s.description.toLowerCase().includes(q);
        const matchesDistrict = s.district.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesDistrict) return false;
      }
      if (selectedDistrict !== 'all' && s.district !== selectedDistrict) {
        return false;
      }
      return true;
    });
  }, [stores, searchQuery, selectedDistrict]);

  const handleWhatsApp = (store: StoreProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    const action = () => {
      const cleanPhone = store.whatsappNumber.replace(/[^0-9]/g, '');
      const formatted = cleanPhone.startsWith('0') ? `964${cleanPhone.slice(1)}` : cleanPhone;
      const message = isAr
        ? `السلام عليكم، أود الاستفسار عن منتجات متجركم: "${store.name}" عبر سوق بلحظة بالموصل.`
        : `Hello, interested in products from your store "${store.name}".`;
      window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(message)}`, '_blank');
    };

    if (!currentUser) {
      onRequireAuth(action, isAr ? 'للتواصل مع إدارة المتجر، يرجى تسجيل حسابك' : 'Register to contact store');
    } else {
      action();
    }
  };

  const handlePhone = (store: StoreProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    const action = () => {
      window.location.href = `tel:${store.phoneNumber}`;
    };

    if (!currentUser) {
      onRequireAuth(action, isAr ? 'للاتصال الهاتفي بالمتجر، يرجى تسجيل حسابك' : 'Register to call store');
    } else {
      action();
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-100 select-none pb-20 text-xs">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 pt-2 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs font-bold text-slate-900 leading-none">
                {isAr ? 'متاجر الموصل المعتمدة' : 'Mosul Stores Directory'}
              </h1>
              <span className="text-[10px] text-slate-500">
                {isAr ? 'تصفح محلات ومعارض الموصل الرسمية' : 'Browse verified local shops'}
              </span>
            </div>
          </div>

          {/* Button to unlock custom store */}
          <button
            type="button"
            onClick={onOpenCreateStore}
            className="h-8 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-all"
          >
            <Sparkles className="w-3 h-3 text-emerald-200" />
            <span>{isAr ? '+ اصنع متجرك' : '+ Create Store'}</span>
          </button>
        </div>

        {/* Search + District Filter */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث عن اسم متجر، معرض، نوع بضاعة...' : 'Search stores...'}
              className="w-full h-8 pr-8 pl-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="h-8 px-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-[11px] font-semibold focus:outline-none"
          >
            <option value="all">{isAr ? '📍 كل الموصل' : 'All Mosul'}</option>
            {MOSUL_DISTRICTS.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-3 space-y-3">
        {/* Banner: Unlock Store for Active Sellers */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Store className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">
                {isAr ? 'هل لديك أكثر من 10 إعلانات؟' : 'Have more than 10 listings?'}
              </p>
              <p className="text-[10px] text-emerald-100 mt-0.5">
                {isAr
                  ? 'اصنع متجرك الخاص مجاناً واعرض كافة منتجاتك في صفحة واحدة'
                  : 'Unlock your verified store page for all your items'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenCreateStore}
            className="px-2.5 py-1 rounded-xl bg-white text-emerald-800 font-bold text-[10px] shadow-sm shrink-0 whitespace-nowrap active:scale-95 transition-transform"
          >
            {isAr ? 'فتح متجر' : 'Unlock'}
          </button>
        </div>

        {/* Counter */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span>
            {isAr ? `المتاجر النشطة بالموصل (${filteredStores.length})` : `Active Stores (${filteredStores.length})`}
          </span>
          <span className="text-emerald-700 font-semibold">
            {isAr ? 'متاجر معتمدة مع مواقع الخريطة' : 'Verified Shop Locations'}
          </span>
        </div>

        {/* Stores Grid */}
        <div className="space-y-3">
          {filteredStores.map((store) => {
            // Count actual listings of this store in system
            const storeItems = listings.filter(
              (it) => it.sellerType === 'commercial' && (it.storeName === store.name || it.sellerPhone === store.ownerPhone)
            );
            const count = Math.max(store.totalListingsCount, storeItems.length);

            return (
              <div
                key={store.id}
                onClick={() => onSelectStore(store)}
                className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-md cursor-pointer transition-all active:scale-[0.99] space-y-2.5 group"
              >
                {/* Store Top */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={store.coverUrl || '/src/assets/images/listing_iphone_pro_1794306234850.jpg'}
                      alt={store.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {store.name}
                        </h3>
                        {store.isVerified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="flex items-center gap-0.5 text-emerald-700 font-semibold">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          {store.district} · الموصل
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          {store.rating || 5.0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                    {count} {isAr ? 'منتجات' : 'items'}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {store.description}
                </p>

                {/* Badges & Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {store.deliveryAvailable ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                        <Truck className="w-3 h-3 text-emerald-600" />
                        {isAr ? 'توصيل متوفر' : 'Delivery available'}
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        {isAr ? 'استلام من المحل' : 'Pickup only'}
                      </span>
                    )}
                  </div>

                  {/* Contact Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleWhatsApp(store, e)}
                      className="h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 text-[10px] font-bold border border-emerald-200 transition-all flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                      <span>واتساب</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handlePhone(store, e)}
                      className="h-7 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 text-[10px] font-bold border border-slate-200 transition-all flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>اتصال</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
