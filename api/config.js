/**
 * يُرجع مفاتيح Supabase العامة فقط (anon key) — آمن للعرض في المتصفح مع RLS.
 * على Vercel: عيّن SUPABASE_URL و SUPABASE_ANON_KEY في Environment Variables.
 */
module.exports = (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({
      error: 'missing_env',
      message: 'SUPABASE_URL و SUPABASE_ANON_KEY غير مهيأة على الخادم.',
    });
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({ supabaseUrl, supabaseAnonKey });
};
