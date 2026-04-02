/**
 * core/socket.js — Socket.IO Connection
 *
 * Creates the SDK's own Socket.IO connection to the fishtank.live
 * WebSocket server. This is a clean, independent connection — it does
 * not modify or interfere with the site's own connection.
 *
 * The server uses MessagePack (binary) encoding over Socket.IO v4.
 *
 * Connection handshake sequence (discovered via frame inspection):
 * 1. Connect WebSocket with msgpack parser
 * 2. Socket.IO handshake (automatic)
 * 3. Auth token sent as part of handshake: { token: <JWT|null> }
 *    - null = anonymous read-only access (sufficient for all rooms)
 *    - JWT = authenticated (required only for sending messages)
 * 4. Server responds with session IDs
 * 5. Server sends chat:room ("Global") — default room
 * 6. Chat messages start flowing
 *
 * Room switching: emit('chat:room', 'Season Pass') to change which
 * room's messages are delivered. No authentication required for reading
 * any room — auth only gates message sending.
 */

const SOCKET_URL = 'wss://ws.fishtank.live';

// Auth token cookie name used by the site (Supabase auth)
const AUTH_COOKIE_NAME = 'sb-wcsaaupukpdmqdjcgaoo-auth-token';

// ── Bundled dependencies (for UMD/userscript usage) ─────────────────
// Static imports of socket.io-client and socket.io-msgpack-parser.
// When the SDK is built as a UMD/IIFE bundle, Rollup resolves these
// and bundles them in. When extensions import the SDK as source,
// their own Rollup build resolves these from the extension's node_modules.
// Either way, the deps are available without dynamic import().
import { io as _bundledIo } from 'socket.io-client';
import * as _bundledMsgpackParser from 'socket.io-msgpack-parser';

/**
 * Known chat room names.
 * The server defaults to Global. Other rooms require an explicit
 * chat:room emission after connecting.
 */
export const ROOMS = {
  GLOBAL: 'Global',
  SEASON_PASS: 'Season Pass',
  SEASON_PASS_XL: 'Season Pass XL',
};

// Connection state
let socket = null;
let connected = false;
let authenticated = false;
let connectionPromise = null;

// Event listeners registered before connection is established
const pendingListeners = [];

// All registered listeners: eventName -> Set<callback>
const listeners = new Map();

/**
 * Known Socket.IO event names used by the site.
 * Discovered by inspecting WebSocket frames.
 */
export const EVENTS = {
  // Chat
  CHAT_MESSAGE: 'chat:message',
  CHAT_ROOM: 'chat:room',
  CHAT_PRESENCE: 'chat:presence',

  // TTS
  TTS_INSERT: 'tts:insert',
  TTS_UPDATE: 'tts:update',

  // SFX
  SFX_INSERT: 'sfx:insert',
  SFX_UPDATE: 'sfx:update',

  // Items
  CRAFTING_RECIPE_LEARNED: 'items:crafting-recipe:learned',

  // Notifications (toast messages / admin announcements)
  NOTIFICATION_GLOBAL: 'notification:global',

  // Presence
  PRESENCE: 'presence',

  // The following are expected based on the site's code but not yet
  // confirmed via frame inspection. They will be verified and added
  // as we discover them.
  // CHAT_REMOVE: 'chat:remove',
  // CHAT_DIRECT: 'chat:direct',
  // ZONES_UPDATE: 'zones:update',
  // ZONES_CLAIM: 'zones:claim',
  // TRADE_OPEN: 'trade:open',
  // TRADE_CLOSE: 'trade:close',
};

/**
 * Connect to the fishtank.live WebSocket server.
 *
 * This creates an independent connection using Socket.IO v4 with
 * MessagePack encoding.
 *
 * Supports two calling conventions:
 *
 *   // Extension usage — caller provides socket.io-client and msgpack parser
 *   await socket.connect(io, msgpackParser, { token: null });
 *
 *   // Userscript usage — uses bundled dependencies (UMD build only)
 *   await socket.connect({ token: null });
 *
 * @param {Function|Object} ioClientOrOptions - Either the socket.io-client `io`
 *   function (extension usage) or an options object (userscript usage)
 * @param {Object} [msgpackParserOrOptions] - The socket.io-msgpack-parser
 *   module (extension usage) or undefined (userscript usage)
 * @param {Object} [maybeOptions] - Connection options (extension usage only)
 * @param {string|null|undefined} options.token - JWT auth token. null = anonymous,
 *   undefined = auto-detect from cookie.
 * @returns {Promise} Resolves when connected and handshake is complete
 */
export async function connect(ioClientOrOptions, msgpackParserOrOptions, maybeOptions) {
  if (socket && connected) return socket;
  if (connectionPromise) return connectionPromise;

  // Detect calling convention:
  // connect(io, msgpackParser, opts) — first arg is a function (extension usage)
  // connect(opts) — first arg is an object or omitted (userscript usage)
  let ioClient, msgpackParser, options;

  if (typeof ioClientOrOptions === 'function') {
    // Extension usage
    ioClient = ioClientOrOptions;
    msgpackParser = msgpackParserOrOptions;
    options = maybeOptions || {};
  } else {
    // Userscript usage — use statically imported bundled dependencies
    options = ioClientOrOptions || {};
    ioClient = _bundledIo;
    msgpackParser = _bundledMsgpackParser;
  }

  const {
    token = undefined,  // undefined = auto-detect, null = force unauthenticated
    autoSubscribe = true,
  } = options;

  // Resolve the auth token
  let authToken = token;
  if (authToken === undefined) {
    authToken = getAuthTokenFromCookie();
  }

  connectionPromise = new Promise((resolve, reject) => {
    try {
      // Store references for createConnection()
      _ioClient = ioClient;
      _msgpackParser = msgpackParser;

      socket = ioClient(SOCKET_URL, {
        parser: msgpackParser,
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 30000,
        autoConnect: true,
        // Socket.IO v4 auth option — sent as part of handshake
        auth: {
          token: authToken || null,
        },
      });

      socket.on('connect', () => {
        connected = true;
        authenticated = !!authToken;

        // Explicitly subscribe to Global chat — don't rely on the
        // server's default, which may be influenced by session state
        socket.emit('chat:room', ROOMS.GLOBAL);

        console.log(
            '[ftl-ext-sdk] Socket connected',
            authenticated ? '(authenticated)' : '(anonymous)'
        );

        // Register any listeners that were added before connection
        for (const { event, callback } of pendingListeners) {
          socket.on(event, callback);
        }
        pendingListeners.length = 0;

        resolve(socket);
      });

      socket.on('disconnect', (reason) => {
        connected = false;
        authenticated = false;
        console.log('[ftl-ext-sdk] Socket disconnected:', reason);
      });

      socket.on('connect_error', (err) => {
        console.warn('[ftl-ext-sdk] Socket connection error:', err.message);
        if (!connected) {
          reject(err);
          connectionPromise = null;
        }
      });
    } catch (err) {
      reject(err);
      connectionPromise = null;
    }
  });

  return connectionPromise;
}

/**
 * Disconnect from the server and clean up.
 */
export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  connected = false;
  authenticated = false;
  connectionPromise = null;
  listeners.clear();
  pendingListeners.length = 0;
}

/**
 * Listen for a Socket.IO event from the server.
 *
 * Can be called before connect() — listeners will be queued and
 * registered once the connection is established.
 *
 * Returns an unsubscribe function.
 *
 * @param {string} eventName - The event name (use EVENTS constants)
 * @param {Function} callback - Called with the event data
 * @returns {Function} Unsubscribe function
 */
export function on(eventName, callback) {
  // Track in our own registry
  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set());
  }
  listeners.get(eventName).add(callback);

  // Register on the socket if connected, otherwise queue
  if (socket && connected) {
    socket.on(eventName, callback);
  } else {
    pendingListeners.push({ event: eventName, callback });
  }

  // Return unsubscribe function
  return () => {
    listeners.get(eventName)?.delete(callback);
    if (socket) {
      socket.off(eventName, callback);
    }
  };
}

/**
 * Check if the socket is currently connected.
 */
export function isConnected() {
  return connected;
}

/**
 * Check if the socket is authenticated (connected with a valid JWT).
 */
export function isAuthenticated() {
  return authenticated;
}

/**
 * Get the raw socket instance (for advanced use cases).
 * Returns null if not connected.
 */
export function getSocket() {
  return socket;
}

/**
 * Force the socket to disconnect and reconnect.
 * Useful as a recovery mechanism if the connection appears stale.
 * All existing event listeners are preserved across the reconnect.
 */
export function forceReconnect() {
  if (!socket) return;
  console.log('[ftl-ext-sdk] Forcing socket reconnect');
  socket.disconnect();
  // Socket.IO will automatically reconnect due to reconnection: true
  socket.connect();
}

/**
 * Attempt to extract the JWT auth token from the site's Supabase auth cookie.
 * Returns the access_token string or null if not found/not logged in.
 */
function getAuthTokenFromCookie() {
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name === AUTH_COOKIE_NAME) {
        const value = decodeURIComponent(valueParts.join('='));
        try {
          const parsed = JSON.parse(value);
          // Supabase stores { access_token, refresh_token, ... }
          return parsed.access_token || parsed.token || null;
        } catch {
          // Might be a raw token string
          return value || null;
        }
      }
    }
  } catch (e) {
    console.warn('[ftl-ext-sdk] Failed to read auth cookie:', e.message);
  }
  return null;
}

// ── Internal: connection factory for multi-room support ─────────────
// Stored references to the io client and parser passed to connect(),
// so that rooms.js can create additional connections with the same config.

let _ioClient = null;
let _msgpackParser = null;

/**
 * Create a new independent socket connection to the server.
 * Uses the same io client and parser that were passed to connect().
 *
 * This is an internal API for the rooms module — not intended for
 * direct consumer use.
 *
 * @param {Object} options
 * @param {string|null|undefined} options.token - Auth token.
 *   undefined = auto-detect from cookie, null = force anonymous.
 * @returns {Object|null} Raw Socket.IO socket instance, or null if
 *   connect() hasn't been called yet
 */
export function createConnection(options = {}) {
  if (!_ioClient || !_msgpackParser) {
    console.warn('[ftl-ext-sdk] Cannot create connection — connect() has not been called yet');
    return null;
  }

  const { token = undefined } = options;

  // Resolve auth token: undefined = auto-detect, null = anonymous
  let authToken = token;
  if (authToken === undefined) {
    authToken = getAuthTokenFromCookie();
  }

  return _ioClient(SOCKET_URL, {
    parser: _msgpackParser,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
    autoConnect: true,
    auth: { token: authToken || null },
  });
}