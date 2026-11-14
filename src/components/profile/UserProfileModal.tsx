import React, { useState, useRef, useEffect } from 'react';
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
  LogIn,
  Store,
  ExternalLink,
  Package,
  PackageCheck,
  PackageX,
  Trash2,
  Image as ImageIcon,
  Handshake
} from 'lucide-react';
import { Listing, StoreProfile, UserAccount } from '../../types';
import { saveUserAccount, clearUserAccount } from '../../data/mockListings';
import {
  createUserFreeStore,
  fetchUserCommercialStats,
  fetchUserRepresentativeStats,
  signOutUser,
  uploadFileToStorage,
  upsertUserProfile
} from '../../lib/supabase';
import { isRepresentativeAd, REQUIRED_REPRESENTATIVE_ADS } from '../../lib/storeUtils';

const REQUIRED_COMMERCIAL_ADS = 30;

interface UserProfileModalProps {
  user: UserAccount | null;
  listings?: Listing[];
  onToggleSoldOut?: (listing: Listing, nextSoldOut: boolean) => Promise<void> | void;
  onDeleteAd?: (listing: Listing) => Promise<boolean> | boolean;
  updatingPostId?: string | null;
  deletingPostId?: string | null;
  onSelectListing?: (listing: Listing) => void;
  onUpdateUser: (user: UserAccount | null) => void;
  onOpenAuth?: () => void;
  onOpenStore?: (store: StoreProfile) => void;
  onOpenRepresentative?: (repId: string) => void;
  onStoreCreated?: (store: StoreProfile) => void;
  onClose: () => void;
  lang?: 'ar' | 'en';
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  listings = [],
  onToggleSoldOut,
  onDeleteAd,
  updatingPostId = null,
  deletingPostId = null,
  onSelectListing,
  onUpdateUser,
  onOpenAuth,
  onOpenStore,
  onOpenRepresentative,
  onStoreCreated,
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

  // Commercial ads progress & Free Store unlock state + Representative Corner unlock state
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [commercialCount, setCommercialCount] = useState(0);
  const [repCount, setRepCount] = useState(0);
  const [userStore, setUserStore] = useState<StoreProfile | null>(null);
  const [showCreateStoreForm, setShowCreateStoreForm] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStorePhone, setNewStorePhone] = useState(user?.phoneNumber || '');
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [storeSuccessMsg, setStoreSuccessMsg] = useState<string | null>(null);
  const [confirmDeleteAd, setConfirmDeleteAd] = useState<Listing | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      setCommercialCount(0);
      setRepCount(0);
      setUserStore(null);
      return;
    }

    setIsLoadingStats(true);
    Promise.all([
      fetchUserCommercialStats(user.id),
      fetchUserRepresentativeStats(user.id),
    ])
      .then(([commRes, repRes]) => {
        if (!active) return;
        setCommercialCount(commRes.commercialCount);
        setUserStore(commRes.userStore);
        setRepCount(repRes.repCount);
      })
      .finally(() => {
        if (active) setIsLoadingStats(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!newStorePhone && user?.phoneNumber) {
      setNewStorePhone(user.phoneNumber);
    }
  }, [user?.phoneNumber, newStorePhone]);

  useEffect(() => {
    if (!confirmDeleteAd) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && deletingPostId !== confirmDeleteAd.id) {
        setConfirmDeleteAd(null);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [confirmDeleteAd, deletingPostId]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploadingAvatar(true);

    try {
      const publicUrl = await uploadFileToStorage(file, 'avatars');
      setAvatarUrl(publicUrl);
    } catch {
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

  const handleCreateFreeStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setStoreError(null);

    if (!newStoreName.trim()) {
      setStoreError(isAr ? 'يرجى كتابة اسم المتجر' : 'Please enter a store name');
      return;
    }
    if (!newStorePhone.trim()) {
      setStoreError(isAr ? 'يرجى كتابة رقم هاتف المتجر' : 'Please enter store phone number');
      return;
    }

    setIsCreatingStore(true);
    try {
      const res = await createUserFreeStore({
        ownerId: user.id,
        storeName: newStoreName.trim(),
        phone: newStorePhone.trim(),
      });

      if (!res.ok || !res.store) {
        setStoreError(res.error || (isAr ? 'تعذر إنشاء المتجر' : 'Failed to create store'));
        return;
      }

      setUserStore(res.store);
      setShowCreateStoreForm(false);
      setStoreSuccessMsg(isAr ? 'تم إنشاء متجرك المجاني وربط إعلاناتك التجارية به!' : 'Store created!');

      const updatedUser: UserAccount = {
        ...user,
        isSeller: true,
        hasCustomStore: true,
        customStoreId: res.store.id,
      };
      saveUserAccount(updatedUser);
      await upsertUserProfile(updatedUser).catch(() => {});
      onUpdateUser(updatedUser);
      onStoreCreated?.(res.store);
    } finally {
      setIsCreatingStore(false);
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

  const myListings = user?.id
    ? listings.filter(
        (item) =>
          (item.sellerId && String(item.sellerId) === String(user.id)) ||
          (user.customStoreId &&
            item.storeId &&
            String(item.storeId) === String(user.customStoreId))
      )
    : [];

  const liveRepCount = myListings.filter((item) => isRepresentativeAd(item)).length;
  const effectiveRepCount = Math.max(repCount, liveRepCount);
  const repProgressPercent = Math.min(
    100,
    Math.round((effectiveRepCount / REQUIRED_REPRESENTATIVE_ADS) * 100)
  );
  const isRepCornerUnlocked = effectiveRepCount >= REQUIRED_REPRESENTATIVE_ADS;

  const progressPercent = Math.min(100, Math.round((commercialCount / REQUIRED_COMMERCIAL_ADS) * 100));
  const canUnlockStore = commercialCount >= REQUIRED_COMMERCIAL_ADS && !userStore;

  const handleConfirmDelete = async () => {
    if (!confirmDeleteAd || !onDeleteAd) return;
    const targetAd = confirmDeleteAd;
    const ok = await onDeleteAd(targetAd);
    if (ok) {
      if (targetAd.adType === 'commercial' || targetAd.sellerType === 'commercial') {
        setCommercialCount((prev) => Math.max(0, prev - 1));
      } else if (isRepresentativeAd(targetAd)) {
        setRepCount((prev) => Math.max(0, prev - 1));
      }
      setConfirmDeleteAd(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-3 select-none text-xs animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#E8C5A0] max-h-[92vh] flex flex-col animate-modal-up">
        {/* Header */}
        <div className="p-4 border-b border-[#E8C5A0]/80 flex items-center justify-between bg-[#FFE4C4]/75 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0D9488] text-white flex items-center justify-center overflow-hidden shadow-xs">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1E293B] leading-none">
                {isAr ? 'حسابي' : 'My Account'}
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

        <div className="overflow-y-auto flex-1">
          {/* Account Info Strip */}
          <div className="p-3.5 bg-teal-50/70 border-b border-teal-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-[11px] text-[#0F766E] font-semibold block">
                {userStore || user?.hasCustomStore
                  ? (isAr ? 'مالك متجر معتمد' : 'Store Owner')
                  : user
                  ? (isAr ? 'حساب نشط' : 'Authenticated Account')
                  : (isAr ? 'غير مسجل الدخول' : 'Guest Session')}
              </span>
              <span className="text-xs font-bold text-[#1E293B] tabular-nums">
                {user?.email || user?.phoneNumber || (isAr ? 'يرجى تسجيل الدخول' : 'Sign in')}
              </span>
            </div>
            {user ? (
              <span className="text-[11px] font-bold text-[#0F766E] inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488]" />
                {isAr ? 'نشط' : 'Active'}
              </span>
            ) : (
              onOpenAuth && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="group min-h-[36px] px-3 py-1.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <LogIn className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110 rtl:group-hover:-translate-x-0.5" />
                  <span>{isAr ? 'دخول / تسجيل' : 'Sign In'}</span>
                </button>
              )
            )}
          </div>

          {/* Free Store Unlock Progress (30 Commercial Ads) */}
          {user && (
            <div className="p-4 border-b border-[#E8C5A0]/70 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E293B]">
                  <Store className="w-4 h-4 text-[#0D9488]" />
                  <span>{isAr ? 'المتجر المجاني' : 'Free Store'}</span>
                </div>
                {isLoadingStats ? (
                  <Loader2 className="w-3.5 h-3.5 text-[#0D9488] animate-spin" />
                ) : (
                  <span className="text-xs font-bold tabular-nums text-[#0F766E]">
                    {commercialCount} / {REQUIRED_COMMERCIAL_ADS}
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-2.5 rounded-full bg-[#FFE4C4] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0D9488] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {isAr
                    ? `الإعلانات التجارية: ${commercialCount} / ${REQUIRED_COMMERCIAL_ADS} — انشر ${REQUIRED_COMMERCIAL_ADS} إعلاناً تجارياً لفتح متجرك المجاني!`
                    : `Commercial Ads: ${commercialCount} / ${REQUIRED_COMMERCIAL_ADS} — Reach 30 commercial ads to unlock your free Store!`}
                </p>
              </div>

              {storeSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0" />
                  <span>{storeSuccessMsg}</span>
                </div>
              )}

              {userStore ? (
                <div className="p-3 rounded-xl bg-[#FFE4C4]/70 border border-[#E8C5A0] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1E293B] truncate">{userStore.name}</p>
                    <p className="text-xs text-[#64748B] tabular-nums" dir="ltr">
                      {userStore.phoneNumber || userStore.ownerPhone}
                    </p>
                  </div>
                  {onOpenStore && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenStore(userStore);
                      }}
                      className="group min-h-[38px] px-3 py-1.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] active:scale-95 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-all"
                    >
                      <span>{isAr ? 'عرض متجري' : 'View Store'}</span>
                      <ExternalLink className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  )}
                </div>
              ) : canUnlockStore ? (
                showCreateStoreForm ? (
                  <form onSubmit={handleCreateFreeStore} className="p-3.5 rounded-2xl bg-[#FFE4C4]/45 border border-[#E8C5A0] space-y-2.5">
                    <p className="text-xs font-bold text-[#1E293B]">
                      {isAr ? 'إعداد متجرك المجاني' : 'Create Your Free Store'}
                    </p>

                    {storeError && (
                      <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{storeError}</span>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-[#1E293B] block mb-1">
                        {isAr ? 'اسم المتجر *' : 'Store Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={newStoreName}
                        onChange={(e) => setNewStoreName(e.target.value)}
                        placeholder={isAr ? 'مثال: معرض النخبة للإلكترونيات' : 'Store Name'}
                        className="w-full h-10 px-3 rounded-xl bg-white border border-[#E8C5A0] text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#1E293B] block mb-1">
                        {isAr ? 'رقم هاتف المتجر *' : 'Store Phone Number *'}
                      </label>
                      <input
                        type="tel"
                        required
                        value={newStorePhone}
                        onChange={(e) => setNewStorePhone(e.target.value)}
                        placeholder="0770XXXXXXX"
                        dir="ltr"
                        className="w-full h-10 px-3 rounded-xl bg-white border border-[#E8C5A0] text-xs tabular-nums text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0D9488] text-left"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isCreatingStore}
                        className="group flex-1 min-h-[40px] rounded-xl bg-[#0D9488] hover:bg-[#0F766E] active:scale-95 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        {isCreatingStore ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Store className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
                        )}
                        <span>{isAr ? 'تفعيل المتجر الآن' : 'Create Store'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateStoreForm(false)}
                        className="min-h-[40px] px-3.5 rounded-xl bg-white border border-[#E8C5A0] text-[#1E293B] text-xs font-semibold hover:bg-[#FFE4C4]/70 active:scale-95 transition-all inline-flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5 text-[#64748B]" />
                        <span>{isAr ? 'إلغاء' : 'Cancel'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCreateStoreForm(true)}
                    className="group w-full min-h-[44px] rounded-xl bg-[#0D9488] hover:bg-[#0F766E] active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Store className="w-4 h-4 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
                    <span>{isAr ? 'أنشئ متجرك المجاني' : 'Create Your Free Store'}</span>
                  </button>
                )
              ) : null}
            </div>
          )}

          {/* Representative Corner Unlock Progress (30 Representative Ads) */}
          {user && (
            <div className="p-4 border-b border-[#E8C5A0]/70 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E293B]">
                  <Handshake className="w-4 h-4 text-[#0D9488]" />
                  <span>{isAr ? 'ركن المندوب' : 'Representative Corner'}</span>
                </div>
                {isLoadingStats ? (
                  <Loader2 className="w-3.5 h-3.5 text-[#0D9488] animate-spin" />
                ) : (
                  <span className="text-xs font-bold tabular-nums text-[#0F766E]">
                    {effectiveRepCount} / {REQUIRED_REPRESENTATIVE_ADS}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="w-full h-2.5 rounded-full bg-[#FFE4C4] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0D9488] transition-all duration-300"
                    style={{ width: `${repProgressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {isRepCornerUnlocked
                    ? (isAr
                        ? 'تم تفعيل ركن المندوب الخاص بك! يمكن للمتسوقين تصفح عروضك ومشاركة رابط الركن مباشرة.'
                        : 'Your Representative Corner is unlocked and active!')
                    : (isAr
                        ? `إعلانات المندوب: ${effectiveRepCount} / ${REQUIRED_REPRESENTATIVE_ADS} — انشر ${REQUIRED_REPRESENTATIVE_ADS} إعلاناً كمندوب لفتح ركن المندوب الخاص بك!`
                        : `Representative Ads: ${effectiveRepCount} / ${REQUIRED_REPRESENTATIVE_ADS} — Reach 30 representative ads to unlock your Corner!`)}
                </p>
              </div>

              {isRepCornerUnlocked && onOpenRepresentative && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRepresentative(user.id);
                  }}
                  className="group w-full min-h-[42px] rounded-xl bg-[#0D9488] hover:bg-[#0F766E] active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Handshake className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                  <span>{isAr ? 'تصفح ركن المندوب' : 'Browse Representative Corner'}</span>
                  <ExternalLink className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              )}
            </div>
          )}

          {/* My Ads (إعلاناتي) with One-Tap Availability Toggle & Safe Delete */}
          {user && (
            <div className="p-4 border-b border-[#E8C5A0]/70 bg-[#FFE4C4]/35 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E293B]">
                  <Package className="w-4 h-4 text-[#0D9488]" />
                  <span>{isAr ? 'إعلاناتي' : 'My Ads'}</span>
                </div>
                <span className="text-[11px] font-bold text-[#0F766E] tabular-nums">
                  {myListings.length}
                </span>
              </div>

              {myListings.length === 0 ? (
                <p className="text-xs text-[#64748B] py-1">
                  {isAr ? 'لا توجد إعلانات منشورة لحسابك بعد.' : 'No ads published yet.'}
                </p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pl-0.5">
                  {myListings.map((item) => {
                    const thumb = item.thumbnailUrl || item.mediaUrls?.[0];
                    const isUpdating = updatingPostId === item.id;
                    const isDeleting = deletingPostId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`p-2 rounded-xl bg-white border border-[#E8C5A0] flex items-center justify-between gap-2 transition-opacity ${
                          item.isSoldOut ? 'opacity-80' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectListing) {
                              onClose();
                              onSelectListing(item);
                            }
                          }}
                          className="flex items-center gap-2.5 min-w-0 text-start flex-1"
                        >
                          <div className="w-10 h-10 rounded-lg bg-[#FFE4C4]/60 border border-[#E8C5A0] overflow-hidden shrink-0 flex items-center justify-center">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={item.title}
                                referrerPolicy="no-referrer"
                                className={`w-full h-full object-cover ${
                                  item.isSoldOut ? 'grayscale-[30%]' : ''
                                }`}
                              />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-[#C69363]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#1E293B] truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] font-semibold text-[#0F766E] tabular-nums">
                              {item.hidePrice
                                ? (isAr ? 'عند التواصل' : 'Contact')
                                : `${Number(item.price ?? 0).toLocaleString()} ${item.currency || 'د.ع'}`}
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {onToggleSoldOut && (
                            <button
                              type="button"
                              disabled={isUpdating || isDeleting}
                              onClick={() => onToggleSoldOut(item, !item.isSoldOut)}
                              className={`group min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shrink-0 transition-all active:scale-95 disabled:opacity-60 ${
                                item.isSoldOut
                                  ? 'bg-slate-800 hover:bg-slate-900 text-white'
                                  : 'bg-teal-50 hover:bg-teal-100 text-[#0F766E] border border-teal-200'
                              }`}
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : item.isSoldOut ? (
                                <PackageX className="w-3 h-3 text-[#FFE4C4] transition-transform duration-200 group-hover:scale-110" />
                              ) : (
                                <PackageCheck className="w-3 h-3 text-[#0D9488] transition-transform duration-200 group-hover:scale-110" />
                              )}
                              <span>
                                {item.isSoldOut
                                  ? (isAr ? 'نفدت الكمية' : 'Sold Out')
                                  : (isAr ? 'متوفر' : 'Available')}
                              </span>
                            </button>
                          )}

                          {onDeleteAd && (
                            <button
                              type="button"
                              disabled={isUpdating || isDeleting}
                              onClick={() => setConfirmDeleteAd(item)}
                              aria-label={isAr ? `حذف ${item.title}` : `Delete ${item.title}`}
                              className="group min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/80 inline-flex items-center gap-1 shrink-0 transition-all active:scale-95 disabled:opacity-60"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3 transition-transform duration-200 group-hover:scale-110" />
                              )}
                              <span>{isAr ? 'حذف' : 'Delete'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Edit Form */}
          <form onSubmit={handleSave} className="p-4 space-y-3">
            {saveSuccess && (
              <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
                <span>{isAr ? 'تم حفظ وتحديث بيانات حسابك بنجاح!' : 'Account updated!'}</span>
              </div>
            )}

            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Avatar Upload */}
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#FFE4C4]/55 border border-[#E8C5A0]">
              <div className="relative w-12 h-12 rounded-xl bg-[#FFE4C4] overflow-hidden shrink-0 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-[#0D9488]" />
                )}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-[#1E293B] block">
                  {isAr ? 'الصورة الشخصية' : 'Profile Photo'}
                </span>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="group mt-1 text-[11px] font-bold text-[#0F766E] hover:bg-teal-100/70 active:scale-95 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 inline-flex items-center gap-1 transition-all"
                >
                  <Camera className="w-3 h-3 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
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
              <label className="text-xs font-bold text-[#1E293B] block mb-1">
                {isAr ? 'الاسم *' : 'Name *'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: عمر الموصلي"
                  className="w-full h-10 px-3 rounded-xl bg-[#FFE4C4]/35 border border-[#E8C5A0] text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white transition-all"
                />
                <User className="w-3.5 h-3.5 text-[#64748B]/70 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Phone Number Field */}
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

            {/* Email */}
            <div>
              <label className="text-xs font-bold text-[#1E293B] block mb-1">
                {isAr ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="w-full h-10 px-3 rounded-xl bg-[#FFE4C4]/35 border border-[#E8C5A0] text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white text-left transition-all"
                />
                <Mail className="w-3.5 h-3.5 text-[#64748B]/70 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="group flex-1 min-h-[44px] rounded-xl bg-[#0D9488] hover:bg-[#0F766E] active:scale-95 disabled:opacity-60 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                )}
                <span>{isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
              </button>

              {user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="group min-h-[44px] px-3.5 rounded-xl bg-red-50 hover:bg-red-100 active:scale-95 text-red-700 text-xs font-bold transition-all flex items-center gap-1 border border-red-200"
                  title={isAr ? 'تسجيل الخروج' : 'Log out'}
                >
                  <LogOut className="w-4 h-4 transition-transform duration-200 rtl:group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5" />
                  <span>{isAr ? 'خروج' : 'Logout'}</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Safe Delete Confirmation Dialog */}
      {confirmDeleteAd && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
          className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => {
            if (deletingPostId !== confirmDeleteAd.id) {
              setConfirmDeleteAd(null);
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-xs rounded-2xl border border-[#E8C5A0] shadow-2xl p-5 space-y-4 animate-modal-up text-center"
          >
            <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200/80 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="space-y-1.5">
              <h3 id="confirm-delete-title" className="text-sm font-extrabold text-[#1E293B]">
                {isAr ? 'تأكيد حذف الإعلان' : 'Confirm Delete'}
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                {isAr
                  ? 'هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.'
                  : 'Are you sure you want to delete this ad? This action cannot be undone.'}
              </p>
              {confirmDeleteAd.title && (
                <p className="text-xs font-bold text-[#0F766E] truncate px-2 pt-0.5">
                  «{confirmDeleteAd.title}»
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={deletingPostId === confirmDeleteAd.id}
                onClick={handleConfirmDelete}
                className="flex-1 min-h-[40px] px-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                {deletingPostId === confirmDeleteAd.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isAr ? 'نعم، احذف الإعلان' : 'Yes, Delete Ad'}</span>
              </button>

              <button
                type="button"
                disabled={deletingPostId === confirmDeleteAd.id}
                onClick={() => setConfirmDeleteAd(null)}
                className="min-h-[40px] px-4 rounded-xl bg-[#FFE4C4] hover:bg-[#F5D0A9] active:scale-95 disabled:opacity-60 text-[#1E293B] border border-[#E8C5A0] text-xs font-bold transition-all"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
