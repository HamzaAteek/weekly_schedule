let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = 'info', duration = 4000) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  getContainer().appendChild(el);
  setTimeout(() => el.remove(), duration);
}

export function userErrorMessage(err) {
  console.error(err);
  return 'حدث خطأ أثناء تنفيذ العملية. يرجى المحاولة مرة أخرى.';
}
