/**
 * player/streams.js — Live Stream Detection
 * 
 * Helpers for detecting which stream is playing and observing stream changes.
 */

import { byId, IDS } from '../core/dom.js';

/**
 * Check if a live stream player is currently visible.
 * 
 * @returns {boolean}
 */
export function isPlayerOpen() {
  return !!byId(IDS.LIVE_STREAM_PLAYER);
}

/**
 * Get the live stream player element.
 * 
 * @returns {HTMLElement|null}
 */
export function getPlayerElement() {
  return byId(IDS.LIVE_STREAM_PLAYER);
}
