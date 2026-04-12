/**
 * chat/store.js — Direct Zustand Chat Store Access
 *
 * Provides access to the site's Zustand chat store via React fiber
 * tree traversal. Lets you read, modify, or remove chat messages
 * directly in React state — before they render.
 *
 * This is the recommended way to filter or modify chat messages.
 * For receiving messages with normalised data and TTS/SFX dedup,
 * use chat.messages instead.
 *
 * REALM REQUIREMENT
 * -----------------
 * This module MUST run in the page's JavaScript realm. It walks
 * React's internal fiber tree, which is only accessible from the
 * same realm React is running in.
 *
 * - Tampermonkey/Greasemonkey scripts: works directly.
 * - Browser extension content scripts: DOES NOT WORK. Content scripts
 *   run in an isolated realm and cannot see page-realm objects.
 *   You need to inject a separate <script> tag pointing at a file
 *   in your extension that imports and uses this module. See the
 *   wiki for the page-injection pattern.
 *
 * STORE SHAPE
 * -----------
 * The store exposes (among other things):
 *   - chatMessages: Array of message objects
 *   - setChatMessages: (messages) => void
 *   - chatRoom: 'Global' | 'Season Pass' | 'Season Pass XL'
 *   - blockedUsers: Array
 *   - wordFilters: Array
 *
 * The SDK validates that chatMessages and setChatMessages exist
 * before returning a store reference.
 */

// Cache the store reference once found — fiber traversal is expensive
let _store = null;

/**
 * Find the chat store in the React fiber tree.
 *
 * Strategy:
 *   1. Try the known fast path: starting from a [data-react-window-index]
 *      element, walk up the fiber tree looking for a hook whose
 *      memoizedState contains a Zustand store with `chatMessages`.
 *   2. If that fails, fall back to a broader tree search from the
 *      React root for any store with the expected shape.
 *
 * Returns the store object (with getState/setState/subscribe) or null
 * if no chat store can be found in the current page.
 *
 * @returns {Object|null}
 */
function findStore() {
    if (_store) return _store;

    // Fast path: known fiber traversal from a virtualised chat row
    const seed = document.querySelector('[data-react-window-index]');
    if (seed) {
        const fiberKey = Object.keys(seed).find(k => k.startsWith('__reactFiber$'));
        if (fiberKey) {
            let fiber = seed[fiberKey];
            for (let i = 0; i < 30 && fiber; i++) {
                let hook = fiber.memoizedState;
                while (hook) {
                    const ms = hook.memoizedState;
                    if (Array.isArray(ms) && ms.length === 2 && ms[1] && typeof ms[1] === 'object') {
                        const inner = ms[1];
                        if (inner[0] && typeof inner[0].getState === 'function') {
                            try {
                                const state = inner[0].getState();
                                if (state?.chatMessages && typeof state.setChatMessages === 'function') {
                                    _store = inner[0];
                                    return _store;
                                }
                            } catch {}
                        }
                    }
                    hook = hook.next;
                }
                fiber = fiber.return;
            }
        }
    }

    // Fallback: broader tree walk from document.body's fiber root.
    // Slower but more resilient to component refactors that might
    // change the depth/structure between the row and the store provider.
    const bodyKey = Object.keys(document.body).find(k => k.startsWith('__reactFiber$'));
    if (bodyKey) {
        const root = document.body[bodyKey];
        const found = walkForStore(root, 0, 200);
        if (found) {
            _store = found;
            return _store;
        }
    }

    return null;
}

/**
 * Recursively walk a fiber subtree looking for a Zustand store
 * whose state has chatMessages and setChatMessages.
 */
function walkForStore(fiber, depth, maxDepth) {
    if (!fiber || depth > maxDepth) return null;

    let hook = fiber.memoizedState;
    while (hook) {
        const ms = hook.memoizedState;
        if (Array.isArray(ms) && ms.length === 2 && ms[1] && typeof ms[1] === 'object') {
            const inner = ms[1];
            if (inner[0] && typeof inner[0].getState === 'function') {
                try {
                    const state = inner[0].getState();
                    if (state?.chatMessages && typeof state.setChatMessages === 'function') {
                        return inner[0];
                    }
                } catch {}
            }
        }
        hook = hook.next;
    }

    return walkForStore(fiber.child, depth + 1, maxDepth)
        || walkForStore(fiber.sibling, depth + 1, maxDepth);
}

/**
 * Wait for the chat store to become available, then resolve.
 *
 * The store may not exist immediately on page load — React needs
 * to mount the chat component first. Polls every 500ms.
 *
 * @param {number} timeout - Max wait time in ms (default 30000)
 * @returns {Promise<Object>} The store reference
 */
function waitForStore(timeout = 30000) {
    return new Promise((resolve, reject) => {
        const immediate = findStore();
        if (immediate) return resolve(immediate);

        const start = Date.now();
        const check = setInterval(() => {
            const store = findStore();
            if (store) {
                clearInterval(check);
                resolve(store);
            } else if (Date.now() - start > timeout) {
                clearInterval(check);
                reject(new Error('[ftl-ext-sdk] Chat store not found within timeout'));
            }
        }, 500);
    });
}

/**
 * Check whether the chat store has been located.
 * Does not trigger a search.
 */
function isReady() {
    return _store !== null;
}

/**
 * Get the current chat messages array.
 * Returns an empty array if the store hasn't been found yet.
 *
 * @returns {Array}
 */
function getMessages() {
    const store = findStore();
    if (!store) return [];
    return store.getState().chatMessages || [];
}

/**
 * Replace the chat messages array.
 *
 * Use this to filter, reorder, or modify messages. The change is
 * applied to React state and the chat re-renders immediately.
 *
 * @param {Array} messages - New messages array
 */
function setMessages(messages) {
    const store = findStore();
    if (!store) {
        throw new Error('[ftl-ext-sdk] Chat store not available — call waitForStore() first');
    }
    store.setState({ chatMessages: messages });
}

/**
 * Subscribe to store changes. Fires whenever any store key changes,
 * not just chatMessages.
 *
 * The callback receives the current state. Returns an unsubscribe
 * function.
 *
 * @param {Function} callback - Called with (state)
 * @returns {Function} Unsubscribe function
 */
function subscribe(callback) {
    const store = findStore();
    if (!store) {
        throw new Error('[ftl-ext-sdk] Chat store not available — call waitForStore() first');
    }
    return store.subscribe(() => callback(store.getState()));
}

/**
 * Subscribe specifically to new messages.
 *
 * Wraps subscribe() to detect when the chatMessages array grows,
 * and fires the callback once per new message with the message
 * object. Already-existing messages are not delivered.
 *
 * @param {Function} callback - Called with (message)
 * @returns {Function} Unsubscribe function
 */
function onMessage(callback) {
    const store = findStore();
    if (!store) {
        throw new Error('[ftl-ext-sdk] Chat store not available — call waitForStore() first');
    }

    let lastLength = store.getState().chatMessages?.length || 0;

    return store.subscribe(() => {
        const messages = store.getState().chatMessages || [];
        if (messages.length > lastLength) {
            const newMessages = messages.slice(lastLength);
            for (const msg of newMessages) {
                try { callback(msg); }
                catch (e) { console.error('[ftl-ext-sdk] chat.store onMessage callback error:', e); }
            }
        }
        lastLength = messages.length;
    });
}

/**
 * Remove a single message by ID.
 *
 * @param {string} id - Message ID to remove
 * @returns {boolean} True if a message was removed
 */
function removeMessage(id) {
    const store = findStore();
    if (!store) return false;

    const messages = store.getState().chatMessages || [];
    const filtered = messages.filter(m => m.id !== id);
    if (filtered.length === messages.length) return false;

    store.setState({ chatMessages: filtered });
    return true;
}

/**
 * Remove messages matching a predicate.
 *
 * @param {Function} predicate - (message) => boolean. Return true to remove.
 * @returns {number} Count of messages removed
 */
function removeWhere(predicate) {
    const store = findStore();
    if (!store) return 0;

    const messages = store.getState().chatMessages || [];
    const filtered = messages.filter(m => !predicate(m));
    const removed = messages.length - filtered.length;
    if (removed === 0) return 0;

    store.setState({ chatMessages: filtered });
    return removed;
}

/**
 * Get the raw store reference for advanced use cases.
 *
 * The store has Zustand's standard interface: getState, setState,
 * subscribe, and any keys/actions defined by the site's slice.
 *
 * @returns {Object|null}
 */
function getStore() {
    return findStore();
}

/**
 * Clear the cached store reference. Useful if the page navigates
 * or the chat component is unmounted and remounted.
 */
function reset() {
    _store = null;
}

export {
    findStore,
    waitForStore,
    isReady,
    getMessages,
    setMessages,
    subscribe,
    onMessage,
    removeMessage,
    removeWhere,
    getStore,
    reset,
};
