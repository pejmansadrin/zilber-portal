import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToReadableStream } from "react-dom/server";

const require = createRequire(import.meta.url);
async function load(file, mocks = {}, globals = {}) {
  const code = ts.transpileModule(await readFile(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => mocks[name] ?? require(name), ...globals });
  return exports;
}

let releaseAccount;
let releaseContent;
const account = new Promise(resolve => { releaseAccount = resolve; });
const content = new Promise(resolve => { releaseContent = resolve; });
const { default: Layout } = await load("src/app/(portal)/layout.tsx", {
  "@/lib/account/data": { getAccount: () => account },
  "@/components/portal/PortalShell": { PortalShell: ({ children, pending }) => React.createElement("div", null,
    React.createElement("nav", null, pending ? "public-shell" : "authenticated-shell"), children) },
  "@/components/portal/PortalSkeleton": { PortalSkeleton: () => React.createElement("p", null, "content-skeleton") },
});
async function SlowContent() {
  await content;
  return React.createElement("article", null, "private-records");
}
const stream = await renderToReadableStream(React.createElement("html", null,
  React.createElement("body", null, React.createElement(Layout, null,
    React.createElement(React.Suspense, { fallback: React.createElement("p", null, "waiting-for-records") }, React.createElement(SlowContent))))));
const reader = stream.getReader();
const decoder = new TextDecoder();
let output = "";
async function until(value) {
  let timer;
  try {
    await Promise.race([
      (async () => {
        while (!output.includes(value)) {
          const chunk = await reader.read();
          assert.equal(chunk.done, false, `Stream ended before ${value}`);
          output += decoder.decode(chunk.value);
        }
      })(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Streaming blocked before ${value}`)), 2000); }),
    ]);
  } finally { clearTimeout(timer); }
}
await until("public-shell");
assert(!output.includes("private-records"));
releaseAccount({ user: { user_metadata: {} }, employee: null, avatar: null, accessRole: "employee" });
await until("authenticated-shell");
await until("waiting-for-records");
assert(!output.includes("private-records"));
releaseContent();
await until("private-records");
await reader.cancel();

const listeners = new Map();
const timers = new Map();
const idleTasks = new Map();
let nextId = 0;
let calls = 0;
const document = { readyState: "loading", hidden: false };
const navigator = { onLine: true, connection: { effectiveType: "4g", saveData: false } };
const window = {
  addEventListener: (event, listener) => listeners.set(event, listener),
  removeEventListener: (event, listener) => { if (listeners.get(event) === listener) listeners.delete(event); },
  requestIdleCallback: callback => { const key = ++nextId; idleTasks.set(key, callback); return key; },
  cancelIdleCallback: key => idleTasks.delete(key),
};
const background = await load("src/lib/background-work.ts", {}, {
  window, document, navigator,
  setTimeout: callback => { const key = ++nextId; timers.set(key, callback); return key; },
  clearTimeout: key => timers.delete(key),
});
const cancel = background.scheduleBackgroundWork(() => calls++);
assert.equal(calls, 0);
assert.equal(timers.size, 0);
listeners.get("load")();
assert.equal(calls, 0);
[...timers.values()][0]();
assert.equal(calls, 0);
[...idleTasks.values()][0]();
assert.equal(calls, 1);
cancel();
assert.equal(listeners.size, 0);
assert.equal(idleTasks.size, 0);
timers.clear();
document.readyState = "complete";
const cancelled = background.scheduleBackgroundWork(() => calls++);
const lateCallback = [...timers.values()][0];
cancelled();
lateCallback();
for (const callback of idleTasks.values()) callback();
assert.equal(calls, 1);
assert(background.canWarmAssets());
for (const effectiveType of ["slow-2g", "2g", "3g"]) {
  navigator.connection.effectiveType = effectiveType;
  assert.equal(background.canWarmAssets(), false);
}
navigator.connection.effectiveType = "4g";
navigator.connection.saveData = true;
assert.equal(background.canWarmAssets(), false);
navigator.connection.saveData = false;
document.hidden = true;
assert.equal(background.canWarmAssets(), false);
document.hidden = false;
navigator.onLine = false;
assert.equal(background.canWarmAssets(), false);
console.log("PASS: shell streams before account and records; background downloads wait for page load/idle, support cancellation and respect slow/offline/data-saving connections.");
