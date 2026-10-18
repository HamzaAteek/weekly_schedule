-- كلية المعلوماتية — مخطط قاعدة البيانات (Supabase / PostgreSQL)
-- نفّذ هذا الملف من SQL Editor في لوحة Supabase

-- امتدادات
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- السنوات الدراسية
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- الفئات / الشعب (مرتبطة بالسنة)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (academic_year_id, name)
);

-- المواد
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- المدرسون
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- القاعات
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- أوقات المحاضرات (5 فترات)
CREATE TABLE IF NOT EXISTS lecture_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_number INT NOT NULL UNIQUE CHECK (period_number BETWEEN 1 AND 5),
  label TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- البرنامج الأسبوعي
-- day: 1=الجمعة ... 7=الخميس
CREATE TABLE IF NOT EXISTS schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day INT NOT NULL CHECK (day BETWEEN 1 AND 7),
  period INT NOT NULL CHECK (period BETWEEN 1 AND 5),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (academic_year_id, category_id, gender, day, period)
);

CREATE INDEX IF NOT EXISTS idx_schedule_filters
  ON schedule (academic_year_id, category_id, gender);

CREATE INDEX IF NOT EXISTS idx_schedule_day_period
  ON schedule (day, period);

-- مستخدمون مسموح لهم بإدارة النظام (يُربطون بـ auth.users بعد إنشاء الحساب)
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- قراءة عامة للطلاب (anon + authenticated)
CREATE POLICY "public_read_academic_years" ON academic_years FOR SELECT USING (true);
CREATE POLICY "public_read_categories" ON categories FOR SELECT USING (true);
CREATE POLICY "public_read_subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "public_read_teachers" ON teachers FOR SELECT USING (true);
CREATE POLICY "public_read_rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "public_read_lecture_times" ON lecture_times FOR SELECT USING (true);
CREATE POLICY "public_read_schedule" ON schedule FOR SELECT USING (true);

-- كتابة للمسؤولين فقط
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
$$;

CREATE POLICY "admin_all_academic_years" ON academic_years
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_categories" ON categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_subjects" ON subjects
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_teachers" ON teachers
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_rooms" ON rooms
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_lecture_times" ON lecture_times
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_all_schedule" ON schedule
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_read_admin_users" ON admin_users
  FOR SELECT USING (public.is_admin());

CREATE POLICY "service_insert_admin_users" ON admin_users
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());
