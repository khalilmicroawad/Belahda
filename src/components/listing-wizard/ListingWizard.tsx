import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ChevronRight,
  ChevronLeft,
  Store,
  User,
  CheckCircle2,
  DollarSign,
  MessageSquare,
  MessageCircle,
  Phone,
  EyeOff,
  Eye,
  Sparkles,
  Truck,
  MapPin,
  AlertCircle
} from 'lucide-react';
import {
  Listing,
  SellerType,
  ItemCondition,
  CategoryId,
  StoreLocation,
  ContactPreferences,
  UserAccount
} from '../../types';
import { CATEGORIES, CURRENCIES, MOSUL_DISTRICTS } from '../../data/categories';
import { MediaSelectorStep } from './MediaSelectorStep';
import { InteractiveMapSelector } from './InteractiveMapSelector';
import { addListingToTop, saveUserAccount, getStoredUser } from '../../data/mockListings';

interface ListingWizardProps {
  onCancel: () => void;
  onPublished: (newListing: Listing) => void;
  currentUser: UserAccount | null;
  onUserCreated?: (user: UserAccount) => void;
  lang?: 'ar' | 'en';
}

export const ListingWizard: React.FC<ListingWizardProps> = ({
  onCancel,
  onPublished,
  currentUser,
  onUserCreated,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';

  // Step 1 to 6
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [mediaUrls, setMediaUrls] = useState<string[]>([
    '/src/assets/images/listing_iphone_pro_1794306234850.jpg'
  ]);
  const [sellerType, setSellerType] = useState<SellerType>('personal');
  const [sellerName, setSellerName] = useState<string>(currentUser?.name || 'عمر الموصلي');
  const [sellerPhone, setSellerPhone] = useState<string>(currentUser?.phoneNumber || '07701234567');
  const [storeName, setStoreName] = useState<string>('محل الفرات للإلكترونيات');
  
  // Location focused on Mosul
  const [district, setDistrict] = useState<string>('حي الزهور');
  const [storeLocation, setStoreLocation] = useState<StoreLocation>({
    lat: 36.3575,
    lng: 43.1558,
    addressName: 'شارع الزهور التجاري، الموصل',
    city: 'الموصل',
    district: 'حي الزهور'
  });

  // Delivery availability
  const [deliveryAvailable, setDeliveryAvailable] = useState<boolean>(true);
  const [deliveryNotes, setDeliveryNotes] = useState<string>('توصيل متوفر لكافة أحياء الموصل');

  const [category, setCategory] = useState<CategoryId>('electronics');
  const [condition, setCondition] = useState<ItemCondition>('new');
  const [title, setTitle] = useState<string>('آيفون 16 برو 256GB جديد بالكرتون ضمان عراقي');
  const [description, setDescription] = useState<string>(
    'جهاز جديد تماماً بتغليف المصنع، لم يستعمل، سيم كارت شغال، ضمان سنة كاملة. متاح التوصيل لجميع مناطق الموصل أو الاستلام المباشر.'
  );

  const [price, setPrice] = useState<number>(1350000);
  const [currency, setCurrency] = useState<string>('د.ع');
  const [hidePrice, setHidePrice] = useState<boolean>(false);

  const [contactOptions, setContactOptions] = useState<ContactPreferences>({
    directChat: true,
    whatsapp: true,
    phoneCall: true,
    whatsappNumber: currentUser?.phoneNumber || '07701234567',
    phoneNumber: currentUser?.phoneNumber || '07701234567'
  });

  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isMediaUploading, setIsMediaUploading] = useState<boolean>(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>(undefined);
  const [fullImageUrl, setFullImageUrl] = useState<string | undefined>(undefined);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleNext = () => {
    setValidationError(null);

    if (currentStep === 1) {
      if (mediaUrls.length === 0) {
        setValidationError(isAr ? 'يرجى إرفاق صورة واحدة على الأقل' : 'Please attach at least one photo');
        return;
      }
    } else if (currentStep === 2) {
      if (!sellerName.trim()) {
        setValidationError(isAr ? 'يرجى إدخال اسم البائع' : 'Please enter seller name');
        return;
      }
      if (!sellerPhone.trim() || sellerPhone.length < 10) {
        setValidationError(isAr ? 'يرجى إدخال رقم هاتف عراقي صحيح للتواصل وإنشاء الحساب' : 'Please enter a valid Iraqi phone');
        return;
      }
      if (sellerType === 'commercial' && !storeName.trim()) {
        setValidationError(isAr ? 'يرجى إدخال اسم المتجر أو المحل' : 'Please enter store name');
        return;
      }
    } else if (currentStep === 3) {
      if (!title.trim()) {
        setValidationError(isAr ? 'يرجى كتابة عنوان واضح للإعلان' : 'Please enter item title');
        return;
      }
    } else if (currentStep === 4) {
      if (!hidePrice && (price <= 0 || isNaN(price))) {
        setValidationError(isAr ? 'يرجى تحديد سعر السلعة أو تفعيل إخفاء السعر' : 'Please enter a valid price');
        return;
      }
    } else if (currentStep === 5) {
      if (!contactOptions.directChat && !contactOptions.whatsapp && !contactOptions.phoneCall) {
        setValidationError(isAr ? 'يرجى تفعيل وسيلة تواصل واحدة على الأقل' : 'Please enable at least one contact channel');
        return;
      }
    }

    setCurrentStep((prev) => Math.min(6, prev + 1));
  };

  const handleBack = () => {
    setValidationError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onCancel();
    }
  };

  // Instant Publishing
  const handlePublish = () => {
    setIsPublishing(true);

    // Save or update user account automatically on first listing:
    // "عندما يضيف البائع اول منتج يكون اسمه ورقم هاتفه هو حساب له داخل البرنامج يمكنه تعديله لاحقة من لوحة التحكم"
    const activeAccount: UserAccount = {
      id: currentUser?.id || `user-${Date.now()}`,
      name: sellerName.trim(),
      phoneNumber: sellerPhone.trim(),
      email: currentUser?.email,
      password: currentUser?.password,
      isSeller: true,
      createdAt: currentUser?.createdAt || Date.now()
    };
    saveUserAccount(activeAccount);
    if (onUserCreated) onUserCreated(activeAccount);

    const newListing: Listing = {
      id: `item-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      price: hidePrice ? 0 : Number(price),
      currency,
      hidePrice,
      category,
      condition,
      sellerType,
      sellerName: sellerType === 'commercial' ? storeName.trim() : sellerName.trim(),
      sellerPhone: sellerPhone.trim(),
      city: 'الموصل',
      district,
      deliveryAvailable,
      deliveryNotes: deliveryAvailable ? deliveryNotes.trim() : undefined,
      storeName: sellerType === 'commercial' ? storeName.trim() : undefined,
      storeLocation: storeLocation,
      mediaUrls,
      thumbnailUrl: thumbnailUrl || mediaUrls[0],
      fullImageUrl: fullImageUrl || mediaUrls[0],
      contactOptions: {
        ...contactOptions,
        whatsappNumber: sellerPhone.trim(),
        phoneNumber: sellerPhone.trim()
      },
      createdAt: isAr ? 'الآن · الموصل' : 'Just now · Mosul',
      createdTimestamp: Date.now(),
      viewsCount: 1,
      sellerAvatar:
        sellerType === 'commercial'
          ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      isVerified: sellerType === 'commercial'
    };

    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch {}

    addListingToTop(newListing);

    setTimeout(() => {
      setIsPublishing(false);
      onPublished(newListing);
    }, 400);
  };

  const stepsMeta = [
    { num: 1, labelAr: 'الصور' },
    { num: 2, labelAr: 'البائع' },
    { num: 3, labelAr: 'التفاصيل' },
    { num: 4, labelAr: 'السعر' },
    { num: 5, labelAr: 'التواصل' },
    { num: 6, labelAr: 'النشر' }
  ];

  return (
    <div className="flex flex-col h-full bg-white select-none text-xs">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3.5 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={handleBack}
            className="p-1 -mx-1 text-slate-700 hover:bg-slate-100 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
          >
            {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <div className="text-center">
            <span className="text-xs font-bold text-slate-900 block leading-tight">
              {isAr ? 'سوق بلحظة · إضافة إعلان جديد' : 'Souq Belahdha · Post Item'}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold">
              {isAr ? `الخطوة ${currentStep} من 6` : `Step ${currentStep} of 6`}
            </span>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 px-1 py-1"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
        </div>

        {/* Segmented Progress Tracker */}
        <div className="grid grid-cols-6 gap-1">
          {stepsMeta.map((s) => (
            <div key={s.num} className="space-y-0.5">
              <div
                className={`h-1 rounded-full transition-all duration-300 ${
                  s.num < currentStep
                    ? 'bg-emerald-600'
                    : s.num === currentStep
                    ? 'bg-emerald-500 ring-2 ring-emerald-200'
                    : 'bg-slate-100'
                }`}
              />
              <span
                className={`text-[9px] block text-center truncate ${
                  s.num === currentStep ? 'font-bold text-emerald-800' : 'text-slate-400'
                }`}
              >
                {s.labelAr}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Wizard Form Body with Compact Spacing */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 pb-20">
        {validationError && (
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-1.5 animate-shake">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* STEP 1: MEDIA SELECTION */}
        {currentStep === 1 && (
          <MediaSelectorStep
            mediaUrls={mediaUrls}
            onChange={(urls) => {
              setMediaUrls(urls);
              if (urls.length === 0) {
                setThumbnailUrl(undefined);
                setFullImageUrl(undefined);
              }
              setValidationError(null);
            }}
            onUploadingChange={(uploading) => setIsMediaUploading(uploading)}
            onDualMediaUploaded={(thumb, full) => {
              setThumbnailUrl((prev) => prev || thumb);
              setFullImageUrl((prev) => prev || full);
            }}
            lang={lang}
          />
        )}

        {/* STEP 2: SELLER DETAILS & AUTOMATIC ACCOUNT SETUP */}
        {currentStep === 2 && (
          <div className="space-y-3.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {isAr ? 'الخطوة 2: بيانات البائع وتأسيس الحساب' : 'Step 2: Seller & Account Setup'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                {isAr
                  ? 'اسمك ورقم هاتفك سيشكلان حسابك المعتمد داخل سوق بلحظة، ويمكنك لاحقاً إضافة بريد ورمز سري من لوحة التحكم'
                  : 'Your name and phone number create your account in Souq Belahdha'}
              </p>
            </div>

            {/* Seller Name & Iraqi Phone */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  {isAr ? 'اسمك الكامل (صاحب الإعلان) *' : 'Your Name *'}
                </label>
                <input
                  type="text"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  placeholder={isAr ? 'مثال: عمر الموصلي' : 'e.g. Omar'}
                  className="w-full h-9 px-3 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  {isAr ? 'رقم الهاتف العراقي (رقم حسابك والتواصل) *' : 'Iraqi Phone Number *'}
                </label>
                <input
                  type="tel"
                  value={sellerPhone}
                  onChange={(e) => setSellerPhone(e.target.value)}
                  placeholder="0770XXXXXXX"
                  className="w-full h-9 px-3 rounded-xl bg-white border border-slate-300 text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left"
                />
              </div>
            </div>

            {/* Seller Type Selector Cards */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                {isAr ? 'نوع الحساب في الموصل:' : 'Seller Type:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSellerType('personal')}
                  className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                    sellerType === 'personal'
                      ? 'border-emerald-600 bg-emerald-50/60 shadow-2xs font-bold'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <User className="w-4 h-4 text-emerald-600" />
                    {sellerType === 'personal' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <span className="text-xs">{isAr ? 'شخصي (أفراد)' : 'Personal'}</span>
                  <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                    {isAr ? 'بيع أغراض ومستلزمات خاصة' : 'Personal items'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSellerType('commercial')}
                  className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                    sellerType === 'commercial'
                      ? 'border-emerald-600 bg-emerald-50/60 shadow-2xs font-bold'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Store className="w-4 h-4 text-emerald-600" />
                    {sellerType === 'commercial' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <span className="text-xs">{isAr ? 'تجاري / متجر ومحل' : 'Shop / Store'}</span>
                  <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                    {isAr ? 'لأصحاب المحلات بالموصل' : 'Registered store'}
                  </span>
                </button>
              </div>
            </div>

            {/* City & District in Mosul */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                {isAr ? 'المنطقة أو الحي في الموصل *' : 'District in Mosul *'}
              </label>
              <select
                value={district}
                onChange={(e) => {
                  const newDist = e.target.value;
                  setDistrict(newDist);
                  setStoreLocation((prev) => ({
                    ...prev,
                    district: newDist,
                    addressName: `الموصل - ${newDist}`
                  }));
                }}
                className="w-full h-9 px-3 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {MOSUL_DISTRICTS.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>

            {/* Commercial Store Name if Commercial */}
            {sellerType === 'commercial' && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 animate-fadeIn">
                <label className="text-[11px] font-bold text-slate-700 block">
                  {isAr ? 'اسم المحل أو المعرض *' : 'Shop Name *'}
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder={isAr ? 'مثال: محل الفرات للهواتف' : 'Shop name'}
                  className="w-full h-9 px-3 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Google Maps Location Selector with [الموقع الحالي] Button for BOTH Personal and Commercial */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <InteractiveMapSelector
                location={storeLocation}
                onChange={(loc) => {
                  setStoreLocation(loc);
                  if (loc.district) {
                    setDistrict(loc.district);
                  }
                }}
                sellerType={sellerType}
                lang={lang}
              />
            </div>
          </div>
        )}

        {/* STEP 3: ITEM DETAILS & DELIVERY OPTION */}
        {currentStep === 3 && (
          <div className="space-y-3.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {isAr ? 'الخطوة 3: مواصفات السلعة وخيار التوصيل' : 'Step 3: Item Specs & Delivery Option'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isAr ? 'حدد الصنف، حالة السلعة، وإمكانية التوصيل داخل الموصل' : 'Choose category, condition and delivery'}
              </p>
            </div>

            {/* Category Grid */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                {isAr ? 'الصنف الرئيسي:' : 'Category:'}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[11px] block truncate">{cat.nameAr}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Condition Segmented Control */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                {isAr ? 'حالة السلعة:' : 'Condition:'}
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                {[
                  { id: 'new', label: 'جديد' },
                  { id: 'good', label: 'بحالة جيدة' },
                  { id: 'acceptable', label: 'مقبول' }
                ].map((cond) => (
                  <button
                    key={cond.id}
                    type="button"
                    onClick={() => setCondition(cond.id as ItemCondition)}
                    className={`py-1.5 rounded-lg text-center text-xs font-semibold transition-all ${
                      condition === cond.id
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600'
                    }`}
                  >
                    {cond.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CRITICAL NEW FEATURE: DELIVERY OPTION */}
            {/* "أيضا أضف عندما يريد البائع ان يضيف إعلان منتج يمكنه اختيار اذا كان متوفر توصيل او غير متوفر" */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAr ? 'خدمة التوصيل داخل الموصل:' : 'Delivery in Mosul:'}</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryAvailable(true)}
                  className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between ${
                    deliveryAvailable
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <span className="text-xs">🛵 {isAr ? 'متوفر توصيل' : 'Delivery Available'}</span>
                  {deliveryAvailable && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryAvailable(false)}
                  className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between ${
                    !deliveryAvailable
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <span className="text-xs">📍 {isAr ? 'غير متوفر (استلام)' : 'Pickup Only'}</span>
                  {!deliveryAvailable && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              </div>

              {deliveryAvailable && (
                <div className="pt-1.5">
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder={isAr ? 'ملاحظة التوصيل (مثال: مجاني للجانب الأيسر / 3000 دينار)' : 'Delivery notes'}
                    className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-300 text-[11px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {isAr ? 'عنوان الإعلان *' : 'Title *'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isAr ? 'مثال: آيفون 16 برو كارتون كامل بالموصل' : 'e.g. iPhone 16 Pro'}
                className="w-full h-9 px-3 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {isAr ? 'تفاصيل السلعة:' : 'Description:'}
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isAr ? 'اكتب المواصفات، النظافة، فترة الاستخدام...' : 'Enter details...'}
                className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* STEP 4: PRICING & VISIBILITY LOGIC */}
        {currentStep === 4 && (
          <div className="space-y-3.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {isAr ? 'الخطوة 4: السعر ومنطق الظهور' : 'Step 4: Pricing & Visibility'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isAr ? 'أدخل السعر بالدينار العراقي أو بالدولار، أو اختر إخفاء السعر' : 'Enter price or toggle hide price'}
              </p>
            </div>

            {/* Hide Price Toggle */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    hidePrice ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {hidePrice ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    {isAr ? 'إخفاء السعر (السعر عند التواصل)' : 'Hide Price'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {isAr ? 'يظهر للشارين "السعر عند التواصل"' : 'Shows "Contact for Price"'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHidePrice(!hidePrice)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  hidePrice ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
                    hidePrice ? (isAr ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Price Input + Currency */}
            <div className={`space-y-2 ${hidePrice ? 'opacity-40 pointer-events-none' : ''}`}>
              <label className="text-[11px] font-bold text-slate-700 block">
                {isAr ? 'السعر المطلوب:' : 'Asking Price:'}
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    disabled={hidePrice}
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="0"
                    className="w-full h-10 px-3 rounded-xl bg-white border border-slate-300 text-base font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
                  />
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    {currency}
                  </span>
                </div>

                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-10 px-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="د.ع">د.ع (دينار عراقي)</option>
                  <option value="$">$ (دولار)</option>
                </select>
              </div>

              {/* Quick amount buttons for Iraq */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {(currency === 'د.ع' ? [25000, 50000, 100000, 250000, 500000, 1000000] : [50, 100, 250, 500, 1000]).map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPrice(amt)}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono tabular-nums whitespace-nowrap"
                  >
                    {amt.toLocaleString()} {currency}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
              <span className="text-[10px] text-slate-500 block mb-0.5">
                {isAr ? 'معاينة ظهور السعر للمشترين:' : 'Public price preview:'}
              </span>
              <span className="text-sm font-black text-emerald-900 font-mono">
                {hidePrice ? (isAr ? 'السعر عند التواصل 💬' : 'Contact for Price 💬') : `${price.toLocaleString()} ${currency}`}
              </span>
            </div>
          </div>
        )}

        {/* STEP 5: COMMUNICATION PREFERENCES */}
        {currentStep === 5 && (
          <div className="space-y-3.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {isAr ? 'الخطوة 5: قنوات التواصل المفضلة' : 'Step 5: Communication Channels'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isAr ? 'حدد كيف يتواصل معك أهل الموصل (رسائل البرنامج أو واتساب مباشر)' : 'Choose contact methods'}
              </p>
            </div>

            {/* Direct Chat */}
            <div
              onClick={() =>
                setContactOptions({ ...contactOptions, directChat: !contactOptions.directChat })
              }
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                contactOptions.directChat ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    {isAr ? 'دردشة مباشرة داخل التطبيق' : 'In-App Direct Chat'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {isAr ? 'محادثات فورية آمنة دون كشف رقمك مباشرة' : 'Built-in direct messaging'}
                  </p>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  contactOptions.directChat ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                }`}
              >
                {contactOptions.directChat && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* WhatsApp */}
            <div
              className={`p-3 rounded-2xl border transition-all space-y-2 ${
                contactOptions.whatsapp ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 bg-white'
              }`}
            >
              <div
                onClick={() =>
                  setContactOptions({ ...contactOptions, whatsapp: !contactOptions.whatsapp })
                }
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      {isAr ? 'تواصل عبر واتساب (WhatsApp)' : 'WhatsApp Deep Link'}
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      {isAr ? 'زر يفتح محادثة واتساب مع رسالة جاهزة' : 'Direct link to chat on WhatsApp'}
                    </p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    contactOptions.whatsapp ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                  }`}
                >
                  {contactOptions.whatsapp && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>

              {contactOptions.whatsapp && (
                <div className="pt-1.5 border-t border-emerald-200/50">
                  <span className="text-[10px] text-slate-600 font-mono block">
                    {isAr ? `سيتم الربط برقمك: ${sellerPhone}` : `Linked to: ${sellerPhone}`}
                  </span>
                </div>
              )}
            </div>

            {/* Direct Phone Call */}
            <div
              onClick={() =>
                setContactOptions({ ...contactOptions, phoneCall: !contactOptions.phoneCall })
              }
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                contactOptions.phoneCall ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    {isAr ? 'اتصال هاتفي مباشر' : 'Cellular Phone Call'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {isAr ? 'إمكانية الاتصال المباشر على رقمك العراقي' : 'Allow direct voice calls'}
                  </p>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  contactOptions.phoneCall ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                }`}
              >
                {contactOptions.phoneCall && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW & INSTANT PUBLISHING */}
        {currentStep === 6 && (
          <div className="space-y-3.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {isAr ? 'الخطوة 6: مراجعة الإعلان والنشر الفوري' : 'Step 6: Review & Instant Publish'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isAr ? 'سيظهر إعلانك في أعلى قائمة الشراء في الموصل فوراً' : 'Item will be published instantly'}
              </p>
            </div>

            {/* Summary Card */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
              <div className="relative aspect-16/9 bg-slate-900">
                <img
                  src={mediaUrls[0]}
                  alt={title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  {sellerType === 'commercial' ? (isAr ? 'متجر معتمد' : 'Store') : (isAr ? 'شخصي' : 'Personal')}
                </div>
                {deliveryAvailable && (
                  <div className="absolute bottom-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                    <Truck className="w-3 h-3" />
                    <span>{isAr ? 'متوفر توصيل' : 'Delivery'}</span>
                  </div>
                )}
              </div>

              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-900 leading-snug">
                    {title}
                  </h3>
                  <span className="text-xs font-black text-emerald-800 font-mono tabular-nums shrink-0">
                    {hidePrice ? (isAr ? 'عند التواصل' : 'Contact') : `${price.toLocaleString()} ${currency}`}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    {district} · الموصل
                  </span>
                  <span>·</span>
                  <span>{sellerName}</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {isAr
                  ? 'سيتم ربط هذا الإعلان بحسابك تلقائياً ويمكنك تعديل بياناتك أو إضافة رمز سري من لوحة التحكم.'
                  : 'Account linked automatically with control panel access.'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="sticky bottom-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200">
        {currentStep < 6 ? (
          <button
            type="button"
            disabled={isMediaUploading}
            onClick={handleNext}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 active:scale-98 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <span>
              {isMediaUploading
                ? (isAr ? 'جاري رفع الصورة...' : 'Uploading image...')
                : (isAr ? 'المتابعة للخطوة التالية' : 'Next Step')}
            </span>
            {!isMediaUploading && (isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
          </button>
        ) : (
          <button
            type="button"
            disabled={isPublishing || isMediaUploading}
            onClick={handlePublish}
            className="w-full h-11.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 active:scale-98 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
          >
            {isPublishing || isMediaUploading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isMediaUploading
                  ? (isAr ? 'جاري رفع الصورة...' : 'Uploading image...')
                  : (isAr ? 'جاري النشر الفوري...' : 'Publishing...')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {isAr ? 'إضافة ونشر الإعلان الآن [سوق بلحظة]' : 'Publish Listing Now'}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
