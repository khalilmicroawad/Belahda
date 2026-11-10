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
  ArrowRight
} from 'lucide-react';
import { Listing } from '../../types';

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
  const isStoreEligible = listings.length >= 10;

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

        {/* Store Unlock Tracker Banner (Requirement: 10+ listings unlocks store) */}
        <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white space-y-1.5 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1 text-[11px] text-emerald-400">
              <Store className="w-3.5 h-3.5" />
              <span>{isAr ? 'فتح متجر خاص بك (Store)' : 'Store Unlock Status'}</span>
            </span>
            <span className="font-mono text-[10px] text-slate-300">
              {listings.length} / 10 {isAr ? 'إعلانات' : 'items'}
            </span>
          </div>

          <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isStoreEligible ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.min(100, (listings.length / 10) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px] text-slate-300">
              {isStoreEligible
                ? (isAr ? 'مؤهل الآن لإنشاء متجرك الخاص مجاناً!' : 'Unlocked! Ready to create store')
                : (isAr ? `أضف ${10 - listings.length} إعلانات إضافية لفتح متجرك` : `${10 - listings.length} more needed`)}
            </span>

            {isStoreEligible ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateStore();
                }}
                className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] transition-colors"
              >
                {isAr ? 'إنشاء المتجر الآن' : 'Create Store'}
              </button>
            ) : (
              onFastSeedListings && (
                <button
                  type="button"
                  onClick={onFastSeedListings}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold text-[9px]"
                  title="إضافة 10 إعلانات تجريبية لفتح المتجر فوراً"
                >
                  {isAr ? '+10 للتجربة الفورية' : '+10 Sample'}
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
                    src={item.mediaUrls[0]}
                    alt={item.title}
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
