/**
 * core/site-detect.js — Environment Detection
 *
 * Detects which version of the site we're on and provides
 * readiness checking for SDK initialisation.
 */

/**
 * Detect which version of the site we're on.
 *
 * @returns {'current'|'classic'|'unknown'}
 */
export function getSiteVersion() {
  const host = window.location.hostname;
  if (host === 'classic.fishtank.live') return 'classic';
  if (host === 'fishtank.live' || host === 'www.fishtank.live') return 'current';
  return 'unknown';
}

/**
 * Check if the current page is the classic site.
 */
export function isClassic() {
  return getSiteVersion() === 'classic';
}

/**
 * Check if the current page is the new/current site.
 */
export function isCurrent() {
  return getSiteVersion() === 'current';
}

/**
 * Check if the viewport suggests a mobile device.
 */
export function isMobile() {
  return screen.width < 800;
}

/**
 * Check if React has mounted on the page.
 *
 * NOTE: This only works from a page-injected script context.
 * It will always return false from a content script due to
 * Chrome's isolated world — __reactFiber$ keys are not visible
 * across the context boundary.
 */
export function isReactMounted() {
  return Object.keys(document.body).some(k => k.startsWith('__reactFiber$'));
}

/**
 * Check if the site appears ready for SDK use.
 * Looks for key elements that indicate the app has loaded.
 *
 * Note: does NOT check for React fibre keys (e.g. __reactFiber$) —
 * these are set in the page's JS context and are not visible to
 * content scripts running in an isolated world.
 */
export function isSiteReady() {
  if (isCurrent()) {
    return (
        document.getElementById('chat-input') !== null ||
        document.querySelector('[data-react-window-index]') !== null
    );
  }

  if (isClassic()) {
    return !!document.querySelector('[class*="chat_chat__"]');
  }

  return false;
}

/**
 * Wait for the site to be ready, then call the callback.
 * Uses a MutationObserver rather than polling — fires as soon as
 * the required elements appear in the DOM.
 *
 * @param {Function} callback - Called when the site is ready
 * @param {Object} options
 * @param {number} options.timeout - Max wait in ms (default 30000)
 * @returns {Function} Cancel function
 */
export function whenReady(callback, options = {}) {
  const { timeout = 30000 } = options;

  if (isSiteReady()) {
    setTimeout(callback, 0);
    return () => {};
  }

  let settled = false;
  let timer = null;

  const settle = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    observer.disconnect();
    callback();
  };

  const observer = new MutationObserver(() => {
    if (isSiteReady()) settle();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    observer.disconnect();
    console.warn('[ftl-ext-sdk] Site ready timeout after', timeout, 'ms.');
  }, timeout);

  return () => {
    settled = true;
    clearTimeout(timer);
    observer.disconnect();
  };
}

// ---------------------------------------------------------------------------
// Current user detection
// ---------------------------------------------------------------------------

// Internal cache for current user
let _currentUser = null;
const _userCallbacks = new Set();

/**
 * Read the logged-in user's display name from the top bar.
 * Returns null if not logged in or element not yet in DOM.
 */
function _readUsernameFromDom() {
  const el = document.querySelector(
      '.fixed.top-\\[calc\\(env\\(safe-area-inset-top\\)\\/2\\)\\] .whitespace-nowrap.font-bold'
  );
  return el?.textContent?.trim() || null;
}

// Watch the DOM for the username element to appear or change.
// Starts immediately at module load so it can't miss early renders.
const _userObserver = new MutationObserver(() => {
  const name = _readUsernameFromDom();
  if (name && name !== _currentUser) {
    _currentUser = name;
    for (const cb of _userCallbacks) {
      try { cb(_currentUser); } catch (e) { console.error('[ftl-ext-sdk] onUserDetected callback error:', e); }
    }
  }
});
_userObserver.observe(document.body, { childList: true, subtree: true });

/**
 * Get the currently logged-in user's display name.
 * Returns null if not logged in or username not yet detected.
 *
 * @returns {string|null}
 */
export function getCurrentUsername() {
  if (!_currentUser) _currentUser = _readUsernameFromDom();
  return _currentUser;
}

/**
 * Register a callback that fires when the logged-in username is first detected
 * or changes (e.g. after login). Fires immediately if already known.
 *
 * @param {Function} callback - Called with the username string
 * @returns {Function} Unsubscribe function
 */
export function onUserDetected(callback) {
  _userCallbacks.add(callback);
  if (_currentUser) {
    try { callback(_currentUser); } catch (e) { console.error('[ftl-ext-sdk] onUserDetected callback error:', e); }
  }
  return () => _userCallbacks.delete(callback);
}