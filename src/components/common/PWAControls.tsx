import React from 'react';
import { Smartphone, WifiOff, Download, X } from 'lucide-react';

interface HeaderApkDownloadButtonProps {
  isStandalone: boolean;
  isAr: boolean;
}

export const HeaderApkDownloadButton: React.FC<HeaderApkDownloadButtonProps> = ({
  isStandalone,
  isAr,
}) => {
  if (isStandalone) {
    return null;
  }

  return (
    <a
      href="/balahza.apk"
      download="balahza.apk"
      title={isAr ? 'حمّل التطبيق (APK)' : 'Download App (APK)'}
      aria-label={isAr ? 'حمّل التطبيق (APK)' : 'Download App (APK)'}
      className="group min-h-[40px] px-2.5 sm:px-3 rounded-xl bg-[#0D9488]/10 hover:bg-[#0D9488] active:scale-95 border border-[#0D9488]/30 text-xs font-bold text-[#0F766E] hover:text-white transition-all duration-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
    >
      <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-[#0D9488] group-hover:text-white transition-transform duration-200 group-hover:scale-110" />
      <span className="hidden md:inline">
        {isAr ? 'حمّل التطبيق (APK)' : 'Download App (APK)'}
      </span>
      <span className="md:hidden">
        {isAr ? 'تطبيق APK' : 'APK'}
      </span>
    </a>
  );
};

interface OfflineStatusBannerProps {
  isOnline: boolean;
  isAr: boolean;
}

export const OfflineStatusBanner: React.FC<OfflineStatusBannerProps> = ({
  isOnline,
  isAr,
}) => {
  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-950 text-[#FFE4C4] text-xs font-semibold px-4 py-2 border-b border-amber-800/60"
    >
      <div className="w-full max-w-6xl mx-auto flex items-center justify-center gap-2 text-center">
        <WifiOff className="w-3.5 h-3.5 shrink-0 text-[#FFE4C4]" />
        <span>
          {isAr
            ? 'أنت غير متصل بالإنترنت — يتم عرض النسخة المحفوظة حالياً'
            : 'You are offline — viewing cached version'}
        </span>
      </div>
    </div>
  );
};

interface BrowserInstallPromptBarProps {
  visible: boolean;
  onInstall: () => void;
  onDismiss: () => void;
  isAr: boolean;
}

export const BrowserInstallPromptBar: React.FC<BrowserInstallPromptBarProps> = ({
  visible,
  onInstall,
  onDismiss,
  isAr,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-3">
      <div className="bg-white/95 border border-[#E8C5A0] rounded-2xl px-3.5 py-2.5 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/pwa-192x192.png"
            alt={isAr ? 'شعار بلحظة' : 'Balahza'}
            className="w-9 h-9 rounded-xl shrink-0 border border-[#E8C5A0]"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#1E293B] truncate">
              {isAr ? 'ثبّت تطبيق بلحظة على جهازك' : 'Install Balahza App'}
            </p>
            <p className="text-[11px] text-[#64748B] truncate">
              {isAr ? 'وصول فوري وشاشة كاملة بدون متصفح' : 'Fast access in fullscreen mode'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onInstall}
            className="min-h-[34px] px-3 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] active:scale-95 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isAr ? 'تثبيت' : 'Install'}</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className="min-h-[34px] min-w-[34px] rounded-xl text-[#64748B] hover:bg-[#FFE4C4]/70 inline-flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
