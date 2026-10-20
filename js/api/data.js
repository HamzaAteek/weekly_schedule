import { getSupabase } from "../supabase-client.js";
import { getPublicSupabase } from "../supabase-public.js";

const SCHEDULE_SELECT = `
  id, day, period, gender,
  academic_year_id, category_id, category_ids, subject_id, teacher_id, room_id,
  academic_years ( id, name ),
  categories ( id, name, academic_year_id ),
  subjects ( id, name, code ),
  teachers ( id, name ),
  rooms ( id, name )
`;

export async function fetchAcademicYears() {
  const supabase = await getPublicSupabase();

  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return data;
}

export async function fetchCategories(yearId = null) {
  const supabase = await getPublicSupabase();

  let q = supabase
    .from("categories")
    .select("*, academic_years(name)")
    .order("name");

  if (yearId) {
    q = q.eq("academic_year_id", yearId);
  }

  const { data, error } = await q;

  if (error) throw error;

  return data;
}

export async function fetchSubjects() {
  const supabase = await getPublicSupabase();

  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("name");

  if (error) throw error;

  return data;
}

export async function fetchTeachers() {
  const supabase = await getPublicSupabase();

  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .order("name");

  if (error) throw error;

  return data;
}

export async function fetchRooms() {
  const supabase = await getPublicSupabase();

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .order("name");

  if (error) throw error;

  return data;
}

export async function fetchLectureTimes() {
  const supabase = await getPublicSupabase();

  const { data, error } = await supabase
    .from("lecture_times")
    .select("*")
    .order("period_number", { ascending: true });

  if (error) throw error;

  return data;
}

/* =========================================================
   جلب الجدول
   ========================================================= */

export async function fetchSchedule(filters = {}) {
  const supabase = await getPublicSupabase();

  let q = supabase.from("schedule").select(SCHEDULE_SELECT);

  // السنة الدراسية
  if (filters.academic_year_id) {
    q = q.eq("academic_year_id", filters.academic_year_id);
  }

  // =====================================================
  // الفئة
  //
  // category_ids هي المصدر الأساسي.
  // هذا يسمح للمحاضرة الواحدة أن تكون مرتبطة بأكثر
  // من فئة، وبالتالي تظهر عند اختيار أي فئة منها.
  // =====================================================

  if (filters.category_id) {
    q = q.contains("category_ids", [filters.category_id]);
  }

  // الجنس
  if (filters.gender) {
    q = q.eq("gender", filters.gender);
  }

  // اليوم
  if (filters.day) {
    q = q.eq("day", Number(filters.day));
  }

  // المادة
  if (filters.subject_id) {
    q = q.eq("subject_id", filters.subject_id);
  }

  // المدرس
  if (filters.teacher_id) {
    q = q.eq("teacher_id", filters.teacher_id);
  }

  // القاعة
  if (filters.room_id) {
    q = q.eq("room_id", filters.room_id);
  }

  const { data, error } = await q.order("day").order("period");

  if (error) throw error;

  // لا توجد محاضرات
  if (!data?.length) {
    return [];
  }

  // =====================================================
  // جمع جميع IDs الفئات الموجودة في المحاضرات
  // =====================================================

  const categoryIds = [
    ...new Set(
      data.flatMap((row) => {
        // المحاضرات الجديدة تستخدم category_ids
        if (Array.isArray(row.category_ids) && row.category_ids.length) {
          return row.category_ids;
        }

        // توافق مع المحاضرات القديمة
        if (row.category_id) {
          return [row.category_id];
        }

        return [];
      }),
    ),
  ];

  // =====================================================
  // جلب بيانات الفئات
  // =====================================================

  let categories = [];

  if (categoryIds.length) {
    const { data: categoryData, error: categoryError } = await supabase
      .from("categories")
      .select("id, name, academic_year_id")
      .in("id", categoryIds);

    if (categoryError) {
      throw categoryError;
    }

    categories = categoryData ?? [];
  }

  // =====================================================
  // إنشاء Map للفئات
  // =====================================================

  const categoryMap = new Map(
    categories.map((category) => [category.id, category]),
  );

  // =====================================================
  // إرجاع المحاضرات مع categories
  // =====================================================

  return data.map((row) => {
    const ids =
      Array.isArray(row.category_ids) && row.category_ids.length
        ? row.category_ids
        : row.category_id
          ? [row.category_id]
          : [];

    return {
      ...row,

      category_ids: ids,

      categories: ids.map((id) => categoryMap.get(id)).filter(Boolean),
    };
  });
}

/* =========================================================
   إضافة / تعديل محاضرة
   ========================================================= */

export async function upsertSchedule(row, id = null) {
  const supabase = await getSupabase();

  const payload = {
    ...row,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabase
      .from("schedule")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  const { data, error } = await supabase
    .from("schedule")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/* =========================================================
   حذف محاضرة
   ========================================================= */

export async function deleteSchedule(id) {
  const supabase = await getSupabase();

  const { error } = await supabase.from("schedule").delete().eq("id", id);

  if (error) throw error;
}

/* =========================================================
   فحص تعارض المحاضرات
   ========================================================= */

export async function checkScheduleConflicts(row, excludeId = null) {
  const supabase = await getSupabase();

  const {
    day,
    period,
    academic_year_id,
    category_ids,
    category_id,
    gender,
    teacher_id,
    room_id,
  } = row;

  // =====================================================
  // تحديد الفئات المختارة
  // =====================================================

  const selectedCategoryIds =
    Array.isArray(category_ids) && category_ids.length
      ? category_ids
      : category_id
        ? [category_id]
        : [];

  if (!selectedCategoryIds.length) {
    return {
      type: "error",
      message: "يجب اختيار فئة واحدة على الأقل.",
    };
  }

  // =====================================================
  // فحص تعارض الفئات
  //
  // إذا كانت هناك محاضرة أخرى تشترك مع أي فئة من
  // الفئات المختارة في نفس اليوم والفترة، نمنع الحفظ.
  // =====================================================

  let slotQ = supabase
    .from("schedule")
    .select("id")
    .eq("day", day)
    .eq("period", period)
    .eq("academic_year_id", academic_year_id)
    .eq("gender", gender)
    .overlaps("category_ids", selectedCategoryIds);

  if (excludeId) {
    slotQ = slotQ.neq("id", excludeId);
  }

  const { data: slotData, error: slotError } = await slotQ;

  if (slotError) {
    throw slotError;
  }

  if (slotData?.length) {
    return {
      type: "slot",
      message:
        "يوجد محاضرة أخرى لإحدى الفئات المحددة في هذا اليوم وهذه الفترة. يرجى اختيار وقت آخر.",
    };
  }

  const warnings = [];

  // =====================================================
  // فحص تعارض المدرس
  // =====================================================

  if (teacher_id) {
    let teacherQ = supabase
      .from("schedule")
      .select("id, category_ids, categories(name), academic_years(name)")
      .eq("day", day)
      .eq("period", period)
      .eq("teacher_id", teacher_id);

    if (excludeId) {
      teacherQ = teacherQ.neq("id", excludeId);
    }

    const teacherRes = await teacherQ;

    if (teacherRes.error) {
      throw teacherRes.error;
    }

    if (teacherRes.data?.length) {
      warnings.push("المدرس لديه محاضرة أخرى في نفس اليوم ونفس الفترة.");
    }
  }

  // =====================================================
  // فحص تعارض القاعة
  // =====================================================

  if (room_id) {
    let roomQ = supabase
      .from("schedule")
      .select("id, rooms(name)")
      .eq("day", day)
      .eq("period", period)
      .eq("room_id", room_id);

    if (excludeId) {
      roomQ = roomQ.neq("id", excludeId);
    }

    const roomRes = await roomQ;

    if (roomRes.error) {
      throw roomRes.error;
    }

    if (roomRes.data?.length) {
      const roomName = roomRes.data[0].rooms?.name ?? "القاعة";

      warnings.push(`تنبيه: ${roomName} مستخدمة في محاضرة أخرى في نفس الوقت.`);
    }
  }

  return {
    type: "ok",
    warnings,
  };
}

/* =========================================================
   CRUD عام
   ========================================================= */

export async function crudTable(table, { select = "*", order } = {}) {
  const supabase = await getSupabase();

  let q = supabase.from(table).select(select);

  if (order) {
    q = q.order(order.column, {
      ascending: order.ascending ?? true,
    });
  }

  const { data, error } = await q;

  if (error) throw error;

  return data;
}

export async function insertRow(table, row) {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from(table)
    .insert(row)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateRow(table, id, row) {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from(table)
    .update(row)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteRow(table, id) {
  const supabase = await getSupabase();

  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) throw error;
}

export async function updateLectureTimes(periodNumber, payload) {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("lecture_times")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("period_number", periodNumber)
    .select()
    .single();

  if (error) throw error;

  return data;
}
