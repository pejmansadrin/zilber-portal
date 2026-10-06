import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const origin = "https://portal.zilber.tech";
const handlers = {};
const stores = new Map();
const requests = [];
let version = "one";
let offline = false;
let denied = false;
let assets = ["/_next/static/one.js", "/_next/static/main.css", "/images/zilber-logo.svg"];
const keyFor = input => new URL(typeof input === "string" ? input : input.url, origin).pathname;
async function network(input, options) {
  const key = keyFor(input);
  requests.push({ key, options });
  if (offline) throw new Error("offline");
  if (key === "/app-assets.json") return Response.json({ build: version, assets });
  if (denied) return new Response("unauthorized", { status: 401 });
  const body = key === "/offline.html" ? "offline" : version + ":" + key;
  const type = key.endsWith(".js") ? "text/javascript" : key.endsWith(".css") ? "text/css" : "image/svg+xml";
  return new Response(body, { headers: { "Content-Type": type } });
}
async function open(name) {
  if (!stores.has(name)) stores.set(name, new Map());
  const store = stores.get(name);
  return {
    async match(input) { return store.get(keyFor(input))?.clone(); },
    async put(input, response) { store.set(keyFor(input), response.clone()); },
    async addAll(paths) { for (const path of paths) await this.put(path, await network(path)); },
  };
}
const caches = {
  open,
  async keys() { return [...stores.keys()]; },
  async delete(name) { return stores.delete(name); },
  async match(input, options = {}) {
    if (options.cacheName) return (await open(options.cacheName)).match(input);
    for (const name of stores.keys()) {
      const value = await (await open(name)).match(input);
      if (value) return value;
    }
  },
};
vm.runInNewContext(await readFile("public/sw.js", "utf8"), {
  self: { location: { origin }, clients: { claim: async () => {} },
    addEventListener: (name, callback) => { handlers[name] = callback; } },
  caches, fetch: network, URL, Response, Set, Promise,
});
async function lifecycle(name) {
  await new Promise((resolve, reject) => handlers[name]({ waitUntil: promise => promise.then(resolve, reject) }));
}
async function warm() {
  const messages = [];
  await new Promise((resolve, reject) => handlers.message({
    data: { type: "WARM_APP" }, ports: [{ postMessage: value => messages.push(value), close() {} }],
    waitUntil: promise => promise.then(resolve, reject),
  }));
  return messages;
}
function request(path, { method = "GET", mode = "cors", headers = {} } = {}) {
  let result;
  handlers.fetch({ request: { url: new URL(path, origin).href, method, mode, headers: new Headers(headers) },
    respondWith: value => { result = value; } });
  return result;
}
await lifecycle("install");
await lifecycle("activate");
assert.equal((await warm()).at(-1).type, "APP_READY");
assert.ok(requests.filter(entry => assets.includes(entry.key)).every(entry => entry.options.credentials === "omit"));
offline = true;
assert.equal(await (await request("/_next/static/one.js")).text(), "one:/_next/static/one.js");
assert.equal(await (await request("/images/zilber-logo.svg")).text(), "one:/images/zilber-logo.svg");
for (const path of ["/account", "/account/photo?path=private", "/api/private", "/attendance?_rsc=1", "https://cloud.supabase.co/auth/v1/user"]) {
  assert.equal(request(path), undefined, "private requests are not intercepted: " + path);
}
assert.equal(request("/_next/static/one.js", { headers: { rsc: "1" } }), undefined);
assert.equal(request("/attendance", { method: "POST" }), undefined);
assert.equal(await (await request("/account", { mode: "navigate" })).text(), "offline");
offline = false;
denied = true;
assert.equal((await request("/account", { mode: "navigate" })).status, 401);
denied = false;
for (const build of ["two", "three"]) {
  version = build;
  assets = ["/_next/static/" + build + ".js", "/images/zilber-logo.svg"];
  assert.equal((await warm()).at(-1).type, "APP_READY");
}
assert.ok(!stores.has("zilber-app-assets-one"));
assert.ok(stores.has("zilber-app-assets-two"));
assert.equal(await (await request("/_next/static/two.js")).text(), "two:/_next/static/two.js");
// Rollback selects that release's unversioned public images, not the newest cache.
version = "two";
assets = ["/_next/static/two.js", "/images/zilber-logo.svg"];
await warm();
assert.equal(await (await request("/images/zilber-logo.svg")).text(), "two:/images/zilber-logo.svg");
const before = requests.length;
assets = ["/account/photo?path=private"];
assert.equal((await warm()).at(-1).type, "APP_RETRY");
assert.ok(requests.slice(before).every(entry => entry.key === "/app-assets.json"));
version = "broken";
assets = ["/_next/static/broken.js"];
denied = true;
assert.equal((await warm()).at(-1).type, "APP_RETRY");
assert.equal(await (await open("zilber-app-assets-broken")).match(assets[0]), undefined);
assert.equal((await (await (await open("zilber-public-offline-v1")).match("/app-assets.json")).json()).build, "two");
console.log("App preload checks passed: public-only assets, cached navigation code, auth/mutation isolation, offline fallback, upgrades, rollback and interrupted downloads.");
