/**
 * core/react.js — React Fiber Tree Access
 * 
 * Provides access to React's internal fiber tree, which lets us
 * find components and their state without depending on DOM structure.
 */

// Cache the fiber key for the session (changes per build, stable per page load)
let _fiberKey = null;

/**
 * Get the React fiber key suffix for this page load.
 * Returns the hash portion, e.g. "z62ix5tx60a"
 */
export function getReactFiberKey() {
  if (_fiberKey) return _fiberKey;
  
  const key = Object.keys(document.body).find(k => k.startsWith('__reactFiber$'));
  if (key) {
    _fiberKey = key.replace('__reactFiber$', '');
  }
  return _fiberKey;
}

/**
 * Get the React fiber node for a DOM element.
 * Returns the fiber object or null.
 */
export function getFiber(element) {
  const key = getReactFiberKey();
  if (!key) return null;
  return element[`__reactFiber$${key}`] || null;
}

/**
 * Get React props for a DOM element.
 * Returns the props object or null.
 */
export function getProps(element) {
  const key = getReactFiberKey();
  if (!key) return null;
  return element[`__reactProps$${key}`] || null;
}

/**
 * Walk up the fiber tree from a DOM element.
 * Calls `test(fiber)` on each fiber node going upward.
 * Returns the first fiber where `test` returns true, or null.
 */
export function walkFiberUp(element, test, maxDepth = 50) {
  let fiber = getFiber(element);
  let depth = 0;
  
  while (fiber && depth < maxDepth) {
    if (test(fiber)) return fiber;
    fiber = fiber.return;
    depth++;
  }
  
  return null;
}

/**
 * Walk down the fiber tree (child → sibling).
 * Calls `test(fiber)` on each node.
 * Returns the first fiber where `test` returns true, or null.
 */
export function walkFiberDown(fiber, test, maxDepth = 50) {
  if (!fiber || maxDepth <= 0) return null;
  if (test(fiber)) return fiber;
  
  let result = walkFiberDown(fiber.child, test, maxDepth - 1);
  if (result) return result;
  
  return walkFiberDown(fiber.sibling, test, maxDepth - 1);
}

/**
 * Find a hook value in a fiber's memoizedState chain.
 * `test` receives the memoizedState value and returns true if it matches.
 * Returns the matching state value or null.
 */
export function findHookState(fiber, test) {
  let state = fiber?.memoizedState;
  
  while (state) {
    try {
      if (state.memoizedState && test(state.memoizedState)) {
        return state.memoizedState;
      }
    } catch {}
    state = state.next;
  }
  
  return null;
}

/**
 * Search the fiber tree starting from document.body for a hook state
 * matching the test function.
 * Returns the matching state value or null.
 */
export function findInTree(test, maxDepth = 100) {
  const rootFiber = getFiber(document.body);
  if (!rootFiber) return null;
  
  let result = null;
  
  function search(fiber, depth) {
    if (!fiber || depth > maxDepth || result) return;
    
    const found = findHookState(fiber, test);
    if (found) {
      result = found;
      return;
    }
    
    search(fiber.child, depth + 1);
    search(fiber.sibling, depth + 1);
  }
  
  search(rootFiber, 0);
  return result;
}

/**
 * Check if React fiber access is available on this page.
 */
export function isAvailable() {
  return getReactFiberKey() !== null;
}
