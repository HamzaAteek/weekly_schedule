import { loadConfig } from './config.js';

/** عميل للقراءة العامة — بدون جلسة (مناسب لصفحة الطلاب والزوار) */
let publicClientPromise = null;

export async function getPublicSupabase() {
  if (!publicClientPromise) {
    publicClientPromise = (async () => {
      const { supabaseUrl, supabaseAnonKey } = await loadConfig();
      const { createClient } = await import(
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm'
      );
      return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
    })();
  }
  return publicClientPromise;
}
