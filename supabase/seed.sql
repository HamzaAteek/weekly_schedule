-- بيانات تجريبية — نفّذ بعد schema.sql
-- ملاحظة: لا يُنشئ حساب أدمن؛ أنشئه من Authentication ثم أضف user_id إلى admin_users

INSERT INTO lecture_times (period_number, label, start_time, end_time) VALUES
  (1, 'المحاضرة الأولى', '08:00', '09:30'),
  (2, 'المحاضرة الثانية', '09:45', '11:15'),
  (3, 'المحاضرة الثالثة', '11:30', '13:00'),
  (4, 'المحاضرة الرابعة', '13:15', '14:45'),
  (5, 'المحاضرة الخامسة', '15:00', '16:30')
ON CONFLICT (period_number) DO NOTHING;

INSERT INTO academic_years (name, sort_order) VALUES
  ('السنة الأولى', 1),
  ('السنة الثانية', 2),
  ('السنة الثالثة', 3),
  ('السنة الرابعة', 4)
ON CONFLICT DO NOTHING;

-- الفئات (باستخدام subquery للسنوات)
INSERT INTO categories (academic_year_id, name)
SELECT y.id, c.name FROM academic_years y
JOIN (VALUES
  ('السنة الأولى', 'A'),
  ('السنة الأولى', 'B'),
  ('السنة الثانية', 'A'),
  ('السنة الثانية', 'B'),
  ('السنة الثالثة', 'A'),
  ('السنة الرابعة', 'A')
) AS c(year_name, name) ON y.name = c.year_name
ON CONFLICT DO NOTHING;

INSERT INTO subjects (name, code) VALUES
  ('برمجة 1', 'CS101'),
  ('قواعد بيانات', 'CS201'),
  ('شبكات', 'CS301'),
  ('رياضيات', 'MATH101'),
  ('هندسة برمجيات', 'SE301')
ON CONFLICT DO NOTHING;

INSERT INTO teachers (name) VALUES
  ('د. أحمد محمد'),
  ('د. محمد علي'),
  ('د. سارة أحمد')
ON CONFLICT DO NOTHING;

INSERT INTO rooms (name) VALUES
  ('قاعة 101'),
  ('قاعة 102'),
  ('قاعة 203'),
  ('مخبر الشبكات'),
  ('مخبر البرمجة')
ON CONFLICT DO NOTHING;

-- محاضرات تجريبية — السنة الأولى، ذكور، فئة A
INSERT INTO schedule (day, period, academic_year_id, category_id, subject_id, teacher_id, room_id, gender)
SELECT
  s.day,
  s.period,
  y.id,
  cat.id,
  sub.id,
  t.id,
  r.id,
  'male'
FROM academic_years y
JOIN categories cat ON cat.academic_year_id = y.id AND cat.name = 'A'
CROSS JOIN (VALUES
  (1, 1, 'برمجة 1', 'د. أحمد محمد', 'قاعة 101'),
  (1, 2, 'رياضيات', 'د. محمد علي', 'قاعة 102'),
  (2, 1, 'قواعد بيانات', 'د. سارة أحمد', 'قاعة 203'),
  (3, 3, 'شبكات', 'د. أحمد محمد', 'مخبر الشبكات'),
  (4, 2, 'هندسة برمجيات', 'د. محمد علي', 'قاعة 101'),
  (5, 4, 'برمجة 1', 'د. سارة أحمد', 'مخبر البرمجة')
) AS s(day, period, subject_name, teacher_name, room_name)
JOIN subjects sub ON sub.name = s.subject_name
JOIN teachers t ON t.name = s.teacher_name
JOIN rooms r ON r.name = s.room_name
WHERE y.name = 'السنة الأولى'
ON CONFLICT DO NOTHING;
