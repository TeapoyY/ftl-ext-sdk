/**
 * chat/index.js — Chat Module Entry Point
 *
 * Sub-modules:
 *
 * - store: Direct Zustand store access. Read, modify, or remove
 *          chat messages in React state. Page realm only.
 * - messages: Socket.IO-based, normalised data, sees ALL messages
 *             with TTS/SFX deduplication.
 * - rooms: Multi-room support — subscribe to Season Pass / XL rooms.
 * - input: Chat input field helpers.
 * - observer: DEPRECATED. DOM-based observation. Unreliable due to
 *             react-window virtualisation. Use store or messages.
 *
 * Recommended choice:
 *   - Filtering or modifying messages → store
 *   - Logging, analytics, multi-room → messages
 */

export * as store from './store.js';
export * as messages from './messages.js';
export * as rooms from './rooms.js';
export * as input from './input.js';