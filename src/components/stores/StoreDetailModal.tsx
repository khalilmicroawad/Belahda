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
  ExternalLink
} from 'lucide-react';
import { StoreProfile, Listing, UserAccount } from '../../types';

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

  // Filter listings belonging to this store
  const storeItems = useMemo(() => {
    return listings.filter((item) => {
      const belongs =
        (item.sellerType === 'commercial' && item.storeName === store.name) ||
        item.sellerPhone === store.ownerPhone ||
        item.storeId === store.id;

      if (!belongs) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [listings, store, searchQuery]);

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
        {/* Header with store brand */}
        <div className="relative bg-slate-900 text-white p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1 -mx-1 text-slate-300 hover:text-white rounded-lg transition-colors"
            >
              {isAr ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-bold leading-none">{store.name}</h2>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="text-[10px] text-slate-400">
                {store.district} · الموصل
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleWhatsApp}
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              title="واتساب"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handlePhone}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
              title="اتصال"
            >
              <Phone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Store Profile Bio Strip */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-1.5">
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {store.description}
          </p>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
            <span className="flex items-center gap-1 truncate max-w-[200px]">
              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
              {store.address}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-700">
                {store.deliveryAvailable ? '🛵 متوفر توصيل' : '📍 استلام'}
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${store.lat || 36.3575},${store.lng || 43.1558}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5 shrink-0"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Store Catalog Items Filter */}
        <div className="p-2.5 border-b border-slate-100 bg-white">
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
        </div>

        {/* Store Items Grid */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>
              {isAr ? `معروضات المتجر (${storeItems.length})` : `Products (${storeItems.length})`}
            </span>
            <span className="text-emerald-700 font-bold">
              {isAr ? 'عروض حصرية' : 'Exclusive'}
            </span>
          </div>

          {storeItems.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-600 font-semibold">
                {isAr ? 'لا توجد منتجات مطابقة حالياً داخل المتجر' : 'No products found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {storeItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onClose();
                    onSelectListing(item);
                  }}
                  className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-2xs hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div className="relative aspect-16/10 bg-slate-100 overflow-hidden">
                    <img
                      src={item.mediaUrls[0]}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 right-1.5 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {item.condition === 'new' ? 'جديد' : 'مستعمل'}
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    <h4 className="text-[11px] font-bold text-slate-900 line-clamp-1">
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
