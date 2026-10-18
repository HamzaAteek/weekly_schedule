export function confirmDialog(message, { confirmText = 'حذف', cancelText = 'إلغاء' } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <p>${message}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-action="cancel">${cancelText}</button>
          <button type="button" class="btn btn-danger" data-action="confirm">${confirmText}</button>
        </div>
      </div>
    `;
    const close = (result) => {
      overlay.remove();
      resolve(result);
    };
    overlay.querySelector('[data-action="cancel"]').onclick = () => close(false);
    overlay.querySelector('[data-action="confirm"]').onclick = () => close(true);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
    document.body.appendChild(overlay);
  });
}

export function openFormModal(title, formHtml, onSubmit) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog">
      <h3>${title}</h3>
      <form id="modal-form">${formHtml}</form>
    </div>
  `;
  const form = overlay.querySelector('#modal-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ok = await onSubmit(new FormData(form), overlay);
    if (ok !== false) overlay.remove();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
  return overlay;
}
