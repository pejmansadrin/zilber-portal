import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
function load(file, mocks = {}, loaded = new Map()) {
  file = path.resolve(file);
  if (loaded.has(file)) return loaded.get(file);
  const exports = {};
  loaded.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, URLSearchParams,
    require: name => {
      if (name in mocks) return mocks[name];
      if (name === 'server-only') return {};
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks, loaded);
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'), mocks, loaded);
      return require(name);
    },
  });
  return exports;
}

let sessionUser = { id: 'fixture-user' };
let sessionError = null;
let accessRole = 'employee';
let accessError = null;
let roleCalls = 0;
const sessionClient = {
  auth: { getUser: async () => ({ data: { user: sessionUser }, error: sessionError }) },
  rpc: async name => {
    assert.equal(name, 'portal_access');
    roleCalls++;
    return { data: accessRole, error: accessError };
  },
};
const guards = load('src/lib/auth/session.ts', {
  react: { cache: callback => callback },
  'next/navigation': { redirect: target => { throw new Error(`redirect:${target}`); } },
  '@/lib/supabase/server': { createClient: async () => sessionClient },
});
assert.equal((await guards.requireSession()).user.id, 'fixture-user');
await assert.rejects(() => guards.requireSuperAdmin(), /دسترسی/);
accessRole = 'super_admin';
assert.equal((await guards.requireSuperAdmin()).client, sessionClient);
accessError = { message: 'fixture failure' };
await assert.rejects(() => guards.requireSuperAdmin(), /سطح دسترسی/);
accessError = null;
sessionError = { message: 'invalid session' };
assert.equal(await guards.getSession(), null);
roleCalls = 0;
await assert.rejects(() => guards.requireSuperAdmin(), /redirect:\/login/);
assert.equal(roleCalls, 0);
sessionError = null;
sessionUser = null;
await assert.rejects(() => guards.requireSession(), /redirect:\/login/);

const { attendanceFilters, attendanceAdminHref } = load('src/domain/attendance/queries.ts');
const defaults = attendanceFilters({});
assert.equal(defaults.status, 'pending');
assert.equal(defaults.daysPage, 1);
assert.equal(attendanceFilters({ daysPage: '۲', requestsPage: '3' }).daysPage, 2);
for (const value of ['-1', '0', '1.5', 'Infinity', '99999999999999999', ['2']])
  assert.equal(attendanceFilters({ daysPage: value }).daysPage, 1);
assert.throws(() => attendanceFilters({ date: '۱۴۰۵/۰۷/۳۱' }));
const filtered = attendanceFilters({ q: '  فنی  ', date: '۱۴۰۵/۰۷/۱۲', status: 'approved', daysPage: '2' });
assert.equal(filtered.date, '2026-10-04');
assert.equal(filtered.query, 'فنی');
const href = new URL(attendanceAdminHref(filtered, { requestsPage: 3 }), 'https://fixture.test');
assert.equal(href.searchParams.get('daysPage'), '2');
assert.equal(href.searchParams.get('requestsPage'), '3');
assert.equal(href.searchParams.get('status'), 'approved');
assert.equal(href.searchParams.get('date'), '۱۴۰۵/۰۷/۱۲');

const requests = [];
let denied = false;
let failDays = false;
const owner = '11111111-1111-4111-8111-111111111111';
const rows = Array.from({ length: 51 }, (_, index) => ({
  user_id: owner, work_date: `2026-10-${String(31 - index % 31).padStart(2, '0')}`,
  sessions: [], revision: index, updated_at: '2026-10-11T08:00:00Z',
}));
const client = createClient('https://fixture.test', 'test-only', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: async (input, options) => {
    const url = new URL(String(input));
    requests.push({ url, method: options.method });
    if (url.pathname.endsWith('/rpc/organization_directory')) return Response.json([
      { auth_user_id: owner, full_name: 'کاربر آزمون', department: 'فنی', national_id: 'MUST_NOT_LEAVE_SERVER' },
      { auth_user_id: '22222222-2222-4222-8222-222222222222', full_name: 'کاربر دیگر', department: 'مالی' },
    ]);
    if (options.method === 'HEAD') return new Response(null, { headers: { 'content-range': '*/137' } });
    if (url.searchParams.get('user_id') === 'in.()') return Response.json([]);
    if (url.pathname.endsWith('/portal_work_days')) {
      if (failDays) return Response.json({ message: 'fixture failure' }, { status: 403 });
      return Response.json(rows);
    }
    return Response.json(rows.slice(0, 4).map((row, index) => ({ ...row, id: `request-${index}`, status: 'approved' })));
  } },
});
const { getAdminAttendanceData } = load('src/lib/attendance/admin-data.ts', {
  '@/lib/auth/session': { requireSuperAdmin: async () => {
    if (denied) throw new Error('denied');
    return { client, user: { id: owner } };
  } },
});
const data = await getAdminAttendanceData(filtered);
assert.equal(data.days.length, 50);
assert.equal(data.hasMoreDays, true);
assert.equal(data.hasMoreRequests, false);
assert.equal(data.pendingCount, 137);
assert.equal(data.people.length, 1);
assert(!JSON.stringify(data).includes('MUST_NOT_LEAVE_SERVER'));
const dayQuery = requests.find(request => request.url.pathname.endsWith('/portal_work_days')).url;
assert.equal(dayQuery.searchParams.get('offset'), '50');
assert.equal(dayQuery.searchParams.get('limit'), '51');
assert.equal(dayQuery.searchParams.get('work_date'), 'eq.2026-10-04');
assert.equal(dayQuery.searchParams.get('order'), 'work_date.desc,user_id.asc');
assert(dayQuery.searchParams.get('user_id').includes(owner));
const requestQuery = requests.find(request => request.method !== 'HEAD' && request.url.pathname.endsWith('/portal_time_requests')).url;
assert.equal(requestQuery.searchParams.get('status'), 'eq.approved');
assert.equal(requestQuery.searchParams.get('order'), 'created_at.desc,id.asc');
assert.equal(requestQuery.searchParams.get('limit'), '51');
requests.length = 0;
const noMatches = await getAdminAttendanceData(attendanceFilters({ q: 'نام ناموجود' }));
assert.equal(noMatches.days.length, 0);
assert.equal(noMatches.requests.length, 0);
denied = true;
requests.length = 0;
await assert.rejects(() => getAdminAttendanceData(defaults), /denied/);
assert.equal(requests.length, 0);
denied = false;
failDays = true;
await assert.rejects(() => getAdminAttendanceData(defaults));

const { registrationDecision } = load('src/domain/attendance/registration-time.ts');
const now = '2026-10-11T11:30:00Z';
assert.equal(registrationDecision('2026-10-11T11:15:00Z', now, 'start'), 'register');
assert.equal(registrationDecision('2026-10-11T11:14:59Z', now, 'start'), 'request');
assert.equal(registrationDecision('2026-10-11T11:45:00Z', now, 'end'), 'register');
assert.equal(registrationDecision('2026-10-11T11:14:59Z', now, 'end'), 'warning');
assert.throws(() => registrationDecision('2026-10-11T11:45:01Z', now, 'end'));
const { sessionMinutes } = load('src/domain/attendance/work-sessions.ts');
assert.equal(sessionMinutes([
  { start: '2026-10-11T08:00:00Z', end: '2026-10-11T10:00:00Z', mode: 'office' },
  { start: '2026-10-11T08:30:00Z', end: '2026-10-11T09:30:00Z', mode: 'mission' },
]), 120);

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : /\.tsx?$/.test(file) ? [file] : [];
  });
}
for (const directory of ['src/domain', 'src/lib', 'src/types', 'src/actions']) {
  for (const file of files(directory)) {
    const source = fs.readFileSync(file, 'utf8');
    assert(!/from\s+['"]@\/components\//.test(source), `${file} depends on UI`);
    if (directory === 'src/domain') assert(!/from\s+['"](?:react|next(?:\/|['"])|@\/lib\/(?:auth|supabase))/.test(source), `${file} must stay pure`);
  }
}
console.log('PASS: bounded and ordered admin queries, global filters, role denial before I/O, minimal DTOs, failures, attendance rules and architectural dependency boundaries.');
