import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  MapPin,
  X,
  AlertTriangle,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  Heart,
  LayoutGrid,
  Smartphone,
  Car,
  Zap,
  Armchair,
  Watch,
  Building2,
  Gamepad2,
  Sparkles,
  Wrench,
  Plus,
  RotateCcw,
  Store,
  PackageX,
  ChevronDown,
  Check,
  Clock,
  Handshake,
  Truck,
  User,
  Navigation,
  ArrowDownNarrowWide,
  ArrowUpWideNarrow,
  Flame,
  ArrowUpDown,
  Loader2
} from 'lucide-react';
import { Listing, CategoryId, SellerType, StoreProfile, UserAccount } from '../../types';
import { CATEGORIES } from '../../data/categories';
import { NeighborhoodSelector } from '../common/NeighborhoodSelector';
import { isRepresentativeAd } from '../../lib/storeUtils';
import {
  GeoCoords,
  calculateHaversineKm,
  formatDistanceAwayLabel,
  getListingCoords
} from '../../lib/geoUtils';

const CATEGORY_ICONS: Record<CategoryId, React.ElementType> = {
  electronics: Smartphone,
  vehicles: Car,
  appliances: Zap,
  furniture: Armchair,
  fashion: Watch,
  real_estate: Building2,
  hobbies: Gamepad2,
  handcrafts: Sparkles,
  services: Wrench,
};

export type FeedSortOption = 'newest' | 'nearest' | 'price_asc' | 'price_desc' | 'activity';

interface MarketplaceFeedProps {
  listings: Listing[];
  stores?: StoreProfile[];
  currentUser?: UserAccount | null;
  favoriteIds?: string[];
  onToggleFavorite?: (postId: string) => void;
  onSelectListing: (listing: Listing) => void;
  onOpenStore?: (storeId: string) => void;
  onOpenRepresentative?: (repId: string) => void;
  qualifiedRepIds?: Set<string>;
  onOpenChat?: (listing: Listing) => void;
  onOpenCreate: () => void;
  onRequireAuth?: (pendingAction: () => void, message?: string) => void;
  userLocation?: GeoCoords | null;
  isLocatingUser?: boolean;
  locationStatus?: 'idle' | 'granted' | 'denied' | 'unsupported';
  onRequestLocation?: () => void;
  newlyPublishedId?: string | null;
  resetTrigger?: number;
  isLoading?: boolean;
  feedError?: { message: string; code?: string } | null;
  onRetryFetch?: () => void;
  onRefresh?: () => Promise<void> | void;
  lang?: 'ar' | 'en';
}

const AdCardImage: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-full bg-[#EDC9AF]/70 flex items-center justify-center">
        <ImageIcon className="w-7 h-7 text-[#C69363]" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {!loaded && <div className="absolute inset-0 skeleton-shimmer" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ease-out ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

export const MarketplaceFeed: React.FC<MarketplaceFeedProps> = ({
  listings,
  stores = [],
  favoriteIds = [],
  onToggleFavorite,
  onSelectListing,
  onOpenStore,
  onOpenRepresentative,
  qualifiedRepIds,
  onOpenCreate,
  userLocation = null,
  isLocatingUser = false,
  locationStatus = 'idle',
  onRequestLocation,
  newlyPublishedId,
  resetTrigger,
  isLoading = false,
  feedError = null,
  onRetryFetch,
  onRefresh,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all' | 'favorites'>('all');
  const [selectedAdType, setSelectedAdType] = useState<SellerType | 'all'>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [sortBy, setSortBy] = useState<FeedSortOption>('newest');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState<boolean>(false);
  const [isAdTypeMenuOpen, setIsAdTypeMenuOpen] = useState<boolean>(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState<boolean>(false);
  const [isLocationBannerDismissed, setIsLocationBannerDismissed] = useState<boolean>(false);
  const [poppedCardId, setPoppedCardId] = useState<string | null>(null);
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const categoryMenuRef = React.useRef<HTMLDivElement>(null);
  const adTypeMenuRef = React.useRef<HTMLDivElement>(null);
  const sortMenuRef = React.useRef<HTMLDivElement>(null);
  const touchStartYRef = React.useRef<number | null>(null);
  const touchStartXRef = React.useRef<number | null>(null);
  const isPullEligibleRef = React.useRef<boolean>(false);
  const PULL_THRESHOLD = 62;
  const MAX_PULL_DISTANCE = 92;

  useEffect(() => {
    if (!isCategoryMenuOpen && !isAdTypeMenuOpen && !isSortMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(target)) {
        setIsCategoryMenuOpen(false);
      }
      if (adTypeMenuRef.current && !adTypeMenuRef.current.contains(target)) {
        setIsAdTypeMenuOpen(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setIsSortMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCategoryMenuOpen(false);
        setIsAdTypeMenuOpen(false);
        setIsSortMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isCategoryMenuOpen, isAdTypeMenuOpen, isSortMenuOpen]);

  useEffect(() => {
    if (resetTrigger) {
      setSearchQuery('');
      setSelectedCategory('all');
      setSelectedAdType('all');
      setSelectedArea('all');
      setSortBy('newest');
      setIsCategoryMenuOpen(false);
      setIsAdTypeMenuOpen(false);
      setIsSortMenuOpen(false);
    }
  }, [resetTrigger]);

  const storeMap = useMemo(() => {
    const map = new Map<string, StoreProfile>();
    stores.forEach((st) => map.set(String(st.id), st));
    return map;
  }, [stores]);

  const distanceKmMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!userLocation) return map;
    listings.forEach((item) => {
      const coords = getListingCoords(item, storeMap);
      if (coords) {
        map.set(item.id, calculateHaversineKm(userLocation, coords));
      }
    });
    return map;
  }, [listings, storeMap, userLocation]);

  const sellerActivityMap = useMemo(() => {
    const counts = new Map<string, number>();
    const latestTs = new Map<string, number>();
    listings.forEach((item) => {
      const key = item.storeId
        ? `store:${item.storeId}`
        : item.sellerId
        ? `user:${item.sellerId}`
        : '';
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
      const prevTs = latestTs.get(key) || 0;
      if ((item.createdTimestamp || 0) > prevTs) {
        latestTs.set(key, item.createdTimestamp || 0);
      }
    });
    return { counts, latestTs };
  }, [listings]);

  const { areaCounts, extraAreas } = useMemo(() => {
    const counts: Record<string, number> = {};
    const extras: string[] = [];
    listings.forEach((item) => {
      const area = (item.district || item.city || '').trim();
      if (area) {
        counts[area] = (counts[area] || 0) + 1;
        if (!extras.includes(area)) extras.push(area);
      }
    });
    return { areaCounts: counts, extraAreas: extras };
  }, [listings]);

  const savedListingsCount = useMemo(
    () => listings.filter((item) => favoriteIds.includes(item.id)).length,
    [listings, favoriteIds]
  );

  const filteredListings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const matched = listings.filter((item) => {
      if (selectedCategory === 'favorites') {
        if (!favoriteIds.includes(item.id)) return false;
      } else if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (selectedAdType !== 'all') {
        const itemType = item.adType || item.sellerType || 'personal';
        if (itemType !== selectedAdType) return false;
      }
      if (selectedArea !== 'all') {
        const itemArea = (item.district || item.city || '').trim();
        if (itemArea !== selectedArea) return false;
      }
      if (q) {
        const catDef = CATEGORIES.find((c) => c.id === item.category);
        const matchesTitle = (item.title || '').toLowerCase().includes(q);
        const matchesCat =
          (item.category || '').toLowerCase().includes(q) ||
          (catDef &&
            (catDef.nameAr.toLowerCase().includes(q) || catDef.nameEn.toLowerCase().includes(q)));
        const matchesArea =
          (item.district || '').toLowerCase().includes(q) ||
          (item.city || '').toLowerCase().includes(q);
        return matchesTitle || matchesCat || matchesArea;
      }
      return true;
    });

    if (sortBy === 'price_asc') {
      return matched.sort((a, b) => {
        if (a.hidePrice && !b.hidePrice) return 1;
        if (!a.hidePrice && b.hidePrice) return -1;
        const diff = Number(a.price ?? 0) - Number(b.price ?? 0);
        return diff !== 0 ? diff : (b.createdTimestamp || 0) - (a.createdTimestamp || 0);
      });
    }

    if (sortBy === 'price_desc') {
      return matched.sort((a, b) => {
        if (a.hidePrice && !b.hidePrice) return 1;
        if (!a.hidePrice && b.hidePrice) return -1;
        const diff = Number(b.price ?? 0) - Number(a.price ?? 0);
        return diff !== 0 ? diff : (b.createdTimestamp || 0) - (a.createdTimestamp || 0);
      });
    }

    if (sortBy === 'nearest') {
      return matched.sort((a, b) => {
        const distA = distanceKmMap.get(a.id);
        const distB = distanceKmMap.get(b.id);
        if (distA !== undefined && distB !== undefined) {
          return distA - distB;
        }
        if (distA !== undefined) return -1;
        if (distB !== undefined) return 1;
        return (b.createdTimestamp || 0) - (a.createdTimestamp || 0);
      });
    }

    if (sortBy === 'activity') {
      return matched.sort((a, b) => {
        const getActivityScore = (item: Listing) => {
          const views = Number(item.viewsCount || 1);
          const key = item.storeId
            ? `store:${item.storeId}`
            : item.sellerId
            ? `user:${item.sellerId}`
            : '';
          const sellerCount = key ? sellerActivityMap.counts.get(key) || 1 : 1;
          const storeObj = item.storeId ? storeMap.get(String(item.storeId)) : undefined;
          const storeBoost = storeObj?.totalListingsCount || 0;
          return views * 10 + Math.max(sellerCount, storeBoost) * 6;
        };
        const diff = getActivityScore(b) - getActivityScore(a);
        if (diff !== 0) return diff;
        return (b.createdTimestamp || 0) - (a.createdTimestamp || 0);
      });
    }

    return matched.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));
  }, [
    listings,
    searchQuery,
    selectedCategory,
    selectedAdType,
    selectedArea,
    sortBy,
    favoriteIds,
    distanceKmMap,
    sellerActivityMap,
    storeMap,
  ]);

  const handleHeartClick = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    setPoppedCardId(postId);
    window.setTimeout(() => {
      setPoppedCardId((prev) => (prev === postId ? null : prev));
    }, 320);
    onToggleFavorite?.(postId);
  };

  const activeCategoryDef = CATEGORIES.find((c) => c.id === selectedCategory);
  const ActiveCategoryIcon: React.ElementType =
    selectedCategory === 'favorites'
      ? Heart
      : selectedCategory === 'all' || !activeCategoryDef
      ? LayoutGrid
      : CATEGORY_ICONS[activeCategoryDef.id];
  const activeCategoryLabel =
    selectedCategory === 'favorites'
      ? isAr
        ? `المفضلة (${savedListingsCount})`
        : `Favorites (${savedListingsCount})`
      : selectedCategory === 'all' || !activeCategoryDef
      ? isAr
        ? 'الكل'
        : 'All'
      : isAr
      ? activeCategoryDef.nameAr
      : activeCategoryDef.nameEn;

  const adTypeOptions: {
    id: SellerType | 'all';
    labelAr: string;
    labelEn: string;
    Icon: React.ElementType;
  }[] = [
    { id: 'all', labelAr: 'الكل', labelEn: 'All', Icon: LayoutGrid },
    { id: 'personal', labelAr: 'شخصي', labelEn: 'Personal', Icon: User },
    { id: 'commercial', labelAr: 'تجاري', labelEn: 'Commercial', Icon: Store },
    { id: 'representative', labelAr: 'مندوب', labelEn: 'Representative', Icon: Handshake },
  ];

  const activeAdTypeDef =
    adTypeOptions.find((opt) => opt.id === selectedAdType) || adTypeOptions[0];
  const ActiveAdTypeIcon = activeAdTypeDef.Icon;

  const sortOptions: {
    id: FeedSortOption;
    labelAr: string;
    labelEn: string;
    Icon: React.ElementType;
  }[] = [
    { id: 'newest', labelAr: 'الأحدث أولاً', labelEn: 'Newest', Icon: Clock },
    { id: 'nearest', labelAr: 'الأقرب إليّ', labelEn: 'Nearest Place', Icon: Navigation },
    { id: 'price_asc', labelAr: 'الأقل سعراً', labelEn: 'Price: Low to High', Icon: ArrowDownNarrowWide },
    { id: 'price_desc', labelAr: 'الأعلى سعراً', labelEn: 'Price: High to Low', Icon: ArrowUpWideNarrow },
    { id: 'activity', labelAr: 'الأكثر نشاطاً', labelEn: 'Most Active', Icon: Flame },
  ];

  const activeSortDef =
    sortOptions.find((opt) => opt.id === sortBy) || sortOptions[0];
  const ActiveSortIcon = activeSortDef.Icon;

  const handleSelectSort = (nextSort: FeedSortOption) => {
    setSortBy(nextSort);
    setIsSortMenuOpen(false);
    if (nextSort === 'nearest' && !userLocation && onRequestLocation) {
      setIsLocationBannerDismissed(false);
      onRequestLocation();
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isRefreshing || !onRefresh) return;
    if (isCategoryMenuOpen || isAdTypeMenuOpen || isSortMenuOpen) return;
    if (window.scrollY <= 2 && e.touches.length === 1) {
      touchStartYRef.current = e.touches[0].clientY;
      touchStartXRef.current = e.touches[0].clientX;
      isPullEligibleRef.current = true;
    } else {
      isPullEligibleRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPullEligibleRef.current || isRefreshing || touchStartYRef.current === null || touchStartXRef.current === null) {
      return;
    }
    if (window.scrollY > 4) {
      isPullEligibleRef.current = false;
      setPullDistance(0);
      return;
    }

    const dy = e.touches[0].clientY - touchStartYRef.current;
    const dx = Math.abs(e.touches[0].clientX - touchStartXRef.current);

    if (dy > 8 && dy > dx * 1.15) {
      const damped = Math.min(MAX_PULL_DISTANCE, (dy - 8) * 0.45);
      setPullDistance(damped);
    } else if (dy <= 0) {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullEligibleRef.current) {
      touchStartYRef.current = null;
      touchStartXRef.current = null;
      return;
    }

    isPullEligibleRef.current = false;
    touchStartYRef.current = null;
    touchStartXRef.current = null;

    if (pullDistance >= PULL_THRESHOLD && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(52);
      try {
        await Promise.resolve(onRefresh());
      } finally {
        window.setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 280);
      }
    } else {
      setPullDistance(0);
    }
  };

  const pullProgress = Math.min(1, pullDistance / PULL_THRESHOLD);
  const showPullIndicator = pullDistance > 6 || isRefreshing;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="w-full max-w-6xl mx-auto px-4 py-5 space-y-4 touch-pan-y"
    >
      {/* Mobile Pull-to-Refresh Indicator */}
      <div
        aria-live="polite"
        style={{
          height: showPullIndicator ? `${Math.max(46, Math.round(pullDistance))}px` : '0px',
          opacity: showPullIndicator ? Math.min(1, pullProgress + (isRefreshing ? 1 : 0.25)) : 0,
        }}
        className="overflow-hidden transition-[height,opacity] duration-200 ease-out flex items-center justify-center"
      >
        <div className="px-4 py-1.5 rounded-2xl bg-white/95 border border-[#D9AF91] shadow-[0_4px_14px_rgba(0,128,128,0.12)] inline-flex items-center gap-2 text-xs font-bold text-[#006666]">
          <RefreshCw
            style={!isRefreshing ? { transform: `rotate(${Math.round(pullProgress * 220)}deg)` } : undefined}
            className={`w-4 h-4 text-[#008080] shrink-0 ${isRefreshing ? 'animate-spin' : 'transition-transform duration-75'}`}
          />
          <span>
            {isRefreshing
              ? (isAr ? 'جاري تحديث الإعلانات...' : 'Refreshing ads...')
              : pullDistance >= PULL_THRESHOLD
              ? (isAr ? 'اترك للتحديث الآن' : 'Release to refresh')
              : (isAr ? 'اسحب للأسفل لتحديث الإعلانات' : 'Pull down to refresh')}
          </span>
        </div>
      </div>
      {/* Sleek Non-Intrusive User Geolocation Banner */}
      {onRequestLocation && (!userLocation && !isLocationBannerDismissed ? (
        <div className="animate-fade-in px-3.5 py-2.5 rounded-2xl bg-white border border-[#D9AF91] shadow-[0_2px_10px_rgba(180,120,60,0.07)] flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200/80 text-[#008080] flex items-center justify-center shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-[#1E293B] leading-snug">
              {locationStatus === 'denied'
                ? (isAr
                    ? 'تم رفض إذن الموقع — يمكنك التصفية حسب الحي أو إعادة السماح'
                    : 'Location access declined — filter by neighborhood or retry')
                : locationStatus === 'unsupported'
                ? (isAr
                    ? 'المتصفح لا يدعم تحديد الموقع التلقائي'
                    : 'Geolocation not supported')
                : (isAr
                    ? 'حدد موقعك لعرض الإعلانات والمتاجر الأقرب إليك'
                    : 'Share your location to view nearest ads & stores')}
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
              onClick={() => setIsLocationBannerDismissed(true)}
              aria-label={isAr ? 'إخفاء' : 'Dismiss'}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#EDC9AF]/70 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : userLocation ? (
        <div className="animate-fade-in px-3.5 py-2 rounded-2xl bg-teal-50/90 border border-teal-200/80 flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-[#006666] font-bold min-w-0">
            <Navigation className="w-3.5 h-3.5 text-[#008080] shrink-0" />
            <span className="truncate">
              {isAr
                ? 'الموقع مفعّل • تُعرض المسافة على الإعلانات المتاحة'
                : 'Location active • Distances shown on listings'}
            </span>
          </span>
          {sortBy !== 'nearest' ? (
            <button
              type="button"
              onClick={() => setSortBy('nearest')}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-[#008080] hover:bg-[#006666] active:scale-95 text-white text-[11px] font-bold transition-all"
            >
              {isAr ? 'رتّب بالأقرب' : 'Sort Nearest'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onRequestLocation}
              disabled={isLocatingUser}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-white hover:bg-[#EDC9AF]/60 border border-teal-200 text-[#006666] text-[11px] font-bold inline-flex items-center gap-1 transition-all"
            >
              {isLocatingUser && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>{isAr ? 'تحديث' : 'Refresh'}</span>
            </button>
          )}
        </div>
      ) : null)}

      {/* Search + Compact Single-Row Dropdown Controls (Type, Category, Area, Sort) */}
      <div className="space-y-2.5">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-[#008080]/70 absolute right-4 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث بالعنوان أو التصنيف أو الحي...' : 'Search by title, category, or area...'}
            className="w-full h-[42px] pr-11 pl-10 rounded-2xl bg-white border border-[#D9AF91] shadow-[0_2px_10px_rgba(180,120,60,0.08)] text-sm text-[#1E293B] placeholder:text-[#64748B]/75 focus:outline-none focus:ring-2 focus:ring-[#008080] focus:border-transparent transition-all duration-200"
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

        {/* Space-Saving Dropdown Bar: Ad Type, Category, Neighborhood, Sort By */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap items-center gap-2">
          {/* 1. Compact Ad Type Dropdown */}
          <div ref={adTypeMenuRef} className="relative w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsAdTypeMenuOpen((prev) => !prev);
                setIsCategoryMenuOpen(false);
                setIsSortMenuOpen(false);
              }}
              aria-haspopup="listbox"
              aria-expanded={isAdTypeMenuOpen}
              className={`group w-full sm:w-auto min-h-[42px] px-3 py-2 rounded-2xl text-xs font-semibold transition-all duration-200 active:scale-95 inline-flex items-center justify-between gap-1.5 whitespace-nowrap ${
                selectedAdType !== 'all'
                  ? 'bg-[#008080] text-white shadow-[0_4px_12px_rgba(0,128,128,0.22)]'
                  : 'bg-white text-[#1E293B] border border-[#D9AF91] hover:border-[#C89875] hover:bg-[#EDC9AF]/70 hover:text-[#006666] shadow-[0_2px_10px_rgba(180,120,60,0.08)]'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <ActiveAdTypeIcon
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    selectedAdType !== 'all'
                      ? 'text-white scale-110'
                      : 'text-[#008080] group-hover:scale-110'
                  }`}
                />
                <span className="truncate">
                  {isAr
                    ? `النوع: ${activeAdTypeDef.labelAr}`
                    : `Type: ${activeAdTypeDef.labelEn}`}
                </span>
              </span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                  isAdTypeMenuOpen ? 'rotate-180' : ''
                } ${selectedAdType !== 'all' ? 'text-white/90' : 'text-[#64748B]'}`}
              />
            </button>

            {isAdTypeMenuOpen && (
              <div
                role="listbox"
                className="animate-fade-in absolute top-full mt-2 start-0 w-52 z-50 bg-white rounded-2xl border border-[#D9AF91] shadow-[0_14px_34px_rgba(0,128,128,0.18)] overflow-hidden py-1.5"
              >
                {adTypeOptions.map(({ id, labelAr, labelEn, Icon }) => {
                  const active = selectedAdType === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedAdType(id);
                        setIsAdTypeMenuOpen(false);
                      }}
                      className={`group w-full px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors ${
                        active
                          ? 'bg-teal-50 text-[#006666] font-bold'
                          : 'text-[#1E293B] hover:bg-[#EDC9AF]/55 font-medium'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[#008080] transition-transform duration-200 group-hover:scale-110" />
                        <span>{isAr ? labelAr : labelEn}</span>
                      </span>
                      {active && <Check className="w-4 h-4 text-[#008080]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Compact Category Dropdown with Icons */}
          <div ref={categoryMenuRef} className="relative w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsCategoryMenuOpen((prev) => !prev);
                setIsAdTypeMenuOpen(false);
                setIsSortMenuOpen(false);
              }}
              aria-haspopup="listbox"
              aria-expanded={isCategoryMenuOpen}
              className={`group w-full sm:w-auto min-h-[42px] px-3 py-2 rounded-2xl text-xs font-semibold transition-all duration-200 active:scale-95 inline-flex items-center justify-between gap-1.5 whitespace-nowrap ${
                selectedCategory === 'favorites'
                  ? 'bg-rose-500 text-white shadow-[0_4px_12px_rgba(244,63,94,0.24)]'
                  : selectedCategory !== 'all'
                  ? 'bg-[#008080] text-white shadow-[0_4px_12px_rgba(0,128,128,0.22)]'
                  : 'bg-white text-[#1E293B] border border-[#D9AF91] hover:border-[#C89875] hover:bg-[#EDC9AF]/70 hover:text-[#006666] shadow-[0_2px_10px_rgba(180,120,60,0.08)]'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <ActiveCategoryIcon
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    selectedCategory !== 'all'
                      ? 'text-white scale-110'
                      : 'text-[#008080] group-hover:scale-110 group-hover:-rotate-6'
                  } ${selectedCategory === 'favorites' ? 'fill-white' : ''}`}
                />
                <span className="truncate">
                  {isAr ? `التصنيف: ${activeCategoryLabel}` : `Category: ${activeCategoryLabel}`}
                </span>
              </span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                  isCategoryMenuOpen ? 'rotate-180' : ''
                } ${selectedCategory !== 'all' ? 'text-white/90' : 'text-[#64748B]'}`}
              />
            </button>

            {isCategoryMenuOpen && (
              <div
                role="listbox"
                className="animate-fade-in absolute top-full mt-2 end-0 sm:start-0 sm:end-auto w-64 z-50 bg-white rounded-2xl border border-[#D9AF91] shadow-[0_14px_34px_rgba(0,128,128,0.18)] overflow-hidden py-1.5 max-h-80 overflow-y-auto"
              >
                {/* All Categories */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setIsCategoryMenuOpen(false);
                  }}
                  className={`group w-full px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-teal-50 text-[#006666] font-bold'
                      : 'text-[#1E293B] hover:bg-[#EDC9AF]/55 font-medium'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <LayoutGrid className="w-4 h-4 text-[#008080] transition-transform duration-200 group-hover:scale-110" />
                    <span>{isAr ? 'الكل' : 'All Categories'}</span>
                  </span>
                  {selectedCategory === 'all' && <Check className="w-4 h-4 text-[#008080]" />}
                </button>

                {/* Favorites */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('favorites');
                    setIsCategoryMenuOpen(false);
                  }}
                  className={`group w-full px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors ${
                    selectedCategory === 'favorites'
                      ? 'bg-rose-50 text-rose-600 font-bold'
                      : 'text-[#1E293B] hover:bg-rose-50/50 font-medium'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Heart
                      className={`w-4 h-4 text-rose-500 transition-transform duration-200 group-hover:scale-110 ${
                        selectedCategory === 'favorites' || savedListingsCount > 0 ? 'fill-rose-500' : ''
                      }`}
                    />
                    <span>{isAr ? 'المفضلة' : 'Favorites'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-rose-100/80 text-rose-600 text-[10px] font-bold tabular-nums">
                      {savedListingsCount}
                    </span>
                    {selectedCategory === 'favorites' && <Check className="w-4 h-4 text-rose-500" />}
                  </span>
                </button>

                <div className="my-1 border-t border-[#EDC9AF]" />

                {/* All 9 Marketplace Categories with Lucide Icons */}
                {CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat.id;
                  const CatIcon = CATEGORY_ICONS[cat.id];
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setIsCategoryMenuOpen(false);
                      }}
                      className={`group w-full px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors ${
                        active
                          ? 'bg-teal-50 text-[#006666] font-bold'
                          : 'text-[#1E293B] hover:bg-[#EDC9AF]/55 font-medium'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <CatIcon className="w-4 h-4 text-[#008080] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
                        <span>{isAr ? cat.nameAr : cat.nameEn}</span>
                      </span>
                      {active && <Check className="w-4 h-4 text-[#008080]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Compact Mosul Neighborhood Dropdown */}
          <NeighborhoodSelector
            value={selectedArea}
            onChange={setSelectedArea}
            mode="filter"
            areaCounts={areaCounts}
            extraAreas={extraAreas}
            lang={lang}
          />

          {/* 4. Organized Multi-Option Sorting Dropdown (ترتيب حسب) */}
          <div ref={sortMenuRef} className="relative w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsSortMenuOpen((prev) => !prev);
                setIsCategoryMenuOpen(false);
                setIsAdTypeMenuOpen(false);
              }}
              aria-haspopup="listbox"
              aria-expanded={isSortMenuOpen}
              className={`group w-full sm:w-auto min-h-[42px] px-3 py-2 rounded-2xl text-xs font-semibold transition-all duration-200 active:scale-95 inline-flex items-center justify-between gap-1.5 whitespace-nowrap ${
                sortBy !== 'newest'
                  ? 'bg-[#008080] text-white shadow-[0_4px_12px_rgba(0,128,128,0.22)]'
                  : 'bg-white text-[#1E293B] border border-[#D9AF91] hover:border-[#C89875] hover:bg-[#EDC9AF]/70 hover:text-[#006666] shadow-[0_2px_10px_rgba(180,120,60,0.08)]'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 min-w-0">
                {sortBy === 'newest' ? (
                  <ArrowUpDown className="w-4 h-4 shrink-0 text-[#008080] transition-transform duration-200 group-hover:scale-110" />
                ) : (
                  <ActiveSortIcon className="w-4 h-4 shrink-0 text-white scale-110 transition-transform duration-200" />
                )}
                <span className="truncate">
                  {isAr
                    ? `ترتيب: ${activeSortDef.labelAr}`
                    : `Sort: ${activeSortDef.labelEn}`}
                </span>
              </span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                  isSortMenuOpen ? 'rotate-180' : ''
                } ${sortBy !== 'newest' ? 'text-white/90' : 'text-[#64748B]'}`}
              />
            </button>

            {isSortMenuOpen && (
              <div
                role="listbox"
                className="animate-fade-in absolute top-full mt-2 end-0 w-56 z-50 bg-white rounded-2xl border border-[#D9AF91] shadow-[0_14px_34px_rgba(0,128,128,0.18)] overflow-hidden py-1.5"
              >
                <div className="px-3.5 py-1.5 text-[11px] font-extrabold text-[#64748B] border-b border-[#EDC9AF]">
                  {isAr ? 'ترتيب حسب' : 'Sort By'}
                </div>
                {sortOptions.map(({ id, labelAr, labelEn, Icon }) => {
                  const active = sortBy === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSelectSort(id)}
                      className={`group w-full px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors ${
                        active
                          ? 'bg-teal-50 text-[#006666] font-bold'
                          : 'text-[#1E293B] hover:bg-[#EDC9AF]/55 font-medium'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[#008080] transition-transform duration-200 group-hover:scale-110" />
                        <span>{isAr ? labelAr : labelEn}</span>
                      </span>
                      {active && <Check className="w-4 h-4 text-[#008080]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Supabase Fetch Error */}
      {feedError && (
        <div className="animate-fade-in p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-bold">
                {isAr ? 'تعذر تحميل الإعلانات' : 'Failed to load posts'}
              </p>
              <p className="text-[11px] text-red-700 mt-0.5 break-words" dir="ltr">
                {feedError.code ? `[${feedError.code}] ` : ''}{feedError.message}
              </p>
            </div>
          </div>
          {onRetryFetch && (
            <button
              type="button"
              onClick={onRetryFetch}
              className="group min-h-[36px] px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-180" />
              <span>{isAr ? 'إعادة' : 'Retry'}</span>
            </button>
          )}
        </div>
      )}

      {/* Newly Published Confirmation */}
      {newlyPublishedId && (
        <div className="animate-toast-in px-4 py-3 rounded-2xl bg-teal-50/90 border border-teal-200 text-[#006666] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#008080] shrink-0" />
          <span>{isAr ? 'تم نشر إعلانك بنجاح' : 'Post published successfully'}</span>
        </div>
      )}

      {/* Pulsing & Shimmering Ad Card Skeleton Loaders (Desert Sand / Light Gray Tints) */}
      {isLoading && listings.length === 0 ? (
        <div
          aria-busy="true"
          aria-label={isAr ? 'جاري تحميل الإعلانات' : 'Loading ads'}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-[#D9AF91]/75 overflow-hidden shadow-[0_3px_12px_rgba(180,120,60,0.06)] flex flex-col"
            >
              <div className="aspect-[4/3] skeleton-shimmer bg-[#F3F4F6]" />
              <div className="p-3.5 sm:p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-3.5 skeleton-shimmer rounded-lg w-11/12" />
                  <div className="h-3.5 skeleton-shimmer rounded-lg w-3/5" />
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-4 skeleton-shimmer rounded-lg w-2/5" />
                    <div className="h-4 skeleton-shimmer rounded-lg w-1/4" />
                  </div>
                  <div className="pt-2 border-t border-[#EDC9AF]/65 flex items-center justify-between gap-2">
                    <div className="h-4 skeleton-shimmer rounded-md w-2/5" />
                    <div className="h-4 skeleton-shimmer rounded-md w-1/3" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="animate-fade-in py-16 px-6 text-center bg-white rounded-2xl border border-[#D9AF91] shadow-[0_3px_14px_rgba(180,120,60,0.08)] space-y-4">
          {selectedCategory === 'favorites' ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto">
                <Heart className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[#1E293B]">
                {savedListingsCount === 0
                  ? (isAr ? 'لا توجد إعلانات محفوظة في المفضلة بعد' : 'No saved favorite ads yet')
                  : (isAr ? 'لا توجد إعلانات محفوظة مطابقة للبحث' : 'No matching favorite ads')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedArea('all');
                }}
                className="group min-h-[42px] px-5 py-2.5 rounded-xl bg-[#008080] hover:bg-[#006666] active:scale-95 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
              >
                <LayoutGrid className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                <span>{isAr ? 'تصفح الإعلانات' : 'Browse Ads'}</span>
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#1E293B]">
                {listings.length === 0
                  ? (isAr ? 'لا توجد إعلانات بعد' : 'No posts yet')
                  : (isAr ? 'لا توجد نتائج مطابقة' : 'No matching posts')}
              </p>
              {listings.length === 0 ? (
                <button
                  type="button"
                  onClick={onOpenCreate}
                  className="group min-h-[42px] px-5 py-2.5 rounded-xl bg-[#008080] hover:bg-[#006666] active:scale-95 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
                  <span>{isAr ? 'أضف أول إعلان' : 'Add First Post'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedAdType('all');
                    setSelectedArea('all');
                  }}
                  className="group min-h-[42px] px-5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-slate-800 active:scale-95 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-rotate-45" />
                  <span>{isAr ? 'عرض الكل' : 'Show All'}</span>
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        /* Modern 4-Element Tactile Post Cards + Floating Heart Button */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {filteredListings.map((item) => {
            const cardImg = item.thumbnailUrl || item.mediaUrls?.[0];
            const cleanDistrict = (item.district || '').trim();
            const cleanCity = (item.city || '').trim();
            const locationBadgeText =
              cleanDistrict === 'أخرى / خارج الموصل'
                ? cleanDistrict
                : cleanDistrict && cleanDistrict !== 'الموصل'
                ? `${cleanCity && cleanCity !== cleanDistrict ? `${cleanCity} - ` : ''}${cleanDistrict}`
                : cleanCity || (isAr ? 'الموصل' : 'Mosul');
            const isHighlighted = item.id === newlyPublishedId;
            const isFav = favoriteIds.includes(item.id);
            const isPopping = poppedCardId === item.id;
            const isRep = isRepresentativeAd(item);
            const isQualifiedRep = Boolean(
              isRep && item.sellerId && qualifiedRepIds?.has(String(item.sellerId))
            );
            const isDelivery =
              item.deliveryMethod === 'delivery' ||
              (!item.deliveryMethod && item.deliveryAvailable);
            const distanceKm = distanceKmMap.get(item.id);

            return (
              <div
                key={item.id}
                onClick={() => onSelectListing(item)}
                className={`group bg-white rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 shadow-[0_3px_12px_rgba(180,120,60,0.08)] hover:shadow-[0_14px_30px_rgba(0,128,128,0.16)] hover:border-[#C89875] hover:-translate-y-1 active:scale-[0.98] flex flex-col ${
                  isHighlighted
                    ? 'border-[#008080] ring-2 ring-[#009999]/30'
                    : 'border-[#D9AF91]/80'
                } ${item.isSoldOut ? 'opacity-80 hover:opacity-100' : ''}`}
              >
                {/* 1. Product Image + Sold Out Ribbon + Floating Heart Bookmark */}
                <div className="relative aspect-[4/3] bg-[#EDC9AF]/50 overflow-hidden flex items-center justify-center">
                  <div className={`w-full h-full ${item.isSoldOut ? 'grayscale-[25%]' : ''}`}>
                    <AdCardImage src={cardImg} alt={item.title || 'منتج'} />
                  </div>

                  {isRep && (
                    <span className="absolute top-2.5 right-2.5 z-10 px-2 py-1 rounded-lg bg-white/95 backdrop-blur-xs text-[#006666] border border-teal-200/90 shadow-xs text-[10px] font-extrabold inline-flex items-center gap-1">
                      <Handshake className="w-3 h-3 text-[#008080]" />
                      <span>{isAr ? 'بواسطة مندوب' : 'Via Rep'}</span>
                    </span>
                  )}

                  {item.isSoldOut && (
                    <div className="absolute inset-0 bg-slate-950/25 flex items-center justify-center pointer-events-none">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-xs text-white text-xs font-extrabold border border-white/15 shadow-sm inline-flex items-center gap-1.5">
                        <PackageX className="w-3.5 h-3.5 text-[#EDC9AF]" />
                        <span>{isAr ? 'نفدت الكمية' : 'Sold Out'}</span>
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleHeartClick(e, item.id)}
                    aria-label={
                      isFav
                        ? (isAr ? 'إزالة من المفضلة' : 'Remove from favorites')
                        : (isAr ? 'إضافة إلى المفضلة' : 'Add to favorites')
                    }
                    className={`absolute top-2.5 left-2.5 z-10 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xs shadow-xs transition-all duration-200 active:scale-125 ${
                      isFav
                        ? 'bg-white/95 text-rose-500 border border-rose-200/80'
                        : 'bg-white/85 hover:bg-white text-[#1E293B]/80 border border-[#D9AF91]/80'
                    } ${isPopping ? 'animate-heart-pop' : ''}`}
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors duration-150 ${
                        isFav ? 'fill-rose-500 text-rose-500' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Card Body */}
                <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-2.5">
                  {/* 2. Product Title (1-2 lines max) */}
                  <h3 className="text-xs sm:text-sm font-bold text-[#1E293B] line-clamp-2 leading-relaxed">
                    {item.title || (isAr ? 'إعلان بدون عنوان' : 'Untitled')}
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {/* 3. Price */}
                      <p className="text-sm sm:text-base font-extrabold text-[#006666] tabular-nums">
                        {item.hidePrice
                          ? (isAr ? 'عند التواصل' : 'Contact')
                          : `${Number(item.price ?? 0).toLocaleString()} ${item.currency || 'د.ع'}`}
                      </p>

                      {item.storeId && item.storeName && onOpenStore && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenStore(item.storeId!);
                          }}
                          className="group/store inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-lg bg-teal-50/90 hover:bg-teal-100/90 active:scale-95 text-[#006666] border border-teal-200/75 text-[10px] font-bold transition-all"
                        >
                          <Store className="w-3 h-3 shrink-0 text-[#008080] transition-transform duration-200 group-hover/store:scale-110" />
                          <span className="truncate max-w-[95px]">{item.storeName}</span>
                        </button>
                      )}

                      {isQualifiedRep && item.sellerId && onOpenRepresentative && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenRepresentative(String(item.sellerId!));
                          }}
                          className="group/rep inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-lg bg-[#EDC9AF]/80 hover:bg-[#EDC9AF] active:scale-95 text-[#6B3F21] border border-[#D9AF91] text-[10px] font-bold transition-all"
                        >
                          <Handshake className="w-3 h-3 shrink-0 text-[#008080] transition-transform duration-200 group-hover/rep:scale-110" />
                          <span className="truncate">{isAr ? 'تصفح ركن المندوب' : 'Rep Corner'}</span>
                        </button>
                      )}
                    </div>

                    {/* 4. Neighborhood + GPS Distance + Handover Badge + Posting Date Footer */}
                    <div className="pt-2 border-t border-[#EDC9AF] space-y-1.5 text-[10px] sm:text-[11px]">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#EDC9AF] text-[#006666] border border-[#D9AF91] font-semibold truncate min-w-0 max-w-[58%]">
                          <MapPin className="w-3 h-3 text-[#008080] shrink-0" />
                          <span className="truncate">{locationBadgeText}</span>
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold shrink-0 ${
                            isDelivery
                              ? 'bg-teal-50 text-[#006666] border border-teal-200/80'
                              : 'bg-[#EDC9AF]/65 text-[#6B3F21] border border-[#D9AF91]'
                          }`}
                        >
                          {isDelivery ? (
                            <Truck className="w-3 h-3 text-[#008080] shrink-0" />
                          ) : (
                            <MapPin className="w-3 h-3 text-[#6B3F21] shrink-0" />
                          )}
                          <span>
                            {isDelivery
                              ? (isAr ? 'توصيل' : 'Delivery')
                              : (isAr ? 'استلام موقعي' : 'Pickup')}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1.5">
                        {distanceKm !== undefined ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-50/90 text-[#006666] border border-teal-200/75 font-bold tabular-nums">
                            <Navigation className="w-2.5 h-2.5 text-[#008080] shrink-0" />
                            <span>{formatDistanceAwayLabel(distanceKm, isAr)}</span>
                          </span>
                        ) : (
                          <span />
                        )}

                        <span className="inline-flex items-center gap-1 text-[#64748B] shrink-0 whitespace-nowrap">
                          <Clock className="w-3 h-3 text-[#64748B]/75 shrink-0" />
                          <span>{item.createdAt || (isAr ? 'اليوم' : 'Today')}</span>
                        </span>
                      </div>
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
