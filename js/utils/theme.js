const STORAGE_KEY = 'it-schedule-theme';

export function initTheme(toggleBtn) {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

  if (toggleBtn) {
    updateToggleLabel(toggleBtn);
    toggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(STORAGE_KEY, 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(STORAGE_KEY, 'dark');
      }
      updateToggleLabel(toggleBtn);
    });
  }
}

function updateToggleLabel(btn) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.textContent = isDark ? 'الوضع الفاتح' : 'الوضع الداكن';
  btn.setAttribute('aria-label', btn.textContent);
}
