import 'server-only';
import { cache } from 'react';
import { getCloudConfig } from './config';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

export const createClient = cache(async () => {
  const cookieStore = await cookies();
  const config = getCloudConfig();
  if (!config) throw new Error('Cloud Supabase configuration is missing.');

  return createServerClient<Database>(
    config.url,
    config.key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
});
