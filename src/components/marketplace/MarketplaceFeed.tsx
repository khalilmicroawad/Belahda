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
  Clock
} from 'lucide-react';
import { Listing, CategoryId, UserAccount } from '../../types';
import { CATEGORIES } from '../../data/categories';
import { NeighborhoodSelector } from '../common/NeighborhoodSelector';

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

interface MarketplaceFeedProps {
  listings: Listing[];
  currentUser?: UserAccount | null;
  favoriteIds?: string[];
  onToggleFavorite?: (postId: string) => void;
  onSelectListing: (listing: Listing) => void;
  onOpenStore?: (storeId: string) => void;
  onOpenChat?: (listing: Listing) => void;
  onOpenCreate: () => void;
  onRequireAuth?: (pendingAction: () => void, message?: string) => void;
  newlyPublishedId?: string | null;
  resetTrigger?: number;
  isLoading?: boolean;
  feedError?: { message: string; code?: string } | null;
  onRetryFetch?: () => void;
  lang?: 'ar' | 'en';
}

const AdCardImage: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-full bg-[#FFE4C4]/70 flex items-center justify-center">
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
  favoriteIds = [],
  onToggleFavorite,
  onSelectListing,
  onOpenStore,
  onOpenCreate,
  newlyPublishedId,
  resetTrigger,
  isLoading = false,
  feedError = null,
  onRetryFetch,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all' | 'favorites'>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState<boolean>(false);
  const [poppedCardId, setPoppedCardId] = useState<string | null>(null);
  const categoryMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCategoryMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCategoryMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isCategoryMenuOpen]);

  useEffect(() => {
    if (resetTrigger) {
      setSearchQuery('');
      setSelectedCategory('all');
      setSelectedArea('all');
      setIsCategoryMenuOpen(false);
    }
  }, [resetTrigger]);

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
    return [...listings]
      .filter((item) => {
        if (selectedCategory === 'favorites') {
          if (!favoriteIds.includes(item.id)) return false;
        } else if (selectedCategory !== 'all' && item.category !== selectedCategory) {
          return false;
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
      })
      .sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));
  }, [listings, searchQuery, selectedCategory, selectedArea, favoriteIds]);

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

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-5 space-y-5">
      {/* Compact Search + Category Dropdown + Mosul Neighborhood Dropdown */}
      <div className="flex flex-col md:flex-row md:items-center gap-2.5">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-[#0D9488]/70 absolute right-4 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث بالعنوان أو التصنيف أو الحي...' : 'Search by title, category, or area...'}
            className="w-full h-[42px] pr-11 pl-10 rounded-2xl bg-white border border-[#E8C5A0] shadow-[0_2px_10px_rgba(180,120,60,0.08)] text-sm text-[#1E293B] placeholder:text-[#64748B]/75 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition-all duration-200"
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

        {/* Compact Side-by-Side Dropdown Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* 1. Compact Category Dropdown with Icons */}
          <div ref={categoryMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={isCategoryMenuOpen}
              className={`group min-h-[42px] px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all duration-200 active:scale-95 inline-flex items-center justify-between gap-2 whitespace-nowrap ${
                selectedCategory === 'favorites'
                  ? 'bg-rose-500 text-white shadow-[0_4px_12px_rgba(244,63,94,0.24)]'
                  : selectedCategory !== 'all'
                  ? 'bg-[#0D9488] text-white shadow-[0_4px_12px_rgba(13,148,136,0.22)]'
                  : 'bg-white text-[#1E293B] border border-[#E8C5A0] hover:border-[#D9AD82] hover:bg-[#FFE4C4]/70 hover:text-[#0F766E] shadow-[0_2px_10px_rgba(180,120,60,0.08)]'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <ActiveCategoryIcon
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    selectedCategory !== 'all'
                      ? 'text-white scale-110'
                      : 'text-[#0D9488] group-hover:scale-110 group-hover:-rotate-6'
                  } ${selectedCategory === 'favorites' ? 'fill-white' : ''}`}
                />
                <span>
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
                className="animate-fade-in absolute top-full mt-2 start-0 sm:end-0 sm:start-auto w-64 z-50 bg-white rounded-2xl border border-[#E8C5A0] shadow-[0_14px_34px_rgba(13,148,136,0.18)] overflow-hidden py-1.5 max-h-80 overflow-y-auto"
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
                      ? 'bg-teal-50 text-[#0F766E] font-bold'
                      : 'text-[#1E293B] hover:bg-[#FFE4C4]/55 font-medium'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <LayoutGrid className="w-4 h-4 text-[#0D9488] transition-transform duration-200 group-hover:scale-110" />
                    <span>{isAr ? 'الكل' : 'All Categories'}</span>
                  </span>
                  {selectedCategory === 'all' && <Check className="w-4 h-4 text-[#0D9488]" />}
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

                <div className="my-1 border-t border-[#FFE4C4]" />

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
                          ? 'bg-teal-50 text-[#0F766E] font-bold'
                          : 'text-[#1E293B] hover:bg-[#FFE4C4]/55 font-medium'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <CatIcon className="w-4 h-4 text-[#0D9488] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
                        <span>{isAr ? cat.nameAr : cat.nameEn}</span>
                      </span>
                      {active && <Check className="w-4 h-4 text-[#0D9488]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Compact Mosul Neighborhood Dropdown */}
          <NeighborhoodSelector
            value={selectedArea}
            onChange={setSelectedArea}
            mode="filter"
            areaCounts={areaCounts}
            extraAreas={extraAreas}
            lang={lang}
          />
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
        <div className="animate-toast-in px-4 py-3 rounded-2xl bg-teal-50/90 border border-teal-200 text-[#0F766E] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0" />
          <span>{isAr ? 'تم نشر إعلانك بنجاح' : 'Post published successfully'}</span>
        </div>
      )}

      {/* Soft Skeleton Shimmer Loaders */}
      {isLoading && listings.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-[#E8C5A0]/80 overflow-hidden"
            >
              <div className="aspect-[4/3] skeleton-shimmer" />
              <div className="p-3.5 space-y-2.5">
                <div className="h-4 skeleton-shimmer rounded-lg w-4/5" />
                <div className="h-4 skeleton-shimmer rounded-lg w-1/2" />
                <div className="h-3 skeleton-shimmer rounded-lg w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="animate-fade-in py-16 px-6 text-center bg-white rounded-2xl border border-[#E8C5A0] shadow-[0_3px_14px_rgba(180,120,60,0.08)] space-y-4">
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
                className="group min-h-[42px] px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] active:scale-95 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
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
                  className="group min-h-[42px] px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] active:scale-95 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
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

            return (
              <div
                key={item.id}
                onClick={() => onSelectListing(item)}
                className={`group bg-white rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 shadow-[0_3px_12px_rgba(180,120,60,0.08)] hover:shadow-[0_14px_30px_rgba(13,148,136,0.16)] hover:border-[#D9AD82] hover:-translate-y-1 active:scale-[0.98] flex flex-col ${
                  isHighlighted
                    ? 'border-[#0D9488] ring-2 ring-[#14B8A6]/30'
                    : 'border-[#E8C5A0]/80'
                } ${item.isSoldOut ? 'opacity-80 hover:opacity-100' : ''}`}
              >
                {/* 1. Product Image + Sold Out Ribbon + Floating Heart Bookmark */}
                <div className="relative aspect-[4/3] bg-[#FFE4C4]/50 overflow-hidden flex items-center justify-center">
                  <div className={`w-full h-full ${item.isSoldOut ? 'grayscale-[25%]' : ''}`}>
                    <AdCardImage src={cardImg} alt={item.title || 'منتج'} />
                  </div>

                  {item.isSoldOut && (
                    <div className="absolute inset-0 bg-slate-950/25 flex items-center justify-center pointer-events-none">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-xs text-white text-xs font-extrabold border border-white/15 shadow-sm inline-flex items-center gap-1.5">
                        <PackageX className="w-3.5 h-3.5 text-[#FFE4C4]" />
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
                        : 'bg-white/85 hover:bg-white text-[#1E293B]/80 border border-[#E8C5A0]/80'
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
                      <p className="text-sm sm:text-base font-extrabold text-[#0F766E] tabular-nums">
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
                          className="group/store inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-lg bg-teal-50/90 hover:bg-teal-100/90 active:scale-95 text-[#0F766E] border border-teal-200/75 text-[10px] font-bold transition-all"
                        >
                          <Store className="w-3 h-3 shrink-0 text-[#0D9488] transition-transform duration-200 group-hover/store:scale-110" />
                          <span className="truncate max-w-[95px]">{item.storeName}</span>
                        </button>
                      )}
                    </div>

                    {/* 4. Clear Location Badge + Posting Date Footer */}
                    <div className="pt-2 border-t border-[#FFE4C4] flex items-center justify-between gap-1.5 text-[10px] sm:text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FFE4C4] text-[#0F766E] border border-[#E8C5A0] font-semibold truncate min-w-0">
                        <MapPin className="w-3 h-3 text-[#0D9488] shrink-0" />
                        <span className="truncate">{locationBadgeText}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 text-[#64748B] shrink-0 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-[#64748B]/75 shrink-0" />
                        <span>{item.createdAt || (isAr ? 'اليوم' : 'Today')}</span>
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
