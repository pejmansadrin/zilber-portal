'use client';

import { Select } from "@/components/ui/Select";

import React, { useState } from 'react';
import { submitMissionRequest } from '@/actions/attendance';
import { Briefcase, MapPin, X, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface MissionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MissionRequestModal({ isOpen, onClose, onSuccess }: MissionRequestModalProps) {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [transportType, setTransportType] = useState('سازمانی');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await submitMissionRequest({
        destination,
        startDate: startDate || new Date().toISOString(),
        endDate: endDate || startDate || new Date().toISOString(),
        purpose,
        transportType,
      });

      if (res.success) {
        setMessage({ text: res.message || 'درخواست با موفقیت ثبت شد', type: 'success' });
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 1200);
      } else {
        setMessage({ text: res.error || 'خطا در ثبت درخواست', type: 'error' });
      }
    } catch {
      setMessage({ text: 'خطایی رخ داد', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-scrim animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-right">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-[#16214f] dark:text-blue-400 font-bold text-lg">
            <Briefcase className="w-5 h-5" />
            <span>ثبت درخواست مأموریت کاری</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              مقصد مأموریت / پروژه
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="مثلاً: دفتر کارفرما، سایت دیتاسنتر و..."
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#16214f]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                تاریخ شروع
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#16214f]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                تاریخ پایان
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#16214f]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              نحوه ایاب و ذهاب
            </label>
            <Select
              aria-label="نحوه ایاب و ذهاب"
              value={transportType}
              onChange={(e) => setTransportType(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#16214f]"
            >
              <option value="سازمانی">خودروی شرکت / سرویس سازمانی</option>
              <option value="شخصی">وسیله نقلیه شخصی</option>
              <option value="هوایی">هوایی (پرواز)</option>
              <option value="عمومی">تاکسی اینترنتی / عمومی</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              شرح هدف مأموریت
            </label>
            <textarea
              rows={3}
              required
              placeholder="شرح کارهایی که در طول این مأموریت انجام خواهد شد..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#16214f]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#16214f] hover:bg-[#0e1635] text-white text-sm font-bold shadow-md shadow-blue-950/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>ثبت مأموریت</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
