import React, { useMemo, useState } from 'react';
import {
  Store,
  Phone,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  MapPin,
  Clock
} from 'lucide-react';
import { StoreProfile, Listing, UserAccount } from '../../types';
import {
  getStoreActivityLabel,
  getStoreBio,
  getStoreLocationLabel,
  getStorePostsForStore,
  isStoreActiveTrusted
} from '../../lib/storeUtils';

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
        (s.phoneNumber || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.district || '').toLowerCase().includes(q)
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
            className="group absolute left-3 top-2.5 p-1 text-[#64748B] hover:text-[#1E293B] rounded-lg transition-all active:scale-90"
            aria-label={isAr ? 'مسح البحث' : 'Clear search'}
          >
            <X className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
          </button>
        )}
      </div>

      {/* Stores Grid */}
      {isLoading && stores.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="p-4 rounded-2xl bg-[#FFFDF9] border border-amber-200/60 space-y-3"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl skeleton-shimmer shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton-shimmer rounded-lg w-2/3" />
                  <div className="h-3 skeleton-shimmer rounded-lg w-5/6" />
                </div>
              </div>
              <div className="h-3 skeleton-shimmer rounded-lg w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="animate-fade-in py-16 px-6 text-center bg-[#FFFDF9] rounded-2xl border border-amber-200/80 shadow-[0_3px_14px_rgba(245,158,11,0.05)]">
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
            const matchedPosts = getStorePostsForStore(store, listings);
            const adsCount = matchedPosts.length;
            const phone = store.phoneNumber || store.ownerPhone;
            const bio = getStoreBio(store, isAr);
            const locationLabel = getStoreLocationLabel(store, isAr);
            const activityLabel = getStoreActivityLabel(matchedPosts, isAr);
            const isTrusted = isStoreActiveTrusted(store, adsCount);

            return (
              <div
                key={store.id}
                onClick={() => onSelectStore(store)}
                className="group p-4 rounded-2xl bg-[#FFFDF9] border border-amber-200/75 shadow-[0_3px_12px_rgba(13,148,136,0.05)] hover:shadow-[0_14px_28px_rgba(13,148,136,0.12)] hover:border-amber-300 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer transition-all duration-200 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-13 h-13 rounded-2xl bg-teal-50 text-[#0D9488] border border-teal-100 flex items-center justify-center overflow-hidden shrink-0 transition-transform duration-200 group-hover:scale-105 group-hover:-rotate-3">
                      {store.logoUrl ? (
                        <img
                          src={store.logoUrl}
                          alt={store.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Store className="w-6 h-6" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-extrabold text-[#1E293B] truncate">
                          {store.name}
                        </h3>
                        {isTrusted && (
                          <span
                            title={isAr ? 'متجر نشط' : 'Active Store'}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-teal-50 text-[#0F766E] border border-teal-200/80 text-[10px] font-bold shrink-0"
                          >
                            <BadgeCheck className="w-3 h-3 text-[#0D9488]" />
                            <span>{isAr ? 'متجر نشط' : 'Active'}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#64748B] line-clamp-1 leading-relaxed">
                        {bio}
                      </p>
                    </div>
                  </div>

                  {isAr ? (
                    <ChevronLeft className="w-4 h-4 text-[#64748B]/70 group-hover:text-[#0D9488] group-hover:-translate-x-1 transition-all duration-200 shrink-0 mt-1" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#64748B]/70 group-hover:text-[#0D9488] group-hover:translate-x-1 transition-all duration-200 shrink-0 mt-1" />
                  )}
                </div>

                {/* Clean Metadata Footer */}
                <div className="pt-2.5 border-t border-amber-200/50 flex items-center justify-between gap-2 text-[11px] text-[#64748B] flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center gap-1 truncate text-[#1E293B] font-medium">
                      <MapPin className="w-3 h-3 text-[#0D9488] shrink-0" />
                      <span className="truncate">{locationLabel}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#0F766E] font-bold tabular-nums shrink-0">
                      {adsCount} {isAr ? 'إعلان' : 'ads'}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[#0F766E] font-medium shrink-0">
                    <Clock className="w-3 h-3 text-[#0D9488]/80 shrink-0" />
                    <span>{activityLabel}</span>
                  </span>
                </div>

                {phone && (
                  <div className="sr-only" dir="ltr">
                    <Phone className="w-3 h-3" />
                    {phone}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

