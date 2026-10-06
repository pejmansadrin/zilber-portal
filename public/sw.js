/* Persist only public app code/assets. Personal HTML, RSC, photos, API responses
   and all mutations remain network-only. Private page prefetching is in-memory. */
const CACHE = "zilber-public-offline-v1";
const APP_PREFIX = "zilber-app-assets-";
const OFFLINE = "/offline.html";
const PUBLIC_ASSETS = [OFFLINE, "/pwa/icon-192.png"];
const APP_PUBLIC = new Set([
  ...PUBLIC_ASSETS, "/pwa/icon-512.png", "/pwa/icon-maskable-512.png", "/pwa/apple-touch-icon.png",
  "/images/zilber-logo.svg", "/images/bg-light.avif", "/images/bg-dark.avif",
  "/images/avatar-female.svg", "/images/avatar-male.svg", "/images/avatar-neutral.svg",
  "/fonts/vazirmatn-numbers.woff2",
]);
function allowed(path) {
  return APP_PUBLIC.has(path) || /^\/_next\/static\/[^?]+?\.(?:js|css|woff2?)$/.test(path);
}
function storable(response, path) {
  return response.ok && !response.redirected &&
    (path === OFFLINE || !/text\/html/i.test(response.headers.get("content-type") || "")) &&
    !/\b(?:private|no-store)\b/i.test(response.headers.get("cache-control") || "");
}

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC_ASSETS)));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith("zilber-public-offline-") && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

let warming;
const listeners = new Set();
function report(value) { listeners.forEach(port => port.postMessage(value)); }
async function prepare() {
  const manifestResponse = await fetch("/app-assets.json", { cache: "no-store", credentials: "omit" });
  if (!manifestResponse.ok || manifestResponse.redirected) throw new Error("Manifest unavailable");
  const manifest = await manifestResponse.json();
  if (!/^[\w-]+$/.test(manifest.build) || !Array.isArray(manifest.assets) ||
      !manifest.assets.length || manifest.assets.length > 2000) throw new Error("Invalid manifest");
  const assets = [...new Set(manifest.assets)];
  if (assets.some(path => typeof path !== "string" || !allowed(path) ||
      new URL(path, self.location.origin).pathname !== path)) throw new Error("Non-public asset");
  const cache = await caches.open(APP_PREFIX + manifest.build);
  let completed = 0;
  let failed = 0;
  let cursor = 0;
  report({ type: "APP_PROGRESS", completed, total: assets.length });
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < assets.length) {
      const path = assets[cursor++];
      try {
        if (!(await cache.match(path))) {
          const response = await fetch(path, { credentials: "omit" });
          if (!storable(response, path)) throw new Error("Asset unavailable");
          await cache.put(path, response);
        }
      } catch { failed++; }
      completed++;
      report({ type: "APP_PROGRESS", completed: completed - failed, total: assets.length });
    }
  }));
  if (failed) throw new Error("Incomplete download");
  const marker = new Response(JSON.stringify({ build: manifest.build }));
  await cache.put("/app-assets.json", marker.clone());
  await (await caches.open(CACHE)).put("/app-assets.json", marker);
  // Keep one prior release available for tabs still running that release.
  const keys = (await caches.keys()).filter(key => key.startsWith(APP_PREFIX));
  const other = keys.filter(key => key !== APP_PREFIX + manifest.build);
  const complete = [];
  for (const key of other) {
    if (await (await caches.open(key)).match("/app-assets.json")) complete.push(key);
    else await caches.delete(key);
  }
  await Promise.all(complete.slice(0, -1).map(key => caches.delete(key)));
  report({ type: "APP_READY", completed, total: assets.length });
}
self.addEventListener("message", event => {
  if (event.data?.type !== "WARM_APP" || !event.ports[0]) return;
  const port = event.ports[0];
  listeners.add(port);
  if (!warming) warming = prepare().catch(() => report({ type: "APP_RETRY" })).finally(() => { warming = undefined; });
  event.waitUntil(warming.finally(() => { listeners.delete(port); port.close(); }));
});
async function cachedAsset(path) {
  const marker = await (await caches.open(CACHE)).match("/app-assets.json");
  if (marker) {
    const { build } = await marker.json();
    const current = await (await caches.open(APP_PREFIX + build)).match(path);
    if (current) return current;
  }
  // Hashed code from an older release is safe for a tab still running it.
  if (!path.startsWith("/_next/static/")) return caches.match(path, { cacheName: CACHE });
  const keys = (await caches.keys()).filter(key => key.startsWith(APP_PREFIX)).reverse();
  for (const key of keys) {
    const cached = await (await caches.open(key)).match(path);
    if (cached) return cached;
  }
  return caches.match(path, { cacheName: CACHE });
}
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin ||
      request.headers?.has("rsc") || url.searchParams.has("_rsc")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE)) || Response.error()));
  } else if (!url.search && allowed(url.pathname)) {
    event.respondWith(cachedAsset(url.pathname).then(cached => cached || fetch(request)));
  }
});
