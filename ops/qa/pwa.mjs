import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import sharp from "sharp";

async function loadTs(path) {
  const code = ts.transpileModule(await readFile(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports });
  return exports;
}
const { pwaBootstrap } = await loadTs("src/lib/pwa-bootstrap.ts");
function mode(userAgent, { touch = 0, standalone = false, display = "browser" } = {}) {
  const listeners = {};
  const document = { documentElement: { dataset: {} } };
  const window = {};
  vm.runInNewContext(pwaBootstrap, {
    navigator: { userAgent, maxTouchPoints: touch, standalone }, document, window,
    matchMedia: query => ({ matches: query === `(display-mode: ${display})`, addEventListener() {} }),
    addEventListener: (name, listener) => { listeners[name] = listener; },
  });
  return { mode: document.documentElement.dataset.pwaMode, window, listeners };
}
assert.equal(mode("Mozilla iPhone Mobile").mode, "ios");
assert.equal(mode("Mozilla Android").mode, "android");
assert.equal(mode("Mozilla Macintosh", { touch: 5 }).mode, "ios");
assert.equal(mode("Mozilla Macintosh", { touch: 0 }).mode, "desktop");
assert.equal(mode("Mozilla Windows", { touch: 10 }).mode, "desktop");
assert.equal(mode("Mozilla iPhone", { standalone: true }).mode, "standalone");
assert.equal(mode("Mozilla Android", { display: "standalone" }).mode, "standalone");
assert.equal(mode("Mozilla Android", { display: "fullscreen" }).mode, "standalone");
const browser = mode("Android");
const prompt = { preventDefault() { this.prevented = true; } };
browser.listeners.beforeinstallprompt(prompt);
assert.equal(prompt.prevented, true);
assert.equal(browser.window.__portalInstallPrompt, prompt);
browser.listeners.appinstalled();
assert.equal(browser.window.__portalInstallPrompt, undefined);
// Installing in a tab does not pretend that tab has become the standalone app.
assert.equal(browser.mode, "android");

const handlers = {};
const cached = [];
const deleted = [];
const offline = new Response("public offline page");
let networkFails = false;
let networkStatus = 200;
const origin = "https://portal.zilber.tech";
vm.runInNewContext(await readFile("public/sw.js", "utf8"), {
  self: { location: { origin }, clients: { claim: async () => {} }, addEventListener: (name, handler) => { handlers[name] = handler; } },
  caches: {
    open: async () => ({ addAll: async paths => { cached.push(...paths); } }),
    keys: async () => ["zilber-public-offline-v0", "zilber-public-offline-v1", "unrelated-cache"],
    delete: async key => { deleted.push(key); },
    match: async path => path === "/offline.html" ? offline : undefined,
  },
  URL, Response,
  fetch: async () => { if (networkFails) throw new Error("offline"); return new Response("network", { status: networkStatus }); },
});
await new Promise((resolve, reject) => handlers.install({ waitUntil: value => value.then(resolve, reject) }));
assert.deepEqual(cached, ["/offline.html", "/pwa/icon-192.png"]);
await new Promise((resolve, reject) => handlers.activate({ waitUntil: value => value.then(resolve, reject) }));
assert.deepEqual(deleted, ["zilber-public-offline-v0"]);
function request(path, method = "GET", mode = "cors") {
  let response;
  handlers.fetch({ request: { url: new URL(path, origin).href, method, mode }, respondWith: value => { response = value; } });
  return response;
}
for (const path of ["/account/photo?path=private", "/api/private", "/dashboard?_rsc=1", "https://cloud.supabase.co/auth/v1/user"]) {
  assert.equal(request(path), undefined, `private network only: ${path}`);
}
assert.equal(request("/account", "POST"), undefined);
assert.equal(await (await request("/account", "GET", "navigate")).text(), "network");
networkStatus = 401;
assert.equal((await request("/account", "GET", "navigate")).status, 401);
networkFails = true;
assert.equal(await request("/account", "GET", "navigate"), offline);
assert.deepEqual(cached, ["/offline.html", "/pwa/icon-192.png"]);

const manifest = (await loadTs("src/app/manifest.ts")).default();
assert.equal(manifest.display, "standalone");
assert.equal(manifest.scope, "/");
assert.equal(manifest.id, "/");
for (const icon of [...manifest.icons, { src: "/pwa/apple-touch-icon.png", sizes: "180x180" }]) {
  const meta = await sharp(`public${icon.src}`).metadata();
  assert.equal(`${meta.width}x${meta.height}`, icon.sizes);
  assert.equal(meta.format, "png");
}
console.log("PWA checks passed: mobile/standalone gate, installation capture, public-only offline caching, network auth/mutations, manifest and icons.");
await import("./app-preload.mjs");
