import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => load(path.resolve(path.dirname(file), `${name}.ts`)) });
  return exports;
}
const { adminDaySummary, adminTimeline, tehranDate } = load('src/domain/attendance/admin-view.ts');
const asOf = '2026-10-13T08:30:00Z'; // Noon in Tehran.
const stamp = (time, date = '2026-10-13') => `${date}T${time}:00+03:30`;
const row = sessions => ({ user_id: 'fixture', work_date: '2026-10-13', sessions });
const session = (start, end, mode = 'office') => ({ start: stamp(start), end: end ? stamp(end) : null, mode });

const split = row([session('07:50', '10:10'), session('11:30', '14:42'), session('12:00', '13:00', 'mission')]);
const summary = adminDaySummary(split, asOf);
assert.equal(summary.minutes, 332, 'Hourly leave is excluded and mission is not double-counted');
assert.equal(summary.lateMinutes, 0);
assert.equal(summary.mission, true);
const open = row([session('08:16', null)]);
assert.equal(adminDaySummary(open, asOf).minutes, 224);
assert.equal(adminDaySummary(open, asOf).lateMinutes, 16);
const historical = { ...open, work_date: '2026-10-12', sessions: [{ start: stamp('08:16', '2026-10-12'), end: null, mode: 'office' }] };
assert.equal(adminDaySummary(historical, asOf).minutes, null, 'Old missing exits must not inflate total hours');
assert.equal(adminTimeline(historical, asOf)[0].width, 0, 'Unknown intervals are markers, not fabricated full-day bars');
const overnight = row([{ start: stamp('22:00'), end: stamp('02:00', '2026-10-14'), mode: 'office' }]);
assert.equal(adminDaySummary(overnight, asOf).minutes, 240);
assert.equal(adminTimeline(overnight, asOf)[0].overnight, true);
assert(Math.abs(adminTimeline(overnight, asOf)[0].width - 100 / 12) < 0.0001);
assert.equal(tehranDate('2026-10-12T21:00:00Z'), '2026-10-13', 'Date follows Tehran midnight');
assert.equal(adminDaySummary(row([]), asOf).start, null);
assert.equal(adminDaySummary(row([]), asOf).minutes, null);
assert.equal(split.sessions[0].start, stamp('07:50'), 'Derived summaries preserve source data');
console.log('PASS: hourly leave, mission union, open and incomplete days, overnight chart clipping, empty days and Tehran date boundaries.');
