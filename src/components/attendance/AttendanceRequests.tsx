'use client';
import { memo, useState } from 'react';
import Link from '@/components/navigation/AppLink';
import type { AttendanceHistory } from '@/domain/attendance/history';
import { persianClock } from '@/lib/clock-format';
import { CalendarDays, CheckCircle2, ChevronDown, Clock3, MessagesSquare, XCircle } from 'lucide-react';
import { toPersianDate } from '@/lib/persian-date';
import { requestStatus, type TimeRequestSummary } from '@/types/attendance-review';
import { modeLabel } from '@/domain/attendance/work-sessions';
import s from './AttendanceWorkspace.module.css';
const clock = persianClock;
const dateTime = (stamp: string) => new Date(stamp).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
function title(request: TimeRequestSummary) {
 if (request.kind === 'late') return 'توضیح تأخیر';
 if (request.requested_until) return request.mode === 'mission' ? 'درخواست ثبت مأموریت' : 'درخواست ثبت ورود و خروج';
 return `${request.session_index !== null ? 'درخواست اصلاح' : 'درخواست ثبت'} ${request.action === 'start' ? 'ورود' : 'خروج'}`;
}
export const AttendanceRequests = memo(function AttendanceRequests({ requests, history, hasMore }: { requests: TimeRequestSummary[]; history: AttendanceHistory; hasMore: boolean }) {
 const [open, setOpen] = useState(history.requestsPage > 1);
 const href = (page: number) => `/attendance?month=${encodeURIComponent(history.month)}&requestsPage=${page}`;
 return <details className={s.correspondence} open={open} onToggle={event => setOpen(event.currentTarget.open)}>
  <summary className={s.correspondenceSummary}><MessagesSquare size={18} aria-hidden="true" /><span>تاریخچه مکاتبات</span><span className={s.correspondenceCount}>{requests.length.toLocaleString('fa-IR')}</span><ChevronDown size={18} aria-hidden="true" /></summary>
  {open && <>{!requests.length ? <p className={s.empty}>هنوز درخواستی ارسال نکرده‌اید. پس از ارسال، درخواست و پاسخ مدیریت در این قسمت نمایش داده می‌شود.</p> : <div className={s.requestList}>{requests.map(request => <article key={request.id} className={`${s.requestItem} ${s.correspondenceItem}`} data-status={request.status}>
   <div><strong>{title(request)}</strong><span className={s.requestBadge} data-status={request.status}>{request.status === 'pending' ? <Clock3 size={14} aria-hidden="true" /> : request.status === 'approved' ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />}{request.status === 'pending' ? 'در انتظار بررسی مدیریت' : requestStatus[request.status]}</span></div>
   <div className={s.requestMeta}><span><CalendarDays size={14} aria-hidden="true" />تاریخ تردد: {toPersianDate(request.work_date)}</span>{request.mode && <span>{modeLabel(request.mode)}</span>}{request.requested_at && <span><Clock3 size={14} aria-hidden="true" />ساعت {clock(request.requested_at)}{request.requested_until && ` تا ${clock(request.requested_until)}`}</span>}</div>
   <div className={s.correspondenceMessage}><span>متن درخواست شما · <time dateTime={request.created_at}>{dateTime(request.created_at)}</time></span><p>{request.reason}</p></div>
   {request.status === 'pending' ? <p className={s.correspondencePending}>درخواست ارسال شده است؛ پاسخ مدیریت همین‌جا نمایش داده می‌شود.</p> : <div className={`${s.correspondenceMessage} ${s.managementReply}`}><span>پاسخ مدیریت{request.reviewed_at && <> · <time dateTime={request.reviewed_at}>{dateTime(request.reviewed_at)}</time></>}</span><p>{request.review_note || (request.status === 'approved' ? 'درخواست شما تأیید شد.' : 'درخواست شما رد شد؛ مدیریت توضیحی ثبت نکرده است.')}</p></div>}
  </article>)}</div>}
  <nav className={s.historyNavigation} aria-label="صفحه‌های مکاتبات">
   {history.requestsPage > 1 && <Link prefetch={false} href={href(history.requestsPage - 1)}>صفحه قبل</Link>}
   <span>صفحه {history.requestsPage.toLocaleString('fa-IR')}</span>
   {hasMore && <Link prefetch={false} href={href(history.requestsPage + 1)}>صفحه بعد</Link>}
  </nav></>}
 </details>;
});
