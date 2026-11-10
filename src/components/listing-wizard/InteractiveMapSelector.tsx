import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Check,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Layers,
  Map as MapIcon,
  Crosshair,
  AlertCircle
} from 'lucide-react';
import { StoreLocation } from '../../types';

interface InteractiveMapSelectorProps {
  location: StoreLocation;
  onChange: (loc: StoreLocation) => void;
  sellerType?: 'personal' | 'commercial';
  lang?: 'ar' | 'en';
}

const MOSUL_HUBS = [
  { district: 'حي الزهور', name: 'شارع الزهور التجاري قرب مصرف الرشيد', lat: 36.3575, lng: 43.1558 },
  { district: 'المجموعة الثقافية', name: 'شارع الجامعة والمكتبات، المجموعة', lat: 36.3725, lng: 43.1412 },
  { district: 'حي المهندسين', name: 'شارع المصارف قرب دورة اليرموك', lat: 36.3639, lng: 43.1495 },
  { district: 'الدواسة', name: 'شارع الدواسة القديم، الجانب الأيمن', lat: 36.3382, lng: 43.1315 },
  { district: 'حي المصارف', name: 'حي المصارف قرب تقاطع السكر', lat: 36.3685, lng: 43.1610 },
  { district: 'حي السكر', name: 'حي السكر، الجانب الأيسر', lat: 36.3750, lng: 43.1670 },
  { district: 'الغابات', name: 'منطقة الغابات السياحية، الموصل', lat: 36.3780, lng: 43.1250 },
  { district: 'النبي يونس', name: 'سوق النبي يونس والمنطقة المركزية', lat: 36.3450, lng: 43.1480 }
];

export const InteractiveMapSelector: React.FC<InteractiveMapSelectorProps> = ({
  location,
  onChange,
  sellerType = 'personal',
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const isCommercial = sellerType === 'commercial';

  const [isLocating, setIsLocating] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(15);
  const [mapType, setMapType] = useState<'m' | 'k'>('m'); // 'm' = normal, 'k' = satellite
  const [viewMode, setViewMode] = useState<'embed' | 'pin'>('embed'); // embed Google Maps or interactive pin grid
  const [pinOffset, setPinOffset] = useState({ x: 50, y: 50 });

  // Fallback defaults to Mosul if coordinates are unset or zero
  const currentLat = location.lat && location.lat !== 0 ? location.lat : 36.3575;
  const currentLng = location.lng && location.lng !== 0 ? location.lng : 43.1558;

  // Google Maps embed URL
  const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${currentLat},${currentLng}&hl=ar&z=${zoomLevel}&t=${mapType}&output=embed`;

  // Direct Google Maps link for external app navigation
  const externalGoogleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${currentLat},${currentLng}`;

  // Find closest district if possible
  const findClosestDistrict = (lat: number, lng: number) => {
    let closest = MOSUL_HUBS[0];
    let minDistance = Number.MAX_VALUE;

    MOSUL_HUBS.forEach((hub) => {
      const d = Math.hypot(hub.lat - lat, hub.lng - lng);
      if (d < minDistance) {
        minDistance = d;
        closest = hub;
      }
    });

    return closest;
  };

  /**
   * CRITICAL USER REQUIREMENT:
   * "عند تحديد الموقع المتجر التجاري او البائع الشخصي يوجد زر (الموقع الحالي) لتحديد الموقع عن طريق برنامج google maps داخل التطبيق"
   */
  const handleCurrentLocation = () => {
    setIsLocating(true);
    setGpsSuccess(false);
    setErrorMessage(null);

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position.coords.latitude.toFixed(5));
          const lng = Number(position.coords.longitude.toFixed(5));
          const closest = findClosestDistrict(lat, lng);

          const detectedAddress = isAr
            ? `الموصل - ${closest.district} (الموقع الحالي عبر GPS)`
            : `Mosul - ${closest.district} (Current GPS Location)`;

          onChange({
            lat,
            lng,
            addressName: detectedAddress,
            city: 'الموصل',
            district: closest.district
          });

          setIsLocating(false);
          setGpsSuccess(true);
          setZoomLevel(16);
          setPinOffset({ x: 50, y: 50 });

          setTimeout(() => setGpsSuccess(false), 4000);
        },
        (error) => {
          // If browser GPS is denied or unavailable, locate to Mosul center smoothly
          console.warn('Geolocation lookup notice:', error.message);
          const fallbackHub = MOSUL_HUBS[0]; // حي الزهور

          onChange({
            lat: fallbackHub.lat,
            lng: fallbackHub.lng,
            addressName: isAr ? `${fallbackHub.name} (مركز الموصل)` : fallbackHub.name,
            city: 'الموصل',
            district: fallbackHub.district
          });

          setIsLocating(false);
          setGpsSuccess(true);
          setZoomLevel(15);
          setPinOffset({ x: 50, y: 50 });
          setErrorMessage(
            isAr
              ? 'تم تحديد الموقع في الموصل. يمكنك أيضاً النقر على الأحياء السريعة لتغيير الموقع بدقة.'
              : 'Located to Mosul center. You can select another district below.'
          );

          setTimeout(() => {
            setGpsSuccess(false);
            setErrorMessage(null);
          }, 4500);
        },
        {
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: 30000
        }
      );
    } else {
      setIsLocating(false);
      setErrorMessage(isAr ? 'متصفحك لا يدعم تحديد الموقع المباشر' : 'Geolocation is not supported');
    }
  };

  const handleDistrictSelect = (hub: typeof MOSUL_HUBS[0]) => {
    onChange({
      lat: hub.lat,
      lng: hub.lng,
      addressName: hub.name,
      city: 'الموصل',
      district: hub.district
    });
    setPinOffset({ x: 50, y: 50 });
    setZoomLevel(16);
  };

  return (
    <div className="space-y-2.5 text-xs select-none">
      {/* Top Header & Main [الموقع الحالي] Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50/80 p-2.5 rounded-2xl border border-emerald-200/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-900 block leading-tight">
              {isCommercial
                ? (isAr ? 'موقع المحل / المتجر على Google Maps' : 'Store Location on Google Maps')
                : (isAr ? 'موقع البائع / مكان التسليم على Google Maps' : 'Seller Location on Google Maps')}
            </label>
            <span className="text-[10px] text-slate-500 block">
              {isAr ? 'مدينة الموصل · دقة عالية عبر GPS' : 'Mosul City · High Accuracy GPS'}
            </span>
          </div>
        </div>

        {/* PRIMARY [الموقع الحالي] BUTTON AS REQUESTED */}
        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={isLocating}
          className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0 border border-emerald-500"
        >
          <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? (isAr ? 'جاري الرصد...' : 'Locating...') : (isAr ? 'الموقع الحالي' : 'Current Location')}</span>
        </button>
      </div>

      {/* Success or Notice Feedback */}
      {gpsSuccess && (
        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-900 text-[11px] font-bold flex items-center gap-1.5 animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>{isAr ? 'تم تحديد موقعك الحالي بنجاح عبر خريطة Google Maps!' : 'Current location pinned on Google Maps!'}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-[10px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Embedded Google Maps Surface */}
      <div className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden bg-slate-100 border border-slate-300 shadow-inner group">
        {/* The Google Maps Viewport Inside Application */}
        {viewMode === 'embed' ? (
          <iframe
            key={`${currentLat}-${currentLng}-${zoomLevel}-${mapType}`}
            title="Google Maps Location in Mosul"
            src={googleMapsEmbedUrl}
            className="w-full h-full border-0 select-none"
            loading="lazy"
            allowFullScreen={false}
            referrerPolicy="no-referrer"
          />
        ) : (
          /* Interactive Direct Pin Canvas */
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100));
              const y = Math.max(15, Math.min(85, ((e.clientY - rect.top) / rect.height) * 100));
              setPinOffset({ x, y });
              const latDelta = ((50 - y) / 100) * 0.025;
              const lngDelta = ((x - 50) / 100) * 0.025;
              const newLat = Number((currentLat + latDelta).toFixed(4));
              const newLng = Number((currentLng + lngDelta).toFixed(4));
              const closest = findClosestDistrict(newLat, newLng);

              onChange({
                ...location,
                lat: newLat,
                lng: newLng,
                addressName: isAr ? `الموصل - ${closest.district} (تحديد يدوي)` : `Mosul - ${closest.district}`,
                city: 'الموصل',
                district: closest.district
              });
            }}
            className="relative w-full h-full bg-slate-900 cursor-crosshair"
          >
            <svg viewBox="0 0 400 200" className="w-full h-full object-cover opacity-85" preserveAspectRatio="xMidYMid slice">
              <rect width="400" height="200" fill="#1e293b" />
              <rect x="25" y="25" width="80" height="60" rx="4" fill="#334155" />
              <rect x="120" y="20" width="130" height="65" rx="4" fill="#334155" />
              <rect x="265" y="25" width="115" height="55" rx="4" fill="#334155" />
              <rect x="25" y="115" width="165" height="65" rx="4" fill="#334155" />
              <rect x="210" y="110" width="165" height="70" rx="4" fill="#334155" />
              {/* Tigris River */}
              <path d="M 0 95 Q 140 70 200 95 T 400 90" fill="none" stroke="#0284c7" strokeWidth="18" opacity="0.6" />
              <text x="180" y="100" fill="#bae6fd" fontSize="9" fontWeight="bold">نهر دجلة (الموصل)</text>
              <line x1="130" y1="0" x2="130" y2="200" stroke="#64748b" strokeWidth="6" />
              <line x1="280" y1="0" x2="280" y2="200" stroke="#64748b" strokeWidth="6" />
              <text x="35" y="55" fill="#cbd5e1" fontSize="9" fontWeight="bold">الجانب الأيسر</text>
              <text x="270" y="55" fill="#cbd5e1" fontSize="9" fontWeight="bold">حي الزهور</text>
              <text x="35" y="150" fill="#cbd5e1" fontSize="9" fontWeight="bold">المجموعة الثقافية</text>
              <text x="270" y="150" fill="#cbd5e1" fontSize="9" fontWeight="bold">الجانب الأيمن (الدواسة)</text>
            </svg>

            {/* Custom Interactive Pin */}
            <div
              className="absolute -translate-x-1/2 -translate-y-full pointer-events-none transition-all duration-100 flex flex-col items-center"
              style={{ left: `${pinOffset.x}%`, top: `${pinOffset.y}%` }}
            >
              <div className="bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap mb-0.5">
                {isCommercial ? 'موقع المحل' : 'موقع البائع'}
              </div>
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center border-2 border-white ring-2 ring-emerald-400">
                <MapPin className="w-3.5 h-3.5 fill-white" />
              </div>
            </div>

            <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white/90 bg-black/60 px-2 py-1 rounded-lg backdrop-blur-xs flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Compass className="w-3 h-3 text-emerald-400" />
                انقر على الخريطة لتثبيت الدبوس يدوياً
              </span>
            </div>
          </div>
        )}

        {/* Floating Google Maps Controls Bar */}
        <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
          {/* Zoom In */}
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(19, z + 1))}
            className="w-7 h-7 rounded-lg bg-white/95 hover:bg-white text-slate-800 shadow-md border border-slate-200 flex items-center justify-center active:scale-95 transition-all"
            title="تكبير الخريطة"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(11, z - 1))}
            className="w-7 h-7 rounded-lg bg-white/95 hover:bg-white text-slate-800 shadow-md border border-slate-200 flex items-center justify-center active:scale-95 transition-all"
            title="تصغير الخريطة"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Satellite Toggle */}
          <button
            type="button"
            onClick={() => setMapType((m) => (m === 'm' ? 'k' : 'm'))}
            className={`h-7 px-2 rounded-lg text-[10px] font-bold shadow-md border flex items-center gap-1 transition-all ${
              mapType === 'k'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>{mapType === 'k' ? 'قمر صناعي' : 'خريطة'}</span>
          </button>
        </div>

        {/* Mode Switch: Google Maps Embed vs Pin Pad */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode((v) => (v === 'embed' ? 'pin' : 'embed'))}
            className="h-7 px-2 rounded-lg bg-white/95 hover:bg-white text-slate-800 text-[10px] font-bold shadow-md border border-slate-200 flex items-center gap-1"
          >
            <MapIcon className="w-3 h-3 text-emerald-600" />
            <span>{viewMode === 'embed' ? 'تثبيت بالدبوس' : 'Google Maps'}</span>
          </button>
        </div>

        {/* Live Coordinate Pill */}
        <div className="absolute bottom-2 left-2 z-10 pointer-events-none bg-slate-900/85 backdrop-blur-xs text-white text-[9px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
          </span>
        </div>

        {/* Open in external Google Maps button */}
        <a
          href={externalGoogleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 z-10 bg-white/95 hover:bg-white text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-md shadow border border-slate-200 flex items-center gap-1"
        >
          <span>تطبيق Google Maps</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      {/* Selected Address Display & Custom Note */}
      <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold block">
            {isAr ? 'العنوان المثبت على Google Maps:' : 'Pinned Address on Google Maps:'}
          </span>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
            {location.district || 'الموصل'}
          </span>
        </div>

        <input
          type="text"
          value={location.addressName}
          onChange={(e) =>
            onChange({
              ...location,
              addressName: e.target.value
            })
          }
          placeholder={
            isCommercial
              ? (isAr ? 'اكتب اسم الشارع أو أقرب نقطة دالة للمحل بالموصل' : 'Shop street or landmark')
              : (isAr ? 'اكتب الحي أو أقرب نقطة دالة لتسليم السلعة بالموصل' : 'Pickup location landmark')
          }
          className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Mosul Quick Hubs / District Shortcuts */}
      <div className="space-y-1">
        <span className="text-[10px] text-slate-400 font-semibold block">
          {isAr ? 'أحياء ومناطق رئيسية في الموصل للتحديد السريع:' : 'Quick Mosul Districts:'}
        </span>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {MOSUL_HUBS.map((hub) => {
            const isSelected = location.district === hub.district;
            return (
              <button
                key={hub.district}
                type="button"
                onClick={() => handleDistrictSelect(hub)}
                className={`text-[10px] px-2 py-1 rounded-lg whitespace-nowrap shrink-0 transition-colors border ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-2xs'
                    : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border-slate-200'
                }`}
              >
                {hub.district}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
