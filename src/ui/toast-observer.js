/**
 * ui/toast-observer.js — Site Toast Observation
 *
 * The new site uses Sonner (https://sonner.emilkowal.dev/) for toast
 * notifications. Toasts are <li> elements with data-sonner-toast attribute.
 *
 * This module observes for new toasts appearing in the DOM and parses
 * their content — useful for logging admin messages, item notifications, etc.
 */

import { observe, waitForElement, SELECTORS } from '../core/dom.js';
import { debugLog } from '../core/debug.js';

const toastCallbacks = new Set();
const processedToasts = new WeakSet();
let disconnectObserver = null;

/**
 * Parse a Sonner toast element into a structured object.
 *
 * Toast structure:
 * <li data-sonner-toast>
 *   <div data-content>
 *     <div data-title>
 *       <div class="relative flex rounded-lg ...">
 *         [optional image div]
 *         <div class="flex flex-1 items-center">
 *           <p class="text-lg ...">Title</p>
 *           <p class="mt-1 text-sm ...">Description</p>
 *         </div>
 *       </div>
 *     </div>
 *   </div>
 * </li>
 *
 * @param {HTMLElement} toastElement - A [data-sonner-toast] element
 * @returns {Object|null} Parsed toast or null
 */
export function parseToastElement(toastElement) {
  if (!toastElement || !toastElement.hasAttribute('data-sonner-toast')) {
    return null;
  }

  // Find the content paragraphs
  const paragraphs = toastElement.querySelectorAll('p');
  if (paragraphs.length === 0) return null;

  const title = paragraphs[0]?.textContent?.trim() || null;
  const description = paragraphs.length > 1
      ? paragraphs[1]?.textContent?.trim() || null
      : null;

  // Check for an image (item notifications have one)
  const img = toastElement.querySelector('img');
  const imageUrl = img ? extractImageUrl(img) : null;
  const imageAlt = img?.getAttribute('alt') || null;

  // Extract position info
  const yPosition = toastElement.getAttribute('data-y-position') || null;
  const xPosition = toastElement.getAttribute('data-x-position') || null;

  return {
    title,
    description,
    imageUrl,
    imageAlt,
    position: { x: xPosition, y: yPosition },
    timestamp: Date.now(),
    element: toastElement,
  };
}

/**
 * Extract image URL, handling Next.js image optimization.
 */
function extractImageUrl(imgElement) {
  const src = imgElement?.getAttribute('src') || '';

  if (src.includes('/_next/image')) {
    try {
      const urlParam = new URL(src, window.location.origin).searchParams.get('url');
      return urlParam ? decodeURIComponent(urlParam) : src;
    } catch {
      const match = src.match(/url=([^&]+)/);
      return match ? decodeURIComponent(match[1]) : src;
    }
  }

  return src || null;
}

/**
 * Register a callback for new site toast notifications.
 *
 * The callback receives a parsed toast object:
 * {
 *   title: string,           // e.g. "You found an item!"
 *   description: string,     // e.g. "Tip Jar was added to your inventory."
 *   imageUrl: string|null,   // CDN URL if toast has an image
 *   imageAlt: string|null,   // Image alt text (often the item name)
 *   position: { x, y },     // Toast position
 *   timestamp: number,       // When we observed it (Date.now())
 *   element: HTMLElement,    // Raw DOM element
 * }
 *
 * @param {Function} callback - Called with the parsed toast
 * @returns {Function} Unsubscribe function
 */
export function onToast(callback) {
  toastCallbacks.add(callback);
  return () => toastCallbacks.delete(callback);
}

/**
 * Start observing for site toast notifications.
 *
 * Targets the Sonner container element specifically, NOT document.body.
 * This is efficient because the container only mutates when toasts
 * are added or removed — it's completely isolated from chat and other
 * high-frequency DOM changes.
 *
 * @returns {boolean} True if observation started successfully
 */
export function startObserving() {
  if (disconnectObserver) return true;

  const container = document.querySelector(SELECTORS.TOAST_CONTAINER);
  if (!container) {
    console.warn('[ftl-ext-sdk] Sonner toast container not found — cannot start observing');
    return false;
  }

  // Process any existing toasts
  container.querySelectorAll('[data-sonner-toast]').forEach(processToast);

  // Watch the Sonner container for new toast elements
  disconnectObserver = observe(container, (mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;

        // Check if the added node is a toast
        if (node.hasAttribute?.('data-sonner-toast')) {
          processToast(node);
        }

        // Check children (toast <li> inside a new <ol>)
        if (node.querySelectorAll) {
          node.querySelectorAll('[data-sonner-toast]').forEach(processToast);
        }
      }
    }
  }, { childList: true, subtree: true });

  debugLog('Toast observer started (targeting Sonner container)');
  return true;
}

/**
 * Stop observing for toasts.
 */
export function stopObserving() {
  if (disconnectObserver) {
    disconnectObserver();
    disconnectObserver = null;
    debugLog('Toast observer stopped');
  }
}

/**
 * Wait for the Sonner toast container to appear, then start observing.
 *
 * The Sonner container appears a few seconds after page load.
 * This uses a short-lived body-level observer to find it, then
 * disconnects and switches to the targeted container observer.
 *
 * @param {number} timeout - Max wait time in ms (default 30000)
 * @returns {Promise<boolean>} True if observation started successfully
 */
export async function waitAndObserve(timeout = 30000) {
  if (disconnectObserver) return true;

  // Try immediately first
  if (startObserving()) return true;

  // Wait for the Sonner container to appear
  try {
    await waitForElement(SELECTORS.TOAST_CONTAINER, timeout);
    return startObserving();
  } catch {
    console.warn('[ftl-ext-sdk] Toast container did not appear within', timeout, 'ms');
    return false;
  }
}

/**
 * Check if the toast observer is running.
 */
export function isObserving() {
  return disconnectObserver !== null;
}

/**
 * Process a single toast element.
 */
function processToast(element) {
  // Skip if already processed
  if (processedToasts.has(element)) return;
  processedToasts.add(element);

  const parsed = parseToastElement(element);
  if (!parsed) return;

  for (const cb of toastCallbacks) {
    try {
      cb(parsed);
    } catch (e) {
      console.error('[ftl-ext-sdk] Toast observer callback error:', e);
    }
  }
}