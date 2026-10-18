import {
  fetchSchedule,
  upsertSchedule,
  deleteSchedule,
  checkScheduleConflicts,
} from '../api/data.js';
import { WEEK_DAYS, PERIOD_LABELS, genderLabel, dayLabel } from '../utils/constants.js';
import { confirmDialog, openFormModal } from '../utils/modal.js';
import { showToast, userErrorMessage } from '../utils/toast.js';

export function createSchedulePanel(state) {
  const filters = {};

  function buildFilterUI() {
    const el = document.getElementById('schedule-filters');
    const yearOpts = `<option value="">السنة</option>${state.years.map((y) => `<option value="${y.id}">${y.name}</option>`).join('')}`;
    const catOpts = `<option value="">الفئة</option>${state.categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}`;
    const subOpts = `<option value="">المادة</option>${state.subjects.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}`;
    const teachOpts = `<option value="">المدرس</option>${state.teachers.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}`;
    const roomOpts = `<option value="">القاعة</option>${state.rooms.map((r) => `<option value="${r.id}">${r.name}</option>`).join('')}`;
    const dayOpts = `<option value="">اليوم</option>${WEEK_DAYS.map((d) => `<option value="${d.value}">${d.label}</option>`).join('')}`;

    el.innerHTML = `
      <div class="form-group"><label>السنة</label><select id="sf-year" class="form-control">${yearOpts}</select></div>
      <div class="form-group"><label>الجنس</label><select id="sf-gender" class="form-control">
        <option value="">الكل</option><option value="male">ذكور</option><option value="female">إناث</option></select></div>
      <div class="form-group"><label>الفئة</label><select id="sf-category" class="form-control">${catOpts}</select></div>
      <div class="form-group"><label>اليوم</label><select id="sf-day" class="form-control">${dayOpts}</select></div>
      <div class="form-group"><label>المادة</label><select id="sf-subject" class="form-control">${subOpts}</select></div>
      <div class="form-group"><label>المدرس</label><select id="sf-teacher" class="form-control">${teachOpts}</select></div>
      <div class="form-group"><label>القاعة</label><select id="sf-room" class="form-control">${roomOpts}</select></div>`;

    ['sf-year', 'sf-gender', 'sf-category', 'sf-day', 'sf-subject', 'sf-teacher', 'sf-room'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', () => {
        readFilters();
        loadTable();
      });
    });
  }

  function readFilters() {
    filters.academic_year_id = document.getElementById('sf-year')?.value || '';
    filters.gender = document.getElementById('sf-gender')?.value || '';
    filters.category_id = document.getElementById('sf-category')?.value || '';
    filters.day = document.getElementById('sf-day')?.value || '';
    filters.subject_id = document.getElementById('sf-subject')?.value || '';
    filters.teacher_id = document.getElementById('sf-teacher')?.value || '';
    filters.room_id = document.getElementById('sf-room')?.value || '';
  }

  function periodLabel(period) {
    const lt = state.lectureTimes.find((t) => t.period_number === period);
    return lt?.label ?? PERIOD_LABELS[period] ?? period;
  }

  async function loadTable() {
    const tbody = document.querySelector('#schedule-admin-table tbody');
    tbody.innerHTML = `<tr><td colspan="9"><div class="spinner"></div></td></tr>`;
    try {
      const data = await fetchSchedule(filters);
      tbody.innerHTML = '';
      if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state">لا توجد محاضرات</td></tr>`;
        state.scheduleRows = [];
        return;
      }
      state.scheduleRows = data;
      data.forEach((row) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${dayLabel(row.day)}</td>
          <td>${periodLabel(row.period)}</td>
          <td>${row.academic_years?.name ?? ''}</td>
          <td>${genderLabel(row.gender)}</td>
          <td>${row.categories?.name ?? ''}</td>
          <td>${row.subjects?.name ?? ''}</td>
          <td>${row.teachers?.name ?? ''}</td>
          <td>${row.rooms?.name ?? ''}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm" data-edit-schedule="${row.id}">تعديل</button>
            <button type="button" class="btn btn-danger btn-sm" data-del-schedule="${row.id}">حذف</button>
          </td>`;
        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9">حدث خطأ أثناء التحميل</td></tr>`;
      showToast(userErrorMessage(err), 'error');
    }
  }

  function lectureFormHtml(values = {}) {
    const dayOpts = WEEK_DAYS.map(
      (d) => `<option value="${d.value}" ${values.day == d.value ? 'selected' : ''}>${d.label}</option>`
    ).join('');
    const periodOpts = [1, 2, 3, 4, 5]
      .map(
        (p) =>
          `<option value="${p}" ${values.period == p ? 'selected' : ''}>${periodLabel(p)}</option>`
      )
      .join('');
    const yearOpts = state.years
      .map(
        (y) =>
          `<option value="${y.id}" ${values.academic_year_id === y.id ? 'selected' : ''}>${y.name}</option>`
      )
      .join('');
    const cats = state.categories.filter(
      (c) => !values.academic_year_id || c.academic_year_id === values.academic_year_id
    );
    const catOpts = cats
      .map(
        (c) =>
          `<option value="${c.id}" ${values.category_id === c.id ? 'selected' : ''}>${c.name}</option>`
      )
      .join('');
    const subOpts = state.subjects
      .map(
        (s) =>
          `<option value="${s.id}" ${values.subject_id === s.id ? 'selected' : ''}>${s.name}</option>`
      )
      .join('');
    const teachOpts = state.teachers
      .map(
        (t) =>
          `<option value="${t.id}" ${values.teacher_id === t.id ? 'selected' : ''}>${t.name}</option>`
      )
      .join('');
    const roomOpts = state.rooms
      .map(
        (r) =>
          `<option value="${r.id}" ${values.room_id === r.id ? 'selected' : ''}>${r.name}</option>`
      )
      .join('');

    return `
      <div class="form-grid">
        <div class="form-group"><label>اليوم</label><select name="day" class="form-control" required>${dayOpts}</select></div>
        <div class="form-group"><label>المحاضرة</label><select name="period" class="form-control" required>${periodOpts}</select></div>
        <div class="form-group"><label>السنة</label><select name="academic_year_id" id="lec-year" class="form-control" required>${yearOpts}</select></div>
        <div class="form-group"><label>الجنس</label><select name="gender" class="form-control" required>
          <option value="male" ${values.gender === 'male' ? 'selected' : ''}>ذكور</option>
          <option value="female" ${values.gender === 'female' ? 'selected' : ''}>إناث</option>
        </select></div>
        <div class="form-group"><label>الفئة</label><select name="category_id" id="lec-category" class="form-control" required>${catOpts}</select></div>
        <div class="form-group"><label>المادة</label><select name="subject_id" class="form-control" required>${subOpts}</select></div>
        <div class="form-group"><label>المدرس</label><select name="teacher_id" class="form-control" required>${teachOpts}</select></div>
        <div class="form-group"><label>القاعة</label><select name="room_id" class="form-control" required>${roomOpts}</select></div>
      </div>
      <div id="conflict-warnings"></div>
      <div class="modal-actions"><button type="submit" class="btn btn-primary">حفظ المحاضرة</button></div>`;
  }

  function bindYearCategorySync(overlay) {
    const yearSel = overlay.querySelector('#lec-year');
    const catSel = overlay.querySelector('#lec-category');
    yearSel?.addEventListener('change', () => {
      const yearId = yearSel.value;
      const cats = state.categories.filter((c) => c.academic_year_id === yearId);
      catSel.innerHTML = cats.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
    });
  }

  async function saveLecture(fd, excludeId = null) {
    const row = {
      day: Number(fd.get('day')),
      period: Number(fd.get('period')),
      academic_year_id: fd.get('academic_year_id'),
      category_id: fd.get('category_id'),
      gender: fd.get('gender'),
      subject_id: fd.get('subject_id'),
      teacher_id: fd.get('teacher_id'),
      room_id: fd.get('room_id'),
    };

    const conflict = await checkScheduleConflicts(row, excludeId);
    if (conflict.type === 'slot') {
      showToast(conflict.message, 'error');
      return false;
    }
    if (conflict.warnings?.length) {
      conflict.warnings.forEach((w) => showToast(w, 'warning', 6000));
    }

    try {
      await upsertSchedule(row, excludeId);
      showToast('تم حفظ المحاضرة', 'success');
      await loadTable();
      return true;
    } catch (err) {
      if (err?.code === '23505') {
        showToast('يوجد محاضرة أخرى في هذا الوقت لهذه الفئة. يرجى اختيار وقت آخر.', 'error');
      } else {
        showToast(userErrorMessage(err), 'error');
      }
      return false;
    }
  }

  function openAddModal() {
    const overlay = openFormModal('إضافة محاضرة', lectureFormHtml(), async (fd) => {
      return saveLecture(fd);
    });
    bindYearCategorySync(overlay);
  }

  function openEditModal(row) {
    const overlay = openFormModal(
      'تعديل محاضرة',
      lectureFormHtml({
        day: row.day,
        period: row.period,
        academic_year_id: row.academic_year_id,
        category_id: row.category_id,
        gender: row.gender,
        subject_id: row.subject_id,
        teacher_id: row.teacher_id,
        room_id: row.room_id,
      }),
      async (fd) => saveLecture(fd, row.id)
    );
    bindYearCategorySync(overlay);
  }

  function exportCsv() {
    const rows = state.scheduleRows ?? [];
    if (!rows.length) {
      showToast('لا توجد بيانات للتصدير', 'warning');
      return;
    }
    const header = ['اليوم', 'المحاضرة', 'السنة', 'الجنس', 'الفئة', 'المادة', 'المدرس', 'القاعة'];
    const lines = rows.map((r) =>
      [
        dayLabel(r.day),
        periodLabel(r.period),
        r.academic_years?.name,
        genderLabel(r.gender),
        r.categories?.name,
        r.subjects?.name,
        r.teachers?.name,
        r.rooms?.name,
      ]
        .map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const bom = '\uFEFF';
    const blob = new Blob([bom + header.join(',') + '\n' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'schedule.csv';
    a.click();
  }

  function bind() {
    document.getElementById('btn-add-lecture')?.addEventListener('click', openAddModal);
    document.getElementById('btn-export-csv')?.addEventListener('click', exportCsv);
    document.getElementById('btn-export-print')?.addEventListener('click', () => window.print());

    document.querySelector('#schedule-admin-table')?.addEventListener('click', async (e) => {
      const editId = e.target.dataset.editSchedule;
      const delId = e.target.dataset.delSchedule;
      if (editId) {
        const row = state.scheduleRows?.find((r) => r.id === editId);
        if (row) openEditModal(row);
      }
      if (delId && (await confirmDialog('هل أنت متأكد من حذف هذه المحاضرة؟'))) {
        try {
          await deleteSchedule(delId);
          showToast('تم الحذف', 'success');
          loadTable();
        } catch (err) {
          showToast(userErrorMessage(err), 'error');
        }
      }
    });
  }

  return {
    rebuildFilters: buildFilterUI,
    loadTable,
    bind,
  };
}
