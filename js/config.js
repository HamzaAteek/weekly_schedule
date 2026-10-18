/** تحميل إعدادات Supabase من API (Vercel) أو ملف محلي */
let cachedConfig = null;

export async function loadConfig() {
  if (cachedConfig) return cachedConfig;

  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      cachedConfig = await res.json();
      return cachedConfig;
    }
  } catch {
    /* محلي بدون Vercel */
  }

  try {
    const local = await import('./env.local.js');
    if (local?.LOCAL_SUPABASE?.supabaseUrl) {
      cachedConfig = {
        supabaseUrl: local.LOCAL_SUPABASE.supabaseUrl,
        supabaseAnonKey: local.LOCAL_SUPABASE.supabaseAnonKey,
      };
      return cachedConfig;
    }
  } catch {
    /* لم يُنشأ env.local.js */
  }

  throw new Error('CONFIG_MISSING');
}
