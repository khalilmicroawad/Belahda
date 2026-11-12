import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Store,
  MapPin,
  Truck,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Phone,
  MessageCircle,
  Building,
  Upload,
  Loader2
} from 'lucide-react';
import { StoreProfile, UserAccount, CategoryId, StoreLocation, StoreSocialLinks, Listing } from '../../types';
import { MOSUL_DISTRICTS, CATEGORIES } from '../../data/categories';
import { addOrUpdateStore } from '../../data/mockStores';
import { InteractiveMapSelector } from '../listing-wizard/InteractiveMapSelector';
import { REQUIRED_POSTS_FOR_STORE, calculateStoreUnlockProgress } from '../../utils/antiSpam';
import { uploadFileToStorage } from '../../lib/supabase';

interface CreateStoreModalProps {
  currentUser: UserAccount | null;
  listingsCount: number;
  userListings?: Listing[];
  onStoreCreated: (store: StoreProfile) => void;
  onClose: () => void;
  onFastSeedListings?: () => void;
  lang?: 'ar' | 'en';
}

const LOGO_PRESETS = [
  { name: 'متجر عام', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80' },
  { name: 'إلكترونيات', url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=150&q=80' },
  { name: 'حرف وتراث', url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=150&q=80' },
  { name: 'أزياء وملابس', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=150&q=80' }
];

const COVER_PRESETS = [
  { name: 'معرض حديث', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80' },
  { name: 'سوق إلكترونيات', url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80' },
  { name: 'تراث موصلي', url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80' }
];

export const CreateStoreModal: React.FC<CreateStoreModalProps> = ({
  currentUser,
  listingsCount,
  userListings,
  onStoreCreated,
  onClose,
  onFastSeedListings,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';

  const unlockStats = React.useMemo(() => {
    if (userListings && userListings.length > 0) {
      return calculateStoreUnlockProgress(userListings);
    }
    const valid = listingsCount;
    const isUnlocked = valid >= REQUIRED_POSTS_FOR_STORE;
    return {
      validCount: valid,
      isUnlocked,
      remainingCount: Math.max(0, REQUIRED_POSTS_FOR_STORE - valid),
      percentage: Math.min(100, Math.round((valid / REQUIRED_POSTS_FOR_STORE) * 100)),
      spamCount: 0
    };
  }, [userListings, listingsCount]);

  const isEligible = unlockStats.isUnlocked;

  const [name, setName] = useState('متجر الموصل الحديث');
  const [district, setDistrict] = useState('حي الزهور');
  const [address, setAddress] = useState('شارع الزهور التجاري قرب مصرف الرشيد');
  const [category, setCategory] = useState<CategoryId>('electronics');
  const [description, setDescription] = useState(
    'متجرنا يقدم أفضل السلع والمنتجات بضمان رسمي وتوصيل فوري داخل مدينة الموصل.'
  );
  const [whatsappNumber, setWhatsappNumber] = useState(currentUser?.phoneNumber || '07701234567');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '07701234567');
  const [instagram, setInstagram] = useState('@mosul_store');
  const [facebook, setFacebook] = useState('facebook.com/mosul.store');
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [deliveryNotes, setDeliveryNotes] = useState('توصيل متوفر لكافة أحياء الموصل');
  
  // Store Branding: Logo & Cover Banner
  const [logoUrl, setLogoUrl] = useState(LOGO_PRESETS[0].url);
  const [coverUrl, setCoverUrl] = useState(COVER_PRESETS[0].url);
  const [uploadingBranding, setUploadingBranding] = useState<'logo' | 'cover' | null>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

  const handleBrandingUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'logo' | 'cover'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBranding(kind);
    try {
      const publicUrl = await uploadFileToStorage(
        file,
        kind === 'logo' ? 'store-logos' : 'store-covers'
      );
      if (kind === 'logo') setLogoUrl(publicUrl);
      else setCoverUrl(publicUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
          if (kind === 'logo') setLogoUrl(ev.target.result);
          else setCoverUrl(ev.target.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingBranding(null);
      e.target.value = '';
    }
  };

  const [storeLocation, setStoreLocation] = useState<StoreLocation>({
    lat: 36.3575,
    lng: 43.1558,
    addressName: 'شارع الزهور التجاري قرب مصرف الرشيد',
    city: 'الموصل',
    district: 'حي الزهور'
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEligible) {
      setError(
        isAr
          ? `عذراً، يجب نشر ${REQUIRED_POSTS_FOR_STORE} إعلاناً حقيقياً وغير مكرر أولاً لفتح متجرك الخاص (أضفت حالياً ${unlockStats.validCount} من ${REQUIRED_POSTS_FOR_STORE}).`
          : `You need at least ${REQUIRED_POSTS_FOR_STORE} valid posts to unlock your store.`
      );
      return;
    }

    if (!name.trim()) {
      setError(isAr ? 'يرجى كتابة اسم المتجر' : 'Please enter store name');
      return;
    }

    const socialLinks: StoreSocialLinks = {
      instagram: instagram.trim() || undefined,
      facebook: facebook.trim() || undefined,
    };

    const newStore: StoreProfile = {
      id: `store-${Date.now()}`,
      name: name.trim(),
      ownerId: currentUser?.id,
      ownerPhone: phoneNumber.trim(),
      description: description.trim(),
      district,
      city: 'الموصل',
      address: address.trim(),
      category,
      whatsappNumber: whatsappNumber.trim(),
      phoneNumber: phoneNumber.trim(),
      socialLinks,
      logoUrl: logoUrl.trim() || undefined,
      coverUrl: coverUrl.trim() || undefined,
      deliveryAvailable,
      deliveryNotes: deliveryAvailable ? deliveryNotes.trim() : undefined,
      isVerified: true,
      totalListingsCount: Math.max(unlockStats.validCount, REQUIRED_POSTS_FOR_STORE),
      rating: 5.0,
      lat: storeLocation.lat,
      lng: storeLocation.lng,
      lastActiveAt: Date.now(),
      isArchived: false,
      createdAt: Date.now()
    };

    try {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
    } catch {}

    addOrUpdateStore(newStore);
    onStoreCreated(newStore);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 select-none animate-fadeIn text-xs">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] border border-slate-200">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold leading-none flex items-center gap-1">
                <span>{isAr ? 'إنشاء متجرك الخاص بالموصل' : 'Create Custom Store'}</span>
                <Sparkles className="w-3 h-3 text-emerald-400" />
              </h2>
              <span className="text-[10px] text-slate-400">
                {isAr ? `يفتح بعد نشر ${REQUIRED_POSTS_FOR_STORE} إعلاناً معتمداً` : `Unlocked after ${REQUIRED_POSTS_FOR_STORE} approved listings`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Eligibility Progress Banner */}
        <div className="p-3 bg-slate-50 border-b border-slate-100 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between font-bold">
            <span className="text-slate-800">
              {isAr ? `شرط فتح المتجر (${REQUIRED_POSTS_FOR_STORE} إعلاناً حقيقياً غير مكرر):` : `Unlock Requirement (${REQUIRED_POSTS_FOR_STORE}+ posts):`}
            </span>
            <span className={`font-mono ${isEligible ? 'text-emerald-700' : 'text-amber-700'}`}>
              {unlockStats.validCount} / {REQUIRED_POSTS_FOR_STORE} {isAr ? 'إعلانات صالحة' : 'valid posts'}
            </span>
          </div>

          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isEligible ? 'bg-emerald-600' : 'bg-amber-500'
              }`}
              style={{ width: `${unlockStats.percentage}%` }}
            />
          </div>

          {unlockStats.spamCount > 0 && (
            <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
              ⚠️ {isAr ? `تم استبعاد ${unlockStats.spamCount} إعلانات مكررة أو ناقصة من احتساب شرط المتجر` : `${unlockStats.spamCount} spam posts excluded`}
            </div>
          )}

          {!isEligible && (
            <div className="pt-1 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                {isAr
                  ? `أضف ${unlockStats.remainingCount} إعلانات إضافية لتفعيل متجرك`
                  : `Add ${unlockStats.remainingCount} more listings to unlock`}
              </span>
              {onFastSeedListings && (
                <button
                  type="button"
                  onClick={onFastSeedListings}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                >
                  {isAr ? `توليد ${REQUIRED_POSTS_FOR_STORE} إعلاناً للتجربة` : 'Add 30 Sample Items'}
                </button>
              )}
            </div>
          )}

          {isEligible && (
            <div className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'تهانينا! حققت شرط الـ 30 إعلاناً، متجرك مؤهل للإطلاق الفوري' : 'Unlocked & ready!'}</span>
            </div>
          )}
        </div>

        {/* Store Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-1.5 animate-shake">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Store Name */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              {isAr ? 'اسم المتجر أو المعرض *' : 'Store Name *'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: معرض الهدى للسيارات أو إلكترونيات الحدباء"
              className="w-full h-8.5 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* District in Mosul */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              {isAr ? 'الحي / المنطقة في الموصل *' : 'Mosul District *'}
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full h-8.5 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {MOSUL_DISTRICTS.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>

          {/* Store Location with Google Maps and [الموقع الحالي] button */}
          <div className="p-2.5 rounded-2xl bg-slate-100/70 border border-slate-200">
            <InteractiveMapSelector
              location={storeLocation}
              onChange={(loc) => {
                setStoreLocation(loc);
                setAddress(loc.addressName);
                if (loc.district) setDistrict(loc.district);
              }}
              sellerType="commercial"
              lang={lang}
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              {isAr ? 'التصنيف الأساسي للمتجر:' : 'Main Category:'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full h-8.5 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Bio / Description */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              {isAr ? 'نبذة عن المتجر (Bio):' : 'Store Bio:'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب نبذة عن المنتجات، الضمان، ساعات العمل..."
              className="w-full p-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* WhatsApp & Phone */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                {isAr ? 'رقم الواتساب:' : 'WhatsApp:'}
              </label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono tabular-nums text-left"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                {isAr ? 'رقم الاتصال:' : 'Phone:'}
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono tabular-nums text-left"
              />
            </div>
          </div>

          {/* Social Media Links */}
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-800 block">
              {isAr ? 'روابط التواصل الاجتماعي للمتجر:' : 'Social Media Links:'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 block mb-0.5">إنستغرام Instagram</label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@store_name"
                  className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-300 text-xs text-left font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-0.5">فيسبوك Facebook</label>
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="facebook.com/..."
                  className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-300 text-xs text-left font-mono"
                />
              </div>
            </div>
          </div>

          {/* Store Branding: Logo & Cover Banner */}
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-800 block">
              {isAr ? 'هوية وشعار المتجر (Branding):' : 'Store Branding:'}
            </span>

            {/* Logo Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-slate-600">
                  {isAr ? 'شعار المتجر (Logo):' : 'Store Logo:'}
                </label>
                <button
                  type="button"
                  onClick={() => logoFileRef.current?.click()}
                  disabled={uploadingBranding === 'logo'}
                  className="text-[9px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1"
                >
                  {uploadingBranding === 'logo' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Upload className="w-2.5 h-2.5" />}
                  <span>{isAr ? 'رفع شعار' : 'Upload Logo'}</span>
                </button>
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleBrandingUpload(e, 'logo')}
                />
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <img
                  src={logoUrl}
                  alt="Store Logo"
                  className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-500 shrink-0"
                />
                <div className="flex-1 flex gap-1 overflow-x-auto py-0.5">
                  {LOGO_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setLogoUrl(preset.url)}
                      className={`px-2 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap transition-colors border ${
                        logoUrl === preset.url
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cover Banner Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-slate-600">
                  {isAr ? 'غلاف واجهة المتجر (Cover Banner):' : 'Cover Banner:'}
                </label>
                <button
                  type="button"
                  onClick={() => coverFileRef.current?.click()}
                  disabled={uploadingBranding === 'cover'}
                  className="text-[9px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1"
                >
                  {uploadingBranding === 'cover' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Upload className="w-2.5 h-2.5" />}
                  <span>{isAr ? 'رفع غلاف' : 'Upload Cover'}</span>
                </button>
                <input
                  ref={coverFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleBrandingUpload(e, 'cover')}
                />
              </div>
              <div className="relative h-14 rounded-xl overflow-hidden border border-slate-200 mb-1.5">
                <img src={coverUrl} alt="Store Cover" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-1 overflow-x-auto py-0.5">
                {COVER_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setCoverUrl(preset.url)}
                    className={`px-2 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap transition-colors border ${
                      coverUrl === preset.url
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Delivery Option */}
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                {isAr ? 'توفر خدمة التوصيل بالمتجر' : 'Store Delivery'}
              </span>
              <button
                type="button"
                onClick={() => setDeliveryAvailable(!deliveryAvailable)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                  deliveryAvailable ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {deliveryAvailable ? (isAr ? 'متوفر ✓' : 'Yes') : (isAr ? 'غير متوفر' : 'No')}
              </button>
            </div>
            {deliveryAvailable && (
              <input
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="ملاحظة التوصيل داخل الموصل..."
                className="w-full h-7.5 px-2.5 rounded-lg bg-white border border-slate-300 text-[10px] text-slate-900"
              />
            )}
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isEligible}
              className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 active:scale-98 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <Store className="w-4 h-4" />
              <span>{isAr ? 'تأكيد وإطلاق المتجر الخاص الآن' : 'Launch Custom Store'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
