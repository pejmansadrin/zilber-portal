import { createClient } from '@supabase/supabase-js';

// Run with: node --env-file=.env.local ops/supabase/seed-demo-person.mjs
// Deliberately limited to this project's local Supabase instance.
const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
if (url.hostname !== '127.0.0.1' || url.port !== '56321') {
  throw new Error('This demo seed only supports the zilber-portal local database.');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
}
const client = createClient(url.href, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = 'demo.person@example.invalid';
const seedTag = 'zilber-portal-demo-person';
let user;
for (let page = 1; ; page++) {
  const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  user = data.users.find((entry) => entry.email === email);
  if (user || data.users.length < 100) break;
}
if (user && user.app_metadata.seed_tag !== seedTag) {
  throw new Error('An account already uses the demo email; refusing to modify it.');
}
if (!user) {
  const { data, error } = await client.auth.admin.createUser({
    email,
    email_confirm: false,
    app_metadata: { seed_tag: seedTag },
    user_metadata: { full_name: 'آرمان نمونه (آزمایشی)', employee_code: 'DEMO-001' },
  });
  if (error) throw error;
  user = data.user;
}
const { error } = await client.from('profiles').upsert({
  id: user.id,
  full_name: 'آرمان نمونه (آزمایشی)',
  employee_code: 'DEMO-001',
  email,
  department: 'واحد آزمایشی',
  role: 'employee',
  phone: null,
  is_active: true,
}, { onConflict: 'id' });
if (error) throw error;
const { data: person, error: readError } = await client.from('profiles')
  .select('id, full_name, employee_code, email, department, role')
  .eq('id', user.id).single();
if (readError) throw readError;
console.log(JSON.stringify({ verified: true, person }, null, 2));
