/**
 * core/debug.js — SDK Debug Logging
 *
 * Gates routine lifecycle logs (connects, disconnects, subscribes)
 * behind an opt-in debug flag. Errors and warnings are NOT gated —
 * they remain visible at all times.
 *
 * Usage (consumer):
 *
 *   import { debug } from 'ftl-ext-sdk';
 *   debug.enable();   // turn on lifecycle logs
 *   debug.disable();  // turn them off (default)
 *
 * Usage (inside the SDK):
 *
 *   import { debugLog } from './debug.js';
 *   debugLog('Socket connected');
 *
 * debugLog is a no-op when debug is disabled. Equivalent to
 * console.log with an '[ftl-ext-sdk]' prefix when enabled.
 */

let _enabled = false;

/**
 * Enable routine SDK lifecycle logging.
 */
export function enable() {
  _enabled = true;
}

/**
 * Disable routine SDK lifecycle logging (default).
 */
export function disable() {
  _enabled = false;
}

/**
 * Check whether debug logging is currently enabled.
 *
 * @returns {boolean}
 */
export function isEnabled() {
  return _enabled;
}

/**
 * Internal logging helper. No-op when debug is disabled.
 *
 * @param {...any} args
 */
export function debugLog(...args) {
  if (_enabled) console.log('[ftl-ext-sdk]', ...args);
}
