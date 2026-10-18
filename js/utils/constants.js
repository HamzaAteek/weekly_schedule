/** أيام الأسبوع: 1 = الجمعة ... 7 = الخميس */
export const WEEK_DAYS = [
  { value: 1, label: 'الجمعة' },
  { value: 2, label: 'السبت' },
  { value: 3, label: 'الأحد' },
  { value: 4, label: 'الاثنين' },
  { value: 5, label: 'الثلاثاء' },
  { value: 6, label: 'الأربعاء' },
  { value: 7, label: 'الخميس' },
];

export const PERIOD_LABELS = {
  1: 'المحاضرة الأولى',
  2: 'المحاضرة الثانية',
  3: 'المحاضرة الثالثة',
  4: 'المحاضرة الرابعة',
  5: 'المحاضرة الخامسة',
};

export const GENDER_OPTIONS = [
  { value: 'male', label: 'ذكور' },
  { value: 'female', label: 'إناث' },
];

export function genderLabel(value) {
  return GENDER_OPTIONS.find((g) => g.value === value)?.label ?? value;
}

export function dayLabel(day) {
  return WEEK_DAYS.find((d) => d.value === day)?.label ?? day;
}

/** تنسيق وقت HH:MM من PostgreSQL time */
export function formatTime(t) {
  if (!t) return '';
  const s = String(t).slice(0, 5);
  return s;
}
