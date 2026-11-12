import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  LogOut,
  Camera,
  Loader2,
  LogIn
} from 'lucide-react';
import { UserAccount } from '../../types';
import { saveUserAccount, clearUserAccount } from '../../data/mockListings';
import { signOutUser, upsertUserProfile, uploadFileToStorage } from '../../lib/supabase';

interface UserProfileModalProps {
  user: UserAccount | null;
  onUpdateUser: (user: UserAccount | null) => void;
  onOpenAuth?: () => void;
  onClose: () => void;
  lang?: 'ar' | 'en';
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  onUpdateUser,
  onOpenAuth,
  onClose,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';

  const [name, setName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploadingAvatar(true);

    try {
      const publicUrl = await uploadFileToStorage(file, 'avatars');
      setAvatarUrl(publicUrl);
    } catch (err: any) {
      // Fallback to preview DataURL if bucket policy is not yet created
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
          setAvatarUrl(ev.target.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
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

    setIsSaving(true);
    try {
      const updatedAccount: UserAccount = {
        id: user?.id || `user-${Date.now()}`,
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        isSeller: user?.isSeller ?? true,
        hasCustomStore: user?.hasCustomStore,
        customStoreId: user?.customStoreId,
        createdAt: user?.createdAt || Date.now()
      };

      saveUserAccount(updatedAccount);
      await upsertUserProfile(updatedAccount).catch(() => {});
      onUpdateUser(updatedAccount);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch {}
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
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
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
                ? (isAr ? 'مالك متجر موثق بالموصل 🏬' : 'Verified Store Owner')
                : user?.isSeller
                ? (isAr ? 'حساب بائع معتمد' : 'Seller Account (Active)')
                : user
                ? (isAr ? 'حساب مسجل بالبريد الإلكتروني' : 'Authenticated Account')
                : (isAr ? 'غير مسجل الدخول' : 'Guest Session')}
            </span>
            <span className="text-xs font-bold text-slate-900 font-mono">
              {user?.email || user?.phoneNumber || (isAr ? 'يرجى تسجيل الدخول' : 'Sign in to sync')}
            </span>
          </div>
          {user ? (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {isAr ? (user?.hasCustomStore ? 'مالك متجر موثق' : 'نشط') : 'Active'}
            </span>
          ) : (
            onOpenAuth && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1"
              >
                <LogIn className="w-3 h-3" />
                <span>{isAr ? 'دخول / تسجيل' : 'Sign In'}</span>
              </button>
            )
          )}
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

          {/* Avatar Upload to Supabase app-uploads */}
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="relative w-12 h-12 rounded-xl bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-slate-500" />
              )}
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <span className="text-[11px] font-bold text-slate-800 block">
                {isAr ? 'الصورة الشخصية (Supabase Storage)' : 'Profile Photo'}
              </span>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="mt-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1"
              >
                <Camera className="w-3 h-3" />
                <span>{isAr ? 'رفع صورة جديدة' : 'Upload Photo'}</span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
          </div>

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

          {/* Email */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
              {isAr ? 'البريد الإلكتروني' : 'Email'}
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

          <div className="pt-1.5 flex items-center gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 active:scale-98 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
            </button>

            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="h-9 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors flex items-center gap-1 border border-red-200"
                title={isAr ? 'تسجيل الخروج' : 'Log out'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isAr ? 'خروج' : 'Logout'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
