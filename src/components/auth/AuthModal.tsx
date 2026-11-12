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
                {mode === 'signup'
                  ? (isAr ? 'إنشاء حساب جديد' : 'Create Account')
                  : (isAr ? 'تسجيل الدخول' : 'Sign In')}
              </h2>
              <span className="text-[10px] text-slate-500">
                {isAr ? 'سوق بلحظة · حساب سحابي مؤمّن' : 'Souq Belahdha · Cloud Auth'}
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

        {/* Auth Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-2 bg-slate-100 border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`h-8 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
              mode === 'signup'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{isAr ? 'حساب جديد' : 'Sign Up'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`h-8 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
              mode === 'login'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{isAr ? 'تسجيل الدخول' : 'Login'}</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-2.5">
          {purposeMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
              {purposeMessage}
            </div>
          )}

          {infoMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-[11px] flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-start gap-1.5 animate-shake">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'signup' && (
            <>
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
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
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
                    placeholder="0770XXXXXXX"
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-left"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </>
          )}

          {/* Email Field */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              {isAr ? 'البريد الإلكتروني *' : 'Email Address *'}
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-left font-mono"
              />
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700">
                {isAr ? 'كلمة المرور *' : 'Password *'}
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
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
                className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-left font-mono"
              />
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 active:scale-98 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'signup' ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <LogIn className="w-4 h-4" />
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
