'use client';

import React, { useState } from 'react';
import { Calendar, Briefcase } from 'lucide-react';
import { LeaveRequestModal } from './LeaveRequestModal';
import { MissionRequestModal } from './MissionRequestModal';

export function DashboardActions() {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowLeaveModal(true)}
          className="px-4 py-2.5 rounded-xl glass-surface [--glass-tint:rgb(255_255_255_/_12%)] [--glass-shadow:none] hover:[--glass-tint:rgb(255_255_255_/_20%)] text-white text-sm font-semibold border border-white/20  flex items-center gap-2 transition-all active:scale-[0.98]"
        >
          <Calendar className="w-4 h-4 text-blue-300" />
          <span>درخواست مرخصی</span>
        </button>

        <button
          onClick={() => setShowMissionModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-900/30 flex items-center gap-2 transition-all active:scale-[0.98]"
        >
          <Briefcase className="w-4 h-4 text-white" />
          <span>ثبت مأموریت</span>
        </button>
      </div>

      <LeaveRequestModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
      />

      <MissionRequestModal
        isOpen={showMissionModal}
        onClose={() => setShowMissionModal(false)}
      />
    </>
  );
}
