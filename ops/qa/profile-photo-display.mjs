import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(url, "https://otsgzpazmmnfeacysdnl.supabase.co");
assert(process.env.ZILBER_QA_CREDENTIALS);
const credentials = [...fs.readFileSync(process.env.ZILBER_QA_CREDENTIALS, "utf8").matchAll(/نام کاربری \(ایمیل\): ([^\n]+)\nرمز عبور: ([^\n]+)/g)].map(match => ({ email: match[1], password: match[2] }));
const base = process.env.ZILBER_QA_BASE_URL || "http://localhost:3000";
const sessions = [];
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
try {
  for (const email of ["pejmansadrinezhad@zilber.tech", "nargesnajaran@zilber.tech", "baharabbaszadeh@zilber.tech"]) {
    const jar = new Map();
    const client = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: items => items.forEach(item => jar.set(item.name, item.value)),
    } });
    assert.ifError((await client.auth.signInWithPassword(credentials.find(entry => entry.email === email))).error);
    sessions.push({ client, headers: { cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") } });
  }
  const [owner, superAdmin, other] = sessions;
  const ownerId = (await owner.client.auth.getUser()).data.user.id;
  const { data: employee, error } = await owner.client.from("employees").select("id,photo_storage_path").eq("auth_user_id", ownerId).single();
  assert.ifError(error); assert(employee.photo_storage_path, "Existing owner photo is needed for this read-only test");
  const href = "/account/photo?path=" + encodeURIComponent(employee.photo_storage_path);
  const { data: original, error: downloadError } = await owner.client.storage.from("employee-files").download(employee.photo_storage_path);
  assert.ifError(downloadError); const expected = digest(Buffer.from(await original.arrayBuffer()));
  for (const session of [owner, superAdmin]) {
    for (const suffix of ["", "&retry=1"]) {
      const response = await fetch(base + href + suffix, { headers: session.headers, redirect: "manual" });
      assert.equal(response.status, 200); assert(response.headers.get("content-type").startsWith("image/"));
      assert(response.headers.get("cache-control").includes("no-store"));
      assert.equal(digest(Buffer.from(await response.arrayBuffer())), expected, "Actual stored photo bytes");
    }
  }
  assert.equal((await fetch(base + href, { headers: other.headers })).status, 404);
  const anonymous = await fetch(base + href, { redirect: "manual" });
  assert([401, 307].includes(anonymous.status));
  assert.equal((await fetch(base + "/account/photo?path=..%2Fsecret", { headers: owner.headers })).status, 404);
  for (const page of ["/dashboard", "/account", "/account?section=identity", `/people?employee=${employee.id}`]) {
    const response = await fetch(base + page, { headers: owner.headers });
    const html = await response.text(); assert.equal(response.status, 200);
    assert(html.includes(href), "Stable private photo URL in " + page);
    assert(!html.includes("/storage/v1/object/sign/"), "No expiring signed photo URL in " + page);
    if (page === "/dashboard") assert(html.split(href).length >= 3, "Both header and welcome photo");
  }
  for (const asset of ["avatar-male.svg", "avatar-female.svg", "avatar-neutral.svg"]) {
    assert.equal((await fetch(base + "/images/" + asset)).status, 200);
  }
  for (const section of ["overview", "identity", "contact", "family", "finance", "career", "documents", "employment", "security"]) {
    const response = await fetch(base + "/account?section=" + section, { headers: other.headers });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal(html.includes("بازگشت به خلاصهٔ پرونده"), section !== "overview", "Back control in " + section);
  }
  console.log("PASS: actual photo bytes for owner and super-admin, denied non-owner/anonymous/traversal, stable photo URLs across portal views, retry and default assets; back control across account sections; no photo changes.");
} finally { for (const session of sessions) await session.client.auth.signOut({ scope: "local" }); }
