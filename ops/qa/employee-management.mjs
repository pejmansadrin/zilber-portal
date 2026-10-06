import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServerClient } from "@supabase/ssr";
const require = createRequire(import.meta.url);
const { encodeReply } = require("next/dist/compiled/react-server-dom-webpack/client.node");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(url, "https://otsgzpazmmnfeacysdnl.supabase.co");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const base = process.env.ZILBER_QA_BASE_URL || "http://localhost:3001";
assert(process.env.ZILBER_QA_CREDENTIALS, "Provide the private credential file");
const entries = [...fs.readFileSync(process.env.ZILBER_QA_CREDENTIALS,"utf8").matchAll(/نام کاربری \(ایمیل\): ([^\n]+)\nرمز عبور: ([^\n]+)/g)].map(m=>({email:m[1],password:m[2]}));
const sessions=[];
try {
  for(const email of ["pejmansadrinezhad@zilber.tech","baharabbaszadeh@zilber.tech"]){
    const credentials=entries.find(e=>e.email===email); assert(credentials);
    const jar=new Map();
    const client=createServerClient(url,key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(item=>jar.set(item.name,item.value))}});
    assert.ifError((await client.auth.signInWithPassword(credentials)).error);
    sessions.push({client,cookie:[...jar].map(([name,value])=>`${name}=${value}`).join("; ")});
  }
  const [admin,employee]=sessions;
  assert.equal((await admin.client.rpc("portal_access",{})).data,"super_admin");
  const {data:directory,error}=await admin.client.rpc("organization_directory",{}); assert.ifError(error);
  const {data:allEmployees,error:employeesError}=await admin.client.from("employees").select("*"); assert.ifError(employeesError);
  assert.equal(directory.length,allEmployees.length);
  for (const person of directory) {
    const response=await fetch(base+`/people?employee=${person.id}`,{headers:{cookie:admin.cookie}});
    const html=await response.text(); assert.equal(response.status,200);
    assert(html.includes("پروندهٔ کامل کاربر"));
    for (const field of Object.keys(person)) assert(html.includes(`data-record-field="${field}"`),`Missing employee field: ${field}`);
    assert(html.includes("بازخورد کارمند") || html.includes("ارزیابی"));
  }
  const adminRoute=await fetch(base+"/admin",{headers:{cookie:admin.cookie},redirect:"manual"});
  assert.equal(adminRoute.status,307); assert.equal(new URL(adminRoute.headers.get("location"),base).pathname,"/people");
  const search=await fetch(base+"/people?q="+encodeURIComponent(directory[0].full_name),{headers:{cookie:admin.cookie}});
  assert.equal(search.status,200); assert((await search.text()).includes("پروندهٔ کامل کاربر"));
  assert.deepEqual((await employee.client.rpc("organization_directory",{})).data,[]);
  for(const path of ["/account","/people","/people?employee=3","/people?employee=999999"]){
    const response=await fetch(base+path,{headers:{cookie:admin.cookie}}); const html=await response.text();
    assert.equal(response.status,200,path); assert(!html.includes("دریافت اطلاعات انجام نشد"),path);
    if(path==="/account") {
      assert(html.includes("پرونده در یک نگاه"));
      const tabs=[...html.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map(match=>match[0]);
      assert.equal(tabs.filter(tab=>tab.includes('aria-selected="true"')).length,1,"Exactly one selected account tab");
      const ids=tabs.map(tab=>tab.match(/id="([^"]+)"/)?.[1]);
      assert.equal(new Set(ids).size,9,"Account section IDs must be unique");
      assert(html.includes("ویرایش مشخصات"));
      assert(html.includes("جزئیات پرونده"));
    }
    if(path==="/people?employee=3") { assert(html.includes("ویرایش توسط مدیریت")); assert(html.includes('name="manager_id"')); }
  }
  const denied=await fetch(base+"/people?employee=3",{headers:{cookie:employee.cookie}}); const deniedHtml=await denied.text();
  assert(deniedHtml.includes("شما به پنل مدیریت دسترسی ندارید.")); assert(!deniedHtml.includes('name="base_amount"'));
  const ownerId=(await employee.client.auth.getUser()).data.user.id;
  const storagePath=`${ownerId}/qa-super-${Date.now()}.pdf`;
  assert.ifError((await employee.client.storage.from("employee-files").upload(storagePath,Buffer.from("%PDF-1.4\nQA test\n%%EOF"),{contentType:"application/pdf"})).error);
  try {
    assert.ifError((await admin.client.storage.from("employee-files").createSignedUrl(storagePath,60)).error);
    const file=await fetch(base+"/account/files?path="+encodeURIComponent(storagePath),{headers:{cookie:admin.cookie},redirect:"manual"});
    assert.equal(file.status,307);
  } finally { assert.ifError((await employee.client.storage.from("employee-files").remove([storagePath])).error); }
  const original=directory.find(e=>e.id===3); assert(original);
  const fields=["employee_number","email","legal_entity","department","team","job_title","job_level","cost_center","work_location","work_arrangement","employment_type","employment_status","hired_on","original_hired_on","probation_ends_on","terminated_on","termination_reason","weekly_work_hours","manager_id"];
  const patch=Object.fromEntries(fields.map(field=>[field,original[field] ?? null]));
  const payload=new FormData();
  const persianDate=new Intl.DateTimeFormat("en-US-u-ca-persian",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"UTC"});
  for(const [field,value] of Object.entries(patch)) {
    if(value && ["hired_on","original_hired_on","probation_ends_on","terminated_on"].includes(field)) {
      const parts=Object.fromEntries(persianDate.formatToParts(new Date(value+"T00:00:00Z")).map(p=>[p.type,p.value])); payload.set(field,`${parts.year}/${parts.month}/${parts.day}`);
    } else payload.set(field,value==null?"":String(value));
  }
  payload.set("team","QA temporary management"); payload.set("auth_user_id","forbidden");
  const manifest=JSON.parse(fs.readFileSync(".next/dev/server/server-reference-manifest.json","utf8"));
  const actionId=Object.entries(manifest.node).find(([,entry])=>entry.exportedName==="saveOrganization")?.[0]; assert(actionId);
  try {
    const response=await fetch(base+"/people?employee=3",{method:"POST",headers:{cookie:admin.cookie,origin:base,"Next-Action":actionId},body:await encodeReply([3,"employees",{ok:false,message:""},payload])});
    const body=await response.text(); assert.equal(response.status,200); assert(body.includes("اطلاعات سازمانی ذخیره شد."));
    const {data:after}=await admin.client.from("employees").select("team,auth_user_id").eq("id",3).single();
    assert.equal(after.team,"QA temporary management"); assert.equal(after.auth_user_id,original.auth_user_id);
  } finally { assert.ifError((await admin.client.rpc("save_organization",{target:3,area:"employees",record_id:null,patch})).error); }
  console.log("PASS: all users and every employee field in super-admin SSR, search and admin entry, employee isolation, manager selector, private files, real organization Server Action and protected ownership; restored original fields.");
} finally { for(const {client} of sessions) await client.auth.signOut(); }
