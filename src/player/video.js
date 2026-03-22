/**
 * player/video.js — Video Element Helpers
 * 
 * Provides access to the video element and common video operations.
 */

import { getVideoElement } from '../core/dom.js';

/**
 * Get the video element.
 * 
 * @returns {HTMLVideoElement|null}
 */
export function getElement() {
  return getVideoElement();
}

/**
 * Toggle fullscreen on the video element.
 * 
 * @returns {boolean} True if action was taken
 */
export function toggleFullscreen() {
  const video = getVideoElement();
  if (!video) return false;
  
  const fsElement = document.fullscreenElement
    || document.webkitFullscreenElement
    || document.mozFullScreenElement;
  
  if (fsElement === video) {
    // Exit fullscreen
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
  } else {
    // Enter fullscreen
    if (video.requestFullscreen) video.requestFullscreen();
    else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
    else if (video.mozRequestFullScreen) video.mozRequestFullScreen();
  }
  
  return true;
}

/**
 * Check if the video is currently in fullscreen.
 * 
 * @returns {boolean}
 */
export function isFullscreen() {
  const video = getVideoElement();
  if (!video) return false;
  
  const fsElement = document.fullscreenElement
    || document.webkitFullscreenElement
    || document.mozFullScreenElement;
  
  return fsElement === video;
}
