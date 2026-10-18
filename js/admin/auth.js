import { getSupabase } from '../supabase-client.js';
import { showToast, userErrorMessage } from '../utils/toast.js';

export async function requireAuth() {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = '/admin';
    return null;
  }
  return data.session;
}

export async function redirectIfAuthed() {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    window.location.href = '/admin/dashboard';
  }
}

export async function login(email, password) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  window.location.href = '/admin';
}

export function bindLoginForm(form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = fd.get('email')?.toString().trim();
    const password = fd.get('password')?.toString();
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      await login(email, password);
      window.location.href = '/admin/dashboard';
    } catch (err) {
      showToast('بيانات الدخول غير صحيحة أو الحساب غير مفعّل.', 'error');
      console.error(err);
    } finally {
      btn.disabled = false;
    }
  });
}

export async function getSessionEmail() {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.email ?? '';
}
