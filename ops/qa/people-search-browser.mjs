// Start a production build and a private headless Chrome on port 9228 first.
// Credentials and browser cookies stay in memory. No account changes are saved.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServerClient } from '@supabase/ssr';

const base = process.env.ZILBER_QA_BASE_URL || 'http://localhost:3104';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'https://otsgzpazmmnfeacysdnl.supabase.co');
assert(process.env.ZILBER_QA_CREDENTIALS);
const credentials = [...fs.readFileSync(process.env.ZILBER_QA_CREDENTIALS, 'utf8').matchAll(/نام کاربری \(ایمیل\): ([^\n]+)\nرمز عبور: ([^\n]+)/g)]
  .map(match => ({ email: match[1], password: match[2] }));
const jar = new Map();
const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: {
  getAll: () => [...jar].map(([name, value]) => ({ name, value })),
  setAll: items => items.forEach(item => jar.set(item.name, item.value)),
} });
let ws;
let call;
try {
  assert.ifError((await client.auth.signInWithPassword(credentials.find(entry => entry.email === 'pejmansadrinezhad@zilber.tech'))).error);
  const target = await (await fetch('http://localhost:9228/json/new?about:blank', { method: 'PUT' })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  const requests = [];
  const exceptions = [];
  let navigations = 0, dialogs = 0;
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const handler = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handler.reject(new Error(message.error.message));
      else handler.resolve(message.result);
    } else if (message.method === 'Network.requestWillBeSent') requests.push(message.params);
    else if (message.method === 'Page.frameNavigated' && !message.params.frame.parentId) navigations++;
    else if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
    else if (message.method === 'Page.javascriptDialogOpening') {
      dialogs++;
      void call('Page.handleJavaScriptDialog', { accept: true });
    }
  });
  call = (method, params = {}) => new Promise((resolve, reject) => {
    const nextId = ++id;
    pending.set(nextId, { resolve, reject });
    ws.send(JSON.stringify({ id: nextId, method, params }));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error('Browser evaluation failed');
    return result.result.value;
  };
  const wait = async expression => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Browser condition did not complete');
  };
  const type = async (selector, text) => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus(); document.querySelector(${JSON.stringify(selector)}).select()`);
    await call('Input.insertText', { text });
  };
  await call('Page.enable');
  await call('Page.bringToFront');
  await call('Runtime.enable');
  await call('Network.enable');
  await call('Network.clearBrowserCache');
  await call('Network.setCookies', { cookies: [...jar].map(([name, value]) => ({ name, value, url: base, path: '/', sameSite: 'Lax' })) });
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: base + '/people' });
  await wait(`document.readyState === 'complete' && !!document.querySelector('#people-search')`);
  await evaluate(`document.querySelector('button[role="tab"][id$="employment"]').click()`);
  await wait(`document.querySelector('button[role="tab"][id$="employment"]').getAttribute('aria-selected') === 'true'`);
  await evaluate(`document.querySelector('#managed-panel-employment details > summary').click()`);
  await wait(`document.querySelector('#managed-panel-employment input[name="job_title"]')?.getBoundingClientRect().width > 0`);
  const original = await evaluate(`document.querySelector('#managed-panel-employment input[name="job_title"]').value`);
  const edited = original + '-QA';
  await type('#managed-panel-employment input[name="job_title"]', edited);
  assert.equal(await evaluate(`document.querySelector('#managed-panel-employment input[name="job_title"]').value`), edited);
  const editedNode = await evaluate(`window.__recordInput = document.querySelector('#managed-panel-employment input[name="job_title"]'); true`);
  assert.equal(editedNode, true);
  const initialRows = await evaluate(`document.querySelectorAll('#people-results a').length`);
  assert(initialRows > 1);
  const phaseRequests = requests.length;
  const initialNavigations = navigations;
  await type('#people-search', 'صدري نژاد');
  await wait(`document.querySelectorAll('#people-results a').length === 1`);
  assert.equal(await evaluate(`document.activeElement.id`), 'people-search');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await new Promise(resolve => setTimeout(resolve, 300));
  assert.equal(await evaluate(`document.querySelector('#managed-panel-employment input[name="job_title"]') === window.__recordInput`), true);
  assert.equal(await evaluate(`document.querySelector('#managed-panel-employment input[name="job_title"]').value`), edited);
  await type('#people-search', 'NO-MATCH-998877');
  await wait(`document.querySelectorAll('#people-results a').length === 0`);
  await evaluate(`document.querySelector('button[aria-label="پاک کردن جست‌وجو"]').click()`);
  await wait(`document.querySelectorAll('#people-results a').length === ${initialRows}`);
  assert.equal(await evaluate(`document.querySelector('#people-search').value`), '');
  assert.equal(await evaluate(`document.activeElement.id`), 'people-search');
  assert.equal(navigations, initialNavigations, 'Search must not reload the document');
  assert.equal(dialogs, 0, 'Search must not trigger the unsaved-record guard');
  // Initial navigation links can still prefetch in the background. Such
  // requests do not navigate or replace the open record and are not search.
  const isPrefetch = event => Object.entries(event.request.headers).some(([name, value]) =>
    (name.toLowerCase() === 'next-router-prefetch' && value === '1') ||
    name.toLowerCase() === 'next-router-segment-prefetch' ||
    (['purpose', 'sec-purpose'].includes(name.toLowerCase()) && String(value).includes('prefetch')),
  );
  const searchRequests = requests.slice(phaseRequests).filter(event =>
    event.type === 'Document' || event.request.method !== 'GET' ||
    (event.request.url.includes('_rsc=') && !isPrefetch(event)),
  );
  assert.equal(searchRequests.length, 0, 'Search must not navigate, refresh server components or mutate data');
  assert.equal(await evaluate(`document.querySelector('#managed-panel-employment input[name="job_title"]') === window.__recordInput`), true);
  assert.equal(await evaluate(`document.querySelector('#managed-panel-employment input[name="job_title"]').value`), edited);
  // Selecting another person still requires the existing unsaved-record guard.
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await call('Network.emulateNetworkConditions', { offline: false, latency: 800, downloadThroughput: -1, uploadThroughput: -1 });
  await evaluate(`document.querySelector('#people-results a:not([aria-current="page"])').click()`);
  await wait(`document.querySelector('.loader .cell') !== null`);
  const loaderColor = await evaluate(`getComputedStyle(document.querySelector('.loader .cell')).backgroundColor`);
  const loaderTheme = await evaluate(`document.documentElement.dataset.theme`);
  assert.equal(loaderColor, loaderTheme === 'dark' ? 'rgb(59, 130, 246)' : 'rgb(37, 99, 235)');
  await wait(`document.querySelector('button[role="tab"][aria-selected="true"][id$="overview"]') !== null`);
  await call('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  assert.equal(dialogs, 1);

  // The compact mobile sheet must stay open and retain focus while filtering.
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(`document.querySelector('button[aria-haspopup="dialog"][aria-controls]').click()`);
  await wait(`document.querySelector('[role="dialog"]') !== null`);
  const mobileNavigations = navigations;
  await type('#people-search', 'پژمان');
  await wait(`document.querySelectorAll('#people-results a').length === 1`);
  assert.equal(await evaluate(`document.activeElement.id`), 'people-search');
  assert.equal(await evaluate(`document.querySelector('[role="dialog"]') !== null`), true);
  assert.equal(navigations, mobileNavigations);
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);

  // Check both saved themes at fresh standalone app launch.
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(navigator, 'standalone', { get: () => true })` });
  for (const theme of ['light', 'dark']) {
    await evaluate(`localStorage.setItem('theme', '${theme}')`);
    await call('Page.navigate', { url: base + '/account' });
    await wait(`document.getElementById('pwa-launch-logo') !== null && document.documentElement.dataset.theme === '${theme}'`);
    const colors = await evaluate(`(() => {
      const splash = document.getElementById('pwa-launch-logo').closest('[role="status"]');
      const ring = splash.querySelector('[class*="spinner"]');
      return { background: getComputedStyle(splash).backgroundColor, ring: getComputedStyle(ring).borderTopColor };
    })()`);
    assert.equal(colors.background, theme === 'light' ? 'rgb(248, 250, 252)' : 'rgb(9, 13, 22)');
    assert.equal(colors.ring, theme === 'light' ? 'rgb(37, 99, 235)' : 'rgb(59, 130, 246)');
    await wait(`document.getElementById('pwa-launch-logo') === null`);
  }
  assert.deepEqual(exceptions, []);
  console.log('PASS: live search/Enter/clear without document or RSC reload; record DOM and unsaved edit retained; selection guard, mobile sheet/focus, themed grid loader and standalone splash; no saved changes.');
} finally {
  if (call && ws?.readyState === WebSocket.OPEN) {
    await call('Network.clearBrowserCookies');
    await call('Page.close');
    ws.close();
  }
  await client.auth.signOut({ scope: 'local' });
}
