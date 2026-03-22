/**
 * ui/modals.js — Modal Helpers
 * 
 * High-level modal utilities built on top of core/events.js.
 * Provides convenient patterns for opening, observing, and
 * injecting content into the site's modal system.
 */

import { openModal, closeModal, isModalOpen, onModalOpen, onModalEvent, MODALS } from '../core/events.js';
import { waitForElement } from '../core/dom.js';

/**
 * Open a modal and wait for it to render in the DOM.
 * Returns a promise that resolves with the modal element.
 * 
 * @param {string} name - Modal name (use MODALS constants)
 * @param {Object} data - Optional data to pass to the modal
 * @param {number} timeout - Max wait time in ms (default 2000)
 * @returns {Promise<HTMLElement>} The modal element
 */
export async function openAndWait(name, data = {}, timeout = 2000) {
  openModal(name, data);
  return waitForElement('#modal', timeout);
}

/**
 * Inject a DOM element into the current modal.
 * 
 * @param {HTMLElement|string} content - Element or HTML string to inject
 * @param {Object} options
 * @param {string} options.position - Where to inject: 'append' (default), 'prepend', 'replace'
 * @param {string} options.id - Optional ID for the injection (for later removal)
 * @returns {boolean} True if injection succeeded
 */
export function injectIntoModal(content, options = {}) {
  const { position = 'append', id = null } = options;
  
  const modal = document.getElementById('modal');
  if (!modal) return false;
  
  // Create the element to inject
  let element;
  if (typeof content === 'string') {
    element = document.createElement('div');
    element.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    element = content;
  } else {
    return false;
  }
  
  // Tag it for identification
  if (id) element.setAttribute('data-ftl-sdk', id);
  
  // Find the modal content area
  // The modal structure is: fixed container > backdrop + motion.div > Panel > content
  // We look for the innermost scrollable/content container
  const contentArea = modal.querySelector('.overflow-y-auto') || modal;
  
  switch (position) {
    case 'replace':
      contentArea.innerHTML = '';
      contentArea.appendChild(element);
      break;
    case 'prepend':
      contentArea.insertBefore(element, contentArea.firstChild);
      break;
    case 'append':
    default:
      contentArea.appendChild(element);
      break;
  }
  
  return true;
}

/**
 * Wait for a modal to close.
 * Returns a promise that resolves when the modal is gone.
 * 
 * @param {number} timeout - Max wait time in ms (default 30000)
 * @returns {Promise<void>}
 */
export function waitForClose(timeout = 30000) {
  return new Promise((resolve, reject) => {
    if (!isModalOpen()) return resolve();
    
    const timer = setTimeout(() => {
      unsub();
      reject(new Error('[ftl-ext-sdk] Modal close timeout'));
    }, timeout);
    
    const unsub = onModalEvent((action) => {
      if (action === 'close') {
        clearTimeout(timer);
        unsub();
        resolve();
      }
    });
  });
}

// Re-export commonly used functions
export { openModal, closeModal, isModalOpen, onModalOpen, onModalEvent, MODALS };
