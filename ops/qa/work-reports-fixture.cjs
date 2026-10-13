// Isolated production-preview fixture. Never load this in a deployed process.
// Usage: node --require ./ops/qa/work-reports-fixture.cjs node_modules/next/dist/bin/next start -p 3118
const original = global.fetch;
const user = { id: 'a7710000-0000-4000-8000-000000000001', email: 'fixture@example.invalid', user_metadata: { full_name: 'کاربر آزمایشی' }, app_metadata: {}, aud: 'authenticated', role: 'authenticated', created_at: '2026-01-01T00:00:00Z' };
const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Tehran'}).format(new Date());
let report = { id:'a7710000-0000-4000-8000-000000000011', user_id:user.id, work_date:today, report_number:42,
  reporter_name:'کاربر آزمایشی', username:user.email, department:'فناوری اطلاعات', template_version:1, content:{}, revision:0,
  saved_at:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString() };
global.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname !== 'otsgzpazmmnfeacysdnl.supabase.co') return original(input, init);
  const respond = (data, status=200) => new Response(JSON.stringify(data), {status,headers:{'content-type':'application/json'}});
  if(url.pathname==='/auth/v1/user') return respond(user);
  if(url.pathname.endsWith('/rpc/portal_access')) return respond('employee');
  if(url.pathname.endsWith('/employees')) return respond([{id:42,auth_user_id:user.id,full_name:report.reporter_name,department:report.department}]);
  if(url.pathname.endsWith('/rpc/open_daily_work_report')) return respond(report);
  if(url.pathname.endsWith('/rpc/save_daily_work_report')) {
    const body = JSON.parse(init.body);
    if(body.expected_revision !== report.revision) return respond({code:'40001',message:'stale'},409);
    report={...report,content:body.report_content,revision:report.revision+1,saved_at:new Date().toISOString()};
    return respond(report);
  }
  if(url.pathname.endsWith('/portal_work_reports')) {
    if(url.searchParams.get('id') && url.searchParams.get('id') !== 'eq.'+report.id) return respond([]);
    return respond([report]);
  }
  throw new Error('Unexpected fixture API path: '+url.pathname);
};
