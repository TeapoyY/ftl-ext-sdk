/**
 * ui/index.js — UI Module Entry Point
 *
 * - keyboard: Register keyboard shortcuts
 * - modals: Open, observe, and inject into site modals
 * - toasts: Show custom toast notifications
 * - toastObserver: Watch for site toast notifications (admin messages, item drops, etc.)
 * - download: Trigger browser file downloads (uses core/transport for cross-origin)
 */

export * as keyboard from './keyboard.js';
export * as modals from './modals.js';
export * as toasts from './toasts.js';
export * as toastObserver from './toast-observer.js';
export * as download from './download.js';