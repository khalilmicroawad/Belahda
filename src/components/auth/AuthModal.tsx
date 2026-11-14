import React, { useState } from 'react';
import {
  X,
  Lock,
  Phone,
  User,
  Mail,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  LogIn,
  UserPlus,
  Loader2
} from 'lucide-react';
import { UserAccount } from '../../types';
import { saveUserAccount } from '../../data/mockListings';
import {
  signInWithEmail,
  signUpWithEmail,
  fetchUserProfile,
  mapAuthUserToAccount
} from '../../lib/supabase';

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

  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError(isAr ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email address');
      return;
    }

    if (!password || password.length < 6) {
      setError(
        isAr
          ? 'كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل'
          : 'Password must be at least 6 characters'
      );
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError(isAr ? 'يرجى كتابة الاسم الكامل' : 'Please enter your full name');
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
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const res = await signUpWithEmail({
          email: trimmedEmail,
          password,
          name: name.trim(),
          phoneNumber: phoneNumber.trim(),
          isSeller: false,
        });

        if (res.user && !res.session) {
          // Email confirmation is enabled on the Supabase project
          setInfoMsg(
            isAr
              ? 'تم إنشاء حسابك بنجاح! يرجى تأكيد بريدك الإلكتروني عبر الرابط المرسل ثم تسجيل الدخول.'
              : 'Account created! Please check your email to confirm your account, then sign in.'
          );
          setMode('login');
          setIsLoading(false);
          return;
        }

        if (res.user) {
          const account = mapAuthUserToAccount(res.user, {
            name: name.trim(),
            phone_number: phoneNumber.trim(),
            email: trimmedEmail,
            is_seller: false,
          });
          saveUserAccount(account);
          onSuccess(account);
        }
      } else {
        const res = await signInWithEmail(trimmedEmail, password);
        if (res.user) {
          const profile = await fetchUserProfile(res.user.id);
          const account = mapAuthUserToAccount(res.user, profile);
          saveUserAccount(account);
          onSuccess(account);
        }
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Invalid login credentials')) {
        setError(
          isAr
            ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            : 'Invalid email or password'
        );
      } else if (msg.includes('User already registered')) {
        setError(
          isAr
            ? 'هذا البريد الإلكتروني مسجل مسبقاً، يرجى تسجيل الدخول'
            : 'Email already registered. Please sign in.'
        );
        setMode('login');
      } else if (msg.includes('Email not confirmed')) {
        setError(
          isAr
            ? 'يرجى تأكيد بريدك الإلكتروني أولاً عبر الرسالة المرسلة لبريدك'
            : 'Please confirm your email address before signing in'
        );
      } else {
        setError(msg || (isAr ? 'حدث خطأ أثناء المصادقة، يرجى المحاولة مجدداً' : 'Authentication failed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-3 select-none animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-[#E8C5A0] animate-modal-up">
        {/* Header */}
        <div className="p-4 border-b border-[#E8C5A0]/80 flex items-center justify-between bg-[#FFE4C4]/75">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0D9488] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1E293B] leading-none">
                {mode === 'signup'
                  ? (isAr ? 'إنشاء حساب جديد' : 'Create Account')
                  : (isAr ? 'تسجيل الدخول' : 'Sign In')}
              </h2>
              <span className="text-[11px] text-[#64748B]">
                {isAr ? 'سوق بلحظة' : 'Souq Belahdha'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="group min-w-[36px] min-h-[36px] text-[#64748B] hover:text-[#1E293B] rounded-xl hover:bg-[#FFE4C4] active:scale-90 flex items-center justify-center transition-all"
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
          </button>
        </div>

        {/* Auth Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-2 bg-[#FFE4C4] border-b border-[#E8C5A0]">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`group min-h-[38px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              mode === 'signup'
                ? 'bg-white text-[#0F766E] shadow-xs'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
            <span>{isAr ? 'حساب جديد' : 'Sign Up'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`group min-h-[38px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              mode === 'login'
                ? 'bg-white text-[#0F766E] shadow-xs'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
            <span>{isAr ? 'تسجيل الدخول' : 'Login'}</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {purposeMessage && (
            <div className="p-3 rounded-xl bg-[#FFE4C4]/70 border border-[#E8C5A0] text-[#1E293B] text-xs leading-relaxed">
              {purposeMessage}
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div>
                <label className="text-xs font-bold text-[#1E293B] block mb-1">
                  {isAr ? 'الاسم الكامل *' : 'Full Name *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isAr ? 'مثال: أحمد الموصلي' : 'e.g. Ahmed'}
                    className="w-full h-10 px-3 rounded-xl bg-[#FFE4C4]/35 border border-[#E8C5A0] text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white transition-all"
                  />
                  <User className="w-3.5 h-3.5 text-[#64748B]/70 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1E293B] block mb-1">
                  {isAr ? 'رقم الهاتف *' : 'Phone Number *'}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0770XXXXXXX"
                    className="w-full h-10 px-3 rounded-xl bg-[#FFE4C4]/35 border border-[#E8C5A0] text-xs tabular-nums text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white text-left transition-all"
                  />
                  <Phone className="w-3.5 h-3.5 text-[#64748B]/70 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-bold text-[#1E293B] block mb-1">
              {isAr ? 'البريد الإلكتروني *' : 'Email Address *'}
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-10 px-3 rounded-xl bg-[#FFE4C4]/35 border border-[#E8C5A0] text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white text-left transition-all"
              />
              <Mail className="w-3.5 h-3.5 text-[#64748B]/70 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#1E293B]">
                {isAr ? 'كلمة المرور *' : 'Password *'}
              </label>
              <span className="text-[11px] text-[#64748B] tabular-nums">
                {password.length}/6+
              </span>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 rounded-xl bg-[#FFE4C4]/35 border border-[#E8C5A0] text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white text-left transition-all"
              />
              <Lock className="w-3.5 h-3.5 text-[#64748B]/70 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group w-full min-h-[46px] rounded-xl bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-60 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'signup' ? (
              <UserPlus className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
            ) : (
              <LogIn className="w-4 h-4 transition-transform duration-200 group-hover:scale-110 rtl:group-hover:-translate-x-0.5" />
            )}
            <span>
              {isLoading
                ? (isAr ? 'جاري التحقق...' : 'Processing...')
                : mode === 'signup'
                ? (isAr ? 'إنشاء الحساب ومتابعة الاستخدام' : 'Create Account & Continue')
                : (isAr ? 'تسجيل الدخول' : 'Sign In')}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
