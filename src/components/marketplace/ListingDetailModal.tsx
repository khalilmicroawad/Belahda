import React, { useState } from 'react';
import {
  X,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Store,
  User,
  ShieldCheck,
  Share2,
  Heart,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Eye,
  Check,
  Truck,
  ExternalLink,
  Navigation
} from 'lucide-react';
import { Listing, UserAccount } from '../../types';

interface ListingDetailModalProps {
  listing: Listing;
  currentUser: UserAccount | null;
  onClose: () => void;
  onOpenChat: (listing: Listing) => void;
  onRequireAuth: (pendingAction: () => void, message?: string) => void;
  lang?: 'ar' | 'en';
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  listing,
  currentUser,
  onClose,
  onOpenChat,
  onRequireAuth,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [showMapPreview, setShowMapPreview] = useState(true);

  const handleWhatsApp = () => {
    const action = () => {
      const phone = listing.contactOptions.whatsappNumber || listing.sellerPhone || '07700000000';
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const formatted = cleanPhone.startsWith('0') ? `964${cleanPhone.slice(1)}` : cleanPhone;
      const message = isAr
        ? `السلام عليكم، أنا مهتم بإعلانك على سوق بلحظة (الموصل): "${listing.title}". هل لا يزال متوفراً؟`
        : `Hello, interested in your listing on Souq Belahdha: "${listing.title}".`;
      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/${formatted}?text=${encoded}`, '_blank');
    };

    if (!currentUser) {
      onRequireAuth(action, isAr ? 'للتواصل عبر واتساب، يرجى كتابة اسمك ورقم هاتفك واختيار رمز سري' : 'Register to contact seller');
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
      onRequireAuth(action, isAr ? 'لبدء محادثة فورية، يرجى كتابة اسمك ورقم هاتفك واختيار رمز سري' : 'Register to chat');
    } else {
      action();
    }
  };

  const handlePhone = () => {
    const action = () => {
      const phone = listing.contactOptions.phoneNumber || listing.sellerPhone;
      if (phone) window.location.href = `tel:${phone}`;
    };

    if (!currentUser) {
      onRequireAuth(action, isAr ? 'للاتصال الهاتفي، يرجى التسجيل برقمك واسمك' : 'Register to call');
    } else {
      action();
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: listing.title,
        text: listing.description.slice(0, 60),
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-3 animate-fadeIn select-none text-xs">
      <div className="bg-white w-full max-w-md mx-auto sm:rounded-3xl rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-white sticky top-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="p-1 -mx-1 text-slate-700 hover:bg-slate-100 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
          >
            {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
            {listing.title}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setIsFav(!isFav)}
              className="p-1.5 text-slate-500 hover:text-red-500 rounded-lg hover:bg-slate-100"
            >
              <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {/* Main Visual */}
          <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-900 shadow-inner">
            <img
              src={listing.mediaUrls[activePhotoIdx] || listing.mediaUrls[0]}
              alt={listing.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />

            <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
              <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded">
                {listing.condition === 'new' ? 'جديد بالكرتون' : 'بحالة جيدة'}
              </span>
              {listing.deliveryAvailable && (
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  <span>متوفر توصيل</span>
                </span>
              )}
            </div>

            {/* Pagination Dots */}
            {listing.mediaUrls.length > 1 && (
              <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1">
                {listing.mediaUrls.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhotoIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      activePhotoIdx === i ? 'bg-white w-4' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pricing & District */}
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                {listing.title}
              </h1>

              <div className="text-right shrink-0">
                {listing.hidePrice ? (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    السعر عند التواصل
                  </span>
                ) : (
                  <div className="flex items-baseline gap-1 text-emerald-800">
                    <span className="text-xl font-black font-mono tabular-nums">
                      {listing.price.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold">
                      {listing.currency}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Location & Time in Mosul */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                {listing.district || 'الموصل'} · الموصل
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {listing.createdAt}
              </span>
            </div>
          </div>

          {/* Delivery Details Card */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className={`w-4 h-4 ${listing.deliveryAvailable ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div>
                <span className="font-bold text-slate-800 block">
                  {listing.deliveryAvailable ? 'خدمة التوصيل داخل الموصل متوفرة 🛵' : 'استلام مباشر من موقع البائع 📍'}
                </span>
                {listing.deliveryNotes && (
                  <span className="text-[10px] text-slate-500">{listing.deliveryNotes}</span>
                )}
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${listing.deliveryAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
              {listing.deliveryAvailable ? 'توصيل' : 'استلام'}
            </span>
          </div>

          {/* Description */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <h2 className="text-[11px] font-bold text-slate-800">
              تفاصيل ومواصفات السلعة:
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          </div>

          {/* Seller Profile in Mosul */}
          <div className="p-3 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={listing.sellerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt={listing.sellerName}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-900">
                      {listing.sellerType === 'commercial' ? listing.storeName : listing.sellerName}
                    </span>
                    {listing.sellerType === 'commercial' && (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {listing.sellerType === 'commercial' ? 'محل معتمد في الموصل' : 'بائع فردي مسجل'}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded">
                {listing.sellerPhone}
              </span>
            </div>

            {/* Google Maps Location for both Commercial and Personal Sellers */}
            {listing.storeLocation && (
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] space-y-2">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block leading-tight">
                        {listing.storeLocation.addressName || `${listing.district} · الموصل`}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {listing.sellerType === 'commercial' ? 'موقع المتجر على Google Maps' : 'موقع البائع / نقطة التسليم'}
                      </span>
                    </div>
                  </div>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${listing.storeLocation.lat},${listing.storeLocation.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 shrink-0"
                  >
                    <span>فتح بالخرائط</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                {/* Embedded Google Maps viewer inside application */}
                {showMapPreview && (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
                    <iframe
                      title="Item Location in Mosul"
                      src={`https://maps.google.com/maps?q=${listing.storeLocation.lat},${listing.storeLocation.lng}&hl=ar&z=15&output=embed`}
                      className="w-full h-full border-0 select-none"
                      loading="lazy"
                    />
                    <div className="absolute bottom-1 right-1 bg-white/90 backdrop-blur-xs text-[9px] font-mono text-slate-700 px-1.5 py-0.5 rounded shadow">
                      {listing.storeLocation.lat.toFixed(3)}, {listing.storeLocation.lng.toFixed(3)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Actions */}
        <div className="p-3 bg-white border-t border-slate-200 grid grid-cols-2 gap-2">
          {listing.contactOptions.whatsapp ? (
            <button
              type="button"
              onClick={handleWhatsApp}
              className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>واتساب مباشر</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePhone}
              className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Phone className="w-4 h-4" />
              <span>اتصال هاتفي</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleChat}
            className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4" />
            <span>دردشة فورية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
