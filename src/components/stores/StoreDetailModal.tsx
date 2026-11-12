import React, { useState, useMemo } from 'react';
import {
  X,
  Store,
  MapPin,
  Truck,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  Search,
  ChevronRight,
  ChevronLeft,
  Package,
  ExternalLink,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { StoreProfile, Listing, UserAccount, CategoryId } from '../../types';
import { CATEGORIES } from '../../data/categories';
import { getStoreActivityStatus } from '../../utils/antiSpam';

interface StoreDetailModalProps {
  store: StoreProfile;
  listings: Listing[];
  currentUser: UserAccount | null;
  onClose: () => void;
  onSelectListing: (listing: Listing) => void;
  onRequireAuth: (action: () => void, message?: string) => void;
  lang?: 'ar' | 'en';
}

export const StoreDetailModal: React.FC<StoreDetailModalProps> = ({
  store,
  listings,
  currentUser,
  onClose,
  onSelectListing,
  onRequireAuth,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const activity = getStoreActivityStatus(store);
  const storeCategoryObj = CATEGORIES.find((c) => c.id === store.category);

  // All listings belonging to this store
  const allStoreItems = useMemo(() => {
    return listings.filter((item) => {
      return (
        (item.sellerType === 'commercial' && item.storeName === store.name) ||
        item.sellerPhone === store.ownerPhone ||
        item.storeId === store.id
      );
    });
  }, [listings, store]);

  // Distinct categories inside this store
  const storeCategories = useMemo(() => {
    const cats = new Set<string>();
    allStoreItems.forEach((it) => {
      if (it.category) cats.add(it.category);
    });
    return Array.from(cats);
  }, [allStoreItems]);

  // Filter listings by query & category
  const filteredStoreItems = useMemo(() => {
    return allStoreItems.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allStoreItems, selectedCategory, searchQuery]);

  const handleWhatsApp = () => {
    const action = () => {
      const cleanPhone = store.whatsappNumber.replace(/[^0-9]/g, '');
      const formatted = cleanPhone.startsWith('0') ? `964${cleanPhone.slice(1)}` : cleanPhone;
      const message = isAr
        ? `السلام عليكم، أود الاستفسار بخصوص منتجات متجر "${store.name}" عبر سوق بلحظة بالموصل.`
        : `Hello, interested in products from "${store.name}".`;
      window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(message)}`, '_blank');
    };

    if (!currentUser) {
      onRequireAuth(action, isAr ? 'للتواصل عبر واتساب مع المتجر، يرجى تسجيل حسابك' : 'Register to contact store');
    } else {
      action();
    }
  };

  const handlePhone = () => {
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
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-3 select-none text-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md mx-auto sm:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Cover Banner with back button & contact actions */}
        <div className="relative h-28 bg-slate-900 overflow-hidden shrink-0">
          <img
            src={store.coverUrl || '/src/assets/images/listing_iphone_pro_1794306234850.jpg'}
            alt={store.name}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

          {/* Top action bar */}
          <div className="absolute top-2.5 inset-x-3 flex items-center justify-between z-10">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-xs"
            >
              {isAr ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleWhatsApp}
                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>واتساب</span>
              </button>
              <button
                type="button"
                onClick={handlePhone}
                className="px-2.5 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white font-bold text-[10px] flex items-center gap-1 border border-white/20 transition-all"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>اتصال</span>
              </button>
            </div>
          </div>
        </div>

        {/* Store Profile Bio Strip with Overlapping Logo */}
        <div className="px-3 pt-0 pb-2.5 bg-slate-50 border-b border-slate-200 relative">
          <div className="flex items-end justify-between -mt-7 mb-1.5">
            <div className="relative">
              <img
                src={store.logoUrl || store.coverUrl || '/src/assets/images/listing_iphone_pro_1794306234850.jpg'}
                alt={store.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md bg-white"
              />
              {store.isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shadow-2xs">
                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                {isAr ? 'مالك متجر موثق' : 'Verified Store Owner'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">{store.name}</h2>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                  activity.isActive
                    ? 'text-emerald-700 bg-emerald-100/80 border border-emerald-200'
                    : 'text-amber-800 bg-amber-100 border border-amber-300'
                }`}
              >
                {activity.isActive ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{isAr ? 'متجر نشط هذا الشهر' : 'Active this month'}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                    <span>{isAr ? 'مؤرشف لعدم النشاط > 30 يوم' : 'Inactive >30d'}</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
              <span className="flex items-center gap-0.5 text-emerald-700 font-semibold">
                <MapPin className="w-3 h-3 text-emerald-600" />
                {store.district} · الموصل
              </span>
              {storeCategoryObj && (
                <>
                  <span>·</span>
                  <span className="text-slate-700 font-semibold">
                    {isAr ? storeCategoryObj.nameAr : storeCategoryObj.nameEn}
                  </span>
                </>
              )}
              <span>·</span>
              <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                {store.rating || 5.0}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">
              {store.description}
            </p>

            {/* Social Links & Location Details */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/80 flex-wrap gap-1">
              <div className="flex items-center gap-2">
                {store.socialLinks?.instagram && (
                  <span className="text-pink-700 font-mono text-[9px] font-bold">
                    📷 {store.socialLinks.instagram}
                  </span>
                )}
                {store.socialLinks?.facebook && (
                  <span className="text-blue-700 font-mono text-[9px] font-bold">
                    📘 {store.socialLinks.facebook}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-emerald-700">
                  {store.deliveryAvailable ? '🛵 متوفر توصيل' : '📍 استلام'}
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${store.lat || 36.3575},${store.lng || 43.1558}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200 font-bold px-1.5 py-0.5 rounded border border-emerald-300 flex items-center gap-0.5 shrink-0 transition-colors"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Store Catalog Items Filter & Category chips */}
        <div className="p-2 border-b border-slate-100 bg-white space-y-1.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? `ابحث داخل منتجات ${store.name}...` : 'Search in store...'}
              className="w-full h-8 pr-8 pl-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Internal Categories Filter Chips */}
          {storeCategories.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-2 py-0.5 rounded-lg font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isAr ? 'الكل' : 'All'} ({allStoreItems.length})
              </button>
              {storeCategories.map((cId) => {
                const catDef = CATEGORIES.find((c) => c.id === cId);
                const count = allStoreItems.filter((i) => i.category === cId).length;
                return (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => setSelectedCategory(cId)}
                    className={`px-2 py-0.5 rounded-lg font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                      selectedCategory === cId
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{catDef ? (isAr ? catDef.nameAr : catDef.nameEn) : cId}</span>
                    <span className="opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Store Items Grid */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>
              {isAr ? `معروضات المتجر (${filteredStoreItems.length})` : `Products (${filteredStoreItems.length})`}
            </span>
            <span className="text-emerald-700 font-bold">
              {isAr ? 'عروض حصرية وضمان معتمد' : 'Exclusive'}
            </span>
          </div>

          {filteredStoreItems.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-600 font-semibold">
                {isAr ? 'لا توجد منتجات مطابقة حالياً داخل المتجر' : 'No products found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredStoreItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onClose();
                    onSelectListing(item);
                  }}
                  className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-2xs hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div className="relative aspect-16/10 bg-slate-100 overflow-hidden">
                    <img
                      src={item.mediaUrls[0]}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                    <div className="absolute top-1.5 right-1.5 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {item.condition === 'new' ? 'جديد' : 'مستعمل'}
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    <h4 className="text-[11px] font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                      {item.title}
                    </h4>
                    <span className="text-xs font-black text-emerald-800 font-mono block">
                      {item.hidePrice ? 'عند التواصل' : `${item.price.toLocaleString()} ${item.currency}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
