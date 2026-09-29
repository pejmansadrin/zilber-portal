import { createBrowserClient } from '@supabase/ssr';
import { getCloudConfig } from './config';
import { Database } from '@/types/database.types';

export function createClient() {
  const config = getCloudConfig();
  if (!config) throw new Error('Cloud Supabase configuration is missing.');
  return createBrowserClient<Database>(
    config.url,
    config.key
  );
}
