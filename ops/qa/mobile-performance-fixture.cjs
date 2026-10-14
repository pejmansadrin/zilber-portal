// Isolated production QA only. Intercepts every Supabase request; no real data/credentials leave this process.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Node preload must run before Next loads.
const fs = require('node:fs');
const original = global.fetch;
const controlPath = process.env.PORTAL_QA_CONTROL;
const logPath = process.env.PORTAL_QA_LOG;
if (!controlPath || !logPath) throw new Error('Set PORTAL_QA_CONTROL and PORTAL_QA_LOG for isolated QA.');
const user = { id: 'a7710000-0000-4000-8000-000000000001', email: 'fixture@example.invalid', user_metadata: { full_name: 'کاربر آزمایشی' }, app_metadata: {}, aud: 'authenticated', role: 'authenticated', created_at: '2026-01-01T00:00:00Z' };
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
const sessions = [{ mode: 'office', start: new Date(Date.now() - 3 * 3600000).toISOString(), end: null }];
let revision = 1;
global.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname !== 'otsgzpazmmnfeacysdnl.supabase.co') return original(input, init);
  const control = JSON.parse(fs.readFileSync(controlPath, 'utf8'));
  fs.appendFileSync(logPath, JSON.stringify({ path: url.pathname, query: { ...Object.fromEntries(url.searchParams), ...(url.searchParams.has('work_date') ? { work_date: url.searchParams.get('work_date') } : {}) }, method: init.method || 'GET', at: Date.now() }) + '\n');
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const response = (value, status = 200) => Response.json(value, { status });
  if (url.pathname === '/auth/v1/user') { await delay(control.authDelay || 0); return control.revoked ? response({ message: 'Invalid JWT', code: 'bad_jwt' }, 401) : response(user); }
  if (url.pathname.endsWith('/rpc/portal_access')) return response('employee');
  if (url.pathname.endsWith('/employees')) {
    await delay(control.identityDelay || 0);
    return response([{ id: 42, auth_user_id: user.id, full_name: 'کاربر آزمایشی', department: 'فناوری اطلاعات' }]);
  }
  if (url.pathname.endsWith('/rpc/register_attendance_checked')) {
    const body = JSON.parse(init.body);
    if (body.event === 'end') sessions[sessions.length - 1].end = body.at_time;
    else sessions.push({ mode: body.work_mode, start: body.at_time, end: null });
    revision++; return response(null);
  }
  if (url.pathname.endsWith('/portal_work_days')) {
    const historical = (url.searchParams.get('work_date') || '').startsWith('gte.');
    await delay(historical ? control.historyDelay || 0 : control.registrationDelay || 0);
    if (historical && control.historyFails) return response({ message: 'fixture history failure' }, 503);
    const rows = [{ user_id: user.id, work_date: today, sessions, revision, updated_at: new Date().toISOString() }];
    return response(url.searchParams.has('sessions') && sessions.every(session => session.end) ? [] : rows);
  }
  if (url.pathname.endsWith('/portal_time_requests')) {
    const pending = url.searchParams.has('status');
    await delay(pending ? control.registrationDelay || 0 : control.historyDelay || 0);
    if (pending) return response([]);
    return response(Array.from({ length: 31 }, (_, index) => ({ id: 'request-'+index, work_date: today, kind: 'time', action: 'start', mode: 'office', requested_at: new Date().toISOString(), requested_until: null, session_index: null, reason: 'درخواست آزمایشی', status: 'approved', review_note: 'تأیید آزمایشی', reviewed_at: new Date().toISOString(), created_at: new Date().toISOString() })));
  }
  // Only employee-owned collection reads are admitted by the fixture.
  if (url.pathname.startsWith('/rest/v1/') && url.searchParams.get('employee_id') === 'eq.42') {
    await delay(control.collectionDelay || 0);
    return response(Array.from({ length: 21 }, (_, index) => ({ id: Number(url.searchParams.get('offset') || 0) + index + 1, employee_id: 42, title: 'مدرک آزمایشی', document_type: 'گواهی', created_at: new Date().toISOString() })));
  }
  throw new Error('Unexpected isolated fixture path: ' + url.pathname);
};
