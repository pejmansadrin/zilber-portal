import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/domain/work-reports/report.ts','utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,{exports,TextEncoder,Intl,Date});
const report = {id:'fixture', work_date:'2026-10-13',report_number:42,reporter_name:'نام واقعی',username:'user@example.invalid',department:'فنی',saved_at:null};
const defaults=exports.reportDefaults(report);
assert.equal(exports.jalaliReportDate(report.work_date),'1405/07/21');
assert.equal(exports.reportNumber(report),'WR-14050721-000042');
assert.equal(exports.formData(report).fields.username,report.username);
const payload=exports.validateContent({...defaults,fields:{...defaults.fields,reporter:'forged',fileNo:'forged',username:'other'}});
assert(!('reporter' in payload.fields));assert(!('fileNo' in payload.fields));assert(!('username' in payload.fields));
assert.throws(()=>exports.validateContent({...defaults,lists:{...defaults.lists,tasks:[]}}));
assert.throws(()=>exports.validateContent({...defaults,lists:{...defaults.lists,tasks:Array(101).fill({text:'',time:''})}}));
assert.throws(()=>exports.validateContent({...defaults,fields:{...defaults.fields,volume:'x'.repeat(10001)}}));
assert.throws(()=>exports.validateContent({...defaults,period:'invalid'}));
assert.throws(()=>exports.validateContent({...defaults,printEmptyRows:'yes'}));
const hostile='</script><script>window.evil=true</script>';
const saved=exports.formData({...report,saved_at:'2026-10-13',content:{...defaults,fields:{...defaults.fields,volume:hostile,reporter:'forged'}}});
assert.equal(saved.fields.reporter,report.reporter_name);
assert.equal(saved.fields.volume,hostile,'Text preserved for safe JSON/textContent rendering');
const html=fs.readFileSync('src/templates/work-report-v1.html','utf8');
assert(html.includes('window.parent.postMessage'));
assert(html.includes('portal ? null : localStorage.getItem'));
assert(html.includes("if(await savePortal()) window.print()"));
console.log('PASS: Tehran/Jalali identity defaults, stable report numbers, immutable identity, input bounds, exact text roundtrip and embedded save/print hooks.');
