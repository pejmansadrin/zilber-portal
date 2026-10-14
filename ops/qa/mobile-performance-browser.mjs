// Build first. Run next start with mobile-performance-fixture.cjs on 3124.
// PLAYWRIGHT_PATH points to an installed Playwright package (no test dependency added).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const controlPath = '/tmp/portal-mobile-control.json', logPath = '/tmp/portal-mobile-requests.jsonl';
const controls = value => fs.writeFileSync(controlPath, JSON.stringify(value));
const logs = () => fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
const resetLog = () => fs.writeFileSync(logPath, '');
const base = 'http://127.0.0.1:3124';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const user = { id: 'a7710000-0000-4000-8000-000000000001', email: 'fixture@example.invalid', user_metadata: {}, app_metadata: {}, aud: 'authenticated', role: 'authenticated' };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = encode({ alg: 'HS256', typ: 'JWT' })+'.'+encode({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 })+'.fixture';
await context.addCookies([{ name: 'sb-otsgzpazmmnfeacysdnl-auth-token', value: 'base64-'+encode({ access_token: token, refresh_token: 'fixture', expires_at: Math.floor(Date.now()/1000)+3600, expires_in: 3600, token_type: 'bearer', user }), url: base }]);
await context.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
const page = await context.newPage();
const errors = []; page.on('pageerror', error => errors.push(error.message));
const requests = []; page.on('request', request => requests.push(request.url()));
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 100000 });
const metrics = {};
const chunks = JSON.parse(fs.readFileSync('.next/react-loadable-manifest.json', 'utf8'));
const deferredFiles = Object.entries(chunks).filter(([key]) => /AttendanceMonthPanel|AttendanceRequestsPanel|AttendanceGantt|AttendanceRegistrationDialog/.test(key)).flatMap(([, value]) => value.files);

try {
  resetLog(); controls({ identityDelay: 6500, registrationDelay: 100, authDelay: 100, historyDelay: 3000 });
  const started = Date.now();
  await page.goto(base+'/attendance', { waitUntil: 'commit' });
  await page.getByRole('heading', { name: 'ثبت ورود و خروج', exact: true }).waitFor();
  metrics.registrationVisibleMs = Date.now()-started;
  // A real UI interaction establishes hydration before the slow identity response.
  await page.getByLabel('دورکاری', { exact: true }).check();
  metrics.registrationInteractiveMs = Date.now()-started;
  assert(metrics.registrationInteractiveMs < 6500, 'Registration must not wait for the delayed identity');
  assert.equal(logs().filter(row => row.query.work_date?.startsWith('gte.') || row.path.endsWith('/portal_time_requests') && !row.query.status).length, 0);
  assert.equal(requests.filter(url => url.includes('/api/attendance/history')).length, 0);
  assert(!requests.some(url => deferredFiles.some(file => url.endsWith('/_next/'+file))), 'Closed secondary panels must not download their chunks');
  await page.screenshot({ path: '/tmp/portal-mobile-registration.png', fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // Failed optional history leaves registration available; a retry recovers locally.
  controls({ identityDelay: 0, historyDelay: 300, historyFails: true });
  await page.getByRole('button', { name: 'تایم‌شیت ورود و خروج مشاهده سوابق ماهانه' }).click();
  await page.locator('#attendance-month').getByRole('button', { name: 'تلاش دوباره' }).waitFor();
  assert(await page.getByRole('heading', { name: 'ثبت ورود و خروج', exact: true }).isVisible());
  controls({});
  await page.locator('#attendance-month').getByRole('button', { name: 'تلاش دوباره' }).click();
  await page.getByRole('table').waitFor();
  assert.equal(await page.getByRole('button', { name: 'بستن نمودار', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'نمایش نمودار کارکرد', exact: true }).click();
  await page.getByRole('button', { name: 'بستن نمودار', exact: true }).waitFor();
  await page.getByRole('button', { name: 'ماه قبل', exact: true }).click();
  await page.getByRole('table').waitFor();
  assert(logs().some(row => row.query.work_date?.startsWith('gte.')));
  // Open requests on demand and page without rebuilding the registration workspace.
  await page.evaluate(() => { window.registrationNode = document.querySelector('#registration-heading'); });
  await page.getByRole('button', { name: 'تاریخچه مکاتبات مشاهده درخواست‌ها' }).click();
  await page.locator('#attendance-requests').getByRole('button', { name: 'صفحه بعد' }).click();
  await page.locator('#attendance-requests').getByText('صفحه ۲', { exact: true }).waitFor();
  assert(await page.evaluate(() => window.registrationNode === document.querySelector('#registration-heading')));
  assert(logs().some(row => row.path.endsWith('/portal_time_requests') && row.query.offset === '30'));
  // Mutations refresh registration and already-open history, without waiting on history.
  const monthReads = () => logs().filter(row => row.query.work_date?.startsWith('gte.')).length;
  const beforeMutation = monthReads();
  await page.getByRole('button', { name: 'خروج عادی', exact: true }).click();
  await page.getByText('تردد ذخیره شد.', { exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('button') !== null);
  for (let i=0; i<50 && monthReads() <= beforeMutation; i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert(monthReads() > beforeMutation, 'Open history must refresh after a successful mutation');
  // Dashboard service navigation must remain available while its identity is slow.
  controls({ identityDelay: 6500 });
  const dashboardStart = Date.now();
  await page.goto(base+'/dashboard', { waitUntil: 'commit' });
  await page.getByRole('heading', { name: 'دسترسی‌های شما', exact: true }).waitFor();
  metrics.dashboardServicesVisibleMs = Date.now()-dashboardStart;
  assert(metrics.dashboardServicesVisibleMs < 6500);
  controls({});
  // Initial account overview must not request any record collections.
  await page.goto(base+'/account', { waitUntil: 'networkidle' });
  resetLog();
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(logs().filter(row => row.query.employee_id).length, 0);
  await page.getByRole('button', { name: 'انتخاب بخش حساب کاربری' }).click();
  await page.locator('button').filter({ hasText: 'مدارک و گواهی‌ها' }).last().click();
  await page.getByRole('button', { name: 'صفحه بعد', exact: true }).first().waitFor();
  const collectionCalls = logs().filter(row => row.query.employee_id);
  assert.equal(collectionCalls.length, 2, 'Documents tab loads only its two collections');
  assert(collectionCalls.every(row => row.query.limit === '21'));
  assert.equal(await page.locator('article input, article textarea, article select').count(), 0, 'Closed record editors must not create hidden form controls');
  const record = page.locator('article').filter({ has: page.locator('summary') }).first();
  await record.locator('summary').click();
  const input = record.locator('input:not([type=hidden]):not([type=file])').first();
  await input.fill('پیش‌نویس حفظ شود');
  await record.locator('summary').click();
  await record.locator('summary').click();
  assert.equal(await input.inputValue(), 'پیش‌نویس حفظ شود');
  assert(await page.getByRole('button', { name: 'صفحه بعد', exact: true }).first().isDisabled(), 'Dirty edits block pagination');
  // Reload intentionally discards this synthetic draft before paging.
  page.on('dialog', dialog => dialog.accept());
  await page.reload({ waitUntil: 'networkidle' });
  const next = page.getByRole('button', { name: 'صفحه بعد', exact: true }).first();
  await next.click();
  await page.getByText('صفحه ۲', { exact: true }).waitFor();
  assert(logs().some(row => row.query.employee_id && row.query.offset === '20'));
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: '/tmp/portal-mobile-account.png', fullPage: true });
  // No automatic manifest/bulk warming requests on a standalone mobile session.
  assert.equal(requests.filter(url => url.endsWith('/app-assets.json')).length, 0);
  assert.equal(errors.length, 0, errors.join('\n'));
  // Anonymous API access must not expose records.
  const anonymous = await browser.newContext();
  const response = await anonymous.request.get(base+'/api/attendance/history?section=month', { maxRedirects: 0 });
  assert([307,401].includes(response.status()));
  await anonymous.close();
  metrics.result = 'PASS';
  fs.writeFileSync('/tmp/portal-mobile-performance.json', JSON.stringify(metrics, null, 2));
  console.log('PASS:', JSON.stringify(metrics), 'on-demand data, retry, paging, mutation freshness, account budgets, no overflow/errors/bulk warming, anonymous denial.');
} finally { await browser.close(); }
