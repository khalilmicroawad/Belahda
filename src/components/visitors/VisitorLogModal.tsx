import React, { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  Clock,
  MapPin,
  Smartphone,
  Laptop,
  X,
  RefreshCw,
  Sparkles,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

interface VisitorLogModalProps {
  onClose: () => void;
  lang?: 'ar' | 'en';
}

interface VisitorRecord {
  id: number;
  visitorId: string;
  page: string;
  city: string;
  device: string;
  visitedAt: string;
}

import { fetchSupabaseVisitors } from '../../lib/supabase';

export const VisitorLogModal: React.FC<VisitorLogModalProps> = ({ onClose, lang = 'ar' }) => {
  const isAr = lang === 'ar';
  const [totalCount, setTotalCount] = useState<number>(0);
  const [records, setRecords] = useState<VisitorRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const supaData = await fetchSupabaseVisitors();
      if (supaData) {
        setTotalCount(supaData.totalVisitors || 0);
        setRecords(supaData.recentVisitors || []);
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/visitors');
      if (res.ok) {
        const data = await res.json();
        setTotalCount(data.totalVisitors || 0);
        setRecords(data.recentVisitors || []);
      }
    } catch (err) {
      console.warn('Error fetching visitors log:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatTime = (isoString?: string) => {
    if (!isoString) return isAr ? 'الآن' : 'Just now';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isAr ? 'منذ قليل' : 'Recently';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-3 select-none text-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md mx-auto sm:rounded-3xl rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold leading-tight">
                {isAr ? 'عداد وسجل زوار سوق بلحظة' : 'Souq Belahdha Visitor Log'}
              </h2>
              <span className="text-[10px] text-slate-400">
                {isAr ? 'رصد حي ومباشر للمتصفحين في الموصل' : 'Live visits in Mosul'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isAr ? 'تحديث السجل' : 'Refresh'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Counter Summary Cards */}
        <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-emerald-100 grid grid-cols-2 gap-2">
          <div className="p-3 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs space-y-0.5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold text-slate-600">
                {isAr ? 'إجمالي الزيارات' : 'Total Visits'}
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-mono text-emerald-900 tabular-nums">
                {totalCount.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-emerald-700">
                {isAr ? 'زيارة موثقة' : 'visits'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs space-y-0.5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold text-slate-600">
                {isAr ? 'المدينة النشطة' : 'Active Region'}
              </span>
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-slate-900">
                {isAr ? 'مدينة الموصل' : 'Mosul City'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          </div>
        </div>

        {/* Log Entries List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pb-1">
            <span>{isAr ? 'آخر الزيارات المسجلة:' : 'Recent Visitor Records:'}</span>
            <span className="text-[10px] text-slate-400 font-normal">
              {isAr ? 'سجل قاعدة البيانات المباشر' : 'Live Database Log'}
            </span>
          </div>

          {isLoading ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <span className="text-[11px] text-slate-400">
                {isAr ? 'جاري تحميل سجل الزوار...' : 'Loading visitor log...'}
              </span>
            </div>
          ) : records.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              {isAr ? 'لا توجد سجلات حالية' : 'No records found'}
            </div>
          ) : (
            records.map((r, i) => (
              <div
                key={r.id || i}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px] hover:bg-emerald-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                    {r.device === 'desktop' ? (
                      <Laptop className="w-3.5 h-3.5 text-slate-700" />
                    ) : (
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block leading-tight">
                      {isAr ? 'زائر من الموصل' : 'Visitor from Mosul'}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {isAr ? `تصفح: ${r.page === 'feed' ? 'قائمة الشراء' : r.page === 'stores' ? 'دليل المتاجر' : 'الرئيسية'}` : r.page}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-slate-500 block">
                    {formatTime(r.visitedAt)}
                  </span>
                  <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">
                    {isAr ? 'متصل' : 'Logged'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAr ? 'سجل محمي ومحفوظ على قاعدة بيانات Cloud SQL' : 'Cloud SQL PostgreSQL Log'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] transition-colors"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
