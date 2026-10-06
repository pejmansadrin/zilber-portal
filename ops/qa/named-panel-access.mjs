import fs from "node:fs";
import assert from "node:assert/strict";
import { createServerClient } from "@supabase/ssr";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { encodeReply } = require("next/dist/compiled/react-server-dom-webpack/client.node");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(url, "https://otsgzpazmmnfeacysdnl.supabase.co");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const base = process.env.ZILBER_QA_BASE_URL || "http://localhost:3000";
assert(process.env.ZILBER_QA_CREDENTIALS);
const credentials = [...fs.readFileSync(process.env.ZILBER_QA_CREDENTIALS, "utf8").matchAll(/نام کاربری \(ایمیل\): ([^\n]+)\nرمز عبور: ([^\n]+)/g)].map(match => ({ email: match[1], password: match[2] }));
const allowed = new Set(["pejmansadrinezhad@zilber.tech", "nargesnajaran@zilber.tech"]);
assert.equal(credentials.length, 7);
let approved = 0, denied = 0;
for (const credential of credentials) {
  const jar = new Map();
  const client = createServerClient(url, key, { cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: items => items.forEach(item => jar.set(item.name, item.value)),
  } });
  try {
    assert.ifError((await client.auth.signInWithPassword(credential)).error);
    const headers = { cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") };
    const expected = allowed.has(credential.email);
    const { data: role, error } = await client.rpc("portal_access", {}); assert.ifError(error);
    assert.equal(role === "super_admin", expected);
    const dashboard = await fetch(base + "/dashboard", { headers });
    const dashboardHtml = await dashboard.text(); assert.equal(dashboard.status, 200);
    assert.equal(dashboardHtml.includes('href="/people"'), expected, "Dashboard panel option");
    const account = await fetch(base + "/account", { headers });
    const accountHtml = await account.text(); assert.equal(account.status, 200);
    const panel = await fetch(base + "/people?employee=3", { headers });
    const html = await panel.text(); assert.equal(panel.status, 200);
    assert.equal(html.includes('name="base_amount"'), expected, "Direct panel access");
    assert.equal(html.includes('data-record-field="national_id"'), expected);
    if (expected) {
      const tabs = [...html.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map(match => match[0]);
      assert.equal(tabs.length, 8, "Complete categorized panel navigation");
      assert.equal(tabs.filter(tab => tab.includes('aria-selected="true"')).length, 1, "One selected panel section");
      const panels = [...html.matchAll(/<div[^>]*role="tabpanel"[^>]*>/g)].map(match => match[0]);
      assert.equal(panels.length, 8);
      assert.equal(panels.filter(panel => !panel.includes('hidden=""')).length, 1, "Only the overview is initially visible");
      assert(html.includes("پرونده در یک نگاه"));
    }
    if (!expected) {
      assert(html.includes("شما به پنل مدیریت دسترسی ندارید."));
      // Call the action directly, without relying on visibility of its form.
      const manifest = JSON.parse(fs.readFileSync(process.env.ZILBER_QA_ACTION_MANIFEST || ".next/dev/server/server-reference-manifest.json", "utf8"));
      const actionId = Object.entries(manifest.node).find(([, entry]) => entry.exportedName === "saveOrganization")?.[0]; assert(actionId);
      const response = await fetch(base + "/people", { method: "POST", headers: { ...headers, origin: base, "Next-Action": actionId },
        body: await encodeReply([3, "employees", { ok: false, message: "" }, new FormData()]),
      });
      assert((await response.text()).includes("دسترسی مجاز نیست."));
      denied++;
    } else approved++;
    assert(accountHtml.includes("حساب من"));
  } finally { await client.auth.signOut({ scope: "local" }); }
}
assert.equal(approved, 2); assert.equal(denied, 5);
console.log("PASS: only the two named accounts have panel visibility, direct route and action access; five other users denied.");
