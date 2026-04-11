/**
 * core/transport.js — Cross-Origin Transport Layer
 *
 * The SDK needs to fetch cross-origin resources (e.g. audio files
 * from cdn.fishtank.live) in contexts where the page's CORS policy
 * would block a normal fetch(). Different host environments solve
 * this differently:
 *
 *   - Browser extensions use a background service worker that runs
 *     with host_permissions and can fetch any allowed origin.
 *   - Userscripts (Tampermonkey/Greasemonkey) use GM_xmlhttpRequest,
 *     which bypasses CORS entirely.
 *   - Pages that happen to use the SDK can use normal fetch() if
 *     the target sends appropriate CORS headers.
 *
 * Rather than baking any of these into the SDK, this module lets
 * the consumer register a fetch function of their choosing. Any
 * SDK feature that needs cross-origin access (such as ui.download)
 * calls `transport.fetch(url)` and doesn't care how it's implemented.
 *
 * Usage — Extension (background service worker):
 *
 *   import { transport } from 'ftl-ext-sdk';
 *
 *   transport.register(async (url) => {
 *     const response = await chrome.runtime.sendMessage({
 *       type: 'ftl-sdk-fetch',
 *       url,
 *     });
 *     if (!response?.ok) throw new Error(response?.error || 'Fetch failed');
 *     return new Uint8Array(response.data);
 *   });
 *
 * Usage — Userscript (GM_xmlhttpRequest):
 *
 *   transport.register((url) => new Promise((resolve, reject) => {
 *     GM_xmlhttpRequest({
 *       method: 'GET',
 *       url,
 *       responseType: 'arraybuffer',
 *       onload: (res) => resolve(new Uint8Array(res.response)),
 *       onerror: reject,
 *     });
 *   }));
 *
 * Usage — Plain page (target supports CORS):
 *
 *   transport.register(async (url) => {
 *     const res = await fetch(url);
 *     if (!res.ok) throw new Error(`HTTP ${res.status}`);
 *     return new Uint8Array(await res.arrayBuffer());
 *   });
 */

let _fetchFn = null;

/**
 * Register a cross-origin fetch function.
 *
 * The function receives a URL string and must return a Promise
 * resolving to a Uint8Array of the raw bytes. It should throw or
 * reject on failure.
 *
 * Calling register() a second time replaces the previous function.
 *
 * @param {Function} fetchFn - async (url) => Uint8Array
 */
function register(fetchFn) {
    if (typeof fetchFn !== 'function') {
        throw new Error('[ftl-ext-sdk] transport.register requires a function');
    }
    _fetchFn = fetchFn;
}

/**
 * Fetch bytes from a URL using the registered transport.
 *
 * Throws if no transport has been registered, or if the transport
 * throws/rejects.
 *
 * @param {string} url - Absolute URL to fetch
 * @returns {Promise<Uint8Array>} Raw bytes
 */
async function fetchBytes(url) {
    if (!_fetchFn) {
        throw new Error('[ftl-ext-sdk] No transport registered. Call transport.register(fn) first.');
    }
    const result = await _fetchFn(url);
    if (!(result instanceof Uint8Array)) {
        throw new Error('[ftl-ext-sdk] Transport function must return a Uint8Array');
    }
    return result;
}

/**
 * Check whether a transport has been registered.
 *
 * @returns {boolean}
 */
function isRegistered() {
    return _fetchFn !== null;
}

/**
 * Clear the registered transport. Mainly useful for tests.
 */
function reset() {
    _fetchFn = null;
}

export { register, fetchBytes, isRegistered, reset };
