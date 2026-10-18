import {
  fetchAcademicYears,
  fetchCategories,
  fetchLectureTimes,
  fetchSchedule,
} from '../api/data.js';
import { WEEK_DAYS, formatTime } from '../utils/constants.js';
import { showToast, userErrorMessage } from '../utils/toast.js';
import { initTheme } from '../utils/theme.js';

const els = {
  year: document.getElementById('filter-year'),
  gender: document.getElementById('filter-gender'),
  category: document.getElementById('filter-category'),
  scheduleHead: document.getElementById('schedule-head'),
  scheduleBody: document.getElementById('schedule-body'),
  scheduleWrap: document.getElementById('schedule-wrap'),
  loading: document.getElementById('schedule-loading'),
  empty: document.getElementById('schedule-empty'),
  printTitle: document.getElementById('print-title'),
};

let lectureTimes = [];
let years = [];
let categories = [];

function getQueryParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    year: p.get('year'),
    gender: p.get('gender'),
    category: p.get('category'),
  };
}

function syncUrl() {
  const yearOpt = els.year.selectedOptions[0];
  const catOpt = els.category.selectedOptions[0];
  const gender = els.gender.value;
  if (!yearOpt?.value || !gender || !catOpt?.value) return;

  const params = new URLSearchParams();
  params.set('year', yearOpt.dataset.slug || yearOpt.value);
  params.set('gender', gender);
  params.set('category', catOpt.dataset.slug || catOpt.textContent.trim());
  const path = window.location.pathname === '/schedule' ? '/schedule' : '/';
  window.history.replaceState({}, '', `${path}?${params.toString()}`);
}

function slugify(text) {
  return text.replace(/\s+/g, '-');
}

function findYearByParam(param, list) {
  if (!param) return null;
  const byId = list.find((y) => y.id === param);
  if (byId) return byId;
  const byOrder = list.find((y) => String(y.sort_order) === param);
  if (byOrder) return byOrder;
  return list.find((y) => slugify(y.name).includes(param) || y.name.includes(param));
}

async function loadMeta() {
  [years, lectureTimes] = await Promise.all([fetchAcademicYears(), fetchLectureTimes()]);
  els.year.innerHTML = '<option value="">اختر السنة</option>';
  years.forEach((y) => {
    const opt = document.createElement('option');
    opt.value = y.id;
    opt.textContent = y.name;
    opt.dataset.slug = String(y.sort_order);
    els.year.appendChild(opt);
  });
  renderTableHeader();
}

async function loadCategoriesForYear(yearId) {
  els.category.innerHTML = '<option value="">اختر الفئة</option>';
  if (!yearId) return;
  categories = await fetchCategories(yearId);
  categories.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    opt.dataset.slug = c.name;
    els.category.appendChild(opt);
  });
}

function renderTableHeader() {
  els.scheduleHead.innerHTML = '';
  const row = document.createElement('tr');
  for (let p = 1; p <= 5; p++) {
    const th = document.createElement('th');
    const lt = lectureTimes.find((t) => t.period_number === p);
    const label = lt?.label ?? `المحاضرة ${p}`;
    const time =
      lt && lt.start_time && lt.end_time
        ? `${formatTime(lt.start_time)} - ${formatTime(lt.end_time)}`
        : '';
    th.innerHTML = `${label}<span class="period-time">${time}</span>`;
    row.appendChild(th);
  }
  const corner = document.createElement('th');
  corner.textContent = 'اليوم';
  corner.className = 'col-day';
  row.appendChild(corner);
  els.scheduleHead.appendChild(row);
}

function renderScheduleGrid(items) {
  els.scheduleBody.innerHTML = '';
  const map = new Map();
  items.forEach((item) => {
    map.set(`${item.day}-${item.period}`, item);
  });

  WEEK_DAYS.forEach((d) => {
    const tr = document.createElement('tr');
    for (let p = 1; p <= 5; p++) {
      const td = document.createElement('td');
      const item = map.get(`${d.value}-${p}`);
      if (item) {
        td.innerHTML = `
          <div class="lecture-card">
            <div class="lecture-card__subject">${escapeHtml(item.subjects?.name ?? '')}</div>
            <div class="lecture-card__meta">${escapeHtml(item.teachers?.name ?? '')}<br>${escapeHtml(item.rooms?.name ?? '')}</div>
          </div>`;
      } else {
        td.innerHTML = '<div class="lecture-card lecture-card--empty">—</div>';
      }
      tr.appendChild(td);
    }
    const th = document.createElement('th');
    th.className = 'col-day';
    th.textContent = d.label;
    tr.appendChild(th);
    els.scheduleBody.appendChild(tr);
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setLoading(on) {
  els.loading.hidden = !on;
  els.scheduleWrap.hidden = on;
  els.empty.hidden = true;
}

async function refreshSchedule() {
  const yearId = els.year.value;
  const gender = els.gender.value;
  const categoryId = els.category.value;

  if (!yearId || !gender || !categoryId) {
    els.scheduleWrap.hidden = true;
    els.empty.hidden = true;
    els.loading.hidden = true;
    return;
  }

  syncUrl();
  const yearName = els.year.selectedOptions[0]?.textContent ?? '';
  const catName = els.category.selectedOptions[0]?.textContent ?? '';
  const genderLabel = gender === 'male' ? 'ذكور' : 'إناث';
  if (els.printTitle) {
    els.printTitle.textContent = `${yearName} — ${genderLabel} — ${catName}`;
  }

  setLoading(true);
  try {
    const data = await fetchSchedule({
      academic_year_id: yearId,
      category_id: categoryId,
      gender,
    });
    setLoading(false);
    if (!data.length) {
      els.scheduleWrap.hidden = true;
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;
    els.scheduleWrap.hidden = false;
    renderScheduleGrid(data);
  } catch (err) {
    setLoading(false);
    showToast(userErrorMessage(err), 'error');
  }
}

function applyQueryToFilters() {
  const q = getQueryParams();
  if (q.year) {
    const y = findYearByParam(q.year, years);
    if (y) els.year.value = y.id;
  }
  if (q.gender && ['male', 'female'].includes(q.gender)) {
    els.gender.value = q.gender;
  }
}

async function init() {
  initTheme(document.getElementById('theme-toggle'));
  document.getElementById('btn-print')?.addEventListener('click', () => window.print());

  try {
    await loadMeta();
    applyQueryToFilters();
    if (els.year.value) await loadCategoriesForYear(els.year.value);
    if (getQueryParams().category && categories.length) {
      const catParam = getQueryParams().category;
      const cat = categories.find(
        (c) => c.id === catParam || c.name === catParam || slugify(c.name) === catParam
      );
      if (cat) els.category.value = cat.id;
    }
    await refreshSchedule();
  } catch (err) {
    showToast('حدث خطأ أثناء تحميل البرنامج. يرجى المحاولة مرة أخرى.', 'error');
    console.error(err);
  }

  els.year.addEventListener('change', async () => {
    await loadCategoriesForYear(els.year.value);
    els.category.value = '';
    await refreshSchedule();
  });
  els.gender.addEventListener('change', refreshSchedule);
  els.category.addEventListener('change', refreshSchedule);
}

init();
