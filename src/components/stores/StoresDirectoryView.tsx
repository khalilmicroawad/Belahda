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
  Clock,
  Navigation,
  Loader2,
  Flame
} from 'lucide-react';
import { StoreProfile, Listing, UserAccount } from '../../types';
import {
  getStoreActivityLabel,
  getStoreBio,
  getStoreLocationLabel,
  getStorePostsForStore,
  isStoreActiveTrusted
} from '../../lib/storeUtils';
import {
  GeoCoords,
  calculateHaversineKm,
  formatDistanceAwayLabel,
  getStoreCoords
} from '../../lib/geoUtils';

type StoreSortMode = 'default' | 'nearest' | 'activity';

interface StoresDirectoryViewProps {
  stores: StoreProfile[];
  listings: Listing[];
  currentUser?: UserAccount | null;
  onSelectStore: (store: StoreProfile) => void;
  userLocation?: GeoCoords | null;
  isLocatingUser?: boolean;
  locationStatus?: 'idle' | 'granted' | 'denied' | 'unsupported';
  onRequestLocation?: () => void;
  isLoading?: boolean;
  lang?: 'ar' | 'en';
}

export const StoresDirectoryView: React.FC<StoresDirectoryViewProps> = ({
  stores,
  listings,
  onSelectStore,
  userLocation = null,
  isLocatingUser = false,
  locationStatus = 'idle',
  onRequestLocation,
  isLoading = false,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<StoreSortMode>('default');
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  const enrichedStores = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = stores
      .filter((s) => {
        if (!q) return true;
        return (
          (s.name || '').toLowerCase().includes(q) ||
          (s.phoneNumber || '').toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q) ||
          (s.district || '').toLowerCase().includes(q)
        );
      })
      .map((store) => {
        const matchedPosts = getStorePostsForStore(store, listings);
        const coords = getStoreCoords(store, matchedPosts);
        const distanceKm =
          userLocation && coords ? calculateHaversineKm(userLocation, coords) : undefined;
        let latestPostTs = store.lastActiveAt || 0;
        matchedPosts.forEach((p) => {
          if ((p.createdTimestamp || 0) > latestPostTs) latestPostTs = p.createdTimestamp || 0;
        });
        return {
          store,
          matchedPosts,
          distanceKm,
          latestPostTs,
        };
      });

    if (sortMode === 'nearest' && userLocation) {
      return list.sort((a, b) => {
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm;
        }
        if (a.distanceKm !== undefined) return -1;
        if (b.distanceKm !== undefined) return 1;
        return b.latestPostTs - a.latestPostTs;
      });
    }

    if (sortMode === 'activity') {
      return list.sort((a, b) => {
        const diffCount = b.matchedPosts.length - a.matchedPosts.length;
        if (diffCount !== 0) return diffCount;
        return b.latestPostTs - a.latestPostTs;
      });
    }

    return list;
  }, [stores, listings, searchQuery, userLocation, sortMode]);

  const handleSortNearest = () => {
    setSortMode('nearest');
    if (!userLocation && onRequestLocation) {
      setIsBannerDismissed(false);
      onRequestLocation();
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-5 space-y-4">
      {/* Sleek Geolocation Prompt / Status Bar */}
      {onRequestLocation && (!userLocation && !isBannerDismissed ? (
        <div className="animate-fade-in px-3.5 py-2.5 rounded-2xl bg-white border border-[#D9AF91] shadow-[0_2px_10px_rgba(180,120,60,0.07)] flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200/80 text-[#008080] flex items-center justify-center shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-[#1E293B] leading-snug">
              {locationStatus === 'denied'
                ? (isAr
                    ? 'تم رفض إذن الموقع — يمكنك التصفح حسب الحي أو إعادة المحاولة'
                    : 'Location declined — browse normally or retry')
                : (isAr
                    ? 'حدد موقعك لعرض المتاجر الأقرب إليك'
                    : 'Share your location to view nearest stores')}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {locationStatus !== 'unsupported' && (
              <button
                type="button"
                disabled={isLocatingUser}
                onClick={onRequestLocation}
                className="group min-h-[34px] px-3 py-1 rounded-xl bg-[#008080] hover:bg-[#006666] active:scale-95 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs"
              >
                {isLocatingUser ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
                )}
                <span>{isAr ? 'تحديد موقعي' : 'Locate Me'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsBannerDismissed(true)}
              aria-label={isAr ? 'إخفاء' : 'Dismiss'}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#EDC9AF]/70 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null)}

      {/* Search + Compact Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-[#008080]/70 absolute right-4 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث عن متجر...' : 'Search stores...'}
            className="w-full h-11 pr-11 pl-10 rounded-2xl bg-white border border-[#D9AF91] shadow-[0_2px_10px_rgba(180,120,60,0.08)] text-sm text-[#1E293B] placeholder:text-[#64748B]/75 focus:outline-none focus:ring-2 focus:ring-[#008080] focus:border-transparent transition-all"
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

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSortNearest}
            className={`group min-h-[42px] px-3.5 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 inline-flex items-center gap-1.5 ${
              sortMode === 'nearest'
                ? 'bg-[#008080] text-white shadow-[0_4px_12px_rgba(0,128,128,0.22)]'
                : 'bg-white text-[#1E293B] border border-[#D9AF91] hover:bg-[#EDC9AF]/70 hover:text-[#006666] shadow-[0_2px_10px_rgba(180,120,60,0.08)]'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 shrink-0" />
            <span>{isAr ? 'الأقرب إليّ' : 'Nearest'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSortMode((m) => (m === 'activity' ? 'default' : 'activity'))}
            className={`group min-h-[42px] px-3.5 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 inline-flex items-center gap-1.5 ${
              sortMode === 'activity'
                ? 'bg-[#008080] text-white shadow-[0_4px_12px_rgba(0,128,128,0.22)]'
                : 'bg-white text-[#1E293B] border border-[#D9AF91] hover:bg-[#EDC9AF]/70 hover:text-[#006666] shadow-[0_2px_10px_rgba(180,120,60,0.08)]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span>{isAr ? 'الأكثر نشاطاً' : 'Most Active'}</span>
          </button>
        </div>
      </div>

      {/* Stores Grid */}
      {isLoading && stores.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="p-4 rounded-2xl bg-white border border-[#D9AF91]/80 space-y-3"
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
      ) : enrichedStores.length === 0 ? (
        <div className="animate-fade-in py-16 px-6 text-center bg-white rounded-2xl border border-[#D9AF91] shadow-[0_3px_14px_rgba(180,120,60,0.08)]">
          <Store className="w-8 h-8 text-[#C69363] mx-auto mb-2.5" />
          <p className="text-sm font-semibold text-[#64748B]">
            {stores.length === 0
              ? (isAr ? 'لا توجد متاجر مسجلة بعد' : 'No stores yet')
              : (isAr ? 'لا توجد متاجر مطابقة للبحث' : 'No matching stores')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrichedStores.map(({ store, matchedPosts, distanceKm }) => {
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
                className="group p-4 rounded-2xl bg-white border border-[#D9AF91]/85 shadow-[0_3px_12px_rgba(180,120,60,0.08)] hover:shadow-[0_14px_28px_rgba(0,128,128,0.14)] hover:border-[#C89875] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer transition-all duration-200 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-13 h-13 rounded-2xl bg-teal-50 text-[#008080] border border-teal-100 flex items-center justify-center overflow-hidden shrink-0 transition-transform duration-200 group-hover:scale-105 group-hover:-rotate-3">
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
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-teal-50 text-[#006666] border border-teal-200/80 text-[10px] font-bold shrink-0"
                          >
                            <BadgeCheck className="w-3 h-3 text-[#008080]" />
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
                    <ChevronLeft className="w-4 h-4 text-[#64748B]/70 group-hover:text-[#008080] group-hover:-translate-x-1 transition-all duration-200 shrink-0 mt-1" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#64748B]/70 group-hover:text-[#008080] group-hover:translate-x-1 transition-all duration-200 shrink-0 mt-1" />
                  )}
                </div>

                {/* Clean Metadata Footer + Distance Badge */}
                <div className="pt-2.5 border-t border-[#EDC9AF] flex items-center justify-between gap-2 text-[11px] text-[#64748B] flex-wrap">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="inline-flex items-center gap-1 truncate text-[#1E293B] font-medium">
                      <MapPin className="w-3 h-3 text-[#008080] shrink-0" />
                      <span className="truncate">{locationLabel}</span>
                    </span>
                    {distanceKm !== undefined && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-50/90 text-[#006666] border border-teal-200/75 text-[10px] font-bold tabular-nums shrink-0">
                        <Navigation className="w-2.5 h-2.5 text-[#008080] shrink-0" />
                        <span>{formatDistanceAwayLabel(distanceKm, isAr)}</span>
                      </span>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="text-[#006666] font-bold tabular-nums shrink-0">
                      {adsCount} {isAr ? 'إعلان' : 'ads'}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[#006666] font-medium shrink-0">
                    <Clock className="w-3 h-3 text-[#008080]/80 shrink-0" />
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

