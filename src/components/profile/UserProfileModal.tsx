import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Store,
  LogOut,
  Sparkles
} from 'lucide-react';
import { UserAccount } from '../../types';
import { saveUserAccount, clearUserAccount } from '../../data/mockListings';

interface UserProfileModalProps {
  user: UserAccount | null;
  onUpdateUser: (user: UserAccount | null) => void;
  onClose: () => void;
  lang?: 'ar' | 'en';
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  onUpdateUser,
  onClose,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';

  const [name, setName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState(user?.password || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(isAr ? 'يرجى كتابة الاسم' : 'Please enter your name');
      return;
    }

    if (!phoneNumber.trim()) {
      setError(isAr ? 'يرجى كتابة رقم الهاتف' : 'Please enter your phone number');
      return;
    }

    if (password && password.length < 8) {
      setError(
        isAr
          ? 'الرمز السري يجب أن يتكون من 8 أرقام أو حروف على الأقل'
          : 'Password must be at least 8 characters'
      );
      return;
    }

    const updatedAccount: UserAccount = {
      id: user?.id || `user-${Date.now()}`,
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim() || undefined,
      password: password.trim() || undefined,
      isSeller: user?.isSeller ?? true,
      hasCustomStore: user?.hasCustomStore,
      customStoreId: user?.customStoreId,
      createdAt: user?.createdAt || Date.now()
    };

    saveUserAccount(updatedAccount);
    onUpdateUser(updatedAccount);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleLogout = () => {
    clearUserAccount();
    onUpdateUser(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 select-none animate-fadeIn text-xs">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 leading-none">
                {isAr ? 'لوحة تحكم الحساب' : 'Account Control Panel'}
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

        {/* Account Info Pill */}
        <div className="p-3 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-emerald-800 font-semibold block">
              {user?.hasCustomStore
                ? (isAr ? 'متجر معتمد خاص بالموصل ✓' : 'Verified Store Owner')
                : user?.isSeller
                ? (isAr ? 'حساب بائع معتمد (تم إنشاؤه عند أول إعلان)' : 'Seller Account (Active)')
                : (isAr ? 'حساب مشتري مسجل' : 'Registered Buyer')}
            </span>
            <span className="text-xs font-bold text-slate-900 font-mono">
              {user?.phoneNumber || (isAr ? 'لا يوجد رقم مسجل' : 'No phone')}
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            {isAr ? 'نشط' : 'Active'}
          </span>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="p-3.5 space-y-2.5">
          {saveSuccess && (
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-900 text-[11px] font-bold flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isAr ? 'تم حفظ وتحديث بيانات حسابك بنجاح!' : 'Account updated!'}</span>
            </div>
          )}

          {error && (
            <div className="p-2 rounded-xl bg-red-50 text-red-700 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
              {isAr ? 'اسم البائع / صاحب الحساب *' : 'Name *'}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: عمر الموصلي"
                className="w-full h-8.5 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Phone Number Field */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
              {isAr ? 'رقم الهاتف العراقي *' : 'Iraqi Phone Number *'}
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0770XXXXXXX"
                className="w-full h-8.5 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-left"
              />
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Optional Email Addition */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
              {isAr ? 'البريد الإلكتروني (إضافي)' : 'Email (Optional)'}
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
                className="w-full h-8.5 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-left"
              />
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* 8-character password */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[11px] font-bold text-slate-700">
                {isAr ? 'رمز سري (8 أرقام أو حروف)' : 'Password (8 chars min)'}
              </label>
              <span className="text-[9px] text-slate-400 font-mono">
                {password.length}/8
              </span>
            </div>
            <div className="relative">
              <input
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل 8 خانات لتأمين حسابك"
                className="w-full h-8.5 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-left font-mono"
              />
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="pt-1.5 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
            </button>

            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs font-semibold transition-colors flex items-center gap-1"
                title={isAr ? 'تسجيل الخروج' : 'Log out'}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
