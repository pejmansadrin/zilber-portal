import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function load(file, dependencies = {}) {
 const exports = {};
 const code = ts.transpileModule(await readFile(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
 vm.runInNewContext(code, { exports, require: name => { assert(name in dependencies, `Unexpected import ${name}`); return dependencies[name]; } });
 return exports;
}
const dates = await load('src/lib/persian-date.ts');
const calendar = await load('src/lib/jalali-calendar.ts', { './persian-date': dates });
for (const [jalali, iso] of [
 ['1399/12/30', '2021-03-20'], ['1400/01/01', '2021-03-21'],
 ['1403/12/30', '2025-03-20'], ['1404/01/01', '2025-03-21'],
 ['1404/12/29', '2026-03-20'], ['1405/01/01', '2026-03-21'],
 ['1405/07/12', '2026-10-04'],
]) {
 assert.equal(dates.fromPersianDate(jalali), iso);
 assert.equal(dates.toPersianDate(iso), jalali);
}
assert.equal(dates.fromPersianDate('۱۴۰۵/۰۷/۱۲'), '2026-10-04');
assert.equal(dates.fromPersianDate('١٤٠٥/٠٧/١٢'), '2026-10-04');
for (const invalid of ['1404/12/30', '1405/07/31', '1405/13/01', '1405/00/01', '1405/01/00']) assert.equal(dates.fromPersianDate(invalid), null);
assert.equal(calendar.jalaliMonth(1403, 12).length, 30);
assert.equal(calendar.jalaliMonth(1404, 12).length, 29);
assert.equal(calendar.jalaliMonth(1405, 1).leading, 0, 'Nowruz 1405 is a Saturday');
assert.equal(calendar.jalaliMonth(1405, 7).leading, 4, 'Mehr 1 1405 is a Wednesday');
for (let year = 1390; year <= 1410; year++) {
 for (let number = 1; number <= 12; number++) {
  const month = calendar.jalaliMonth(year, number);
  if (number <= 6) assert.equal(month.length, 31);
  else if (number <= 11) assert.equal(month.length, 30);
  else assert([29, 30].includes(month.length));
  assert.equal(month.cells.filter(Boolean).length, month.length);
  assert.equal(month.cells.length, 42, 'Every month reserves six complete weeks');
  for (const cell of month.cells.filter(Boolean)) {
   assert.equal(dates.toPersianDate(cell.iso), `${year}/${String(number).padStart(2, '0')}/${String(cell.day).padStart(2, '0')}`);
  }
 }
}
assert.equal(dates.toPersianDate(calendar.dateInJalaliMonth(1404, 12, 30)), '1404/12/29');
assert.equal(dates.toPersianDate(calendar.addCalendarDays('2025-03-20', 1)), '1404/01/01');
assert.equal(dates.toPersianDate(calendar.addCalendarDays('2026-03-21', -1)), '1404/12/29');
assert.equal(calendar.moveJalaliMonth(1404, 12, 1).year, 1405);
assert.equal(calendar.moveJalaliMonth(1405, 1, -1).month, 12);
assert(calendar.selectableCalendarDate('2026-10-04', '2026-10-04'));
assert(!calendar.selectableCalendarDate('2026-10-05', '2026-10-04'));
assert(!calendar.selectableCalendarDate('2026-02-31', '2026-10-04'));
assert(!calendar.selectableCalendarDate('2026-01-01', '2026-10-04', '2026-02-01'));
for (const zone of ['UTC', 'Asia/Tehran', 'America/Los_Angeles']) {
 process.env.TZ = zone;
 assert.equal(dates.toPersianDate('2026-03-21'), '1405/01/01');
 assert.equal(dates.fromPersianDate('1403/12/30'), '2025-03-20');
}
console.log('PASS: Jalali date fixtures, leap/non-leap Esfand, 252 month grids, Saturday alignment, year/month rollover, clamping, invalid/future dates, Persian/Arabic digits and timezone-independent ISO round trips.');
