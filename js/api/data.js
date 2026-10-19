import { getSupabase } from '../supabase-client.js';
import { getPublicSupabase } from '../supabase-public.js';

const SCHEDULE_SELECT = `
  id, day, period, gender,
  academic_year_id, category_id, subject_id, teacher_id, room_id,
  academic_years ( id, name ),
  categories ( id, name, academic_year_id ),
  subjects ( id, name, code ),
  teachers ( id, name ),
  rooms ( id, name )
`;

export async function fetchAcademicYears() {
  const supabase = await getPublicSupabase();
  const { data, error } = await supabase
    .from('academic_years')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchCategories(yearId = null) {
  const supabase = await getPublicSupabase();
  let q = supabase.from('categories').select('*, academic_years(name)').order('name');
  if (yearId) q = q.eq('academic_year_id', yearId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function fetchSubjects() {
  const supabase = await getPublicSupabase();
  const { data, error } = await supabase.from('subjects').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function fetchTeachers() {
  const supabase = await getPublicSupabase();
  const { data, error } = await supabase.from('teachers').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function fetchRooms() {
  const supabase = await getPublicSupabase();
  const { data, error } = await supabase.from('rooms').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function fetchLectureTimes() {
  const supabase = await getPublicSupabase();
  const { data, error } = await supabase
    .from('lecture_times')
    .select('*')
    .order('period_number', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchSchedule(filters = {}) {
  const supabase = await getPublicSupabase();
  let q = supabase.from('schedule').select(SCHEDULE_SELECT);
  if (filters.academic_year_id) q = q.eq('academic_year_id', filters.academic_year_id);
  if (filters.category_id) q = q.eq('category_id', filters.category_id);
  if (filters.gender) q = q.eq('gender', filters.gender);
  if (filters.day) q = q.eq('day', Number(filters.day));
  if (filters.subject_id) q = q.eq('subject_id', filters.subject_id);
  if (filters.teacher_id) q = q.eq('teacher_id', filters.teacher_id);
  if (filters.room_id) q = q.eq('room_id', filters.room_id);
  const { data, error } = await q.order('day').order('period');
  if (error) throw error;
  return data;
}

export async function upsertSchedule(row, id = null) {
  const supabase = await getSupabase();
  const payload = { ...row, updated_at: new Date().toISOString() };
  if (id) {
    const { data, error } = await supabase.from('schedule').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('schedule').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSchedule(id) {
  const supabase = await getSupabase();
  const { error } = await supabase.from('schedule').delete().eq('id', id);
  if (error) throw error;
}

export async function checkScheduleConflicts(row, excludeId = null) {
  const supabase = await getSupabase();
  const { day, period, academic_year_id, category_id, gender, teacher_id, room_id } = row;

  let slotQ = supabase
    .from('schedule')
    .select('id')
    .eq('day', day)
    .eq('period', period)
    .eq('academic_year_id', academic_year_id)
    .eq('category_id', category_id)
    .eq('gender', gender);
  if (excludeId) slotQ = slotQ.neq('id', excludeId);
  const slot = await slotQ.maybeSingle();
  if (slot.error) throw slot.error;
  if (slot.data) {
    return { type: 'slot', message: 'يوجد محاضرة أخرى في هذا الوقت لهذه الفئة. يرجى اختيار وقت آخر.' };
  }

  const warnings = [];

  let teacherQ = supabase
    .from('schedule')
    .select('id, categories(name), academic_years(name)')
    .eq('day', day)
    .eq('period', period)
    .eq('teacher_id', teacher_id);
  if (excludeId) teacherQ = teacherQ.neq('id', excludeId);
  const teacherRes = await teacherQ;
  if (teacherRes.error) throw teacherRes.error;
  if (teacherRes.data?.length) {
    warnings.push('المدرس لديه محاضرة أخرى في نفس اليوم ونفس الفترة.');
  }

  let roomQ = supabase
    .from('schedule')
    .select('id, rooms(name)')
    .eq('day', day)
    .eq('period', period)
    .eq('room_id', room_id);
  if (excludeId) roomQ = roomQ.neq('id', excludeId);
  const roomRes = await roomQ;
  if (roomRes.error) throw roomRes.error;
  if (roomRes.data?.length) {
    const roomName = roomRes.data[0].rooms?.name ?? 'القاعة';
    warnings.push(`تنبيه: ${roomName} مستخدمة في محاضرة أخرى في نفس الوقت.`);
  }

  return { type: 'ok', warnings };
}

/** CRUD عام */
export async function crudTable(table, { select = '*', order } = {}) {
  const supabase = await getSupabase();
  let q = supabase.from(table).select(select);
  if (order) q = q.order(order.column, { ascending: order.ascending ?? true });
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function insertRow(table, row) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateRow(table, id, row) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from(table).update(row).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRow(table, id) {
  const supabase = await getSupabase();
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export async function updateLectureTimes(periodNumber, payload) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('lecture_times')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('period_number', periodNumber)
    .select()
    .single();
  if (error) throw error;
  return data;
}
