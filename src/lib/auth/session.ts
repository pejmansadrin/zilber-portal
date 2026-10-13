import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const getSession = cache(async () => {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  return error || !user ? null : { client, user };
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export const getAccessRole = cache(async () => {
  const { client } = await requireSession();
  const { data, error } = await client.rpc('portal_access', {});
  if (error) throw new Error('دریافت سطح دسترسی حساب انجام نشد.');
  return data;
});

export async function requireSuperAdmin() {
  const session = await requireSession();
  if (await getAccessRole() !== 'super_admin') throw new Error('شما به پنل مدیریت دسترسی ندارید.');
  return session;
}
