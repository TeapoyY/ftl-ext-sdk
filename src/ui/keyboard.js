/**
 * ui/keyboard.js — Keyboard Shortcut Registration
 * 
 * Provides a clean API for registering keyboard shortcuts that
 * automatically skip when the user is typing in input fields.
 */

const shortcuts = new Map();
let listenerAttached = false;

/**
 * Register a keyboard shortcut.
 * 
 * @param {string} id - Unique identifier for this shortcut
 * @param {Object} options - Shortcut configuration
 * @param {string} options.key - The key to listen for (e.g. 'e', 'F', 'Escape')
 * @param {boolean} options.ctrl - Require Ctrl key (default false)
 * @param {boolean} options.alt - Require Alt key (default false)
 * @param {boolean} options.shift - Require Shift key (default false)
 * @param {boolean} options.meta - Require Meta/Cmd key (default false)
 * @param {boolean} options.skipInputs - Don't fire when user is typing (default true)
 * @param {boolean} options.preventDefault - Prevent default browser action (default true)
 * @param {Function} callback - Called when the shortcut is triggered
 * @returns {Function} Unregister function
 */
export function register(id, options, callback) {
  if (!listenerAttached) attachListener();
  
  shortcuts.set(id, {
    key: options.key.toLowerCase(),
    ctrl: options.ctrl || false,
    alt: options.alt || false,
    shift: options.shift || false,
    meta: options.meta || false,
    skipInputs: options.skipInputs !== false,
    preventDefault: options.preventDefault !== false,
    callback,
  });
  
  return () => shortcuts.delete(id);
}

/**
 * Remove a keyboard shortcut by ID.
 * 
 * @param {string} id - Shortcut ID to remove
 */
export function unregister(id) {
  shortcuts.delete(id);
}

/**
 * Remove all registered shortcuts.
 */
export function unregisterAll() {
  shortcuts.clear();
}

/**
 * Get all registered shortcut IDs.
 * 
 * @returns {string[]}
 */
export function getRegistered() {
  return [...shortcuts.keys()];
}

/**
 * Check if the user is currently focused on a text input.
 * 
 * @returns {boolean}
 */
function isUserTyping() {
  const active = document.activeElement;
  if (!active) return false;
  
  return (
    active.tagName === 'INPUT' ||
    active.tagName === 'TEXTAREA' ||
    active.isContentEditable ||
    active.getAttribute('role') === 'textbox'
  );
}

/**
 * Attach the global keydown listener.
 * Called once on first shortcut registration.
 */
function attachListener() {
  document.addEventListener('keydown', (e) => {
    for (const [id, shortcut] of shortcuts) {
      // Skip if user is typing and shortcut respects inputs
      if (shortcut.skipInputs && isUserTyping()) continue;
      
      // Check the key matches
      if (e.key.toLowerCase() !== shortcut.key) continue;
      
      // Check required modifiers are pressed
      if (shortcut.ctrl && !e.ctrlKey) continue;
      if (shortcut.alt && !e.altKey) continue;
      if (shortcut.shift && !e.shiftKey) continue;
      if (shortcut.meta && !e.metaKey) continue;
      
      // Check non-required modifiers are NOT pressed
      if (!shortcut.ctrl && e.ctrlKey) continue;
      if (!shortcut.alt && e.altKey) continue;
      if (!shortcut.shift && e.shiftKey) continue;
      if (!shortcut.meta && e.metaKey) continue;
      
      // Match found
      if (shortcut.preventDefault) e.preventDefault();
      
      try {
        shortcut.callback(e);
      } catch (err) {
        console.error(`[ftl-ext-sdk] Shortcut "${id}" error:`, err);
      }
    }
  });
  
  listenerAttached = true;
}
