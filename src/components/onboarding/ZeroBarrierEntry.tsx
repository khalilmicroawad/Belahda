import React from 'react';
import { ShoppingBag, PlusCircle, ArrowLeft, ArrowRight, ShieldCheck, Zap, Globe, Sparkles, MapPin, Store } from 'lucide-react';
import { CATEGORIES } from '../../data/categories';

interface ZeroBarrierEntryProps {
  onSelectBuy: () => void;
  onSelectSell: () => void;
  onSelectStores?: () => void;
  onToggleLang?: () => void;
  lang?: 'ar' | 'en';
}

export const ZeroBarrierEntry: React.FC<ZeroBarrierEntryProps> = ({
  onSelectBuy,
  onSelectSell,
  onSelectStores,
  onToggleLang,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';

  return (
    <div className="flex flex-col min-h-full bg-slate-50 text-slate-900 justify-between p-3.5 sm:p-5 select-none text-xs">
      {/* Top Bar with Brand & Location Badge */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/20">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black tracking-tight text-slate-950 leading-none">
                سوق بلحظة
              </h1>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                الموصل
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              بيع وشراء فوري · السوق العراقي
            </span>
          </div>
        </div>

        {onToggleLang && (
          <button
            type="button"
            onClick={onToggleLang}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs"
          >
            <Globe className="w-3 h-3 text-slate-500" />
            <span>{isAr ? 'English' : 'العربية'}</span>
          </button>
        )}
      </div>

      {/* Hero Welcome Message with Compact Typography */}
      <div className="py-3 text-center space-y-1 my-auto">
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-900 text-[10px] font-bold">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>منصة البيع والشراء فائقة السرعة في الموصل</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-snug">
          ماذا ترغب أن تفعل اليوم؟
        </h2>
        <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
          تصفح المعروضات والمتاجر في الموصل، أو انشر إعلانك في لحظات مع إنشاء حسابك التلقائي
        </p>
      </div>

      {/* CORE ZERO-BARRIER CHOICES */}
      <div className="space-y-2.5 my-auto">
        {/* ACTION 1: [ BUY / شراء ] */}
        <button
          type="button"
          onClick={onSelectBuy}
          className="w-full p-3.5 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-600 hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-between group text-right shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-slate-950 group-hover:text-emerald-700 transition-colors">
                  شراء
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  / BUY
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-snug">
                عرض كافة الإعلانات المضافة بالموصل مصنفة حسب التاريخ والحي والصنف
              </p>
            </div>
          </div>

          <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-slate-600 transition-all shrink-0">
            {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </div>
        </button>

        {/* ACTION 2: [ SELL / بيع ] */}
        <button
          type="button"
          onClick={onSelectSell}
          className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-between group text-right"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-xs shrink-0">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-white">
                  بيع
                </span>
                <span className="text-[11px] text-emerald-200 font-normal">
                  / SELL
                </span>
              </div>
              <p className="text-[10px] text-emerald-100 leading-snug">
                أضف إعلانك مع الصور وخيار التوصيل ونشر فوري بالموصل
              </p>
            </div>
          </div>

          <div className="w-7 h-7 rounded-full bg-white/20 group-hover:bg-white group-hover:text-emerald-700 flex items-center justify-center text-white transition-all shrink-0">
            {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </div>
        </button>

        {/* ACTION 3: [ STORES / متاجر الموصل ] */}
        {onSelectStores && (
          <button
            type="button"
            onClick={onSelectStores}
            className="w-full p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm active:scale-[0.98] transition-all flex items-center justify-between text-right"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <span>متاجر الموصل (Stores)</span>
                  <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-mono">جديد</span>
                </span>
                <p className="text-[10px] text-slate-400">
                  تصفح المتاجر المعتمدة ومحلات ومعارض الموصل الرسمية
                </p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
              {isAr ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
            </div>
          </button>
        )}
      </div>

      {/* Trust & Category Strip */}
      <div className="pt-3 space-y-2">
        <div className="flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {CATEGORIES.slice(0, 4).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={onSelectBuy}
              className="text-[10px] font-semibold text-slate-600 bg-white hover:bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 transition-colors whitespace-nowrap"
            >
              {c.nameAr}
            </button>
          ))}
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-200 text-center text-slate-500">
          <div className="flex flex-col items-center">
            <MapPin className="w-3 h-3 text-emerald-600 mb-0.5" />
            <span className="text-[10px] font-bold text-slate-800">مدينة الموصل</span>
            <span className="text-[9px] text-slate-400">كافة الأحياء</span>
          </div>

          <div className="flex flex-col items-center">
            <Store className="w-3 h-3 text-emerald-600 mb-0.5" />
            <span className="text-[10px] font-bold text-slate-800">متاجر خاصة</span>
            <span className="text-[9px] text-slate-400">لأكثر من 10 إعلانات</span>
          </div>

          <div className="flex flex-col items-center">
            <ShieldCheck className="w-3 h-3 text-emerald-600 mb-0.5" />
            <span className="text-[10px] font-bold text-slate-800">تواصل موثق</span>
            <span className="text-[9px] text-slate-400">واتساب ومحادثة</span>
          </div>
        </div>
      </div>
    </div>
  );
};
