/**
 * chat/messages.js — Chat Message Interception
 * 
 * Listens for chat messages, TTS, and SFX events via the SDK's
 * Socket.IO connection. Provides callbacks for each event type
 * with fully structured data.
 */

import { on, EVENTS } from '../core/socket.js';

// Callback registries
const messageCallbacks = new Set();
const ttsCallbacks = new Set();
const sfxCallbacks = new Set();

/**
 * Register a callback for new chat messages.
 * 
 * The callback receives the full message object:
 * {
 *   id: string,                    // Message UUID
 *   user: {
 *     id: string,                  // User UUID (or "happening" for system events)
 *     displayName: string,
 *     photoURL: string,
 *     customUsernameColor: string,
 *     clan: string|null,
 *     medals: string[],
 *     xp: number,
 *     endorsement: string|null,
 *     endorsementColor: string|null,
 *   },
 *   message: string,               // Message text
 *   type: string,                  // "message", etc.
 *   admin: boolean,
 *   timestamp: number,             // Unix timestamp
 *   mentions: string[],
 *   clips: any[],
 *   metadata: {
 *     isGrandMarshall: boolean,
 *     isEpic: boolean,
 *     isFish: boolean,
 *     isFree: boolean,
 *     isAdmin: boolean,
 *     isMod: boolean,
 *     watching: string,            // Room name being watched
 *   },
 *   tempId: string,
 *   nsp: string,                   // Namespace ("/" for global)
 * }
 * 
 * @param {Function} callback - Called with the message object
 * @returns {Function} Unsubscribe function
 */
export function onMessage(callback) {
  messageCallbacks.add(callback);
  return () => messageCallbacks.delete(callback);
}

/**
 * Register a callback for TTS events.
 * 
 * The callback receives:
 * {
 *   id: string,
 *   createdAt: number,
 *   updatedAt: number,
 *   userId: string,
 *   displayName: string,
 *   message: string,
 *   room: string,                  // e.g. "cfsl-5"
 *   status: string,                // "pending", "approved", "rejected"
 *   voice: string,                 // e.g. "Brainrot"
 *   clanTag: string|null,
 *   cost: number,
 *   autoApproved: boolean,
 *   superApproved: boolean,
 *   highPriority: boolean,
 * }
 * 
 * @param {Function} callback - Called with the TTS object
 * @returns {Function} Unsubscribe function
 */
export function onTTS(callback) {
  ttsCallbacks.add(callback);
  return () => ttsCallbacks.delete(callback);
}

/**
 * Register a callback for SFX events.
 * 
 * The callback receives:
 * {
 *   id: string,
 *   createdAt: number,
 *   updatedAt: number,
 *   userId: string,
 *   displayName: string,
 *   sound: string,                 // Sound name
 *   room: string,                  // e.g. "brrr-5"
 *   status: string,                // "pending", "approved"
 *   url: string,                   // CDN URL to the audio file
 *   duration: string,              // Duration in ms
 *   clanTag: string|null,
 *   cost: number,
 *   isAI: boolean,
 *   autoApproved: boolean,
 *   superApproved: boolean,
 *   highPriority: boolean,
 * }
 * 
 * @param {Function} callback - Called with the SFX object
 * @returns {Function} Unsubscribe function
 */
export function onSFX(callback) {
  sfxCallbacks.add(callback);
  return () => sfxCallbacks.delete(callback);
}

/**
 * Start listening for chat events on the socket.
 * Call this after the socket is connected.
 */
export function startListening() {
  on(EVENTS.CHAT_MESSAGE, (data) => {
    for (const cb of messageCallbacks) {
      try { cb(data); }
      catch (e) { console.error('[ftl-ext-sdk] Chat message callback error:', e); }
    }
  });
  
  on(EVENTS.TTS_UPDATE, (data) => {
    for (const cb of ttsCallbacks) {
      try { cb(data); }
      catch (e) { console.error('[ftl-ext-sdk] TTS callback error:', e); }
    }
  });
  
  on(EVENTS.SFX_INSERT, (data) => {
    for (const cb of sfxCallbacks) {
      try { cb(data); }
      catch (e) { console.error('[ftl-ext-sdk] SFX callback error:', e); }
    }
  });
}

/**
 * Convenience: check if a chat message is from a fish (contestant).
 */
export function isFishMessage(msg) {
  return msg?.metadata?.isFish === true;
}

/**
 * Convenience: check if a chat message is from staff/admin.
 */
export function isStaffMessage(msg) {
  return msg?.metadata?.isAdmin === true || msg?.admin === true;
}

/**
 * Convenience: check if a chat message is from a mod.
 */
export function isModMessage(msg) {
  return msg?.metadata?.isMod === true;
}

/**
 * Convenience: check if a chat message is a "happening" (item use, etc).
 */
export function isHappening(msg) {
  return msg?.user?.id === 'happening';
}

/**
 * Convenience: check if a message mentions a specific username.
 */
export function mentionsUser(msg, username) {
  if (!msg?.mentions || !username) return false;
  const lower = username.toLowerCase();
  return msg.mentions.some(m => m.toLowerCase() === lower);
}
