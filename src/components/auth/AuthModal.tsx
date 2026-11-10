import React, { useState } from 'react';
import { X, Lock, Phone, User, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { UserAccount } from '../../types';
import { saveUserAccount } from '../../data/mockListings';

interface AuthModalProps {
  onSuccess: (user: UserAccount) => void;
  onClose: () => void;
  purposeMessage?: string;
  lang?: 'ar' | 'en';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onSuccess,
  onClose,
  purposeMessage,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(isAr ? 'يرجى كتابة الاسم الكامل' : 'Please enter your name');
      return;
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setError(
        isAr
          ? 'يرجى إدخال رقم هاتف عراقي صحيح (مثال: 07701234567)'
          : 'Please enter a valid phone number (e.g. 07701234567)'
      );
      return;
    }

    if (!password || password.length < 8) {
      setError(
        isAr
          ? 'الرمز السري يجب أن يتكون من 8 أرقام أو حروف على الأقل'
          : 'Password must be at least 8 characters or digits'
      );
      return;
    }

    const newAccount: UserAccount = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      password: password.trim(),
      isSeller: false,
      createdAt: Date.now()
    };

    saveUserAccount(newAccount);
    onSuccess(newAccount);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 select-none animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 leading-none">
                {isAr ? 'تسجيل سريع للتواصل' : 'Quick Registration'}
              </h2>
              <span className="text-[10px] text-slate-500">
                {isAr ? 'سوق بلحظة · الموصل' : 'Souq Belahdha · Mosul'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {purposeMessage ? (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
              {purposeMessage}
            </div>
          ) : (
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isAr
                ? 'للتواصل المباشر مع البائع، يرجى كتابة اسمك ورقم هاتفك وتعيين رمز سري من 8 خانات لحماية حسابك.'
                : 'To contact the seller, enter your name, phone number, and an 8-character password.'}
            </p>
          )}

          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-1.5 animate-shake">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              {isAr ? 'الاسم الكامل *' : 'Full Name *'}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isAr ? 'مثال: أحمد الموصلي' : 'e.g. Ahmed'}
                className="w-full h-9.5 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Phone Field */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              {isAr ? 'رقم الهاتف (عراقي) *' : 'Phone Number (Iraq) *'}
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0770XXXXXXX أو 0750XXXXXXX"
                className="w-full h-9.5 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-left"
              />
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Password (8 characters) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700">
                {isAr ? 'رمز سري (8 أرقام أو حروف) *' : 'Password (8 chars) *'}
              </label>
              <span className="text-[10px] text-slate-400">
                {password.length}/8
              </span>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isAr ? '•••••••• (8 خانات على الأقل)' : '••••••••'}
                className="w-full h-9.5 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-left font-mono"
              />
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
            <p className="text-[9px] text-slate-500 mt-1">
              {isAr
                ? 'يمكنك استخدام هذا الرمز للدخول والتواصل وحفظ إعلاناتك لاحقاً'
                : 'Used to log in and manage your inquiries'}
            </p>
          </div>

          <button
            type="submit"
            className="w-full h-10.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 mt-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isAr ? 'حفظ الحساب ومتابعة التواصل' : 'Save & Continue'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
