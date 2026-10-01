import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {
  encodeReply,
} = require("next/dist/compiled/react-server-dom-webpack/client.node");
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.equal(url, "https://otsgzpazmmnfeacysdnl.supabase.co");
const privateFile = process.env.ZILBER_QA_CREDENTIALS;
assert(
  privateFile,
  "Set ZILBER_QA_CREDENTIALS to the private credential file.",
);
const entries = [
  ...fs
    .readFileSync(privateFile, "utf8")
    .matchAll(/نام کاربری \(ایمیل\): ([^\n]+)\nرمز عبور: ([^\n]+)/g),
].map((m) => ({ email: m[1], password: m[2] }));
const first = entries.find((e) => e.email === "baharabbaszadeh@zilber.tech");
const second = entries.find((e) => e.email === "aryaazizieh@zilber.tech");
assert(first && second);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const a = createClient(url, key, opts),
  b = createClient(url, key, opts),
  anon = createClient(url, key, opts);
for (const [client, credentials] of [
  [a, first],
  [b, second],
]) {
  const { error } = await client.auth.signInWithPassword(credentials);
  assert.ifError(error);
}
const { data: rows, error } = await a.from("employees").select("*");
assert.ifError(error);
assert.equal(rows.length, 1);
const owner = rows[0];
const { data: others, error: otherError } = await b
  .from("employees")
  .select("id");
assert.ifError(otherError);
assert.equal(others.length, 1);
assert.notEqual(owner.id, others[0].id);
const cleanup = [];
let path;
try {
  const { error } = await anon.from("employees").select("id");
  assert(error, "Anonymous access must fail");
  const foreign = await b.from("employees").select("id").eq("id", owner.id);
  assert.deepEqual(foreign.data, []);
  const forbidden = await a
    .from("employees")
    .update({ department: owner.department })
    .eq("id", owner.id);
  assert(forbidden.error, "Organization fields must be read-only");
  const escalation = await a
    .from("employees")
    .update({ auth_user_id: owner.auth_user_id })
    .eq("id", owner.id);
  assert(escalation.error, "Ownership must be immutable");
  const edit = await a
    .from("employees")
    .update({ preferred_name: "آزمایش موقت پورتال" })
    .eq("id", owner.id)
    .select("preferred_name")
    .single();
  assert.ifError(edit.error);
  assert.equal(edit.data.preferred_name, "آزمایش موقت پورتال");
  cleanup.push(async () => {
    const r = await a
      .from("employees")
      .update({ preferred_name: owner.preferred_name, city: owner.city })
      .eq("id", owner.id);
    assert.ifError(r.error);
  });
  const configs = [
    ["employee_emergency_contacts", "full_name"],
    ["employee_dependents", "full_name"],
    ["employee_bank_accounts", "bank_name"],
    ["employee_education", "institution"],
    ["employee_work_history", "employer"],
    ["employee_skills", "skill_name"],
    ["employee_languages", "language"],
    ["employee_certifications", "title"],
    ["employee_documents", "title"],
    ["employee_training", "title"],
  ];
  for (const [table, field] of configs) {
    const payload = {
      employee_id: owner.id,
      [field]: "Portal QA temporary record",
    };
    const created = await a.from(table).insert(payload).select("id").single();
    assert.ifError(created.error);
    const id = created.data.id;
    cleanup.push(async () => {
      const r = await a.from(table).delete().eq("id", id);
      assert.ifError(r.error);
    });
    const otherRead = await b.from(table).select("id").eq("id", id);
    assert.deepEqual(otherRead.data, []);
    const otherEdit = await b
      .from(table)
      .update({ [field]: "forbidden" })
      .eq("id", id)
      .select("id");
    assert.deepEqual(otherEdit.data, []);
    const otherDelete = await b.from(table).delete().eq("id", id).select("id");
    assert.deepEqual(otherDelete.data, []);
    const otherInsert = await b.from(table).insert(payload);
    assert(otherInsert.error, `${table} must reject cross-user inserts`);
    const edited = await a
      .from(table)
      .update({ [field]: "Portal QA updated" })
      .eq("id", id)
      .select(field)
      .single();
    assert.ifError(edited.error);
    assert.equal(edited.data[field], "Portal QA updated");
  }
  path = `${owner.auth_user_id}/qa-${crypto.randomUUID()}.png`;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lS8AAAAASUVORK5CYII=",
    "base64",
  );
  const upload = await a.storage
    .from("employee-files")
    .upload(path, png, { contentType: "image/png" });
  assert.ifError(upload.error);
  cleanup.push(async () => {
    const r = await a.storage.from("employee-files").remove([path]);
    assert.ifError(r.error);
  });
  const sign = await a.storage.from("employee-files").createSignedUrl(path, 60);
  assert.ifError(sign.error);
  assert.equal((await fetch(sign.data.signedUrl)).status, 200);
  const foreignFile = await b.storage.from("employee-files").download(path);
  assert(foreignFile.error);
  const forbiddenUpload = await b.storage
    .from("employee-files")
    .upload(`${owner.auth_user_id}/forbidden.png`, png, {
      contentType: "image/png",
    });
  assert(forbiddenUpload.error);
  const remove = await b.storage.from("employee-files").remove([path]);
  assert(!remove.data?.length);
  assert.ifError((await a.storage.from("employee-files").download(path)).error);
  const cookieJar = new Map();
  const ssr = createServerClient(url, key, {
    cookies: {
      getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
      setAll: (items) =>
        items.forEach((item) => cookieJar.set(item.name, item.value)),
    },
  });
  assert.ifError((await ssr.auth.signInWithPassword(first)).error);
  const cookie = [...cookieJar]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  const base = process.env.ZILBER_QA_BASE_URL || "http://localhost:3000";
  for (const route of [
    "/dashboard",
    "/account",
    "/account?section=identity",
    "/account?section=career",
    "/account?section=documents",
    "/account?section=employment",
    "/account?section=security",
  ]) {
    const response = await fetch(base + route, { headers: { cookie } });
    const html = await response.text();
    assert.equal(response.status, 200, route);
    assert(html.includes("حساب من"), route);
    assert(!html.includes("دریافت اطلاعات انجام نشد"), route);
    if (route === "/account") assert(html.includes("پرونده در یک نگاه"), route);
    if (route === "/account?section=identity") assert(html.includes('name="last_name"'), route);
  }
  const page = await fetch(base + "/account?section=contact", {
    headers: { cookie },
  });
  const html = await page.text();
  const form = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)]
    .map((m) => m[0])
    .find((s) => s.includes('name="mobile_phone"'));
  assert(form, "Contact form must be rendered");
  const payload = new FormData();
  for (const field of [
    "mobile_phone",
    "personal_email",
    "work_phone",
    "phone_extension",
    "country",
    "province",
    "city",
    "postal_code",
    "address_line_1",
    "address_line_2",
    "timezone",
    "preferred_language",
  ])
    payload.append(field, owner[field] || "");
  payload.set("city", "آزمایش موقت فرم");
  payload.set("auth_user_id", others[0].id);
  payload.set("department", "forbidden");
  const manifest = JSON.parse(
    fs.readFileSync(".next/dev/server/server-reference-manifest.json", "utf8"),
  );
  const actionId = Object.entries(manifest.node).find(
    ([, entry]) => entry.exportedName === "savePersonal",
  )?.[0];
  assert(actionId, "Save action must be compiled");
  const saved = await fetch(base + "/account?section=contact", {
    method: "POST",
    headers: { cookie, origin: base, "Next-Action": actionId },
    body: await encodeReply(["contact", { ok: false, message: "" }, payload]),
  });
  const savedHtml = await saved.text();
  assert.equal(saved.status, 200);
  assert(
    savedHtml.includes("اطلاعات شما ذخیره شد."),
    "Server action save confirmation",
  );
  const after = await a
    .from("employees")
    .select("city,department,auth_user_id")
    .eq("id", owner.id)
    .single();
  assert.ifError(after.error);
  assert.equal(after.data.city, "آزمایش موقت فرم");
  assert.equal(after.data.department, owner.department);
  assert.equal(after.data.auth_user_id, owner.auth_user_id);
  const denied = await fetch(base + "/account", { redirect: "manual" });
  assert([302, 303, 307, 308].includes(denied.status));
  const hiddenFile = await fetch(
    base +
      "/account/files?path=" +
      encodeURIComponent(`${others[0].id}/fake.pdf`),
    { headers: { cookie }, redirect: "manual" },
  );
  assert.equal(hiddenFile.status, 404);
  console.log(
    "PASS: own profile edit; protected fields; 10 collection CRUD and cross-user denials; private files; authenticated pages; server action save; anonymous redirect.",
  );
} finally {
  for (const remove of cleanup.reverse()) await remove();
  await Promise.all([
    a.auth.signOut({ scope: "local" }),
    b.auth.signOut({ scope: "local" }),
  ]);
  console.log("QA records and files removed; employee fields restored.");
}
