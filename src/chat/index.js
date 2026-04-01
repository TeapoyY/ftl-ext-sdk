/**
 * chat/index.js — Chat Module Entry Point
 *
 * Three sub-modules:
 *
 * - observer: DOM-based, no auth needed, lightweight, sees ~17 visible messages
 * - messages: Socket.IO-based, normalised data, sees ALL messages with deduplication
 * - rooms: Multi-room support, subscribe to Season Pass / XL rooms
 * - input: Chat input field helpers
 *
 * Use observer for simple extensions that just need to react to visible messages.
 * Use messages for comprehensive logging that can't afford to miss anything.
 * Use rooms to monitor additional chat rooms beyond Global.
 */

export * as observer from './observer.js';
export * as messages from './messages.js';
export * as rooms from './rooms.js';
export * as input from './input.js';