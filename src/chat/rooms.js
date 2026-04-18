/**
 * chat/rooms.js — Multi-Room Chat Subscription
 *
 * Manages additional socket connections for monitoring chat rooms
 * beyond the default Global room. Each subscribed room gets its own
 * independent Socket.IO connection that emits `chat:room` to switch
 * the server's message feed.
 *
 * Messages from all room sockets are funnelled through the same
 * normalisation pipeline in chat/messages.js, so consumers using
 * onMessage/onTTS/onSFX receive events from all subscribed rooms
 * transparently. Each normalised chat message includes a `chatRoom`
 * field indicating which room it came from.
 *
 * The primary socket (from socket.connect()) always handles Global.
 * This module only manages the additional room connections.
 *
 * Usage:
 *   import { chat } from 'ftl-ext-sdk';
 *
 *   // After socket.connect()...
 *   chat.rooms.subscribe('Season Pass');
 *   chat.rooms.subscribe('Season Pass XL');
 *
 *   // Messages from all rooms now flow through chat.messages.onMessage()
 *   // Each message has msg.chatRoom: 'Global' | 'Season Pass' | 'Season Pass XL'
 *
 *   chat.rooms.unsubscribe('Season Pass XL');
 *   chat.rooms.getSubscribed();  // ['Season Pass']
 *   chat.rooms.unsubscribeAll();
 */

import { createConnection, ROOMS, EVENTS } from '../core/socket.js';
import { _dispatchChat, _dispatchTts, _dispatchSfx } from './messages.js';
import { debugLog } from '../core/debug.js';

// ── State ───────────────────────────────────────────────────────────

// Active room connections: roomName → { socket, connected }
const roomSockets = new Map();

// ── Constants ───────────────────────────────────────────────────────

// Re-export for convenience
export { ROOMS };

/**
 * All subscribable room names (excluding Global, which is always active
 * on the primary socket).
 */
export const EXTRA_ROOMS = [ROOMS.SEASON_PASS, ROOMS.SEASON_PASS_XL];

// ── Public API ──────────────────────────────────────────────────────

/**
 * Subscribe to a chat room. Opens a new socket connection and emits
 * `chat:room` to start receiving that room's messages.
 *
 * Messages will flow through the existing chat.messages.onMessage(),
 * onTTS(), and onSFX() callbacks with the `chatRoom` field set.
 *
 * No-op if already subscribed to this room. No-op for 'Global'
 * (always handled by the primary socket).
 *
 * @param {string} roomName - Room to subscribe to (use ROOMS constants)
 * @returns {Promise<boolean>} True if subscription succeeded
 */
export async function subscribe(roomName) {
  // Global is always on the primary socket
  if (roomName === ROOMS.GLOBAL) {
    console.warn('[ftl-ext-sdk] Global room is always active on the primary socket');
    return true;
  }

  // Already subscribed
  if (roomSockets.has(roomName)) return true;

  // Auto-detect auth token from cookie — Season Pass rooms require
  // authentication, the server silently ignores room switches from
  // anonymous connections
  const socket = createConnection();
  if (!socket) {
    console.warn(`[ftl-ext-sdk] Cannot subscribe to "${roomName}" — primary socket not connected yet`);
    return false;
  }

  const entry = { socket, connected: false };
  roomSockets.set(roomName, entry);

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn(`[ftl-ext-sdk] Room "${roomName}" connection timed out`);
      cleanup(roomName);
      resolve(false);
    }, 10000);

    socket.on('connect', () => {
      entry.connected = true;
      clearTimeout(timeout);

      // Subscribe to the room
      socket.emit('chat:room', roomName);

      // Wire up event listeners that dispatch through messages.js
      wireRoomListeners(socket, roomName);

      debugLog(`Subscribed to room: ${roomName}`);
      resolve(true);
    });

    socket.on('disconnect', (reason) => {
      entry.connected = false;
      debugLog(`Room "${roomName}" disconnected: ${reason}`);
    });

    // Note: auto-reconnect is disabled on room sockets (see
    // core/socket.js createConnection). Consumers must call
    // chat.rooms.subscribe() again to re-establish a dead room socket.

    socket.on('connect_error', (err) => {
      if (!entry.connected) {
        clearTimeout(timeout);
        console.warn(`[ftl-ext-sdk] Room "${roomName}" connection error: ${err.message}`);
        cleanup(roomName);
        resolve(false);
      }
    });
  });
}

/**
 * Unsubscribe from a chat room. Disconnects and removes the socket.
 *
 * @param {string} roomName - Room to unsubscribe from
 */
export function unsubscribe(roomName) {
  cleanup(roomName);
}

/**
 * Subscribe to all extra rooms (Season Pass + Season Pass XL).
 *
 * @returns {Promise<Object>} Map of room name → success boolean
 */
export async function subscribeAll() {
  const results = {};
  for (const room of EXTRA_ROOMS) {
    results[room] = await subscribe(room);
  }
  return results;
}

/**
 * Unsubscribe from all extra rooms.
 */
export function unsubscribeAll() {
  for (const roomName of [...roomSockets.keys()]) {
    cleanup(roomName);
  }
}

/**
 * Get a list of currently subscribed extra room names.
 * Does not include Global (always active on primary socket).
 *
 * @returns {string[]}
 */
export function getSubscribed() {
  return [...roomSockets.keys()];
}

/**
 * Check if a specific room is currently subscribed.
 *
 * @param {string} roomName
 * @returns {boolean}
 */
export function isSubscribed(roomName) {
  return roomSockets.has(roomName);
}

// ── Internal ────────────────────────────────────────────────────────

/**
 * Wire up event listeners on a room socket that dispatch through
 * the messages.js normalisation pipeline.
 */
function wireRoomListeners(socket, roomName) {
  // Chat messages — dispatch with the room name
  socket.on(EVENTS.CHAT_MESSAGE, (data) => {
    _dispatchChat(data, roomName);
  });

  // TTS — listen on both insert and update, dedup handles overlap
  const ttsHandler = (data) => _dispatchTts(data);
  socket.on(EVENTS.TTS_INSERT, ttsHandler);
  socket.on(EVENTS.TTS_UPDATE, ttsHandler);

  // SFX — same pattern
  const sfxHandler = (data) => _dispatchSfx(data);
  socket.on(EVENTS.SFX_INSERT, sfxHandler);
  socket.on(EVENTS.SFX_UPDATE, sfxHandler);
}

/**
 * Clean up a room subscription — disconnect and remove from state.
 */
function cleanup(roomName) {
  const entry = roomSockets.get(roomName);
  if (!entry) return;

  try {
    entry.socket.disconnect();
  } catch {}

  roomSockets.delete(roomName);
  debugLog(`Unsubscribed from room: ${roomName}`);
}