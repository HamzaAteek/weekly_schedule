import { loadConfig } from './config.js';

let clientPromise = null;

export async function getSupabase() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { supabaseUrl, supabaseAnonKey } = await loadConfig();
      const { createClient } = await import(
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm'
      );
      return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    })();
  }
  return clientPromise;
}
