/**
 * chat/index.js — Chat Module Entry Point
 * 
 * Two approaches for chat message interception:
 * 
 * - observer: DOM-based, no auth needed, lightweight, sees ~17 visible messages
 * - messages: Socket.IO-based, optional auth, sees ALL messages with full structured data
 * 
 * Use observer for simple extensions that just need to react to visible messages.
 * Use messages for comprehensive logging that can't afford to miss anything.
 * Both can be used simultaneously.
 */

export * as observer from './observer.js';
export * as messages from './messages.js';
export * as input from './input.js';
