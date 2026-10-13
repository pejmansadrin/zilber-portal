# Attendance and approval workflow

Employees use `/attendance`. The super-admin panel (`/people`) links to `/admin/attendance`, which shows all recorded attendance and the request inbox. Users without the existing `super_admin` role cannot read other users' attendance or review requests.

Normal registration persists immediately and accepts only timestamps in the preceding 15 minutes through the database's current time. Office and remote sessions can be switched, and missions overlay an active base session. Overnight exits belong to the day the base session started. Times are stored as ISO timestamps and dates, with Tehran time and Jalali dates in the UI.

The daily registration flow has only two modes: immediate registration within the preceding 15 minutes, or a current-day request awaiting management approval. The time picker contains only the management checkbox and a required reason. Its approval mode offers today's elapsed minutes; it has no date, session, overnight or request-kind controls. The main entry/exit buttons submit new current-day transitions with no edit index. An entry starts a new session (or switches work mode); an exit closes the active session. Existing timestamps are never edited through this daily flow. No future timestamp is accepted. A pending entry must be approved before its session is available for an exit.

A separate collapsed “درخواست ثبت یا اصلاح تردد” section holds Jalali date selection, previous-session corrections, missed historic transitions, overnight times and standalone late-arrival explanations. It has independent form state and its own submission button. All these requests also require management review. The database serializes mutations per user and validates session ordering, mission containment and overlapping days. Approval and timestamp changes happen in the same transaction. A request whose attendance revision has changed must be rejected and resubmitted. Late-arrival explanations never change timestamps or automatically excuse a work-hours shortfall.

`portal_work_days` stores authoritative sessions. `portal_time_requests` stores the original sessions, requested timestamp, reason, status, reviewer, note and review time. Both tables have RLS and authenticated SELECT grants only. Writes go through authenticated RPC wrappers and authorization checks in the private schema; neither a client nor a Server Action receives a service-role key.

Migration `20261004065216_attendance_review.sql` was applied and recorded on the existing cloud project `otsgzpazmmnfeacysdnl`. The cloud does not contain the prototype's `profiles` or legacy `attendance_logs` tables. Older local migration versions already differ from cloud history; this change records only its own version and does not reconcile that earlier history.

Validation:

```bash
SUPABASE_TELEMETRY_DISABLED=1 npx supabase db query --linked --project-ref otsgzpazmmnfeacysdnl --file supabase/tests/attendance_review.sql
npx next build --webpack
```

The SQL test creates temporary fixtures inside a transaction and rolls everything back. It checks time restrictions, isolation, denied direct writes, duplicate pending requests, approval, rejection, stale approval, mission behavior, audit fields, and HR/anonymous boundaries. Targeted ESLint checks and the Webpack production build passed. The default Turbopack build encountered a port-binding restriction in the execution environment. Full-repository lint still has pre-existing `any` errors in `ApprovalInbox.tsx`. Browser interaction/visual QA and frontend production deployment have not been performed.

The shared time picker uses a native `dialog.showModal()` top layer. A fixed header and footer surround an independently scrolling body. Its bounds follow `visualViewport` resize/scroll events, screen safe-area insets and orientation changes, including when the mobile keyboard reduces visible space. Mobile uses a bottom-aligned sheet; desktop uses a centered dialog. Escape and the close control dismiss it, native modal focus containment keeps keyboard navigation inside, and dismissal preserves the unsubmitted request draft. User-facing labels say “مدیریت”; the stored authorization role remains unchanged. Browser QA could not run because no browser provider was available in this session.

The request area expands/collapses with a CSS grid height transition and respects reduced motion. The Jalali calendar uses the existing Persian Intl conversion, computes month lengths from consecutive month boundaries, disables future dates, and supports RTL keyboard navigation, month/year selection and a Today shortcut. Its controlled value is an ISO date. Run `node ops/qa/jalali-calendar.mjs` for fixed Nowruz/leap-day fixtures, 252 month grids, Saturday-first alignment, clamping and timezone-independent round trips.

Mobile and desktop share the same custom magnetic hour/minute wheels. Pointer dragging and tapping visible numbers work with touch, pen and mouse; captured gestures stop on release or cancellation. Vertical swipes over a wheel adjust time, while the surrounding dialog body remains scrollable. The device-native time input is not used. Normal registration still restricts wheel options to the allowed 15-minute window.

Date selection opens an independent native modal calendar above the correction form. Closing it or pressing Escape dismisses only the calendar and restores focus to the date trigger. The calendar follows the visual viewport and safe-area bounds and scrolls internally on short screens. Month/year menus retain the shared branded listbox.

Every calendar month reserves a six-week grid with equal-height cells, including empty weeks. Switching between months keeps the modal geometry and footer position stable; viewport bounds still limit its height on small screens.

The request section is placed at the bottom of the attendance page. It offers explicit categories for missed entry/exit registration (either timestamp or the complete pair), correction of a selected stored timestamp, a complete mission interval inside a selected registered work session, and late-arrival explanations. Mission selection is disabled on days without a base work session. Both completed and active work sessions can contain a retrospective completed mission; future times and out-of-session missions are rejected by the database as well as the UI.

Migration `20261004113000_attendance_interval_requests.sql` adds nullable `requested_until` and an authenticated invoker RPC for complete intervals. Pending interval requests preserve the attendance revision and original sessions. Approval validates and applies both endpoints in one transaction, with the existing authorization, overlap checks and stale-revision guard. Existing single-timestamp requests remain compatible. The interval integration test uses temporary auth fixtures inside a rolled-back transaction: `supabase/tests/attendance_interval_requests.sql`.

## Exit state recovery (v0.1.5)

The database previously used the same error for a missing open interval and a
stale work-mode selection. These now have distinct Persian messages and SQLSTATE
P1001/P1002. A failed registration or pending-entry exit revalidates the attendance
page; the confirmation dialog closes so a repeated click cannot keep submitting
its stale selection. Different work modes are still rejected rather than closing
an unrelated interval. The release also includes pending-entry exit support.

`supabase/tests/attendance_exit_state_errors.sql` covers repeated exits, no entry,
mode mismatch, remote success and mission isolation in a rolled-back transaction.
