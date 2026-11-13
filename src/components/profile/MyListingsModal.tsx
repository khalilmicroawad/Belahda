import React from 'react';
import {
  X,
  Trash2,
  CheckCircle,
  Eye,
  Plus,
  Store,
  User,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Listing } from '../../types';
import { calculateStoreUnlockProgress, REQUIRED_POSTS_FOR_STORE } from '../../utils/antiSpam';

interface MyListingsModalProps {
  listings: Listing[];
  onClose: () => void;
  onOpenCreate: () => void;
  onOpenCreateStore: () => void;
  onDeleteListing: (id: string) => void;
  onSelectListing: (listing: Listing) => void;
  onFastSeedListings?: () => void;
  lang?: 'ar' | 'en';
}

export const MyListingsModal: React.FC<MyListingsModalProps> = ({
  listings,
  onClose,
  onOpenCreate,
  onOpenCreateStore,
  onDeleteListing,
  onSelectListing,
  onFastSeedListings,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';

  const totalViews = listings.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0);
  const {
    validCount,
    spamCount,
    isUnlocked,
    remainingCount,
    percentage
  } = calculateStoreUnlockProgress(listings);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 select-none animate-fadeIn text-xs">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[88vh] border border-slate-200">
        {/* Header */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <div>
              <h2 className="text-xs font-bold text-slate-900 leading-none">
                {isAr ? 'إعلاناتي المعروضة' : 'My Listings'}
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

        {/* Store Unlock Tracker Banner (Requirement: 30 genuine non-spam listings unlock store) */}
        <div className="p-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white space-y-2 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1 text-[11px] text-emerald-400">
              <Store className="w-3.5 h-3.5" />
              <span>{isAr ? 'شرط فتح المتجر المجاني (30 إعلاناً معتمداً)' : 'Store Unlock: 30 Posts'}</span>
            </span>
            <span className="font-mono text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              {validCount} / {REQUIRED_POSTS_FOR_STORE} {isAr ? 'إعلاناً' : 'posts'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>{isAr ? `التقدم المنجز: ${percentage}%` : `Progress: ${percentage}%`}</span>
              <span>{isUnlocked ? (isAr ? '✓ اكتمل الشرط' : '✓ Unlocked') : (isAr ? `متبقي ${remainingCount} إعلاناً` : `${remainingCount} needed`)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isUnlocked ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Anti-spam notice if duplicate/short posts exist */}
          {spamCount > 0 && (
            <div className="flex items-center gap-1 text-[9px] text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
              <AlertTriangle className="w-3 h-3 shrink-0 text-amber-400" />
              <span>
                {isAr
                  ? `ملاحظة مكافحة التكرار: تم استبعاد ${spamCount} إعلانات مكررة أو تفتقر للتفاصيل من احتساب المتجر.`
                  : `${spamCount} low-quality/duplicate posts excluded.`}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-300 leading-tight">
              {isUnlocked
                ? (isAr ? '🎉 تهانينا! مؤهل الآن لفتح متجرك الخاص مجاناً' : 'Eligible! Ready to create store')
                : (isAr ? `انشر ${remainingCount} إعلاناً حقيقياً لفتح متجرك المعتمد` : `Publish ${remainingCount} more genuine posts`)}
            </span>

            {isUnlocked ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateStore();
                }}
                className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] shadow-sm transition-all active:scale-95"
              >
                {isAr ? 'إنشاء المتجر الآن' : 'Create Store'}
              </button>
            ) : (
              onFastSeedListings && (
                <button
                  type="button"
                  onClick={onFastSeedListings}
                  className="px-2 py-0.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 font-bold text-[9px] transition-colors"
                  title="توليد 30 إعلاناً للتجربة الفورية"
                >
                  {isAr ? '+30 إعلاناً للتجربة' : '+30 Sample Posts'}
                </button>
              )
            )}
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 p-2 bg-slate-50 border-b border-slate-100 text-center text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block">
              {isAr ? 'الإعلانات النشطة' : 'Active Items'}
            </span>
            <span className="text-sm font-black text-slate-900 font-mono">
              {listings.length}
            </span>
          </div>
          <div className="border-r rtl:border-r-0 rtl:border-l border-slate-200">
            <span className="text-[10px] text-slate-500 block">
              {isAr ? 'المشاهدات' : 'Views'}
            </span>
            <span className="text-sm font-black text-emerald-700 font-mono">
              {totalViews}
            </span>
          </div>
        </div>

        {/* Listings List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {listings.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-[11px] text-slate-500">
                {isAr ? 'لا توجد إعلانات منشورة حالياً' : 'No listings found'}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreate();
                }}
                className="text-[11px] font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-xl"
              >
                {isAr ? '+ أضف إعلانك الأول' : '+ Post First Item'}
              </button>
            </div>
          ) : (
            listings.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 hover:bg-slate-100 transition-colors"
              >
                <div
                  className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                  onClick={() => {
                    onClose();
                    onSelectListing(item);
                  }}
                >
                  <img
                    src={item.thumbnailUrl || (item.mediaUrls && item.mediaUrls[0]) || '/src/assets/images/listing_iphone_pro_1794306234850.jpg'}
                    alt={item.title || 'منتج'}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-200"
                  />
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {item.title}
                    </h3>
                    <p className="text-[10px] font-mono font-bold text-emerald-700">
                      {item.hidePrice
                        ? (isAr ? 'عند التواصل' : 'Contact')
                        : `${item.price.toLocaleString()} ${item.currency}`}
                    </p>
                    <span className="text-[9px] text-slate-400 block">
                      {item.district} · {item.createdAt}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteListing(item.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                  title={isAr ? 'حذف الإعلان' : 'Delete listing'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreate();
            }}
            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? 'إضافة إعلان جديد' : 'Post New Item'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
