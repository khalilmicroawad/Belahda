import React, { useState } from 'react';
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
  Upload
} from 'lucide-react';
import { StoreProfile, UserAccount, CategoryId, StoreLocation } from '../../types';
import { MOSUL_DISTRICTS, CATEGORIES } from '../../data/categories';
import { addOrUpdateStore } from '../../data/mockStores';
import { InteractiveMapSelector } from '../listing-wizard/InteractiveMapSelector';

interface CreateStoreModalProps {
  currentUser: UserAccount | null;
  listingsCount: number;
  onStoreCreated: (store: StoreProfile) => void;
  onClose: () => void;
  onFastSeedListings?: () => void;
  lang?: 'ar' | 'en';
}

export const CreateStoreModal: React.FC<CreateStoreModalProps> = ({
  currentUser,
  listingsCount,
  onStoreCreated,
  onClose,
  onFastSeedListings,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const isEligible = listingsCount >= 10;

  const [name, setName] = useState('متجر الموصل الحديث');
  const [district, setDistrict] = useState('حي الزهور');
  const [address, setAddress] = useState('شارع الزهور التجاري قرب مصرف الرشيد');
  const [category, setCategory] = useState<CategoryId>('electronics');
  const [description, setDescription] = useState(
    'متجرنا يقدم أفضل السلع والمنتجات بضمان رسمي وتوصيل فوري داخل مدينة الموصل.'
  );
  const [whatsappNumber, setWhatsappNumber] = useState(currentUser?.phoneNumber || '07701234567');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '07701234567');
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [deliveryNotes, setDeliveryNotes] = useState('توصيل متوفر لكافة أحياء الموصل');
  const [coverUrl, setCoverUrl] = useState('/src/assets/images/listing_iphone_pro_1794306234850.jpg');
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
          ? `عذراً، يجب إضافة أكثر من 10 إعلانات أولاً لفتح متجرك الخاص (أضفت حالياً ${listingsCount} من 10).`
          : 'You need at least 10 listings to unlock your store.'
      );
      return;
    }

    if (!name.trim()) {
      setError(isAr ? 'يرجى كتابة اسم المتجر' : 'Please enter store name');
      return;
    }

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
      deliveryAvailable,
      deliveryNotes: deliveryAvailable ? deliveryNotes.trim() : undefined,
      isVerified: true,
      totalListingsCount: Math.max(listingsCount, 11),
      rating: 5.0,
      coverUrl,
      lat: storeLocation.lat,
      lng: storeLocation.lng,
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
                {isAr ? 'ميزة المتاجر المعتمدة للمعلنين النشطين' : 'Unlocked after 10+ listings'}
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
              {isAr ? 'شرط فتح المتجر (أكثر من 10 إعلانات):' : 'Unlock Requirement (10+ posts):'}
            </span>
            <span className={`font-mono ${isEligible ? 'text-emerald-700' : 'text-amber-700'}`}>
              {listingsCount} / 10 {isAr ? 'إعلانات' : 'items'}
            </span>
          </div>

          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isEligible ? 'bg-emerald-600' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, (listingsCount / 10) * 100)}%` }}
            />
          </div>

          {!isEligible && (
            <div className="pt-1 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                {isAr
                  ? `أضف ${10 - listingsCount} إعلانات إضافية لتفعيل متجرك`
                  : `Add ${10 - listingsCount} more listings to unlock`}
              </span>
              {onFastSeedListings && (
                <button
                  type="button"
                  onClick={onFastSeedListings}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                >
                  {isAr ? 'توليد 10 إعلانات للتجربة الآن' : 'Add 10 Sample Items'}
                </button>
              )}
            </div>
          )}

          {isEligible && (
            <div className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'تهانينا! متجرك مؤهل للنشر الفوري وعرض كافة منتجاتك' : 'Unlocked & ready!'}</span>
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
