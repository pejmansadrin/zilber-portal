import assert from "node:assert/strict";
const base = "https://portal.zilber.tech";
const health = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(15000) });
assert.equal(health.status, 200);
const result = await health.json();
assert.equal(result.status, "ok");
assert.equal(result.version, process.env.CI_COMMIT_TAG);
assert.equal(result.commit, process.env.CI_COMMIT_SHA);
for (const path of ["/login", "/images/bg-light.avif", "/images/avatar-male.svg"]) {
  assert.equal((await fetch(base + path, { signal: AbortSignal.timeout(15000), redirect: "manual" })).status, 200, path);
}
assert.equal((await fetch(`${base}/account`, { redirect: "manual", signal: AbortSignal.timeout(15000) })).status, 307);
console.log(`Production HTTPS and assets verified: ${result.version}`);
