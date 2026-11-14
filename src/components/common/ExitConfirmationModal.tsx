import React from 'react';
import { LogOut } from 'lucide-react';

interface ExitConfirmationModalProps {
  open: boolean;
  onConfirmExit: () => void;
  onCancel: () => void;
}

export const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({
  open,
  onConfirmExit,
  onCancel,
}) => {
  if (!open) {
    return null;
  }

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-confirm-title"
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs sm:max-w-sm bg-white border border-[#D9AF91] rounded-3xl p-6 shadow-[0_22px_54px_rgba(0,102,102,0.22)] animate-modal-up text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 mx-auto mb-3.5 rounded-2xl bg-[#EDC9AF]/75 border border-[#D9AF91] flex items-center justify-center text-[#006666]">
          <LogOut className="w-5 h-5" />
        </div>

        <h2
          id="exit-confirm-title"
          className="text-lg font-extrabold text-[#1E293B] mb-1.5"
        >
          هل تريد الخروج؟
        </h2>
        <p className="text-xs text-[#64748B] mb-5 leading-relaxed">
          سيتم إغلاق تطبيق سوق بلحظة
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onConfirmExit}
            className="min-h-[44px] px-4 rounded-2xl bg-[#008080] hover:bg-[#006666] active:scale-95 text-white font-bold text-sm transition-all duration-200 shadow-xs"
          >
            نعم
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-4 rounded-2xl bg-[#EDC9AF]/75 hover:bg-[#EDC9AF] active:scale-95 border border-[#D9AF91] text-[#1E293B] font-bold text-sm transition-all duration-200"
          >
            لا
          </button>
        </div>
      </div>
    </div>
  );
};
