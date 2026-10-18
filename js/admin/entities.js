import {
  fetchAcademicYears,
  fetchCategories,
  fetchSubjects,
  fetchTeachers,
  fetchRooms,
  insertRow,
  updateRow,
  deleteRow,
  fetchLectureTimes,
  updateLectureTimes,
} from '../api/data.js';
import { confirmDialog, openFormModal } from '../utils/modal.js';
import { showToast, userErrorMessage } from '../utils/toast.js';
import { PERIOD_LABELS, formatTime } from '../utils/constants.js';

export function createEntitiesController(state, refreshAll) {
  const cache = state;

  async function reloadMeta() {
    cache.years = await fetchAcademicYears();
    cache.categories = await fetchCategories();
    cache.subjects = await fetchSubjects();
    cache.teachers = await fetchTeachers();
    cache.rooms = await fetchRooms();
    cache.lectureTimes = await fetchLectureTimes();
  }

  function renderSubjects(filter = '') {
    const tbody = document.querySelector('#subjects-table tbody');
    const q = filter.trim().toLowerCase();
    tbody.innerHTML = '';
    cache.subjects
      .filter((s) => !q || s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q)))
      .forEach((s) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${esc(s.name)}</td>
          <td>${esc(s.code || '—')}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm" data-edit-subject="${s.id}">تعديل</button>
            <button type="button" class="btn btn-danger btn-sm" data-del-subject="${s.id}">حذف</button>
          </td>`;
        tbody.appendChild(tr);
      });
  }

  function renderTeachers(filter = '') {
    const tbody = document.querySelector('#teachers-table tbody');
    const q = filter.trim().toLowerCase();
    tbody.innerHTML = '';
    cache.teachers
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .forEach((t) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${esc(t.name)}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm" data-edit-teacher="${t.id}">تعديل</button>
            <button type="button" class="btn btn-danger btn-sm" data-del-teacher="${t.id}">حذف</button>
          </td>`;
        tbody.appendChild(tr);
      });
  }

  function renderRooms(filter = '') {
    const tbody = document.querySelector('#rooms-table tbody');
    const q = filter.trim().toLowerCase();
    tbody.innerHTML = '';
    cache.rooms
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .forEach((r) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${esc(r.name)}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm" data-edit-room="${r.id}">تعديل</button>
            <button type="button" class="btn btn-danger btn-sm" data-del-room="${r.id}">حذف</button>
          </td>`;
        tbody.appendChild(tr);
      });
  }

  function renderYears() {
    const tbody = document.querySelector('#years-table tbody');
    tbody.innerHTML = '';
    cache.years.forEach((y) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${esc(y.name)}</td>
        <td>${y.sort_order}</td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm" data-edit-year="${y.id}">تعديل</button>
          <button type="button" class="btn btn-danger btn-sm" data-del-year="${y.id}">حذف</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  function renderCategories(filter = '') {
    const tbody = document.querySelector('#categories-table tbody');
    const q = filter.trim().toLowerCase();
    tbody.innerHTML = '';
    cache.categories
      .filter((c) => {
        if (!q) return true;
        const yearName = cache.years.find((y) => y.id === c.academic_year_id)?.name ?? '';
        return c.name.toLowerCase().includes(q) || yearName.toLowerCase().includes(q);
      })
      .forEach((c) => {
        const yearName = cache.years.find((y) => y.id === c.academic_year_id)?.name ?? '—';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${esc(yearName)}</td>
          <td>${esc(c.name)}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm" data-edit-category="${c.id}">تعديل</button>
            <button type="button" class="btn btn-danger btn-sm" data-del-category="${c.id}">حذف</button>
          </td>`;
        tbody.appendChild(tr);
      });
  }

  function renderLectureTimesForm() {
    const wrap = document.getElementById('lecture-times-form');
    wrap.innerHTML = cache.lectureTimes
      .map(
        (lt) => `
      <div class="form-grid" style="margin-bottom:1rem;border-bottom:1px solid var(--color-border);padding-bottom:1rem">
        <div class="form-group">
          <label>${esc(lt.label || PERIOD_LABELS[lt.period_number])}</label>
          <input type="hidden" name="period_${lt.period_number}" value="${lt.period_number}" />
        </div>
        <div class="form-group">
          <label>وقت البداية</label>
          <input class="form-control" type="time" id="start_${lt.period_number}" value="${formatTime(lt.start_time)}" required />
        </div>
        <div class="form-group">
          <label>وقت النهاية</label>
          <input class="form-control" type="time" id="end_${lt.period_number}" value="${formatTime(lt.end_time)}" required />
        </div>
      </div>`
      )
      .join('');
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function bindCrud() {
    document.getElementById('btn-add-subject')?.addEventListener('click', () => {
      openFormModal(
        'إضافة مادة',
        `<div class="form-group"><label>اسم المادة</label><input name="name" class="form-control" required /></div>
         <div class="form-group"><label>رمز المادة (اختياري)</label><input name="code" class="form-control" /></div>
         <div class="modal-actions"><button type="submit" class="btn btn-primary">حفظ</button></div>`,
        async (fd) => {
          try {
            await insertRow('subjects', { name: fd.get('name'), code: fd.get('code') || null });
            await reloadMeta();
            renderSubjects();
            showToast('تمت إضافة المادة', 'success');
          } catch (e) {
            showToast(userErrorMessage(e), 'error');
            return false;
          }
        }
      );
    });

    document.getElementById('subjects-table')?.addEventListener('click', async (e) => {
      const editId = e.target.dataset.editSubject;
      const delId = e.target.dataset.delSubject;
      if (editId) {
        const s = cache.subjects.find((x) => x.id === editId);
        openFormModal(
          'تعديل مادة',
          `<div class="form-group"><label>اسم المادة</label><input name="name" class="form-control" value="${esc(s.name)}" required /></div>
           <div class="form-group"><label>رمز المادة</label><input name="code" class="form-control" value="${esc(s.code || '')}" /></div>
           <div class="modal-actions"><button type="submit" class="btn btn-primary">حفظ</button></div>`,
          async (fd) => {
            try {
              await updateRow('subjects', editId, { name: fd.get('name'), code: fd.get('code') || null });
              await reloadMeta();
              renderSubjects();
              showToast('تم التحديث', 'success');
            } catch (err) {
              showToast(userErrorMessage(err), 'error');
              return false;
            }
          }
        );
      }
      if (delId && (await confirmDialog('هل أنت متأكد من حذف هذه المادة؟'))) {
        try {
          await deleteRow('subjects', delId);
          await reloadMeta();
          renderSubjects();
          showToast('تم الحذف', 'success');
        } catch (err) {
          showToast(userErrorMessage(err), 'error');
        }
      }
    });

    document.getElementById('search-subjects')?.addEventListener('input', (e) => renderSubjects(e.target.value));

    document.getElementById('btn-add-teacher')?.addEventListener('click', () => {
      openFormModal(
        'إضافة مدرس',
        `<div class="form-group"><label>اسم المدرس</label><input name="name" class="form-control" required /></div>
         <div class="modal-actions"><button type="submit" class="btn btn-primary">حفظ</button></div>`,
        async (fd) => {
          try {
            await insertRow('teachers', { name: fd.get('name') });
            await reloadMeta();
            renderTeachers();
            showToast('تمت الإضافة', 'success');
          } catch (err) {
            showToast(userErrorMessage(err), 'error');
            return false;
          }
        }
      );
    });

    document.getElementById('teachers-table')?.addEventListener('click', async (e) => {
      const editId = e.target.dataset.editTeacher;
      const delId = e.target.dataset.delTeacher;
      if (editId) {
        const t = cache.teachers.find((x) => x.id === editId);
        openFormModal(
          'تعديل مدرس',
          `<div class="form-group"><label>اسم المدرس</label><input name="name" class="form-control" value="${esc(t.name)}" required /></div>
           <div class="modal-actions"><button type="submit" class="btn btn-primary">حفظ</button></div>`,
          async (fd) => {
            try {
              await updateRow('teachers', editId, { name: fd.get('name') });
              await reloadMeta();
              renderTeachers();
              showToast('تم التحديث', 'success');
            } catch (err) {
              showToast(userErrorMessage(err), 'error');
              return false;
            }
          }
        );
      }
      if (delId && (await confirmDialog('هل أنت متأكد من حذف هذا المدرس؟'))) {
        try {
          await deleteRow('teachers', delId);
          await reloadMeta();
          renderTeachers();
        } catch (err) {
          showToast(userErrorMessage(err), 'error');
        }
      }
    });

    document.getElementById('search-teachers')?.addEventListener('input', (e) => renderTeachers(e.target.value));

    document.getElementById('btn-add-room')?.addEventListener('click', () => {
      openFormModal(
        'إضافة قاعة',
        `<div class="form-group"><label>اسم القاعة</label><input name="name" class="form-control" required /></div>
         <div class="modal-actions"><button type="submit" class="btn btn-primary">حفظ</button></div>`,
        async (fd) => {
          try {
            await insertRow('rooms', { name: fd.get('name') });
            await reloadMeta();
            renderRooms();
            showToast('تمت الإضافة', 'success');
          } catch (err) {
            showToast(userErrorMessage(err), 'error');
            return false;
          }
        }
      );
    });

    document.getElementById('rooms-table')?.addEventListener('click', async (e) => {
      const editId = e.target.dataset.editRoom;
      const delId = e.target.dataset.delRoom;
      if (editId) {
        const r = cache.rooms.find((x) => x.id === editId);
        openFormModal(
          'تعديل قاعة',
          `<div class="form-group"><label>اسم القاعة</label><input name="name" class="form-control" value="${esc(r.name)}" required /></div>
           <div class="modal-actions"><button type="submit" class="btn btn-primary">حفظ</button></div>`,
          async (fd) => {
            try {
              await updateRow('rooms', editId, { name: fd.get('name') });
              await reloadMeta();
              renderRooms();
            } catch (err) {
              showToast(userErrorMessage(err), 'error');
              return false;
            }
          }
        );
      }
      if (delId && (await confirmDialog('هل أنت متأكد من حذف هذه القاعة؟'))) {
        try {
          await deleteRow('rooms', delId);
          await reloadMeta();
          renderRooms();
        } catch (err) {
          showToast(userErrorMessage(err), 'error');
        }
      }
    });

    document.getElementById('search-rooms')?.addEventListener('input', (e) => renderRooms(e.target.value));

    document.getElementById('btn-add-year')?.addEventListener('click', () => {
      openFormModal(
        'إضافة سنة دراسية',
        `<div class="form-group"><label>الاسم</label><input name="name" class="form-control" required /></div>
         <div class="form-group"><label>الترتيب</label><input name="sort_order" type="number" class="form-control" value="${cache.years.length + 1}" required /></div>
         <div class="modal-actions"><button type="submit" class="btn btn-primary">حفظ</button></div>`,
        async (fd) => {
          try {
            await insertRow('academic_years', {
              name: fd.get('name'),
              sort_order: Number(fd.get('sort_order')),
            });
            await reloadMeta();
            renderYears();
            refreshAll?.();
          } catch (err) {
            showToast(userErrorMessage(err), 'error');
            return false;
          }
        }
      );
    });

    document.getElementById('years-table')?.addEventListener('click', async (e) => {
      const editId = e.target.dataset.editYear;
      const delId = e.target.dataset.delYear;
      if (editId) {
        const y = cache.years.find((x) => x.id === editId);
        openFormModal(
          'تعديل سنة',
          `<div class="form-group"><label>الاسم</label><input name="name" class="form-control" value="${esc(y.name)}" required /></div>
           <div class="form-group"><label>الترتيب</label><input name="sort_order" type="number" class="form-control" value="${y.sort_order}" required /></div>
           <div class="modal-actions"><button type="submit" class="btn btn-primary">حفظ</button></div>`,
          async (fd) => {
            try {
              await updateRow('academic_years', editId, {
                name: fd.get('name'),
                sort_order: Number(fd.get('sort_order')),
              });
              await reloadMeta();
              renderYears();
              refreshAll?.();
            } catch (err) {
              showToast(userErrorMessage(err), 'error');
              return false;
            }
          }
        );
      }
      if (delId && (await confirmDialog('حذف السنة قد يحذف الفئات والمحاضرات المرتبطة. متابعة؟'))) {
        try {
          await deleteRow('academic_years', delId);
          await reloadMeta();
          renderYears();
          refreshAll?.();
        } catch (err) {
          showToast(userErrorMessage(err), 'error');
        }
      }
    });

    document.getElementById('btn-add-category')?.addEventListener('click', () => {
      const yearOpts = cache.years.map((y) => `<option value="${y.id}">${esc(y.name)}</option>`).join('');
      openFormModal(
        'إضافة فئة',
        `<div class="form-group"><label>السنة</label><select name="academic_year_id" class="form-control" required>${yearOpts}</select></div>
         <div class="form-group"><label>اسم الفئة</label><input name="name" class="form-control" required /></div>
         <div class="modal-actions"><button type="submit" class="btn btn-primary">حفظ</button></div>`,
        async (fd) => {
          try {
            await insertRow('categories', {
              academic_year_id: fd.get('academic_year_id'),
              name: fd.get('name'),
            });
            await reloadMeta();
            renderCategories();
            refreshAll?.();
          } catch (err) {
            showToast(userErrorMessage(err), 'error');
            return false;
          }
        }
      );
    });

    document.getElementById('categories-table')?.addEventListener('click', async (e) => {
      const editId = e.target.dataset.editCategory;
      const delId = e.target.dataset.delCategory;
      if (editId) {
        const c = cache.categories.find((x) => x.id === editId);
        const yearOpts = cache.years
          .map(
            (y) =>
              `<option value="${y.id}" ${y.id === c.academic_year_id ? 'selected' : ''}>${esc(y.name)}</option>`
          )
          .join('');
        openFormModal(
          'تعديل فئة',
          `<div class="form-group"><label>السنة</label><select name="academic_year_id" class="form-control">${yearOpts}</select></div>
           <div class="form-group"><label>اسم الفئة</label><input name="name" class="form-control" value="${esc(c.name)}" required /></div>
           <div class="modal-actions"><button type="submit" class="btn btn-primary">حفظ</button></div>`,
          async (fd) => {
            try {
              await updateRow('categories', editId, {
                academic_year_id: fd.get('academic_year_id'),
                name: fd.get('name'),
              });
              await reloadMeta();
              renderCategories();
              refreshAll?.();
            } catch (err) {
              showToast(userErrorMessage(err), 'error');
              return false;
            }
          }
        );
      }
      if (delId && (await confirmDialog('هل أنت متأكد من حذف هذه الفئة؟'))) {
        try {
          await deleteRow('categories', delId);
          await reloadMeta();
          renderCategories();
          refreshAll?.();
        } catch (err) {
          showToast(userErrorMessage(err), 'error');
        }
      }
    });

    document.getElementById('search-categories')?.addEventListener('input', (e) => renderCategories(e.target.value));

    document.getElementById('btn-save-times')?.addEventListener('click', async () => {
      try {
        for (const lt of cache.lectureTimes) {
          const p = lt.period_number;
          const start = document.getElementById(`start_${p}`)?.value;
          const end = document.getElementById(`end_${p}`)?.value;
          if (!start || !end) continue;
          await updateLectureTimes(p, { start_time: start, end_time: end });
        }
        await reloadMeta();
        renderLectureTimesForm();
        showToast('تم حفظ الأوقات', 'success');
        refreshAll?.();
      } catch (err) {
        showToast(userErrorMessage(err), 'error');
      }
    });
  }

  return {
    reloadMeta,
    renderAll() {
      renderSubjects();
      renderTeachers();
      renderRooms();
      renderYears();
      renderCategories();
      renderLectureTimesForm();
    },
    bindCrud,
  };
}
