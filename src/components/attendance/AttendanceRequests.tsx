'use client';
import { toPersianDate } from '@/lib/persian-date';
import { requestStatus, type TimeRequest } from '@/types/attendance-review';
import s from './AttendanceWorkspace.module.css';
const clock = (stamp: string) => new Date(stamp).toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' });
export function AttendanceRequests({ requests }: { requests: TimeRequest[] }) {
 return <section className={s.card}>
  <h2 className={s.requestsHeading}>درخواست‌های من</h2>
  {!requests.length ? <p className={s.empty}>درخواستی ثبت نشده است.</p> : <div className={s.requestList}>{requests.map(request => <article key={request.id} className={s.requestItem}>
   <div><strong>{request.kind === 'late' ? 'توضیح تأخیر' : `${request.requested_until ? request.mode === 'mission' ? 'ثبت مأموریت' : 'ثبت ورود و خروج' : request.action === 'start' ? 'ورود' : 'خروج'} · ${request.requested_at ? clock(request.requested_at) : ''}${request.requested_until ? ` تا ${clock(request.requested_until)}` : ''}`}</strong><span>{toPersianDate(request.work_date)} · {requestStatus[request.status]}</span></div>
   <p>{request.reason}</p>{request.review_note && <p>پاسخ مدیریت: {request.review_note}</p>}
  </article>)}</div>}
 </section>;
}
