import { requireAuth, logout, getSessionEmail } from './auth.js';
import { createEntitiesController } from './entities.js';
import { createSchedulePanel } from './schedule-panel.js';
import { fetchSchedule } from '../api/data.js';
import { initTheme } from '../utils/theme.js';
import { showToast } from '../utils/toast.js';

const state = {
  years: [],
  categories: [],
  subjects: [],
  teachers: [],
  rooms: [],
  lectureTimes: [],
  scheduleRows: [],
};

let schedulePanel;
let entities;

async function renderStats() {
  const grid = document.getElementById('stats-grid');
  try {
    const all = await fetchSchedule({});
    grid.innerHTML = `
      <div class="stat-card card"><div class="num">${state.subjects.length}</div><div>مواد</div></div>
      <div class="stat-card card"><div class="num">${state.teachers.length}</div><div>مدرسون</div></div>
      <div class="stat-card card"><div class="num">${all.length}</div><div>محاضرات</div></div>
      <div class="stat-card card"><div class="num">${state.rooms.length}</div><div>قاعات</div></div>`;
  } catch {
    grid.innerHTML = '<p>تعذر تحميل الإحصائيات</p>';
  }
}

function setupNavigation() {
  const links = document.querySelectorAll('#admin-nav a[data-panel]');
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const panel = link.dataset.panel;
      document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
      document.getElementById(`panel-${panel}`)?.classList.add('active');
      links.forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
      document.getElementById('panel-title').textContent =
        document.getElementById(`panel-${panel}`)?.dataset.title ?? '';
      document.getElementById('sidebar')?.classList.remove('open');
      if (panel === 'schedule') schedulePanel.loadTable();
    });
  });

  const hash = window.location.hash.replace('#', '') || 'home';
  const target = document.querySelector(`#admin-nav a[data-panel="${hash}"]`);
  if (target) target.click();
}

function refreshScheduleFilters() {
  schedulePanel.rebuildFilters();
}

async function init() {
  const session = await requireAuth();
  if (!session) return;

  initTheme(document.getElementById('theme-toggle'));
  const email = await getSessionEmail();
  document.getElementById('admin-email').textContent = email;
  document.getElementById('settings-email').textContent = email;

  document.getElementById('btn-logout')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });

  entities = createEntitiesController(state, refreshScheduleFilters);
  schedulePanel = createSchedulePanel(state);

  try {
    await entities.reloadMeta();
    entities.renderAll();
    schedulePanel.rebuildFilters();
    schedulePanel.bind();
    entities.bindCrud();
    await renderStats();
    setupNavigation();
  } catch (err) {
    showToast('حدث خطأ أثناء تحميل البيانات. تحقق من إعداد Supabase.', 'error');
    console.error(err);
  }
}

init();
