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
  const exports = {}; loaded.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, URL, Response, Date, URLSearchParams, require: name => {
    if (name in mocks) return mocks[name];
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks, loaded);
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'), mocks, loaded);
    return require(name);
  } });
  return exports;
}
const calls = [];
let denied = false, failHistory = false;
const owner = '11111111-1111-4111-8111-111111111111';
const day = date => ({ user_id: owner, work_date: date, sessions: [{ mode: 'office', start: `${date}T08:00:00+03:30`, end: null }], revision: 1, updated_at: '2026-10-14T08:00:00Z' });
const client = createClient('https://fixture.invalid', 'fixture-only', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async input => {
  const url = new URL(String(input)); calls.push(url);
  if (url.pathname.endsWith('/employees')) return Response.json([{ id: 42 }]);
  if (url.pathname.endsWith('/portal_work_days')) {
    if (url.searchParams.has('sessions')) return Response.json([day('2026-09-30')]);
    if (url.searchParams.get('work_date')?.startsWith('eq.')) return Response.json([day('2026-10-14')]);
    if (failHistory) return Response.json({ message: 'delayed history unavailable' }, { status: 503 });
    return Response.json([day('2026-10-12')]);
  }
  if (url.pathname.endsWith('/portal_time_requests')) {
    if (url.searchParams.has('status')) return Response.json([{ id: 'pending', mode: 'office', requested_at: '2026-10-13T08:00:00Z' }]);
    return Response.json(Array.from({ length: 31 }, (_, id) => ({ id })));
  }
  return Response.json(Array.from({ length: 21 }, (_, id) => ({ id, employee_id: 42 })));
} } });
const mocks = { react: { cache: fn => fn }, '@/lib/auth/session': { requireSession: async () => { if (denied) throw Error('denied'); return { user: { id: owner }, client }; } } };
const data = load('src/lib/attendance/data.ts', mocks);
const { attendanceHistory } = load('src/domain/attendance/history.ts');
const history = attendanceHistory({ month: '1405/06', requestsPage: '2' }, '2026-10-14T10:00:00Z');
failHistory = true;
const registration = await data.getRegistrationData('2026-10-14T10:00:00Z');
assert.equal(calls.length, 3);
assert.equal(registration.days.length, 2, 'Today and old overnight session are both available');
assert.equal(registration.pendingEntry.id, 'pending');
for (const url of calls) assert.equal(url.searchParams.get('user_id'), `eq.${owner}`);
assert(calls.every(url => !url.searchParams.get('work_date')?.startsWith('gte.')), 'Initial registration has no month query');
assert.equal(calls.find(url => url.pathname.endsWith('/portal_time_requests')).searchParams.get('select'), 'id,mode,requested_at');
await assert.rejects(() => data.getMonthHistory(history));
failHistory = false; calls.length = 0;
await data.getMonthHistory(history);
assert.equal(calls[0].searchParams.get('limit'), '31');
assert.deepEqual(calls[0].searchParams.getAll('work_date'), [`gte.${history.first}`, `lt.${history.until}`]);
const requests = await data.getRequestHistory(history);
assert.equal(requests.requests.length, 30); assert(requests.hasMoreRequests);
assert.equal(calls[1].searchParams.get('offset'), '30'); assert.equal(calls[1].searchParams.get('limit'), '31');
const account = load('src/lib/account/data.ts', mocks);
calls.length = 0;
const records = await account.getAccountCollection('documents', 2);
assert.equal(calls.length, 2, 'One owned employee lookup and one selected collection');
assert.equal(calls[0].searchParams.get('auth_user_id'), `eq.${owner}`);
assert.equal(calls[1].searchParams.get('employee_id'), 'eq.42');
assert.equal(calls[1].searchParams.get('offset'), '20'); assert.equal(calls[1].searchParams.get('limit'), '21');
assert.equal(records.records.length, 20); assert(records.hasMore);
calls.length = 0;
await assert.rejects(() => account.getAccountCollection('arbitrary_table', 1));
await assert.rejects(() => account.getAccountCollection('documents', -1));
assert.equal(calls.length, 0);
denied = true;
for (const read of [() => data.getRegistrationData('2026-10-14'), () => data.getMonthHistory(history), () => data.getRequestHistory(history), () => account.getAccountCollection('documents', 1)]) await assert.rejects(read, /denied/);
assert.equal(calls.length, 0, 'Denied reads must not issue data queries');
// Exercise HTTP validation/no-store separately from query construction.
let authenticated = false, reads = 0, failing = false;
for (const [file, valid, invalid, mockName, mockMethods] of [
  ['src/app/api/attendance/history/route.ts', '?section=requests', '?section=invalid', '@/lib/attendance/data', ['getMonthHistory', 'getRequestHistory']],
  ['src/app/api/account/collection/route.ts', '?collection=documents&page=1', '?collection=employees', '@/lib/account/data', ['getAccountCollection']],
]) {
  const read = async () => { reads++; if (failing) throw Error('fixture'); return {}; };
  const route = load(file, { '@/lib/auth/session': { getSession: async () => authenticated ? {} : null }, '@/lib/account/data': {}, [mockName]: Object.fromEntries(mockMethods.map(name => [name, read])) });
  authenticated = false;
  let response = await route.GET(new Request('https://portal.invalid/api'+valid));
  assert.equal(response.status, 401); assert.equal(reads, 0);
  authenticated = true;
  response = await route.GET(new Request('https://portal.invalid/api'+invalid));
  assert.equal(response.status, 400); assert.equal(reads, 0);
  response = await route.GET(new Request('https://portal.invalid/api'+valid));
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
  failing = true;
  response = await route.GET(new Request('https://portal.invalid/api'+valid));
  assert.equal(response.status, 503); assert.equal(response.headers.get('vary'), 'Cookie');
  reads = 0; failing = false;
}
console.log('PASS: independent registration, overnight/pending context, monthly/request/collection budgets, owned queries, invalid and denied requests, private API responses and recoverable failures.');
