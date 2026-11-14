import React, { useEffect, useMemo, useState } from 'react';
import {
  Store,
  Phone,
  MessageCircle,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Heart,
  Share2,
  Check,
  BadgeCheck,
  Clock,
  Search,
  X,
  ArrowDownNarrowWide,
  CheckCircle2,
  Package,
  PackageX
} from 'lucide-react';
import { StoreProfile, Listing } from '../../types';
import { fetchPostsByStoreId } from '../../lib/supabase';
import {
  buildStoreShareUrl,
  getStoreActivityLabel,
  getStoreBio,
  getStoreLocationLabel,
  getStoreWhatsAppUrl,
  isStoreActiveTrusted
} from '../../lib/storeUtils';

type StoreSortOption = 'newest' | 'price_asc' | 'available_first';

interface StorefrontViewProps {
  store: StoreProfile;
  listings: Listing[];
  favoriteIds?: string[];
  onToggleFavorite?: (postId: string) => void;
  onBack: () => void;
  onSelectListing: (listing: Listing) => void;
  onNotifyToast?: (message: string, kind?: 'favorite' | 'share' | 'info') => void;
  backLabel?: string;
  lang?: 'ar' | 'en';
}

const StoreProductImage: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#FEF9E7] to-amber-100/60 flex items-center justify-center">
        <ImageIcon className="w-7 h-7 text-amber-300" />
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

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  store,
  listings,
  favoriteIds = [],
  onToggleFavorite,
  onBack,
  onSelectListing,
  onNotifyToast,
  backLabel,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [remoteStorePosts, setRemoteStorePosts] = useState<Listing[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(true);
  const [storeSearch, setStoreSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<StoreSortOption>('newest');
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [poppedCardId, setPoppedCardId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoadingPosts(true);
    setStoreSearch('');
    setSortBy('newest');

    fetchPostsByStoreId(store.id)
      .then((rows) => {
        if (active) setRemoteStorePosts(rows);
      })
      .finally(() => {
        if (active) setIsLoadingPosts(false);
      });

    return () => {
      active = false;
    };
  }, [store.id]);

  // Merge remote posts matching store_id with in-memory listings belonging to this store
  const storePosts = useMemo(() => {
    const merged = new Map<string, Listing>();
    remoteStorePosts.forEach((p) => merged.set(p.id, p));

    listings.forEach((item) => {
      const matchesByStoreId = item.storeId && String(item.storeId) === String(store.id);
      const matchesByOwner =
        store.ownerId &&
        item.sellerId === store.ownerId &&
        (item.adType === 'commercial' || item.sellerType === 'commercial');
      if (matchesByStoreId || matchesByOwner) {
        if (!merged.has(item.id)) merged.set(item.id, item);
      }
    });

    return Array.from(merged.values()).sort(
      (a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0)
    );
  }, [remoteStorePosts, listings, store.id, store.ownerId]);

  // Client-side search & sorting inside this merchant's ads only
  const visiblePosts = useMemo(() => {
    const q = storeSearch.toLowerCase().trim();
    const filtered = q
      ? storePosts.filter(
          (item) =>
            (item.title || '').toLowerCase().includes(q) ||
            (item.description || '').toLowerCase().includes(q)
        )
      : [...storePosts];

    if (sortBy === 'price_asc') {
      return filtered.sort((a, b) => {
        if (a.hidePrice && !b.hidePrice) return 1;
        if (!a.hidePrice && b.hidePrice) return -1;
        const diff = Number(a.price ?? 0) - Number(b.price ?? 0);
        return diff !== 0 ? diff : (b.createdTimestamp || 0) - (a.createdTimestamp || 0);
      });
    }

    if (sortBy === 'available_first') {
      return filtered.sort((a, b) => {
        const aSoldOut = Boolean(a.isSoldOut || (a as Listing & { isSold?: boolean }).isSold);
        const bSoldOut = Boolean(b.isSoldOut || (b as Listing & { isSold?: boolean }).isSold);
        if (aSoldOut !== bSoldOut) return aSoldOut ? 1 : -1;
        if (a.hidePrice !== b.hidePrice) return a.hidePrice ? 1 : -1;
        if (a.deliveryAvailable !== b.deliveryAvailable) {
          return a.deliveryAvailable ? -1 : 1;
        }
        return (b.createdTimestamp || 0) - (a.createdTimestamp || 0);
      });
    }

    return filtered.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));
  }, [storePosts, storeSearch, sortBy]);

  const storePhone = store.phoneNumber || store.ownerPhone || '';
  const whatsappUrl = getStoreWhatsAppUrl(
    store.whatsappNumber || storePhone,
    store.name,
    isAr
  );
  const storeBio = getStoreBio(store, isAr);
  const locationLabel = getStoreLocationLabel(store, isAr);
  const activityLabel = getStoreActivityLabel(storePosts, isAr);
  const isActiveTrusted = isStoreActiveTrusted(store, storePosts.length);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback below
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  };

  const handleShareStore = async () => {
    const shareUrl = buildStoreShareUrl(store.id);

    if (navigator.share) {
      try {
        await navigator.share({
          title: store.name,
          text: isAr ? `تصفح منتجات متجر ${store.name} على سوق بلحظة` : `Check out ${store.name} on Souq Belahdha`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        // Fall back to clipboard copy on unsupported desktop share rejections
      }
    }

    const copied = await copyToClipboard(shareUrl);
    if (copied) {
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 2200);
      onNotifyToast?.(
        isAr ? 'تم نسخ رابط المتجر للمشاركة' : 'Store link copied to share',
        'share'
      );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-5 space-y-5 animate-fade-in">
      {/* Top Action Strip: Back & One-Tap Share Store */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="group min-h-[40px] px-3 rounded-xl bg-[#FFFDF9] hover:bg-[#FEF9E7] active:scale-95 border border-amber-200/80 text-xs sm:text-sm font-bold text-[#1E293B] inline-flex items-center gap-1.5 transition-all shadow-2xs"
        >
          {isAr ? (
            <ChevronRight className="w-4 h-4 text-[#0D9488] transition-transform duration-200 group-hover:translate-x-0.5" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-[#0D9488] transition-transform duration-200 group-hover:-translate-x-0.5" />
          )}
          <span>{backLabel || (isAr ? 'رجوع' : 'Back')}</span>
        </button>

        <button
          type="button"
          onClick={handleShareStore}
          className={`group min-h-[40px] px-3.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs ${
            copiedShare
              ? 'bg-teal-50 border-teal-300 text-[#0F766E]'
              : 'bg-[#FFFDF9] hover:bg-[#FEF9E7] border-amber-200/80 text-[#1E293B]'
          }`}
        >
          {copiedShare ? (
            <Check className="w-4 h-4 text-[#0D9488] animate-heart-pop" />
          ) : (
            <Share2 className="w-4 h-4 text-[#0D9488] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
          )}
          <span>
            {copiedShare
              ? (isAr ? 'تم النسخ' : 'Copied')
              : (isAr ? 'مشاركة المتجر' : 'Share Store')}
          </span>
        </button>
      </div>

      {/* Mini Storefront Header Card */}
      <section className="bg-[#FFFDF9] rounded-2xl sm:rounded-3xl border border-amber-200/80 shadow-[0_6px_24px_rgba(13,148,136,0.07)] p-4 sm:p-6 space-y-4">
        <div className="flex items-start gap-3.5 sm:gap-4">
          {/* Store Logo / Avatar */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-teal-50 border border-teal-200/80 text-[#0D9488] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <Store className="w-7 h-7 sm:w-8 sm:h-8" />
            )}
          </div>

          {/* Store Identity, Trusted Badge, 1-line Bio & Metadata */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-extrabold text-[#1E293B] truncate">
                {store.name}
              </h1>

              {isActiveTrusted && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-200/90 text-[11px] font-bold shrink-0">
                  <BadgeCheck className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>{isAr ? 'متجر نشط' : 'Active Store'}</span>
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-[#64748B] line-clamp-1 leading-relaxed">
              {storeBio}
            </p>

            {/* Location, Activity & Ads Count Badges */}
            <div className="flex items-center flex-wrap gap-2 pt-1 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FEF9E7] text-[#1E293B] border border-amber-200/70">
                <MapPin className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                <span>{locationLabel}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50/75 text-[#0F766E] border border-teal-100">
                <Clock className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                <span>{activityLabel}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-[#64748B] border border-amber-200/70 tabular-nums">
                <Package className="w-3.5 h-3.5 text-[#0D9488]/80 shrink-0" />
                <span>
                  {storePosts.length} {isAr ? 'إعلان' : 'ads'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Direct One-Tap Contact Buttons (WhatsApp & Phone Call) */}
        {(whatsappUrl || storePhone) && (
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-amber-200/60">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group min-h-[44px] px-4 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] active:scale-95 text-white text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
                <span>{isAr ? 'واتساب المتجر' : 'WhatsApp'}</span>
              </a>
            )}

            {storePhone && (
              <a
                href={`tel:${storePhone}`}
                className="group min-h-[44px] px-4 rounded-xl bg-[#FEF9E7] hover:bg-amber-100/80 active:scale-95 text-[#1E293B] border border-amber-200/90 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4 text-[#0D9488] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-12" />
                <span className="tabular-nums" dir="ltr">
                  {storePhone}
                </span>
              </a>
            )}
          </div>
        )}
      </section>

      {/* In-Store Search & Quick Sort Pills (Client-Side Only) */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#0D9488]/70 absolute right-4 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={storeSearch}
            onChange={(e) => setStoreSearch(e.target.value)}
            placeholder={isAr ? 'ابحث داخل منتجات هذا المتجر...' : 'Search within this store...'}
            className="w-full h-11 pr-11 pl-10 rounded-2xl bg-[#FFFDF9] border border-amber-200/80 shadow-[0_2px_10px_rgba(245,158,11,0.06)] text-sm text-[#1E293B] placeholder:text-[#64748B]/75 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white focus:border-transparent transition-all duration-200"
          />
          {storeSearch && (
            <button
              type="button"
              onClick={() => setStoreSearch('')}
              className="group absolute left-3 top-2.5 p-1 text-[#64748B] hover:text-[#1E293B] rounded-lg transition-all active:scale-90"
              aria-label={isAr ? 'مسح البحث' : 'Clear search'}
            >
              <X className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
            </button>
          )}
        </div>

        {/* Sort Pill Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSortBy('newest')}
            className={`group min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 inline-flex items-center gap-1.5 ${
              sortBy === 'newest'
                ? 'bg-[#0D9488] text-white shadow-[0_4px_12px_rgba(13,148,136,0.22)]'
                : 'bg-[#FFFDF9] text-[#1E293B] border border-amber-200/80 hover:border-amber-300 hover:bg-[#FEF9E7] hover:text-[#0F766E]'
            }`}
          >
            <Clock
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                sortBy === 'newest' ? 'text-white scale-110' : 'text-[#0D9488] group-hover:scale-110'
              }`}
            />
            <span>{isAr ? 'الأحدث' : 'Newest'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSortBy('price_asc')}
            className={`group min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 inline-flex items-center gap-1.5 ${
              sortBy === 'price_asc'
                ? 'bg-[#0D9488] text-white shadow-[0_4px_12px_rgba(13,148,136,0.22)]'
                : 'bg-[#FFFDF9] text-[#1E293B] border border-amber-200/80 hover:border-amber-300 hover:bg-[#FEF9E7] hover:text-[#0F766E]'
            }`}
          >
            <ArrowDownNarrowWide
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                sortBy === 'price_asc'
                  ? 'text-white scale-110'
                  : 'text-[#0D9488] group-hover:scale-110'
              }`}
            />
            <span>{isAr ? 'الأقل سعراً' : 'Lowest Price'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSortBy('available_first')}
            className={`group min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 inline-flex items-center gap-1.5 ${
              sortBy === 'available_first'
                ? 'bg-[#0D9488] text-white shadow-[0_4px_12px_rgba(13,148,136,0.22)]'
                : 'bg-[#FFFDF9] text-[#1E293B] border border-amber-200/80 hover:border-amber-300 hover:bg-[#FEF9E7] hover:text-[#0F766E]'
            }`}
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                sortBy === 'available_first'
                  ? 'text-white scale-110'
                  : 'text-[#0D9488] group-hover:scale-110'
              }`}
            />
            <span>{isAr ? 'المتوفر أولاً' : 'Available First'}</span>
          </button>
        </div>
      </div>

      {/* Store Ads Grid */}
      {isLoadingPosts && storePosts.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-[#FFFDF9] rounded-2xl border border-amber-200/60 overflow-hidden"
            >
              <div className="aspect-[4/3] skeleton-shimmer" />
              <div className="p-3.5 space-y-2">
                <div className="h-4 skeleton-shimmer rounded-lg w-4/5" />
                <div className="h-4 skeleton-shimmer rounded-lg w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="py-14 px-6 text-center bg-[#FFFDF9] rounded-2xl border border-amber-200/80 space-y-3">
          <Store className="w-8 h-8 text-amber-300 mx-auto" />
          <p className="text-sm font-semibold text-[#64748B]">
            {storePosts.length === 0
              ? (isAr ? 'لا توجد إعلانات في هذا المتجر بعد' : 'No ads in this store yet')
              : (isAr ? 'لا توجد منتجات مطابقة لبحثك داخل المتجر' : 'No matching products in this store')}
          </p>
          {storeSearch && (
            <button
              type="button"
              onClick={() => setStoreSearch('')}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] active:scale-95 text-white text-xs font-bold transition-all"
            >
              {isAr ? 'عرض جميع منتجات المتجر' : 'Show all store products'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {visiblePosts.map((item) => {
            const cardImg = item.thumbnailUrl || item.mediaUrls?.[0];
            const locationText = item.district || item.city;
            const isFav = favoriteIds.includes(item.id);
            const isPopping = poppedCardId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => onSelectListing(item)}
                className={`group bg-[#FFFDF9] rounded-2xl overflow-hidden border border-amber-200/75 shadow-[0_3px_12px_rgba(13,148,136,0.05)] hover:shadow-[0_14px_30px_rgba(13,148,136,0.14)] hover:border-amber-300 hover:-translate-y-1 cursor-pointer transition-all duration-200 active:scale-[0.98] flex flex-col ${
                  item.isSoldOut ? 'opacity-80 hover:opacity-100' : ''
                }`}
              >
                <div className="relative aspect-[4/3] bg-[#FEF9E7]/80 overflow-hidden flex items-center justify-center">
                  <div className={`w-full h-full ${item.isSoldOut ? 'grayscale-[25%]' : ''}`}>
                    <StoreProductImage src={cardImg} alt={item.title || 'منتج'} />
                  </div>

                  {item.isSoldOut && (
                    <div className="absolute inset-0 bg-slate-950/25 flex items-center justify-center pointer-events-none">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-xs text-white text-xs font-extrabold border border-white/15 shadow-sm inline-flex items-center gap-1.5">
                        <PackageX className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isAr ? 'نفدت الكمية' : 'Sold Out'}</span>
                      </span>
                    </div>
                  )}

                  {onToggleFavorite && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPoppedCardId(item.id);
                        window.setTimeout(() => {
                          setPoppedCardId((prev) => (prev === item.id ? null : prev));
                        }, 320);
                        onToggleFavorite(item.id);
                      }}
                      aria-label={
                        isFav
                          ? (isAr ? 'إزالة من المفضلة' : 'Remove from favorites')
                          : (isAr ? 'إضافة إلى المفضلة' : 'Add to favorites')
                      }
                      className={`absolute top-2.5 left-2.5 z-10 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xs shadow-xs transition-all duration-200 active:scale-125 ${
                        isFav
                          ? 'bg-white/95 text-rose-500 border border-rose-200/80'
                          : 'bg-white/80 hover:bg-white text-[#1E293B]/80 border border-amber-200/60'
                      } ${isPopping ? 'animate-heart-pop' : ''}`}
                    >
                      <Heart
                        className={`w-4 h-4 transition-colors duration-150 ${
                          isFav ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-2.5">
                  <h3 className="text-xs sm:text-sm font-bold text-[#1E293B] line-clamp-2 leading-relaxed">
                    {item.title || (isAr ? 'إعلان بدون عنوان' : 'Untitled')}
                  </h3>

                  <div className="space-y-1">
                    <p className="text-sm sm:text-base font-extrabold text-[#0F766E] tabular-nums">
                      {item.hidePrice
                        ? (isAr ? 'عند التواصل' : 'Contact')
                        : `${Number(item.price ?? 0).toLocaleString()} ${item.currency || 'د.ع'}`}
                    </p>

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
