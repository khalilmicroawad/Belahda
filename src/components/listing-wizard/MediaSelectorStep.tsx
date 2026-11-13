import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Upload, X, Check, RefreshCw, Zap, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { performDualProductImageUpload } from '../../lib/mediaUpload';

interface MediaSelectorStepProps {
  mediaUrls: string[];
  onChange: (urls: string[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
  onDualMediaUploaded?: (thumbnailUrl: string, fullImageUrl: string) => void;
  lang?: 'ar' | 'en';
}

const PRESET_ASSETS = [
  {
    nameAr: 'موبايل حديث',
    nameEn: 'Smartphone',
    url: '/src/assets/images/listing_iphone_pro_1794306234850.jpg'
  },
  {
    nameAr: 'سيارة حديثة',
    nameEn: 'Car',
    url: '/src/assets/images/listing_suv_car_1794306236554.jpg'
  },
  {
    nameAr: 'أثاث منزلي',
    nameEn: 'Armchair',
    url: '/src/assets/images/listing_modern_armchair_1794306236545.jpg'
  },
  {
    nameAr: 'ساعة يد',
    nameEn: 'Watch',
    url: '/src/assets/images/listing_luxury_watch_1794306236996.jpg'
  }
];

export const MediaSelectorStep: React.FC<MediaSelectorStepProps> = ({
  mediaUrls,
  onChange,
  onUploadingChange,
  onDualMediaUploaded,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const setUploadingState = (val: boolean) => {
    setIsUploading(val);
    if (onUploadingChange) onUploadingChange(val);
  };

  useEffect(() => {
    if (isCameraActive) {
      let isMounted = true;
      navigator.mediaDevices
        ?.getUserMedia({
          video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 960 } }
        })
        .then((stream) => {
          if (!isMounted) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setCameraError(null);
        })
        .catch(() => {
          setCameraError(isAr ? 'الكاميرا غير متاحة، يمكنك التقاط صورة تجريبية أو الرفع من الاستوديو' : 'Camera not accessible, use upload.');
        });

      return () => {
        isMounted = false;
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  }, [isCameraActive, facingMode, isAr]);

  const readFileAsDataUrl = (file: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') resolve(ev.target.result);
        else reject(new Error('Failed to read file'));
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const snapPhoto = () => {
    if (videoRef.current && streamRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setIsCameraActive(false);
        setUploadingState(true);
        setUploadStatusMsg(null);
        canvas.toBlob(
          async (blob) => {
            try {
              if (blob) {
                const res = await performDualProductImageUpload(blob);
                onChange([...mediaUrls, res.fullImageUrl]);
                if (onDualMediaUploaded) {
                  onDualMediaUploaded(res.thumbnailUrl, res.fullImageUrl);
                }
                setUploadStatusMsg(
                  isAr
                    ? `تم حفظ الصورة المصغرة (${res.thumbnailSizeKB} KB) والأصلية بنجاح ✓`
                    : `Saved thumbnail (${res.thumbnailSizeKB} KB) & full image ✓`
                );
                return;
              }
            } catch {
              const fallbackData = canvas.toDataURL('image/jpeg', 0.88);
              onChange([...mediaUrls, fallbackData]);
            } finally {
              setUploadingState(false);
            }
          },
          'image/jpeg',
          0.9
        );
        return;
      }
    }

    const fallbackImage = PRESET_ASSETS[Math.floor(Math.random() * PRESET_ASSETS.length)].url;
    onChange([...mediaUrls, fallbackImage]);
    setIsCameraActive(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingState(true);
    setUploadStatusMsg(null);
    const uploadedFullUrls: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const res = await performDualProductImageUpload(file);
        uploadedFullUrls.push(res.fullImageUrl);
        if (onDualMediaUploaded) {
          onDualMediaUploaded(res.thumbnailUrl, res.fullImageUrl);
        }
        setUploadStatusMsg(
          isAr
            ? `تم رفع الصورة المصغرة (${res.thumbnailSizeKB} KB) والأصلية ${res.usedImageKit ? 'عبر ImageKit' : ''} بنجاح ✓`
            : `Uploaded thumbnail (${res.thumbnailSizeKB} KB) & full-res image ✓`
        );
      } catch {
        const dataUrl = await readFileAsDataUrl(file).catch(() => null);
        if (dataUrl) uploadedFullUrls.push(dataUrl);
      }
    }

    if (uploadedFullUrls.length > 0) {
      onChange([...mediaUrls, ...uploadedFullUrls]);
    }
    setUploadingState(false);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    const updated = mediaUrls.filter((_, i) => i !== index);
    onChange(updated);
  };

  const selectPreset = (url: string) => {
    if (!mediaUrls.includes(url)) {
      onChange([...mediaUrls, url]);
    }
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Header */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 leading-tight">
          {isAr ? 'الخطوة 1: صور السلعة أولاً' : 'Step 1: Attach Photos First'}
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {isAr
            ? 'ابدأ بإرفاق صور السلعة بكاميرا الموبايل أو من ألبوم الصور'
            : 'Take photos or choose from album'}
        </p>
      </div>

      {/* Main Binary Photo Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setIsCameraActive(true)}
          disabled={isUploading}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 active:scale-95 text-white shadow-sm transition-all"
        >
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-1.5">
            <Camera className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-xs font-bold leading-tight">
            {isAr ? 'التقاط صورة' : 'Camera'}
          </span>
          <span className="text-[10px] text-emerald-100">
            {isAr ? 'مباشرة بالكاميرا' : 'Direct Shot'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white hover:bg-slate-50 disabled:opacity-60 active:scale-95 text-slate-900 shadow-2xs border border-slate-200 transition-all"
        >
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center mb-1.5">
            <ImageIcon className="w-4.5 h-4.5 text-slate-700" />
          </div>
          <span className="text-xs font-bold leading-tight">
            {isAr ? 'من الاستوديو' : 'Gallery'}
          </span>
          <span className="text-[10px] text-slate-500">
            {isAr ? 'اختيار من الألبوم' : 'Pick Photos'}
          </span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {isUploading && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-bold flex items-center gap-2 animate-fadeIn">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
          <div>
            <span className="block">{isAr ? 'جاري رفع الصورة... (Uploading image...)' : 'Uploading image...'}</span>
            <span className="text-[9px] text-emerald-700 font-normal">
              {isAr ? 'توليد نسخة مصغرة لـ Supabase ونسخة أصلية لـ ImageKit بالتوازي' : 'Uploading compressed thumbnail & full-resolution photo in parallel'}
            </span>
          </div>
        </div>
      )}

      {!isUploading && uploadStatusMsg && (
        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-1.5 animate-fadeIn">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{uploadStatusMsg}</span>
        </div>
      )}

      {/* Camera Viewfinder */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-3 max-w-sm mx-auto">
          <div className="flex items-center justify-between text-white pt-2">
            <button
              type="button"
              onClick={() => setIsCameraActive(false)}
              className="p-1.5 rounded-full bg-white/10 text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-slate-200">
              {isAr ? 'كاميرا سوق بلحظة' : 'Product Camera'}
            </span>
            <button
              type="button"
              onClick={() => setFlashOn(!flashOn)}
              className={`p-1.5 rounded-full ${flashOn ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-white'}`}
            >
              <Zap className="w-4 h-4" />
            </button>
          </div>

          <div className="relative flex-1 my-3 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-white/10">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute w-36 h-36 border-2 border-emerald-400/80 rounded-2xl pointer-events-none animate-pulse"></div>

            {cameraError && (
              <div className="absolute inset-x-3 bottom-3 p-2 rounded-xl bg-slate-900/90 text-white text-[11px] text-center border border-white/20">
                <p>{cameraError}</p>
                <button
                  type="button"
                  onClick={snapPhoto}
                  className="mt-1 text-[11px] font-bold text-emerald-400 underline"
                >
                  التقاط صورة جاهزة الآن
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-around pb-4">
            <button
              type="button"
              onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}
              className="p-2.5 rounded-full bg-white/15 text-white"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={snapPhoto}
              className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-transparent active:scale-90 transition-transform"
            >
              <div className="w-13 h-13 rounded-full bg-white"></div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCameraActive(false);
                fileInputRef.current?.click();
              }}
              className="p-2.5 rounded-full bg-white/15 text-white"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Selected Photos Strip */}
      {mediaUrls.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span>الصور المرفقة ({mediaUrls.length})</span>
            <span className="text-emerald-700 text-[10px]">الصورة الأولى هي الغلاف</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {mediaUrls.map((url, idx) => (
              <div
                key={idx}
                className="relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group"
              >
                <img
                  src={url}
                  alt={`Product view ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                {idx === 0 && (
                  <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    الغلاف
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 left-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-4/3 rounded-xl border border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 flex flex-col items-center justify-center text-slate-500 hover:text-emerald-600 transition-colors"
            >
              <Upload className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] font-bold">+ إضافة</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 mb-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>أو اختر صورة جاهزة للتجربة:</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_ASSETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectPreset(preset.url)}
                className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 hover:border-emerald-500 transition-all active:scale-95"
              >
                <img
                  src={preset.url}
                  alt={preset.nameEn}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-slate-900/80 p-0.5 text-center">
                  <span className="text-[8px] text-white block truncate">
                    {preset.nameAr}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
