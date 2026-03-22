/**
 * core/storage.js — Storage Wrapper
 * 
 * Simple localStorage wrapper with JSON serialisation and error handling.
 * Works identically in browser extensions and Tampermonkey scripts.
 */

/**
 * Default prefix for SDK storage keys.
 * Prevents collisions with the site's own localStorage usage.
 */
const DEFAULT_PREFIX = 'ftl-sdk:';

/**
 * Get a value from localStorage.
 * Automatically parses JSON.
 * 
 * @param {string} key - Storage key
 * @param {*} defaultValue - Returned if key doesn't exist or parsing fails
 * @param {boolean} prefixed - Whether to add the SDK prefix (default true)
 * @returns {*} Parsed value or defaultValue
 */
export function get(key, defaultValue = null, prefixed = true) {
  try {
    const fullKey = prefixed ? DEFAULT_PREFIX + key : key;
    const raw = localStorage.getItem(fullKey);
    return raw !== null ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Set a value in localStorage.
 * Automatically serialises to JSON.
 * 
 * @param {string} key - Storage key
 * @param {*} value - Value to store (must be JSON-serialisable)
 * @param {boolean} prefixed - Whether to add the SDK prefix (default true)
 * @returns {boolean} True if successful
 */
export function set(key, value, prefixed = true) {
  try {
    const fullKey = prefixed ? DEFAULT_PREFIX + key : key;
    localStorage.setItem(fullKey, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[ftl-ext-sdk] Storage write failed:', e.message);
    return false;
  }
}

/**
 * Remove a value from localStorage.
 * 
 * @param {string} key - Storage key
 * @param {boolean} prefixed - Whether to add the SDK prefix (default true)
 */
export function remove(key, prefixed = true) {
  const fullKey = prefixed ? DEFAULT_PREFIX + key : key;
  localStorage.removeItem(fullKey);
}

/**
 * Get all SDK storage keys.
 * 
 * @returns {string[]} Array of key names (without prefix)
 */
export function keys() {
  const result = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(DEFAULT_PREFIX)) {
      result.push(key.slice(DEFAULT_PREFIX.length));
    }
  }
  return result;
}

/**
 * Clear all SDK storage entries.
 * Only removes keys with the SDK prefix — does not affect the site's data.
 */
export function clear() {
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(DEFAULT_PREFIX)) {
      toRemove.push(key);
    }
  }
  toRemove.forEach(key => localStorage.removeItem(key));
}
