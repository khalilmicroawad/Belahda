import React, { useState } from 'react';
import {
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Store,
  User,
  Share2,
  Heart,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Check,
  Truck,
  ExternalLink,
  Image as ImageIcon,
  PackageX,
  PackageCheck,
  Loader2,
  Handshake
} from 'lucide-react';
import { Listing, UserAccount } from '../../types';
import { isRepresentativeAd } from '../../lib/storeUtils';

interface ListingDetailModalProps {
  listing: Listing;
  currentUser: UserAccount | null;
  isFavorite?: boolean;
  onToggleFavorite?: (postId: string) => void;
  onToggleSoldOut?: (listing: Listing, nextSoldOut: boolean) => Promise<void> | void;
  isUpdatingSoldOut?: boolean;
  onClose: () => void;
  onOpenChat: (listing: Listing) => void;
  onOpenStore?: (storeId: string) => void;
  onOpenRepresentative?: (repId: string) => void;
  isRepresentativeQualified?: boolean;
  onRequireAuth: (pendingAction: () => void, message?: string) => void;
  lang?: 'ar' | 'en';
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  listing,
  currentUser,
  isFavorite,
  onToggleFavorite,
  onToggleSoldOut,
  isUpdatingSoldOut = false,
  onClose,
  onOpenChat,
  onOpenStore,
  onOpenRepresentative,
  isRepresentativeQualified = false,
  onRequireAuth,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [localFav, setLocalFav] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [heartPop, setHeartPop] = useState(false);
  const [sharePop, setSharePop] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const isFav = typeof isFavorite === 'boolean' ? isFavorite : localFav;
  const isOwner = Boolean(
    currentUser?.id &&
      ((listing.sellerId && String(listing.sellerId) === String(currentUser.id)) ||
        (currentUser.customStoreId &&
          listing.storeId &&
          String(currentUser.customStoreId) === String(listing.storeId)))
  );

  const handleAnimatedClose = () => {
    setIsClosing(true);
    window.setTimeout(() => {
      onClose();
    }, 150);
  };

  const handleWhatsApp = () => {
    const action = () => {
      const phone = listing.contactOptions?.whatsappNumber || listing.sellerPhone || '07700000000';
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const formatted = cleanPhone.startsWith('0') ? `964${cleanPhone.slice(1)}` : cleanPhone;
      const message = isAr
        ? `السلام عليكم، أنا مهتم بإعلانك على سوق بلحظة: "${listing.title}". هل لا يزال متوفراً؟`
        : `Hello, interested in your listing on Souq Belahdha: "${listing.title}".`;
      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/${formatted}?text=${encoded}`, '_blank');
    };

    if (!currentUser) {
      onRequireAuth(action, isAr ? 'للتواصل عبر واتساب، يرجى تسجيل الدخول أو إنشاء حساب' : 'Sign in to contact seller');
    } else {
      action();
    }
  };

  const handleChat = () => {
    const action = () => {
      onClose();
      onOpenChat(listing);
    };

    if (!currentUser) {
      onRequireAuth(action, isAr ? 'لبدء محادثة فورية، يرجى تسجيل الدخول أو إنشاء حساب' : 'Sign in to chat');
    } else {
      action();
    }
  };

  const handlePhone = () => {
    const action = () => {
      const phone = listing.contactOptions?.phoneNumber || listing.sellerPhone;
      if (phone) window.location.href = `tel:${phone}`;
    };

    if (!currentUser) {
      onRequireAuth(action, isAr ? 'للاتصال الهاتفي، يرجى تسجيل الدخول أولاً' : 'Sign in to call');
    } else {
      action();
    }
  };

  const buildSharePayload = () => {
    const cleanDistrict = (listing.district || '').trim();
    const cleanCity = (listing.city || '').trim();
    const locationLabel =
      cleanDistrict && cleanCity && cleanDistrict !== cleanCity && cleanDistrict !== 'أخرى / خارج الموصل'
        ? `${cleanCity} - ${cleanDistrict}`
        : cleanDistrict || cleanCity || (isAr ? 'الموصل' : 'Mosul');

    const priceLabel = listing.hidePrice
      ? (isAr ? 'السعر عند التواصل' : 'Contact for price')
      : `${Number(listing.price ?? 0).toLocaleString()} ${listing.currency || 'د.ع'}`;

    let shareUrl = window.location.href;
    try {
      const shareUrlObj = new URL(window.location.href);
      shareUrlObj.searchParams.delete('store');
      shareUrlObj.searchParams.delete('rep');
      shareUrlObj.searchParams.set('ad', listing.id);
      shareUrl = shareUrlObj.toString();
    } catch {
      // Fallback to current href
    }

    const formattedText =
      `بـلـحـظـة ⚡ | ${listing.title || 'إعلان'}\n` +
      `📍 ${locationLabel}\n` +
      `💰 السعر: ${priceLabel}\n` +
      `تفاصيل أكثر داخل التطبيق!`;

    return {
      shareUrl,
      formattedText,
      fullShareMessage: `${formattedText}\n${shareUrl}`,
    };
  };

  const handleCopyShare = () => {
    const { fullShareMessage } = buildSharePayload();
    navigator.clipboard?.writeText(fullShareMessage);
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleShare = () => {
    setSharePop(true);
    window.setTimeout(() => setSharePop(false), 280);
    const { shareUrl, formattedText } = buildSharePayload();
    if (navigator.share) {
      navigator.share({
        title: listing.title,
        text: formattedText,
        url: shareUrl
      }).catch(() => {});
    } else {
      handleCopyShare();
    }
  };

  const { fullShareMessage } = buildSharePayload();
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(fullShareMessage)}`;

  const handleToggleFav = () => {
    setHeartPop(true);
    window.setTimeout(() => setHeartPop(false), 300);
    if (onToggleFavorite) {
      onToggleFavorite(listing.id);
    } else {
      setLocalFav((prev) => !prev);
    }
  };

  const safeMediaUrls = Array.isArray(listing.mediaUrls) ? listing.mediaUrls : [];
  const fullResPhotos = safeMediaUrls.length > 0
    ? safeMediaUrls
    : listing.fullImageUrl
    ? [listing.fullImageUrl]
    : listing.thumbnailUrl
    ? [listing.thumbnailUrl]
    : [];
  const activePhotoSrc =
    (activePhotoIdx === 0 && listing.fullImageUrl) ||
    fullResPhotos[activePhotoIdx] ||
    fullResPhotos[0] ||
    null;

  const lat = listing.latitude ?? listing.storeLocation?.lat;
  const lng = listing.longitude ?? listing.storeLocation?.lng;
  const resolvedMapsUrl =
    listing.mapsUrl ||
    (typeof lat === 'number' && typeof lng === 'number'
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : undefined);

  const isCommercial = listing.adType === 'commercial' || listing.sellerType === 'commercial';
  const isRep = isRepresentativeAd(listing);
  const isDelivery =
    listing.deliveryMethod === 'delivery' ||
    (!listing.deliveryMethod && listing.deliveryAvailable);

  return (
    <div
      onClick={handleAnimatedClose}
      className={`fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-4 select-none ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
    >
      {isLightboxOpen && activePhotoSrc && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsLightboxOpen(false);
          }}
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 min-w-[44px] min-h-[44px] rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all"
            aria-label={isAr ? 'إغلاق الصورة' : 'Close zoom'}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <img
            src={activePhotoSrc}
            alt={listing.title || 'صورة المنتج'}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white w-full max-w-lg mx-auto sm:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-[#D9AF91] ${
          isClosing ? 'animate-modal-down' : 'animate-modal-up'
        }`}
      >
        <div className="sm:hidden w-10 h-1 bg-[#D9AF91] rounded-full mx-auto mt-2.5 mb-0.5 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#D9AF91]/80 bg-white/95 sticky top-0 z-10">
          <button
            type="button"
            onClick={handleAnimatedClose}
            className="group min-w-[40px] min-h-[40px] text-[#1E293B] hover:bg-[#EDC9AF]/70 active:scale-95 rounded-xl flex items-center justify-center transition-all"
            aria-label={isAr ? 'رجوع' : 'Back'}
          >
            {isAr ? (
              <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
            ) : (
              <ChevronLeft className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            )}
          </button>

          <span className="text-sm font-bold text-[#1E293B] truncate max-w-[210px]">
            {listing.title}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleShare}
              className={`group min-w-[40px] min-h-[40px] text-[#64748B] hover:text-[#1E293B] rounded-xl hover:bg-[#EDC9AF]/70 active:scale-90 flex items-center justify-center transition-all ${
                sharePop ? 'animate-heart-pop text-[#008080]' : ''
              }`}
              aria-label={isAr ? 'مشاركة' : 'Share'}
            >
              {copiedLink ? (
                <Check className="w-4 h-4 text-[#008080]" />
              ) : (
                <Share2 className="w-4 h-4 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
              )}
            </button>
            <button
              type="button"
              onClick={handleToggleFav}
              className={`group min-w-[40px] min-h-[40px] rounded-xl hover:bg-[#EDC9AF]/70 active:scale-90 flex items-center justify-center transition-all ${
                isFav ? 'text-rose-500' : 'text-[#64748B] hover:text-rose-500'
              } ${heartPop ? 'animate-heart-pop' : ''}`}
              aria-label={isAr ? 'حفظ' : 'Save'}
            >
              <Heart
                className={`w-4 h-4 transition-all duration-200 group-hover:scale-110 ${
                  isFav ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Full-Resolution Image */}
          <div
            onClick={() => { if (activePhotoSrc) setIsLightboxOpen(true); }}
            className={`relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#EDC9AF]/60 border border-[#D9AF91]/80 flex items-center justify-center ${
              activePhotoSrc ? 'cursor-zoom-in' : ''
            }`}
          >
            {activePhotoSrc ? (
              <>
                {!imgLoaded && <div className="absolute inset-0 skeleton-shimmer" />}
                <img
                  src={activePhotoSrc}
                  alt={listing.title || 'صورة المنتج'}
                  referrerPolicy="no-referrer"
                  onLoad={() => setImgLoaded(true)}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    imgLoaded ? 'opacity-100' : 'opacity-0'
                  } ${listing.isSoldOut ? 'grayscale-[25%]' : ''}`}
                />
              </>
            ) : (
              <div className="w-full h-full bg-[#EDC9AF]/70 flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-[#C69363]" />
              </div>
            )}

            {listing.isSoldOut && (
              <div className="absolute inset-0 bg-slate-950/25 flex items-center justify-center pointer-events-none">
                <span className="px-4 py-2 rounded-2xl bg-slate-900/80 backdrop-blur-xs text-white text-xs sm:text-sm font-extrabold border border-white/15 shadow-md inline-flex items-center gap-2">
                  <PackageX className="w-4 h-4 text-[#EDC9AF]" />
                  <span>{isAr ? 'نفدت الكمية' : 'Sold Out'}</span>
                </span>
              </div>
            )}

            {fullResPhotos.length > 1 && (
              <div
                className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                {fullResPhotos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setImgLoaded(false);
                      setActivePhotoIdx(i);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      activePhotoIdx === i ? 'bg-[#009999] w-5' : 'bg-white/70 w-1.5'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Title, Price & Clean Unboxed Metadata */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-base sm:text-lg font-extrabold text-[#1E293B] leading-snug">
                {listing.title}
              </h1>

              <div className="shrink-0">
                {listing.hidePrice ? (
                  <span className="text-xs font-bold text-[#6B3F21]">
                    {isAr ? 'السعر عند التواصل' : 'Contact for price'}
                  </span>
                ) : (
                  <div className="flex items-baseline gap-1 text-[#006666]">
                    <span className="text-xl font-extrabold tabular-nums">
                      {Number(listing.price ?? 0).toLocaleString()}
                    </span>
                    <span className="text-xs font-bold">
                      {listing.currency || 'د.ع'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2 text-xs text-[#64748B]">
              {isRep && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-teal-50 text-[#006666] border border-teal-200/90 text-[11px] font-bold">
                  <Handshake className="w-3.5 h-3.5 text-[#008080]" />
                  <span>{isAr ? 'بواسطة مندوب' : 'Via Representative'}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[#006666] font-semibold">
                <MapPin className="w-3.5 h-3.5 text-[#008080]" />
                {listing.district || 'الموصل'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#64748B]/80" />
                {listing.createdAt}
              </span>
              <span aria-hidden="true">·</span>
              <span>{listing.condition === 'new' ? 'جديد' : 'مستعمل'}</span>
              <span aria-hidden="true">·</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                  isDelivery
                    ? 'bg-teal-50 text-[#006666] border border-teal-200/80'
                    : 'bg-[#EDC9AF]/75 text-[#6B3F21] border border-[#D9AF91]'
                }`}
              >
                {isDelivery ? (
                  <Truck className="w-3.5 h-3.5 text-[#008080]" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-[#6B3F21]" />
                )}
                <span>
                  {isDelivery
                    ? (isAr ? 'توصيل' : 'Delivery')
                    : (isAr ? 'استلام موقعي' : 'On-site Pickup')}
                </span>
              </span>
            </div>
          </div>

          {/* Owner Quick Availability Toggle (متوفر / نفدت الكمية) */}
          {isOwner && onToggleSoldOut && (
            <div className="p-3.5 rounded-2xl bg-[#EDC9AF]/75 border border-[#D9AF91] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {listing.isSoldOut ? (
                  <PackageX className="w-4 h-4 text-[#6B3F21] shrink-0" />
                ) : (
                  <PackageCheck className="w-4 h-4 text-[#008080] shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#1E293B]">
                    {listing.isSoldOut
                      ? (isAr ? 'الحالة: نفدت الكمية' : 'Status: Sold Out')
                      : (isAr ? 'الحالة: متوفر حالياً' : 'Status: Available')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isUpdatingSoldOut}
                onClick={() => onToggleSoldOut(listing, !listing.isSoldOut)}
                className={`group min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-all active:scale-95 disabled:opacity-60 ${
                  listing.isSoldOut
                    ? 'bg-[#008080] hover:bg-[#006666] text-white shadow-xs'
                    : 'bg-[#1E293B] hover:bg-slate-800 text-white shadow-xs'
                }`}
              >
                {isUpdatingSoldOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : listing.isSoldOut ? (
                  <PackageCheck className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
                ) : (
                  <PackageX className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
                )}
                <span>
                  {listing.isSoldOut
                    ? (isAr ? 'تحديد كـ متوفر' : 'Mark Available')
                    : (isAr ? 'تحديد كـ نفدت الكمية' : 'Mark Sold Out')}
                </span>
              </button>
            </div>
          )}

          {/* Description */}
          <div className="p-4 rounded-2xl bg-[#EDC9AF]/45 border border-[#D9AF91]/80 space-y-1.5">
            <h2 className="text-xs font-bold text-[#1E293B]">
              {isAr ? 'تفاصيل الإعلان' : 'Details'}
            </h2>
            <p className="text-sm text-[#1E293B]/90 leading-relaxed whitespace-pre-line">
              {listing.description || (isAr ? 'لم تتم إضافة تفاصيل إضافية.' : 'No additional description.')}
            </p>
          </div>

          {/* Formatted WhatsApp Share Card Inside Ad View */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#D9AF91] shadow-[0_2px_10px_rgba(180,120,60,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-[#006666]">
                {isAr ? 'شارك الإعلان مع أصدقائك' : 'Share this listing'}
              </p>
              <p className="text-[11px] text-[#64748B] truncate">
                {isAr
                  ? 'رسالة جاهزة بالاسم والموقع والسعر ورابط الإعلان'
                  : 'Ready-to-send summary with title, area, price & link'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#008080] hover:bg-[#006666] active:scale-95 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                <span>{isAr ? 'مشاركة واتساب' : 'Share WhatsApp'}</span>
              </a>
              <button
                type="button"
                onClick={handleCopyShare}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#EDC9AF]/70 hover:bg-[#EDC9AF] active:scale-95 border border-[#D9AF91] text-[#1E293B] text-xs font-bold inline-flex items-center gap-1.5 transition-all"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#008080]" />
                    <span className="text-[#006666]">{isAr ? 'تم النسخ' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-[#008080]" />
                    <span>{isAr ? 'نسخ' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Seller / Store & Location Card */}
          <div className="p-4 rounded-2xl bg-white border border-[#D9AF91] shadow-[0_2px_10px_rgba(180,120,60,0.06)] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-[#008080] flex items-center justify-center overflow-hidden shrink-0">
                  {listing.sellerAvatar ? (
                    <img
                      src={listing.sellerAvatar}
                      alt={listing.sellerName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : isRep ? (
                    <Handshake className="w-5 h-5" />
                  ) : isCommercial ? (
                    <Store className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {listing.storeId && onOpenStore ? (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenStore(listing.storeId!);
                        }}
                        className="text-sm font-bold text-[#006666] hover:underline truncate text-start"
                      >
                        {isCommercial && listing.storeName
                          ? listing.storeName
                          : listing.sellerName || (isAr ? 'بائع' : 'Seller')}
                      </button>
                    ) : (
                      <span className="text-sm font-bold text-[#1E293B] truncate">
                        {isCommercial && listing.storeName
                          ? listing.storeName
                          : listing.sellerName || (isAr ? 'بائع' : 'Seller')}
                      </span>
                    )}
                    {listing.storeId && onOpenStore && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenStore(listing.storeId!);
                        }}
                        className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EDC9AF] hover:bg-[#F5D0A9] active:scale-95 text-[#6B3F21] border border-[#D9AF91] text-[11px] font-bold transition-all"
                      >
                        <Store className="w-3 h-3 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
                        <span>{isAr ? 'زيارة المتجر' : 'View Store'}</span>
                      </button>
                    )}
                    {isRep && isRepresentativeQualified && listing.sellerId && onOpenRepresentative && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenRepresentative(String(listing.sellerId!));
                        }}
                        className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EDC9AF] hover:bg-[#F5D0A9] active:scale-95 text-[#6B3F21] border border-[#D9AF91] text-[11px] font-bold transition-all"
                      >
                        <Handshake className="w-3 h-3 text-[#008080] transition-transform duration-200 group-hover:scale-110" />
                        <span>{isAr ? 'تصفح ركن المندوب' : 'Browse Rep Corner'}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B]">
                    {isRep
                      ? (isAr ? 'بواسطة مندوب • ربط وتوصيل مباشر' : 'Via Representative • Direct Coordination')
                      : isCommercial
                      ? (isAr ? 'إعلان تجاري' : 'Commercial Ad')
                      : (isAr ? 'إعلان شخصي' : 'Personal Ad')}
                  </p>
                </div>
              </div>

              {listing.sellerPhone && (
                <a
                  href={`tel:${listing.sellerPhone}`}
                  dir="ltr"
                  className="group inline-flex items-center gap-1.5 text-xs font-bold tabular-nums text-[#1E293B] bg-[#EDC9AF]/80 hover:bg-[#EDC9AF] active:scale-95 border border-[#D9AF91] px-3 py-2 rounded-xl transition-all shrink-0"
                >
                  <Phone className="w-3.5 h-3.5 text-[#008080] transition-transform duration-200 group-hover:-rotate-12" />
                  <span>{listing.sellerPhone}</span>
                </a>
              )}
            </div>

            {/* Coverage Note for Representative OR Google Maps for Personal/Commercial */}
            {isRep ? (
              <div className="p-3 rounded-xl bg-[#EDC9AF]/50 border border-[#D9AF91] flex items-start gap-2 text-xs text-[#1E293B]">
                <Handshake className="w-4 h-4 text-[#008080] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {isAr ? 'تنسيق وربط مباشر بين البائع والمشتري' : 'Direct Buyer-Seller Coordination'}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    {listing.coverageArea || listing.deliveryNotes || (isAr ? 'نطاق التوصيل والتنسيق داخل الموصل بدون عنوان محل ثابت' : 'Mosul delivery & coordination without a fixed shop')}
                  </p>
                </div>
              </div>
            ) : resolvedMapsUrl ? (
              <div className="space-y-2.5 pt-1">
                <a
                  href={resolvedMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-full min-h-[44px] px-3.5 rounded-xl bg-teal-50 hover:bg-teal-100/80 active:scale-[0.98] text-[#006666] border border-teal-200 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <MapPin className="w-4 h-4 text-[#008080] transition-transform duration-200 group-hover:scale-110 group-hover:-translate-y-0.5" />
                  <span>{isAr ? 'فتح في خرائط Google' : 'Open in Google Maps'}</span>
                  <ExternalLink className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>

                {typeof lat === 'number' && typeof lng === 'number' && (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-[#D9AF91] bg-[#EDC9AF]/50">
                    <iframe
                      title="Post Location in Google Maps"
                      src={`https://maps.google.com/maps?q=${lat},${lng}&hl=ar&z=15&output=embed`}
                      className="w-full h-full border-0 select-none"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Sticky Bottom Actions */}
        <div className="p-4 bg-white border-t border-[#D9AF91]/80 grid grid-cols-2 gap-2.5 pb-safe">
          {listing.contactOptions?.whatsapp ? (
            <button
              type="button"
              onClick={handleWhatsApp}
              className="group min-h-[46px] px-2.5 rounded-xl bg-[#008080] hover:bg-[#006666] active:scale-95 text-white text-[11px] sm:text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 text-center leading-tight"
            >
              <MessageCircle className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
              <span>
                {isRep
                  ? (isAr ? 'تواصل مع المندوب للتنسيق والتوصيل' : 'Contact Rep to Coordinate')
                  : (isAr ? 'واتساب مباشر' : 'WhatsApp')}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePhone}
              className="group min-h-[46px] px-2.5 rounded-xl bg-[#008080] hover:bg-[#006666] active:scale-95 text-white text-[11px] sm:text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 text-center leading-tight"
            >
              <Phone className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-12" />
              <span>
                {isRep
                  ? (isAr ? 'تواصل مع المندوب للتنسيق والتوصيل' : 'Contact Rep to Coordinate')
                  : (isAr ? 'اتصال هاتفي' : 'Call Seller')}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleChat}
            className="group min-h-[46px] px-2.5 rounded-xl bg-[#1E293B] hover:bg-slate-900 active:scale-95 text-white text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-translate-x-0.5" />
            <span>{isAr ? 'دردشة فورية' : 'Direct Chat'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
