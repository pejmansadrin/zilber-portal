'use client';

import React, { useState } from 'react';
import { reviewLeaveRequest, reviewMissionRequest } from '@/actions/admin';
import { Check, X, Calendar, Briefcase, Loader2, AlertCircle } from 'lucide-react';

interface ApprovalInboxProps {
  leaves: any[];
  missions: any[];
}

export function ApprovalInbox({ leaves, missions }: ApprovalInboxProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const handleReviewLeave = async (id: string, status: 'approved' | 'rejected') => {
    setProcessingId(id);
    setMessage(null);
    try {
      const res = await reviewLeaveRequest(id, status, noteInputs[id]);
      if (res.success) {
        setMessage(res.message || 'انجام شد');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReviewMission = async (id: string, status: 'approved' | 'rejected') => {
    setProcessingId(id);
    setMessage(null);
    try {
      const res = await reviewMissionRequest(id, status, noteInputs[id]);
      if (res.success) {
        setMessage(res.message || 'انجام شد');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const pendingLeaves = leaves.filter((l) => l.status === 'pending');
  const pendingMissions = missions.filter((m) => m.status === 'pending');

  return (
    <div className="space-y-6">
      {message && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-sm font-medium border border-blue-200 dark:border-blue-900">
          {message}
        </div>
      )}

      {/* Leaves Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>درخواست‌های مرخصی در انتظار تایید ({pendingLeaves.length})</span>
          </div>
        </div>

        {pendingLeaves.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">هیچ درخواست مرخصی در انتظاری وجود ندارد.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendingLeaves.map((l) => (
              <div key={l.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {l.profile?.full_name || 'کارمند زیلبر'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">({l.profile?.employee_code})</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                      {l.type === 'hourly' ? `ساعتی (${l.hours} ساعت)` : 'روزانه'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    علت: {l.reason}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    بازه: {new Date(l.start_date).toLocaleDateString('fa-IR')} تا {new Date(l.end_date).toLocaleDateString('fa-IR')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="یادداشت مدیر (اختیاری)..."
                    value={noteInputs[l.id] || ''}
                    onChange={(e) => setNoteInputs({ ...noteInputs, [l.id]: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs w-48"
                  />
                  <button
                    disabled={processingId === l.id}
                    onClick={() => handleReviewLeave(l.id, 'approved')}
                    className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                    title="تایید درخواست"
                  >
                    {processingId === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    disabled={processingId === l.id}
                    onClick={() => handleReviewLeave(l.id, 'rejected')}
                    className="p-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                    title="رد درخواست"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Missions Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <span>درخواست‌های مأموریت در انتظار تایید ({pendingMissions.length})</span>
          </div>
        </div>

        {pendingMissions.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">هیچ درخواست مأموریتی در انتظاری وجود ندارد.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendingMissions.map((m) => (
              <div key={m.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {m.profile?.full_name || 'کارمند زیلبر'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                      مقصد: {m.destination}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    شرح: {m.purpose}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    بازه: {new Date(m.start_date).toLocaleDateString('fa-IR')} تا {new Date(m.end_date).toLocaleDateString('fa-IR')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="یادداشت مدیر..."
                    value={noteInputs[m.id] || ''}
                    onChange={(e) => setNoteInputs({ ...noteInputs, [m.id]: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs w-48"
                  />
                  <button
                    disabled={processingId === m.id}
                    onClick={() => handleReviewMission(m.id, 'approved')}
                    className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                    title="تایید مأموریت"
                  >
                    {processingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    disabled={processingId === m.id}
                    onClick={() => handleReviewMission(m.id, 'rejected')}
                    className="p-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                    title="رد مأموریت"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
