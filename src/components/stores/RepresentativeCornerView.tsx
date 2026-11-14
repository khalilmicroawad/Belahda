import React, { useEffect, useMemo, useState } from 'react';
import {
  Handshake,
  Phone,
  MessageCircle,
  MapPin,
  Truck,
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
import { Listing, RepresentativeProfile } from '../../types';
import { fetchPostsByRepresentativeId } from '../../lib/supabase';
import {
  buildRepresentativeProfile,
  buildRepresentativeShareUrl,
  getRepresentativePosts,
  getRepresentativeWhatsAppUrl,
  getStoreActivityLabel
} from '../../lib/storeUtils';

type RepSortOption = 'newest' | 'price_asc' | 'available_first';

interface RepresentativeCornerViewProps {
  repId: string;
  initialProfile?: RepresentativeProfile;
  listings: Listing[];
  favoriteIds?: string[];
  onToggleFavorite?: (postId: string) => void;
  onBack: () => void;
  onSelectListing: (listing: Listing) => void;
  onNotifyToast?: (message: string, kind?: 'favorite' | 'share' | 'info') => void;
  backLabel?: string;
  lang?: 'ar' | 'en';
}

const RepProductImage: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
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

export const RepresentativeCornerView: React.FC<RepresentativeCornerViewProps> = ({
  repId,
  initialProfile,
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
  const [remoteRepPosts, setRemoteRepPosts] = useState<Listing[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(true);
  const [repSearch, setRepSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<RepSortOption>('newest');
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [poppedCardId, setPoppedCardId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoadingPosts(true);
    setRepSearch('');
    setSortBy('newest');

    fetchPostsByRepresentativeId(repId)
      .then((rows) => {
        if (active) setRemoteRepPosts(rows);
      })
      .finally(() => {
        if (active) setIsLoadingPosts(false);
      });

    return () => {
      active = false;
    };
  }, [repId]);

  const repPosts = useMemo(() => {
    const merged = new Map<string, Listing>();
    remoteRepPosts.forEach((p) => merged.set(p.id, p));
    getRepresentativePosts(listings, repId).forEach((item) => {
      if (!merged.has(item.id)) merged.set(item.id, item);
    });
    return Array.from(merged.values()).sort(
      (a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0)
    );
  }, [remoteRepPosts, listings, repId]);

  const repProfile = useMemo(() => {
    const derived = buildRepresentativeProfile(repId, repPosts, null, isAr);
    if (!initialProfile) return derived;
    return {
      ...derived,
      name: repPosts.length > 0 ? derived.name : initialProfile.name || derived.name,
      phoneNumber: derived.phoneNumber || initialProfile.phoneNumber,
      avatarUrl: derived.avatarUrl || initialProfile.avatarUrl,
      coverageArea: derived.coverageArea || initialProfile.coverageArea,
      totalDeals: Math.max(derived.totalDeals, initialProfile.totalDeals || 0),
    };
  }, [repId, repPosts, initialProfile, isAr]);

  const visiblePosts = useMemo(() => {
    const q = repSearch.toLowerCase().trim();
    const filtered = q
      ? repPosts.filter(
          (item) =>
            (item.title || '').toLowerCase().includes(q) ||
            (item.description || '').toLowerCase().includes(q) ||
            (item.district || '').toLowerCase().includes(q)
        )
      : [...repPosts];

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
        const aSoldOut = Boolean(a.isSoldOut);
        const bSoldOut = Boolean(b.isSoldOut);
        if (aSoldOut !== bSoldOut) return aSoldOut ? 1 : -1;
        if (a.hidePrice !== b.hidePrice) return a.hidePrice ? 1 : -1;
        return (b.createdTimestamp || 0) - (a.createdTimestamp || 0);
      });
    }

    return filtered.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));
  }, [repPosts, repSearch, sortBy]);

  const activeDealsCount = useMemo(
    () => repPosts.filter((p) => !p.isSoldOut).length,
    [repPosts]
  );

  const whatsappUrl = getRepresentativeWhatsAppUrl(
    repProfile.phoneNumber,
    repProfile.name,
    isAr
  );
  const activityLabel = getStoreActivityLabel(repPosts, isAr);

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

  const handleShareCorner = async () => {
    const shareUrl = buildRepresentativeShareUrl(repId);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${isAr ? 'ركن المندوب' : 'Representative Corner'} - ${repProfile.name}`,
          text: isAr
            ? `تصفح عروض المندوب ${repProfile.name} على سوق بلحظة`
            : `Browse ${repProfile.name}'s deals on Souq Belahdha`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    const copied = await copyToClipboard(shareUrl);
    if (copied) {
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 2200);
      onNotifyToast?.(
        isAr ? 'تم نسخ رابط ركن المندوب للمشاركة' : 'Representative corner link copied',
        'share'
      );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-5 space-y-5 animate-fade-in">
      {/* Top Action Strip: Back & Share Representative Corner */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="group min-h-[40px] px-3 rounded-xl bg-white hover:bg-[#FFE4C4]/75 active:scale-95 border border-[#E8C5A0] text-xs sm:text-sm font-bold text-[#1E293B] inline-flex items-center gap-1.5 transition-all shadow-2xs"
        >
          {isAr ? (
            <ChevronRight className="w-4 h-4 text-[#0D9488] transition-transform duration-200 group-hover:translate-x-0.5" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-[#0D9488] transition-transform duration-200 group-hover:-translate-x-0.5" />
          )}
          <span>{backLabel || (isAr ? 'رجوع للسوق' : 'Back to Market')}</span>
        </button>

        <button
          type="button"
          onClick={handleShareCorner}
          className={`group min-h-[40px] px-3.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs ${
            copiedShare
              ? 'bg-teal-50 border-teal-300 text-[#0F766E]'
              : 'bg-white hover:bg-[#FFE4C4]/75 border-[#E8C5A0] text-[#1E293B]'
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
              : (isAr ? 'مشاركة ركن المندوب' : 'Share Corner')}
          </span>
        </button>
      </div>

      {/* Representative Corner Header Card (No fixed shop address or map pin) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border border-[#E8C5A0] shadow-[0_6px_24px_rgba(180,120,60,0.09)] p-4 sm:p-6 space-y-4">
        <div className="flex items-start gap-3.5 sm:gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-teal-50 border border-teal-200/80 text-[#0D9488] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
            {repProfile.avatarUrl ? (
              <img
                src={repProfile.avatarUrl}
                alt={repProfile.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <Handshake className="w-7 h-7 sm:w-8 sm:h-8" />
            )}
          </div>

          {/* Name, Verified Rep Badge, Bio & Metadata */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FFE4C4] text-[#7C4A21] border border-[#E8C5A0] text-[11px] font-extrabold shrink-0">
                <Handshake className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>{isAr ? 'ركن المندوب' : 'Representative Corner'}</span>
              </span>
              <h1 className="text-base sm:text-xl font-extrabold text-[#1E293B] truncate">
                {repProfile.name}
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-200/90 text-[11px] font-bold">
                <BadgeCheck className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>
                  {isAr ? 'مندوب معتمد • ربط وتوصيل مباشر' : 'Verified Rep • Direct Coordination'}
                </span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#64748B] line-clamp-2 leading-relaxed">
              {repProfile.bio}
            </p>

            {/* Coverage Area (if provided), Activity & Active Deals */}
            <div className="flex items-center flex-wrap gap-2 pt-1 text-[11px] font-semibold">
              {repProfile.coverageArea && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFE4C4] text-[#1E293B] border border-[#E8C5A0]">
                  <Truck className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                  <span>{repProfile.coverageArea}</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50/75 text-[#0F766E] border border-teal-100">
                <Clock className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                <span>{activityLabel}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-[#64748B] border border-[#E8C5A0] tabular-nums">
                <Package className="w-3.5 h-3.5 text-[#0D9488]/80 shrink-0" />
                <span>
                  {activeDealsCount} {isAr ? 'عرض نشط' : 'active deals'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Direct Representative Contact Buttons */}
        {(whatsappUrl || repProfile.phoneNumber) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#FFE4C4]">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group min-h-[44px] px-4 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] active:scale-95 text-white text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
                <span>
                  {isAr ? 'تواصل مع المندوب للتنسيق والتوصيل' : 'Contact Rep to Coordinate'}
                </span>
              </a>
            )}

            {repProfile.phoneNumber && (
              <a
                href={`tel:${repProfile.phoneNumber}`}
                className="group min-h-[44px] px-4 rounded-xl bg-[#FFE4C4]/80 hover:bg-[#FFE4C4] active:scale-95 text-[#1E293B] border border-[#E8C5A0] text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4 text-[#0D9488] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-12" />
                <span className="tabular-nums" dir="ltr">
                  {repProfile.phoneNumber}
                </span>
              </a>
            )}
          </div>
        )}
      </section>

      {/* In-Corner Search & Sort */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#0D9488]/70 absolute right-4 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={repSearch}
            onChange={(e) => setRepSearch(e.target.value)}
            placeholder={
              isAr ? 'ابحث داخل عروض هذا المندوب...' : 'Search within this representative corner...'
            }
            className="w-full h-11 pr-11 pl-10 rounded-2xl bg-white border border-[#E8C5A0] shadow-[0_2px_10px_rgba(180,120,60,0.08)] text-sm text-[#1E293B] placeholder:text-[#64748B]/75 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition-all duration-200"
          />
          {repSearch && (
            <button
              type="button"
              onClick={() => setRepSearch('')}
              className="group absolute left-3 top-2.5 p-1 text-[#64748B] hover:text-[#1E293B] rounded-lg transition-all active:scale-90"
              aria-label={isAr ? 'مسح البحث' : 'Clear search'}
            >
              <X className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSortBy('newest')}
            className={`group min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 inline-flex items-center gap-1.5 ${
              sortBy === 'newest'
                ? 'bg-[#0D9488] text-white shadow-[0_4px_12px_rgba(13,148,136,0.22)]'
                : 'bg-white text-[#1E293B] border border-[#E8C5A0] hover:border-[#D9AD82] hover:bg-[#FFE4C4]/70 hover:text-[#0F766E]'
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
                : 'bg-white text-[#1E293B] border border-[#E8C5A0] hover:border-[#D9AD82] hover:bg-[#FFE4C4]/70 hover:text-[#0F766E]'
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
                : 'bg-white text-[#1E293B] border border-[#E8C5A0] hover:border-[#D9AD82] hover:bg-[#FFE4C4]/70 hover:text-[#0F766E]'
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

      {/* Representative Ads Grid */}
      {isLoadingPosts && repPosts.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-[#E8C5A0]/80 overflow-hidden"
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
        <div className="py-14 px-6 text-center bg-white rounded-2xl border border-[#E8C5A0] space-y-3">
          <Handshake className="w-8 h-8 text-[#C69363] mx-auto" />
          <p className="text-sm font-semibold text-[#64748B]">
            {repPosts.length === 0
              ? (isAr ? 'لا توجد عروض في ركن المندوب بعد' : 'No deals in this corner yet')
              : (isAr ? 'لا توجد عروض مطابقة لبحثك' : 'No matching deals')}
          </p>
          {repSearch && (
            <button
              type="button"
              onClick={() => setRepSearch('')}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] active:scale-95 text-white text-xs font-bold transition-all"
            >
              {isAr ? 'عرض جميع عروض المندوب' : 'Show all deals'}
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
            const isDelivery =
              item.deliveryMethod === 'delivery' ||
              (!item.deliveryMethod && item.deliveryAvailable);

            return (
              <div
                key={item.id}
                onClick={() => onSelectListing(item)}
                className={`group bg-white rounded-2xl overflow-hidden border border-[#E8C5A0]/85 shadow-[0_3px_12px_rgba(180,120,60,0.08)] hover:shadow-[0_14px_30px_rgba(13,148,136,0.16)] hover:border-[#D9AD82] hover:-translate-y-1 cursor-pointer transition-all duration-200 active:scale-[0.98] flex flex-col ${
                  item.isSoldOut ? 'opacity-80 hover:opacity-100' : ''
                }`}
              >
                <div className="relative aspect-[4/3] bg-[#FFE4C4]/50 overflow-hidden flex items-center justify-center">
                  <div className={`w-full h-full ${item.isSoldOut ? 'grayscale-[25%]' : ''}`}>
                    <RepProductImage src={cardImg} alt={item.title || 'منتج'} />
                  </div>

                  {item.isSoldOut && (
                    <div className="absolute inset-0 bg-slate-950/25 flex items-center justify-center pointer-events-none">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-xs text-white text-xs font-extrabold border border-white/15 shadow-sm inline-flex items-center gap-1.5">
                        <PackageX className="w-3.5 h-3.5 text-[#FFE4C4]" />
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
                          : 'bg-white/85 hover:bg-white text-[#1E293B]/80 border border-[#E8C5A0]/80'
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
                  <div className="space-y-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-[#0F766E] border border-teal-200/80 text-[10px] font-bold">
                      <Handshake className="w-3 h-3 text-[#0D9488]" />
                      <span>{isAr ? 'بواسطة مندوب' : 'Via Rep'}</span>
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-[#1E293B] line-clamp-2 leading-relaxed">
                      {item.title || (isAr ? 'إعلان بدون عنوان' : 'Untitled')}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm sm:text-base font-extrabold text-[#0F766E] tabular-nums">
                      {item.hidePrice
                        ? (isAr ? 'عند التواصل' : 'Contact')
                        : `${Number(item.price ?? 0).toLocaleString()} ${item.currency || 'د.ع'}`}
                    </p>

                    <div className="pt-2 border-t border-[#FFE4C4] flex items-center justify-between gap-1.5 text-[10px] sm:text-[11px] flex-wrap">
                      {locationText && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FFE4C4] text-[#0F766E] border border-[#E8C5A0] font-semibold truncate min-w-0 max-w-full">
                          <MapPin className="w-3 h-3 text-[#0D9488] shrink-0" />
                          <span className="truncate">{locationText}</span>
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold shrink-0 ${
                          isDelivery
                            ? 'bg-teal-50 text-[#0F766E] border border-teal-200/80'
                            : 'bg-[#FFE4C4]/70 text-[#7C4A21] border border-[#E8C5A0]'
                        }`}
                      >
                        {isDelivery ? (
                          <Truck className="w-3 h-3 text-[#0D9488] shrink-0" />
                        ) : (
                          <MapPin className="w-3 h-3 text-[#7C4A21] shrink-0" />
                        )}
                        <span>
                          {isDelivery
                            ? (isAr ? 'توصيل' : 'Delivery')
                            : (isAr ? 'استلام موقعي' : 'Pickup')}
                        </span>
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
