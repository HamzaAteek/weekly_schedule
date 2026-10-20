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
  const corner = document.createElement('th');
  corner.textContent = 'اليوم';
  corner.className = 'col-day';
  row.appendChild(corner);
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
    const th = document.createElement('th');
    th.className = 'col-day';
    th.textContent = d.label;
    tr.appendChild(th);
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

function getExportName(extension) {
  const title = els.printTitle?.textContent || 'البرنامج-الأسبوعي';
  const safeTitle = title.replace(/[^\u0600-\u06ff\w\s-]/g, '').trim().replace(/\s+/g, '-');
  return `${safeTitle || 'البرنامج-الأسبوعي'}.${extension}`;
}

async function loadHtml2Canvas() {
  const module = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
  return module.default;
}

async function exportScheduleAsImage() {
  if (els.scheduleWrap.hidden) {
    showToast('اختر الفلاتر وأظهر الجدول أولًا.', 'warning');
    return;
  }
  const button = document.getElementById('btn-export-image');
  button.disabled = true;
  try {
    const html2canvas = await loadHtml2Canvas();
    const canvas = await html2canvas(document.querySelector('.schedule-table'), {
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      scale: Math.min(window.devicePixelRatio || 1, 2),
      useCORS: true,
    });
    const link = document.createElement('a');
    link.download = getExportName('png');
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('تم تصدير الجدول كصورة.', 'success');
  } catch (err) {
    console.error(err);
    showToast('تعذر تصدير الصورة. حاول مرة أخرى.', 'error');
  } finally {
    button.disabled = false;
  }
}

async function exportScheduleAsPdf() {
  if (els.scheduleWrap.hidden) {
    showToast('اختر الفلاتر وأظهر الجدول أولًا.', 'warning');
    return;
  }
  const button = document.getElementById('btn-export-pdf');
  button.disabled = true;
  try {
    const [html2canvas, { jsPDF }] = await Promise.all([
      loadHtml2Canvas(),
      import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm'),
    ]);
    const canvas = await html2canvas(document.querySelector('.schedule-table'), {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    });
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const margin = 8;
    const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
    const imageHeight = (canvas.height * pageWidth) / canvas.width;
    let offset = 0;
    while (offset < imageHeight) {
      if (offset) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin - offset, pageWidth, imageHeight);
      offset += pageHeight;
    }
    pdf.save(getExportName('pdf'));
    showToast('تم تصدير الجدول كملف PDF.', 'success');
  } catch (err) {
    console.error(err);
    showToast('تعذر تصدير ملف PDF. حاول مرة أخرى.', 'error');
  } finally {
    button.disabled = false;
  }
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
  document.getElementById('btn-export-image')?.addEventListener('click', exportScheduleAsImage);
  document.getElementById('btn-export-pdf')?.addEventListener('click', exportScheduleAsPdf);

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
