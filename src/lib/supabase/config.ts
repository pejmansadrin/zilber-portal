export const CLOUD_SUPABASE_URL = 'https://otsgzpazmmnfeacysdnl.supabase.co';

export function getCloudConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url?.replace(/\/$/, '') !== CLOUD_SUPABASE_URL || !key) return null;
  return { url: CLOUD_SUPABASE_URL, key };
}
