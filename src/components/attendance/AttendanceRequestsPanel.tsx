'use client';
import { useState } from 'react';
import type { AttendanceHistory } from '@/domain/attendance/history';
import type { TimeRequestSummary } from '@/types/attendance-review';
import { usePrivateResource } from '@/lib/use-private-resource';
import { AttendanceRequests } from './AttendanceRequests';

export default function AttendanceRequestsPanel({ history: initialHistory, revision }: { history: AttendanceHistory; revision: string }) {
  const [history, setHistory] = useState(initialHistory);
  const { data, error, retry } = usePrivateResource<{ requests: TimeRequestSummary[]; hasMoreRequests: boolean }>(`/api/attendance/history?section=requests&requestsPage=${history.requestsPage}`, revision);
  if (error) return <p role="alert">{error} <button type="button" onClick={retry}>تلاش دوباره</button></p>;
  if (!data) return <p role="status">در حال دریافت مکاتبات…</p>;
  return <AttendanceRequests requests={data.requests} history={history} hasMore={data.hasMoreRequests} expanded
    onPageChange={requestsPage => setHistory(previous => ({ ...previous, requestsPage }))} />;
}
