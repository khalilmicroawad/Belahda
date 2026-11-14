import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Camera,
  Loader2,
  X,
  AlertCircle,
  MapPin,
  Store,
  User,
  Crosshair,
  ExternalLink,
  Link2,
  Send,
  Handshake,
  Truck
} from 'lucide-react';
import { Listing, CategoryId, SellerType, DeliveryMethod, StoreProfile, UserAccount } from '../../types';
import { CATEGORIES } from '../../data/categories';
import { performDualProductImageUpload } from '../../lib/mediaUpload';
import { saveUserAccount } from '../../data/mockListings';
import {
  fetchUserOwnedStore,
  saveSupabasePost,
  supabase,
  upsertUserProfile
} from '../../lib/supabase';
import { NeighborhoodSelector } from '../common/NeighborhoodSelector';

interface ListingWizardProps {
  onCancel: () => void;
  onPublished: (newListing: Listing) => void;
  currentUser: UserAccount | null;
  onUserCreated?: (user: UserAccount) => void;
  lang?: 'ar' | 'en';
}

function parseGoogleMapsCoords(url: string): { lat: number; lng: number } | null {
  const qMatch = url.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i);
  if (qMatch) {
    return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) };
  }
  const atMatch = url.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i);
  if (atMatch) {
    return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
  }
  return null;
}

export const ListingWizard: React.FC<ListingWizardProps> = ({
  onCancel,
  onPublished,
  currentUser,
  onUserCreated,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Essential fields + Ad Type & Google Maps Location
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>(undefined);
  const [fullImageUrl, setFullImageUrl] = useState<string | undefined>(undefined);
  const [adType, setAdType] = useState<SellerType>('personal');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(null);
  const [coverageArea, setCoverageArea] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<CategoryId>('electronics');
  const [price, setPrice] = useState<string>('');
  const [sellerPhone, setSellerPhone] = useState<string>(currentUser?.phoneNumber || '');
  const [district, setDistrict] = useState<string>('حي الزهور');
  const [description, setDescription] = useState<string>('');

  // Google Maps location state (hidden for Representative ads)
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [mapsUrl, setMapsUrl] = useState<string>('');
  const [showPasteLink, setShowPasteLink] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Owned store auto-detection for commercial posts
  const [ownedStore, setOwnedStore] = useState<StoreProfile | null>(null);

  const [isMediaUploading, setIsMediaUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dbErrorDetail, setDbErrorDetail] = useState<{ code?: string; message: string; hint?: string } | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id || currentUser?.id;
      if (uid && active) {
        fetchUserOwnedStore(uid).then((st) => {
          if (active && st) setOwnedStore(st);
        });
      }
    });
    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setValidationError(null);
    setIsMediaUploading(true);

    try {
      const res = await performDualProductImageUpload(file);
      setThumbnailUrl(res.thumbnailUrl);
      setFullImageUrl(res.fullImageUrl);
    } catch (err: any) {
      setUploadError(
        err?.message || (isAr ? 'فشل رفع الصورة، يرجى المحاولة مجدداً' : 'Image upload failed')
      );
    } finally {
      setIsMediaUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setThumbnailUrl(undefined);
    setFullImageUrl(undefined);
    setUploadError(null);
  };

  const handleDetectGps = () => {
    setLocationError(null);
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationError(isAr ? 'المتصفح لا يدعم تحديد الموقع، يمكنك لصق رابط خرائط Google.' : 'Geolocation unsupported.');
      setShowPasteLink(true);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setMapsUrl(`https://www.google.com/maps?q=${lat},${lng}`);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setShowPasteLink(true);
        setLocationError(
          isAr
            ? 'تعذر الوصول للموقع التلقائي. يمكنك لصق رابط من خرائط Google أدناه.'
            : 'GPS unavailable. Paste a Google Maps link below.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  const handleMapsUrlChange = (val: string) => {
    setMapsUrl(val);
    setLocationError(null);
    const parsed = parseGoogleMapsCoords(val);
    if (parsed) {
      setLatitude(parsed.lat);
      setLongitude(parsed.lng);
    } else if (!val.trim()) {
      setLatitude(undefined);
      setLongitude(undefined);
    }
  };

  const clearLocation = () => {
    setLatitude(undefined);
    setLongitude(undefined);
    setMapsUrl('');
    setLocationError(null);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setDbErrorDetail(null);

    if (isMediaUploading) {
      setValidationError(isAr ? 'يرجى الانتظار حتى يكتمل رفع الصورة' : 'Please wait for image upload to complete');
      return;
    }

    if (!fullImageUrl && !thumbnailUrl) {
      setValidationError(isAr ? 'يرجى رفع صورة للمنتج' : 'Please upload a product image');
      return;
    }

    if (!title.trim()) {
      setValidationError(isAr ? 'يرجى كتابة عنوان الإعلان' : 'Please enter a post title');
      return;
    }

    const numericPrice = Number(price);
    if (!price.trim() || Number.isNaN(numericPrice) || numericPrice <= 0) {
      setValidationError(isAr ? 'يرجى إدخال سعر صحيح' : 'Please enter a valid price');
      return;
    }

    if (!sellerPhone.trim() || sellerPhone.trim().length < 8) {
      setValidationError(isAr ? 'يرجى إدخال رقم هاتف صحيح للتواصل' : 'Please enter a valid contact phone number');
      return;
    }

    if (!deliveryMethod) {
      setValidationError(
        isAr
          ? 'يرجى اختيار طريقة التسليم (استلام موقعي أو توصيل)'
          : 'Please select a delivery method (Pickup or Delivery)'
      );
      return;
    }

    setIsPublishing(true);

    try {
      const { data: userRes } = await supabase.auth.getUser();
      const verifiedUser = userRes?.user || null;

      const resolvedSellerName =
        currentUser?.name?.trim() ||
        verifiedUser?.email?.split('@')[0] ||
        (isAr ? 'بائع' : 'Seller');

      let activeStore = ownedStore;
      if (!activeStore && verifiedUser?.id && adType === 'commercial') {
        activeStore = await fetchUserOwnedStore(verifiedUser.id).catch(() => null);
      }

      if (verifiedUser) {
        const activeAccount: UserAccount = {
          id: verifiedUser.id,
          name: resolvedSellerName,
          phoneNumber: sellerPhone.trim(),
          email: currentUser?.email || verifiedUser.email,
          isSeller: true,
          hasCustomStore: Boolean(activeStore || currentUser?.hasCustomStore),
          customStoreId: activeStore?.id || currentUser?.customStoreId,
          createdAt: currentUser?.createdAt || Date.now(),
        };
        saveUserAccount(activeAccount);
        upsertUserProfile(activeAccount).catch(() => {});
        if (onUserCreated) onUserCreated(activeAccount);
      }

      const resolvedFull = fullImageUrl || thumbnailUrl || '';
      const resolvedThumb = thumbnailUrl || fullImageUrl || '';
      const isRep = adType === 'representative';
      const cleanMapsUrl =
        !isRep && mapsUrl.trim()
          ? mapsUrl.trim()
          : !isRep && latitude !== undefined && longitude !== undefined
          ? `https://www.google.com/maps?q=${latitude},${longitude}`
          : undefined;

      const resolvedCity = district === 'أخرى / خارج الموصل' ? 'خارج الموصل' : 'الموصل';
      const resolvedDistrict = district.trim() || 'حي الزهور';

      const newListing: Listing = {
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: title.trim(),
        description: description.trim(),
        price: numericPrice,
        currency: 'د.ع',
        hidePrice: false,
        category,
        condition: 'new',
        sellerType: adType,
        adType,
        storeId: adType === 'commercial' && activeStore ? activeStore.id : undefined,
        storeName: adType === 'commercial' && activeStore ? activeStore.name : undefined,
        sellerId: verifiedUser?.id,
        sellerName: resolvedSellerName,
        sellerPhone: sellerPhone.trim(),
        city: resolvedCity,
        district: resolvedDistrict,
        latitude: isRep ? undefined : latitude,
        longitude: isRep ? undefined : longitude,
        mapsUrl: cleanMapsUrl,
        storeLocation:
          !isRep && latitude !== undefined && longitude !== undefined
            ? {
                lat: latitude,
                lng: longitude,
                addressName: resolvedDistrict,
                city: resolvedCity,
                district: resolvedDistrict,
              }
            : undefined,
        deliveryAvailable: deliveryMethod === 'delivery',
        deliveryMethod: deliveryMethod || 'pickup',
        coverageArea: isRep ? coverageArea.trim() || undefined : undefined,
        deliveryNotes: isRep ? coverageArea.trim() || undefined : undefined,
        mediaUrls: resolvedFull ? [resolvedFull] : [],
        thumbnailUrl: resolvedThumb || undefined,
        fullImageUrl: resolvedFull || undefined,
        contactOptions: {
          directChat: true,
          whatsapp: true,
          phoneCall: true,
          whatsappNumber: sellerPhone.trim(),
          phoneNumber: sellerPhone.trim(),
        },
        createdAt: isAr ? 'الآن' : 'Just now',
        createdTimestamp: Date.now(),
        viewsCount: 1,
        sellerAvatar: currentUser?.avatarUrl || undefined,
        isVerified: Boolean(adType === 'commercial' && activeStore),
      };

      const result = await saveSupabasePost(newListing);
      if (!result.ok || !result.savedListing) {
        setDbErrorDetail({
          code: result.errorCode,
          message:
            result.error ||
            (isAr ? 'تعذر حفظ الإعلان في قاعدة البيانات.' : 'Failed to save post to Supabase.'),
          hint: result.errorHint || result.errorDetails,
        });
        setIsPublishing(false);
        return;
      }

      setIsPublishing(false);
      onPublished(result.savedListing);
    } catch (err: any) {
      setDbErrorDetail({
        code: err?.code || 'EXCEPTION',
        message: err?.message || (isAr ? 'حدث خطأ أثناء نشر الإعلان.' : 'Failed to publish post.'),
      });
      setIsPublishing(false);
    }
  };

  const previewUrl = fullImageUrl || thumbnailUrl;

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 animate-modal-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={onCancel}
          className="group min-h-[40px] px-2 -mx-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#64748B] hover:text-[#1E293B] rounded-xl transition-all active:scale-95"
        >
          {isAr ? (
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          ) : (
            <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          )}
          <span>{isAr ? 'رجوع' : 'Back'}</span>
        </button>

        <h1 className="text-base sm:text-lg font-extrabold text-[#1E293B]">
          {isAr ? 'إضافة إعلان جديد' : 'Add Post'}
        </h1>

        <div className="w-14" />
      </div>

      {/* Form Card */}
      <form
        onSubmit={handlePublish}
        className="bg-white rounded-2xl border border-[#D9AF91] p-5 sm:p-6 space-y-5 shadow-[0_4px_20px_rgba(180,120,60,0.09)]"
      >
        {(validationError || uploadError) && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="break-words">{validationError || uploadError}</span>
          </div>
        )}

        {dbErrorDetail && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{isAr ? 'خطأ في الحفظ:' : 'Database Error:'}</span>
            </div>
            <div className="text-[11px] text-red-700 break-words select-text" dir="ltr">
              {dbErrorDetail.code ? `[${dbErrorDetail.code}] ` : ''}{dbErrorDetail.message}
              {dbErrorDetail.hint ? ` (${dbErrorDetail.hint})` : ''}
            </div>
          </div>
        )}

        {/* 1. Image Upload */}
        <div>
          <label className="block text-xs font-bold text-[#1E293B] mb-2">
            {isAr ? 'صورة المنتج *' : 'Product Image *'}
          </label>

          {previewUrl ? (
            <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-[#EDC9AF]/50 border border-[#D9AF91]">
              <img
                src={previewUrl}
                alt={title || 'صورة المنتج'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="group absolute top-2.5 left-2.5 w-9 h-9 rounded-full bg-[#1E293B]/80 hover:bg-[#1E293B] active:scale-90 text-white flex items-center justify-center transition-all"
                aria-label={isAr ? 'حذف الصورة' : 'Remove image'}
              >
                <X className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isMediaUploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-40 rounded-2xl border-2 border-dashed border-[#C89875] bg-[#EDC9AF]/45 hover:border-[#008080] hover:bg-teal-50/40 transition-colors flex flex-col items-center justify-center gap-2.5 text-[#64748B] disabled:opacity-60"
            >
              {isMediaUploading ? (
                <>
                  <Loader2 className="w-6 h-6 text-[#008080] animate-spin" />
                  <span className="text-xs font-semibold text-[#006666]">
                    {isAr ? 'جاري ضغط ورفع الصورة...' : 'Compressing & uploading...'}
                  </span>
                </>
              ) : (
                <>
                  <Camera className="w-7 h-7 text-[#008080]/75" />
                  <span className="text-xs font-bold text-[#1E293B]">
                    {isAr ? 'اضغط لاختيار صورة' : 'Tap to upload image'}
                  </span>
                </>
              )}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        {/* Ad Type: 3-Way Sliding Segmented Toggle (Personal / Commercial / Representative) */}
        <div>
          <label className="block text-xs font-bold text-[#1E293B] mb-2">
            {isAr ? 'نوع الإعلان *' : 'Ad Type *'}
          </label>
          <div className="relative grid grid-cols-3 p-1 rounded-2xl bg-[#EDC9AF] border border-[#D9AF91]">
            <span
              aria-hidden="true"
              className={`absolute top-1 bottom-1 start-1 w-[calc((100%-0.5rem)/3)] rounded-xl bg-[#008080] shadow-xs transition-transform duration-200 ease-out ${
                adType === 'commercial'
                  ? isAr
                    ? '-translate-x-full'
                    : 'translate-x-full'
                  : adType === 'representative'
                  ? isAr
                    ? '-translate-x-[200%]'
                    : 'translate-x-[200%]'
                  : 'translate-x-0'
              }`}
            />
            <button
              type="button"
              onClick={() => setAdType('personal')}
              className={`group relative z-10 min-h-[42px] px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors duration-200 active:scale-95 ${
                adType === 'personal'
                  ? 'text-white'
                  : 'text-[#1E293B] hover:text-[#006666]'
              }`}
            >
              <User className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span>{isAr ? 'شخصي' : 'Personal'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAdType('commercial')}
              className={`group relative z-10 min-h-[42px] px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors duration-200 active:scale-95 ${
                adType === 'commercial'
                  ? 'text-white'
                  : 'text-[#1E293B] hover:text-[#006666]'
              }`}
            >
              <Store className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
              <span>{isAr ? 'تجاري' : 'Commercial'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAdType('representative')}
              className={`group relative z-10 min-h-[42px] px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors duration-200 active:scale-95 ${
                adType === 'representative'
                  ? 'text-white'
                  : 'text-[#1E293B] hover:text-[#006666]'
              }`}
            >
              <Handshake className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span>{isAr ? 'مندوب' : 'Representative'}</span>
            </button>
          </div>
          {adType === 'commercial' && ownedStore && (
            <p className="mt-2 text-xs text-[#006666] font-semibold animate-fade-in">
              {isAr
                ? `سيُربط الإعلان تلقائياً بمتجرك: ${ownedStore.name}`
                : `Linked automatically to your store: ${ownedStore.name}`}
            </p>
          )}
          {adType === 'representative' && (
            <p className="mt-2 text-xs text-[#006666] font-semibold animate-fade-in flex items-center gap-1.5">
              <Handshake className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isAr
                  ? 'وضع المندوب: تنسيق وربط مباشر بين البائع والمشتري بدون عنوان محل ثابت.'
                  : 'Representative mode: direct coordination without a fixed shop address.'}
              </span>
            </p>
          )}
        </div>

        {/* 2. Post Title */}
        <div>
          <label className="block text-xs font-bold text-[#1E293B] mb-2">
            {isAr ? 'عنوان الإعلان *' : 'Title *'}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isAr ? 'مثال: آيفون 15 برو بحالة ممتازة' : 'e.g. iPhone 15 Pro'}
            className="w-full h-11 px-3.5 rounded-xl bg-[#EDC9AF]/35 border border-[#D9AF91] text-sm text-[#1E293B] placeholder:text-[#64748B]/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008080] transition-all"
          />
        </div>

        {/* 3. Category & 4. Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              {isAr ? 'التصنيف *' : 'Category *'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryId)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#EDC9AF]/35 border border-[#D9AF91] text-sm text-[#1E293B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008080] transition-all"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {isAr ? cat.nameAr : cat.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              {isAr ? 'السعر (د.ع) *' : 'Price (IQD) *'}
            </label>
            <input
              type="number"
              min="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              className="w-full h-11 px-3.5 rounded-xl bg-[#EDC9AF]/35 border border-[#D9AF91] text-sm tabular-nums text-[#1E293B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008080] transition-all"
            />
          </div>
        </div>

        {/* 5. Contact Phone Number & Mosul Neighborhood */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              {isAr ? 'رقم الهاتف للتواصل *' : 'Contact Phone Number *'}
            </label>
            <input
              type="tel"
              value={sellerPhone}
              onChange={(e) => setSellerPhone(e.target.value)}
              placeholder="0770XXXXXXX"
              dir="ltr"
              className="w-full h-11 px-3.5 rounded-xl bg-[#EDC9AF]/35 border border-[#D9AF91] text-sm tabular-nums text-[#1E293B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008080] transition-all text-left"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              {isAr ? 'الحي / المنطقة (الموصل) *' : 'Mosul Neighborhood *'}
            </label>
            <NeighborhoodSelector
              value={district}
              onChange={setDistrict}
              mode="form"
              lang={lang}
            />
          </div>
        </div>

        {/* Required Handover / Delivery Option for ALL Ad Types */}
        <div>
          <label className="block text-xs font-bold text-[#1E293B] mb-2">
            {isAr ? 'طريقة التسليم *' : 'Delivery / Handover Method *'}
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setDeliveryMethod('pickup');
                setValidationError(null);
              }}
              className={`group min-h-[46px] px-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                deliveryMethod === 'pickup'
                  ? 'bg-[#008080] text-white border-[#008080] shadow-[0_4px_12px_rgba(0,128,128,0.22)]'
                  : 'bg-[#EDC9AF]/45 hover:bg-[#EDC9AF]/80 text-[#1E293B] border-[#D9AF91]'
              }`}
            >
              <MapPin
                className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                  deliveryMethod === 'pickup' ? 'text-white' : 'text-[#008080]'
                }`}
              />
              <span>{isAr ? 'استلام موقعي' : 'On-site Pickup'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDeliveryMethod('delivery');
                setValidationError(null);
              }}
              className={`group min-h-[46px] px-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                deliveryMethod === 'delivery'
                  ? 'bg-[#008080] text-white border-[#008080] shadow-[0_4px_12px_rgba(0,128,128,0.22)]'
                  : 'bg-[#EDC9AF]/45 hover:bg-[#EDC9AF]/80 text-[#1E293B] border-[#D9AF91]'
              }`}
            >
              <Truck
                className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                  deliveryMethod === 'delivery' ? 'text-white' : 'text-[#008080]'
                }`}
              />
              <span>{isAr ? 'توصيل' : 'Delivery'}</span>
            </button>
          </div>
        </div>

        {/* Location Section: Coverage Note for Representative OR Google Maps Picker for Personal/Commercial */}
        {adType === 'representative' ? (
          <div className="p-3.5 rounded-2xl bg-[#EDC9AF]/45 border border-[#D9AF91] space-y-2.5 animate-fade-in">
            <div className="flex items-start gap-2 text-xs text-[#1E293B]">
              <Handshake className="w-4 h-4 text-[#008080] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {isAr ? 'نطاق التوصيل والتنسيق بين البائع والمشتري' : 'Delivery & Coordination Coverage'}
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {isAr
                    ? 'لا يتطلب إعلان المندوب عنوان محل ثابت على الخريطة.'
                    : 'Representative ads do not require a fixed shop address on the map.'}
                </p>
              </div>
            </div>
            <input
              type="text"
              value={coverageArea}
              onChange={(e) => setCoverageArea(e.target.value)}
              placeholder={
                isAr
                  ? 'نطاق التغطية (اختياري) مثال: الساحل الأيمن والأيسر'
                  : 'Optional coverage area (e.g. Left & Right Coast)'
              }
              className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#D9AF91] text-xs text-[#1E293B] placeholder:text-[#64748B]/70 focus:outline-none focus:ring-2 focus:ring-[#008080] transition-all"
            />
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-bold text-[#1E293B]">
                {isAr ? 'الموقع على خرائط Google (اختياري)' : 'Google Maps Location (Optional)'}
              </label>
              {!mapsUrl && (
                <button
                  type="button"
                  onClick={() => setShowPasteLink((v) => !v)}
                  className="group inline-flex items-center gap-1 text-xs font-semibold text-[#006666] hover:underline active:scale-95 transition-transform"
                >
                  <Link2 className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-12" />
                  <span>
                    {showPasteLink
                      ? (isAr ? 'إخفاء الرابط' : 'Hide link')
                      : (isAr ? 'أو لصق رابط خرائط' : 'Or paste link')}
                  </span>
                </button>
              )}
            </div>

            {mapsUrl ? (
              <div className="p-3 rounded-xl bg-teal-50/90 border border-teal-200 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin className="w-4 h-4 text-[#008080] shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-[#006666] block truncate tabular-nums">
                      {latitude !== undefined && longitude !== undefined
                        ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                        : isAr
                        ? 'تم ربط رابط خرائط Google'
                        : 'Google Maps link attached'}
                    </span>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-[#008080] hover:underline inline-flex items-center gap-1"
                    >
                      <span>{isAr ? 'معاينة على الخريطة' : 'Preview pin'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearLocation}
                  className="group min-w-[36px] min-h-[36px] text-[#64748B] hover:text-red-600 rounded-lg flex items-center justify-center transition-colors"
                  aria-label={isAr ? 'إزالة الموقع' : 'Clear location'}
                >
                  <X className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isLocating}
                onClick={handleDetectGps}
                className="group w-full min-h-[44px] px-3.5 rounded-xl bg-[#EDC9AF]/75 hover:bg-[#EDC9AF] active:scale-[0.98] border border-[#D9AF91] text-xs font-bold text-[#1E293B] flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              >
                {isLocating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#008080]" />
                ) : (
                  <Crosshair className="w-4 h-4 text-[#008080] transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110" />
                )}
                <span>
                  {isLocating
                    ? (isAr ? 'جاري تحديد الموقع...' : 'Detecting location...')
                    : (isAr ? 'تحديد الموقع على خرائط Google' : 'Select Location on Google Maps')}
                </span>
              </button>
            )}

            {showPasteLink && !mapsUrl && (
              <input
                type="url"
                value={mapsUrl}
                onChange={(e) => handleMapsUrlChange(e.target.value)}
                placeholder="https://www.google.com/maps?q=36.3489,43.1577"
                dir="ltr"
                className="w-full h-10 px-3.5 rounded-xl bg-[#EDC9AF]/35 border border-[#D9AF91] text-xs text-[#1E293B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008080] text-left"
              />
            )}

            {locationError && (
              <p className="text-xs text-[#6B3F21]">{locationError}</p>
            )}
          </div>
        )}

        {/* 6. Optional Short Description (2-row textarea) */}
        <div>
          <label className="block text-xs font-bold text-[#1E293B] mb-2">
            {isAr ? 'وصف مختصر (اختياري)' : 'Short description (optional)'}
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isAr ? 'تفاصيل إضافية عن الحالة أو الموقع...' : 'Optional details...'}
            className="w-full p-3.5 rounded-xl bg-[#EDC9AF]/35 border border-[#D9AF91] text-sm text-[#1E293B] placeholder:text-[#64748B]/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008080] transition-all resize-none"
          />
        </div>

        {/* Single Clear Full-Width Publish Button */}
        <button
          type="submit"
          disabled={isPublishing || isMediaUploading}
          className="group w-full min-h-[48px] rounded-xl bg-[#008080] hover:bg-[#006666] disabled:opacity-60 active:scale-[0.98] text-white font-bold text-sm shadow-[0_6px_16px_rgba(0,128,128,0.22)] transition-all flex items-center justify-center gap-2"
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isAr ? 'جاري النشر...' : 'Publishing...'}</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 rtl:rotate-180 transition-transform duration-200 group-hover:scale-110 rtl:group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5" />
              <span>{isAr ? 'نشر الإعلان' : 'Publish Post'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
