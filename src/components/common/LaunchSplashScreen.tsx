import React, { useEffect, useState } from 'react';

const SPLASH_LOGO_URL = 'https://ik.imagekit.io/Belahda/Logo512.png';

interface LaunchSplashScreenProps {
  onComplete: () => void;
}

export const LaunchSplashScreen: React.FC<LaunchSplashScreenProps> = ({ onComplete }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => {
      setIsFadingOut(true);
    }, 1220);

    const completeTimer = window.setTimeout(() => {
      onComplete();
    }, 1500);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="جاري تحميل سوق بلحظة"
      className={`fixed inset-0 z-[100] bg-[#008080] flex flex-col items-center justify-center px-6 select-none transition-opacity duration-300 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-splash-logo">
        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl flex items-center justify-center overflow-hidden shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
          {!logoLoadFailed ? (
            <img
              src={SPLASH_LOGO_URL}
              alt="شعار سوق بلحظة"
              referrerPolicy="no-referrer"
              decoding="async"
              fetchPriority="high"
              onError={() => setLogoLoadFailed(true)}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full bg-[#006666] border border-[#EDC9AF]/40 flex items-center justify-center">
              <span className="text-3xl font-extrabold text-[#EDC9AF]">بلحظة</span>
            </div>
          )}
        </div>

        {/* Subtle loading indicator in Desert Sand (#EDC9AF) */}
        <div className="flex flex-col items-center gap-2.5">
          <div
            aria-hidden="true"
            className="w-28 h-1 rounded-full bg-[#EDC9AF]/25 overflow-hidden"
          >
            <div className="w-1/2 h-full rounded-full bg-[#EDC9AF] animate-splash-loader" />
          </div>
          <span className="sr-only">جاري فتح التطبيق</span>
        </div>
      </div>
    </div>
  );
};
