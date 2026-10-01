import assert from "node:assert/strict";
const base = "https://portal.zilber.tech";
const health = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(15000) });
assert.equal(health.status, 200);
const result = await health.json();
assert.equal(result.status, "ok");
assert.equal(result.version, process.env.CI_COMMIT_TAG);
assert.equal(result.commit, process.env.CI_COMMIT_SHA);
for (const path of ["/login", "/images/bg-light.avif", "/images/avatar-male.svg", "/offline.html", "/pwa/icon-192.png", "/pwa/icon-512.png", "/pwa/icon-maskable-512.png", "/pwa/apple-touch-icon.png"]) {
  assert.equal((await fetch(base + path, { signal: AbortSignal.timeout(15000), redirect: "manual" })).status, 200, path);
}
const manifestResponse = await fetch(`${base}/manifest.webmanifest`, { redirect: "manual", signal: AbortSignal.timeout(15000) });
assert.equal(manifestResponse.status, 200);
assert.match(manifestResponse.headers.get("content-type"), /application\/manifest\+json/);
const manifest = await manifestResponse.json();
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "/dashboard");
const worker = await fetch(`${base}/sw.js`, { redirect: "manual", signal: AbortSignal.timeout(15000) });
assert.equal(worker.status, 200);
assert.match(worker.headers.get("content-type"), /javascript/);
assert.match(worker.headers.get("cache-control"), /no-store/);
assert.equal(worker.headers.get("service-worker-allowed"), "/");
assert.match(await worker.text(), /zilber-public-offline/);
assert.equal((await fetch(`${base}/account`, { redirect: "manual", signal: AbortSignal.timeout(15000) })).status, 307);
console.log(`Production HTTPS and assets verified: ${result.version}`);
