import React, { useMemo, useState } from 'react';
import { Store, Phone, Search, X, Loader2 } from 'lucide-react';
import { StoreProfile, Listing, UserAccount } from '../../types';

interface StoresDirectoryViewProps {
  stores: StoreProfile[];
  listings: Listing[];
  currentUser?: UserAccount | null;
  onSelectStore: (store: StoreProfile) => void;
  isLoading?: boolean;
  lang?: 'ar' | 'en';
}

export const StoresDirectoryView: React.FC<StoresDirectoryViewProps> = ({
  stores,
  listings,
  onSelectStore,
  isLoading = false,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStores = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.phoneNumber || '').toLowerCase().includes(q)
    );
  }, [stores, searchQuery]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-5 space-y-5">
      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#0D9488]/70 absolute right-4 top-3.5 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isAr ? 'ابحث عن متجر...' : 'Search stores...'}
          className="w-full h-11 pr-11 pl-10 rounded-2xl bg-[#FFFDF9] border border-amber-200/80 shadow-[0_2px_10px_rgba(245,158,11,0.06)] text-sm text-[#1E293B] placeholder:text-[#64748B]/75 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white focus:border-transparent transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute left-3 top-2.5 p-1 text-[#64748B] hover:text-[#1E293B] rounded-lg transition-colors"
            aria-label={isAr ? 'مسح البحث' : 'Clear search'}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Stores Grid */}
      {isLoading && stores.length === 0 ? (
        <div className="py-16 flex items-center justify-center text-[#0D9488]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="py-16 px-6 text-center bg-[#FFFDF9] rounded-2xl border border-amber-200/80 shadow-[0_3px_14px_rgba(245,158,11,0.05)]">
          <Store className="w-8 h-8 text-amber-300 mx-auto mb-2.5" />
          <p className="text-sm font-semibold text-[#64748B]">
            {stores.length === 0
              ? (isAr ? 'لا توجد متاجر مسجلة بعد' : 'No stores yet')
              : (isAr ? 'لا توجد متاجر مطابقة للبحث' : 'No matching stores')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.map((store) => {
            const adsCount = listings.filter(
              (item) =>
                (item.storeId && String(item.storeId) === String(store.id)) ||
                (store.ownerId &&
                  item.sellerId === store.ownerId &&
                  (item.adType === 'commercial' || item.sellerType === 'commercial'))
            ).length;
            const phone = store.phoneNumber || store.ownerPhone;

            return (
              <div
                key={store.id}
                onClick={() => onSelectStore(store)}
                className="p-4 rounded-2xl bg-[#FFFDF9] border border-amber-200/75 shadow-[0_3px_12px_rgba(13,148,136,0.05)] hover:shadow-[0_12px_26px_rgba(13,148,136,0.11)] hover:border-amber-300 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer transition-all duration-200 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#0D9488] border border-teal-100 flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-sm font-bold text-[#1E293B] truncate">
                      {store.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#64748B] flex-wrap">
                      {phone && (
                        <span className="inline-flex items-center gap-1 tabular-nums" dir="ltr">
                          <Phone className="w-3 h-3 text-[#0D9488]/70 shrink-0" />
                          <span>{phone}</span>
                        </span>
                      )}
                      {phone && <span aria-hidden="true">·</span>}
                      <span className="text-[#0F766E] font-semibold tabular-nums">
                        {adsCount} {isAr ? 'إعلان' : 'ads'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
