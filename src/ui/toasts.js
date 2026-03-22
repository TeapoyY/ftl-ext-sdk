/**
 * ui/toasts.js — Toast Notifications
 * 
 * Since the new site's toast system is internal (Zustand store-based),
 * we implement our own lightweight toast UI that matches the site's
 * visual style using Tailwind classes.
 */

let toastContainer = null;

/**
 * Show a toast notification.
 * 
 * @param {string} title - Toast title
 * @param {Object} options
 * @param {string} options.description - Optional description text
 * @param {number} options.duration - Display duration in ms (default 5000)
 * @param {'default'|'success'|'error'|'warning'} options.type - Toast style
 * @param {string} options.id - Optional ID (prevents duplicate toasts with same ID)
 * @returns {string} Toast ID
 */
export function notify(title, options = {}) {
  const {
    description = '',
    duration = 5000,
    type = 'default',
    id = `ftl-sdk-toast-${Date.now()}`,
  } = options;
  
  ensureContainer();
  
  // Prevent duplicates
  if (id && toastContainer.querySelector(`[data-toast-id="${id}"]`)) {
    return id;
  }
  
  const toast = document.createElement('div');
  toast.setAttribute('data-toast-id', id);
  toast.setAttribute('data-ftl-sdk', 'toast');
  
  // Style based on type using site's Tailwind classes
  const borderColor = {
    default: 'border-light-600/50',
    success: 'border-green-400/50',
    error: 'border-red-500/40',
    warning: 'border-amber-400',
  }[type] || 'border-light-600/50';
  
  const titleColor = {
    default: 'text-light-text',
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-amber-300',
  }[type] || 'text-light-text';
  
  toast.className = `p-3 rounded-lg shadow-lg bg-dark-600/90 border ${borderColor} backdrop-blur-sm`;
  toast.style.cssText = 'animation: ftl-sdk-toast-in 0.25s ease; pointer-events: auto; max-width: 320px;';
  
  toast.innerHTML = `
    <div class="font-bold text-sm ${titleColor} drop-shadow-[1px_1px_0_#00000050]">${escapeHtml(title)}</div>
    ${description ? `<div class="text-xs text-light-text/60 mt-1">${escapeHtml(description)}</div>` : ''}
  `;
  
  toastContainer.appendChild(toast);
  
  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => dismiss(id), duration);
  }
  
  return id;
}

/**
 * Dismiss a toast by ID.
 * 
 * @param {string} id - Toast ID to dismiss
 */
export function dismiss(id) {
  if (!toastContainer) return;
  
  const toast = toastContainer.querySelector(`[data-toast-id="${id}"]`);
  if (!toast) return;
  
  toast.style.animation = 'ftl-sdk-toast-out 0.2s ease forwards';
  setTimeout(() => toast.remove(), 200);
}

/**
 * Dismiss all toasts.
 */
export function dismissAll() {
  if (!toastContainer) return;
  toastContainer.innerHTML = '';
}

/**
 * Ensure the toast container exists in the DOM.
 */
function ensureContainer() {
  if (toastContainer && document.body.contains(toastContainer)) return;
  
  // Add animation keyframes if not already present
  if (!document.getElementById('ftl-sdk-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'ftl-sdk-toast-styles';
    style.textContent = `
      @keyframes ftl-sdk-toast-in {
        from { opacity: 0; transform: translateY(-8px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes ftl-sdk-toast-out {
        from { opacity: 1; transform: translateY(0) scale(1); }
        to { opacity: 0; transform: translateY(-8px) scale(0.95); }
      }
    `;
    document.head.appendChild(style);
  }
  
  toastContainer = document.createElement('div');
  toastContainer.setAttribute('data-ftl-sdk', 'toast-container');
  toastContainer.className = 'fixed top-4 right-4 z-100 flex flex-col gap-2 pointer-events-none';
  document.body.appendChild(toastContainer);
}

/**
 * Escape HTML to prevent XSS in toast content.
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
