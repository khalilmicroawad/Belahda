import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  MapPin,
  X,
  AlertTriangle,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import { Listing, CategoryId, UserAccount } from '../../types';
import { CATEGORIES } from '../../data/categories';

interface MarketplaceFeedProps {
  listings: Listing[];
  currentUser?: UserAccount | null;
  onSelectListing: (listing: Listing) => void;
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

export const MarketplaceFeed: React.FC<MarketplaceFeedProps> = ({
  listings,
  onSelectListing,
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
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');

  useEffect(() => {
    if (resetTrigger) {
      setSearchQuery('');
      setSelectedCategory('all');
    }
  }, [resetTrigger]);

  const filteredListings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return [...listings]
      .filter((item) => {
        if (selectedCategory !== 'all' && item.category !== selectedCategory) {
          return false;
        }
        if (q) {
          const catDef = CATEGORIES.find((c) => c.id === item.category);
          const matchesTitle = (item.title || '').toLowerCase().includes(q);
          const matchesCat =
            (item.category || '').toLowerCase().includes(q) ||
            (catDef &&
              (catDef.nameAr.toLowerCase().includes(q) || catDef.nameEn.toLowerCase().includes(q)));
          return matchesTitle || matchesCat;
        }
        return true;
      })
      .sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));
  }, [listings, searchQuery, selectedCategory]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-5 space-y-5">
      {/* Search + Zero-Overflow Wrapping Categories */}
      <div className="space-y-3.5">
        <div className="relative">
          <Search className="w-4 h-4 text-[#0D9488]/70 absolute right-4 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث بالعنوان أو التصنيف...' : 'Search by title or category...'}
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

        {/* Clean Wrapping Category Filters (Zero Horizontal Scroll) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
              selectedCategory === 'all'
                ? 'bg-[#0F766E] text-white shadow-[0_4px_12px_rgba(15,118,110,0.22)]'
                : 'bg-[#FFFDF9] text-[#1E293B] border border-amber-200/80 hover:border-amber-300 hover:bg-[#FEF9E7]'
            }`}
          >
            {isAr ? 'الكل' : 'All'}
          </button>

          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  active
                    ? 'bg-[#0D9488] text-white shadow-[0_4px_12px_rgba(13,148,136,0.22)]'
                    : 'bg-[#FFFDF9] text-[#1E293B] border border-amber-200/80 hover:border-amber-300 hover:bg-[#FEF9E7] hover:text-[#0F766E]'
                }`}
              >
                {isAr ? cat.nameAr : cat.nameEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* Supabase Fetch Error */}
      {feedError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between gap-3">
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
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isAr ? 'إعادة' : 'Retry'}</span>
            </button>
          )}
        </div>
      )}

      {/* Newly Published Confirmation */}
      {newlyPublishedId && (
        <div className="px-4 py-3 rounded-2xl bg-teal-50/90 border border-teal-200 text-[#0F766E] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0" />
          <span>{isAr ? 'تم نشر إعلانك بنجاح' : 'Post published successfully'}</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && listings.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="bg-[#FFFDF9] rounded-2xl border border-amber-200/60 overflow-hidden animate-pulse"
            >
              <div className="aspect-[4/3] bg-amber-100/50" />
              <div className="p-3.5 space-y-2.5">
                <div className="h-4 bg-amber-100/70 rounded-lg w-4/5" />
                <div className="h-4 bg-amber-100/70 rounded-lg w-1/2" />
                <div className="h-3 bg-amber-50 rounded-lg w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="py-16 px-6 text-center bg-[#FFFDF9] rounded-2xl border border-amber-200/80 shadow-[0_3px_14px_rgba(245,158,11,0.05)] space-y-4">
          <p className="text-sm font-semibold text-[#1E293B]">
            {listings.length === 0
              ? (isAr ? 'لا توجد إعلانات بعد' : 'No posts yet')
              : (isAr ? 'لا توجد نتائج مطابقة' : 'No matching posts')}
          </p>
          {listings.length === 0 ? (
            <button
              type="button"
              onClick={onOpenCreate}
              className="min-h-[42px] px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-colors shadow-xs"
            >
              {isAr ? 'أضف أول إعلان' : 'Add First Post'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="min-h-[42px] px-5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              {isAr ? 'عرض الكل' : 'Show All'}
            </button>
          )}
        </div>
      ) : (
        /* Modern 4-Element Post Cards: Image, Title (1-2 lines), Price, Location */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {filteredListings.map((item) => {
            const cardImg = item.thumbnailUrl || item.mediaUrls?.[0];
            const locationText = item.district || item.city;
            const isHighlighted = item.id === newlyPublishedId;

            return (
              <div
                key={item.id}
                onClick={() => onSelectListing(item)}
                className={`group bg-[#FFFDF9] rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 shadow-[0_3px_12px_rgba(13,148,136,0.05)] hover:shadow-[0_12px_28px_rgba(13,148,136,0.12)] hover:border-amber-300/90 hover:-translate-y-0.5 active:scale-[0.99] flex flex-col ${
                  isHighlighted
                    ? 'border-[#0D9488] ring-2 ring-[#14B8A6]/30'
                    : 'border-amber-200/70'
                }`}
              >
                {/* 1. Product Image */}
                <div className="aspect-[4/3] bg-[#FEF9E7]/80 overflow-hidden flex items-center justify-center">
                  {cardImg ? (
                    <img
                      src={cardImg}
                      alt={item.title || 'منتج'}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#FEF9E7] to-amber-100/60 flex items-center justify-center">
                      <ImageIcon className="w-7 h-7 text-amber-300" />
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-2.5">
                  {/* 2. Product Title (1-2 lines max) */}
                  <h3 className="text-xs sm:text-sm font-bold text-[#1E293B] line-clamp-2 leading-relaxed">
                    {item.title || (isAr ? 'إعلان بدون عنوان' : 'Untitled')}
                  </h3>

                  <div className="space-y-1">
                    {/* 3. Price */}
                    <p className="text-sm sm:text-base font-extrabold text-[#0F766E] tabular-nums">
                      {item.hidePrice
                        ? (isAr ? 'عند التواصل' : 'Contact')
                        : `${Number(item.price ?? 0).toLocaleString()} ${item.currency || 'د.ع'}`}
                    </p>

                    {/* 4. City / Location */}
                    {locationText && (
                      <p className="text-[11px] text-[#64748B] flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#0D9488]/70 shrink-0" />
                        <span className="truncate">{locationText}</span>
                      </p>
                    )}
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
