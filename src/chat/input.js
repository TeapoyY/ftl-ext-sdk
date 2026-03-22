/**
 * chat/input.js — Chat Input Helpers
 * 
 * Provides methods for interacting with the chat input field.
 * Handles the Slate-based contenteditable editor the site uses.
 */

import { byId, IDS } from '../core/dom.js';

/**
 * Get the chat input element.
 * 
 * @returns {HTMLElement|null}
 */
export function getInputElement() {
  return byId(IDS.CHAT_INPUT);
}

/**
 * Focus the chat input and move the cursor to the end.
 * 
 * @returns {boolean} True if successful
 */
export function focus() {
  const el = getInputElement();
  if (!el) return false;
  
  el.focus();
  
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false); // Collapse to end
  sel.removeAllRanges();
  sel.addRange(range);
  
  return true;
}

/**
 * Insert text into the chat input at the current cursor position.
 * Uses InputEvent for Slate editor compatibility.
 * 
 * @param {string} text - Text to insert
 * @returns {boolean} True if successful
 */
export function insertText(text) {
  const el = getInputElement();
  if (!el) return false;
  
  // Focus first
  focus();
  
  // Use InputEvent for Slate compatibility
  el.dispatchEvent(new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    data: text,
    inputType: 'insertText',
  }));
  
  el.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    data: text,
    inputType: 'insertText',
  }));
  
  return true;
}

/**
 * Insert a @mention into the chat input.
 * Adds a space after the mention for convenience.
 * 
 * @param {string} username - Username to mention (without @)
 * @returns {boolean} True if successful
 */
export function mentionUser(username) {
  return insertText(`@${username} `);
}

/**
 * Clear the chat input.
 * 
 * @returns {boolean} True if successful
 */
export function clear() {
  const el = getInputElement();
  if (!el) return false;
  
  el.focus();
  
  // Select all content
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  sel.removeAllRanges();
  sel.addRange(range);
  
  // Delete it
  el.dispatchEvent(new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    inputType: 'deleteContentBackward',
  }));
  
  el.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    inputType: 'deleteContentBackward',
  }));
  
  return true;
}

/**
 * Get the current text content of the chat input.
 * 
 * @returns {string|null}
 */
export function getText() {
  const el = getInputElement();
  return el?.textContent?.trim() || null;
}
