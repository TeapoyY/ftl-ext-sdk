# ftl-ext-sdk

General-purpose SDK for building browser extensions and Tampermonkey/Greasemonkey userscripts for [fishtank.live](https://fishtank.live).

## Installation

### Browser Extension (npm)

```bash
npm install ftl-ext-sdk
```

```js
import { site, chat, ui, socket } from 'ftl-ext-sdk';
```

### Tampermonkey / Greasemonkey

```js
// @require https://cdn.example.com/ftl-ext-sdk.bundle.js

const { site, chat, ui, socket } = window.FTL;
```

## Quick Start

```js
import { site, chat, ui, socket, events } from 'ftl-ext-sdk';
import { io } from 'socket.io-client';
import { parser } from 'socket.io-msgpack-parser';

// Wait for the site to load
site.whenReady(async () => {

  // Connect to the chat WebSocket
  await socket.connect(io, parser);

  // Start listening for chat events
  chat.messages.startListening();

  // Log staff messages
  chat.messages.onMessage((msg) => {
    if (chat.messages.isStaffMessage(msg)) {
      console.log(`[Staff] ${msg.user.displayName}: ${msg.message}`);
    }
  });

  // Log TTS
  chat.messages.onTTS((tts) => {
    console.log(`[TTS] ${tts.displayName} in ${tts.room}: ${tts.message} (${tts.voice})`);
  });

  // Log SFX
  chat.messages.onSFX((sfx) => {
    console.log(`[SFX] ${sfx.displayName} in ${sfx.room}: ${sfx.sound}`);
  });

  // Register keyboard shortcuts
  ui.keyboard.register('fullscreen', { key: 'f' }, () => {
    // Your fullscreen logic
  });

  ui.keyboard.register('settings', { key: 'e' }, () => {
    // Open your settings modal
  });

  // Watch for craft modal
  events.onModalOpen('craftItem', (modal, data) => {
    // Inject recipe data into the modal
  });

  // Show a toast
  ui.toasts.notify('Extension loaded!', {
    description: 'ftl-ext-sdk is active',
    type: 'success',
  });
});
```

## Modules

### `site` — Environment Detection

```js
import { site } from 'ftl-ext-sdk';

site.getSiteVersion();   // 'current' | 'classic' | 'unknown'
site.isCurrent();        // true on fishtank.live
site.isClassic();        // true on classic.fishtank.live
site.isMobile();         // true on small screens
site.isReactMounted();   // true when React has loaded
site.isSiteReady();      // true when key elements are present

// Wait for site to be ready before initialising
site.whenReady(() => {
  console.log('Site is ready!');
});
```

### `socket` — Socket.IO Connection

```js
import { socket } from 'ftl-ext-sdk';
import { io } from 'socket.io-client';
import { parser } from 'socket.io-msgpack-parser';

// Connect (pass the socket.io-client and msgpack parser)
await socket.connect(io, parser);

// Listen for any event
const unsub = socket.on('chat:message', (data) => {
  console.log(data);
});

// Later: unsubscribe
unsub();

// Check connection status
socket.isConnected(); // true/false

// Disconnect
socket.disconnect();
```

#### Known Events

| Constant | Event Name | Description |
|----------|-----------|-------------|
| `EVENTS.CHAT_MESSAGE` | `chat:message` | Chat messages (including happenings) |
| `EVENTS.TTS_UPDATE` | `tts:update` | TTS submissions and status changes |
| `EVENTS.SFX_INSERT` | `sfx:insert` | SFX submissions |

### `chat.observer` — DOM-Based Chat Observation (Lightweight)

The simplest way to watch chat. No auth, no extra connections. Observes the chat DOM for new messages and parses them.

```js
import { chat } from 'ftl-ext-sdk';

// Watch for new messages in the DOM
chat.observer.onMessage((msg) => {
  console.log(`${msg.username}: ${msg.message}`);
  console.log('Timestamp:', msg.timestamp);
  console.log('Avatar:', msg.avatarUrl);
  console.log('Level:', msg.level);
  console.log('Mentions:', msg.mentions);
  
  // The raw DOM element is available for visual modifications
  if (msg.role === 'staff') {
    msg.element.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
  }
});

// Start observing (call after site is ready)
chat.observer.startObserving();

// Convenience helpers
chat.observer.isStaffMessage(msg);              // boolean
chat.observer.isFishMessage(msg);               // boolean
chat.observer.mentionsUser(msg, 'username');     // boolean

// Parse a specific element manually
const parsed = chat.observer.parseMessageElement(someElement);

// Stop observing
chat.observer.stopObserving();
```

#### Observer vs Socket.IO — Which to use?

| | `chat.observer` (DOM) | `chat.messages` (Socket.IO) |
|---|---|---|
| Auth required | No | Optional |
| Extra connections | None | 1 WebSocket |
| Data richness | Text, username, avatar, level | Full user object, medals, metadata flags |
| Reliability | May miss fast-scrolling messages | Captures every message |
| Visual modifications | Yes (has DOM element ref) | No (data only) |
| TTS/SFX | Only if rendered in chat | Dedicated events with full data |
| **Best for** | Simple extensions, UI mods | Comprehensive logging, analytics |

### `chat.messages` — Socket.IO Chat Interception (Full Data)

```js
import { chat } from 'ftl-ext-sdk';

// Register callbacks (can be done before socket connects)
chat.messages.onMessage((msg) => {
  console.log(`${msg.user.displayName}: ${msg.message}`);
  console.log('Watching:', msg.metadata.watching);
  console.log('Is fish:', msg.metadata.isFish);
});

chat.messages.onTTS((tts) => {
  console.log(`TTS by ${tts.displayName}: ${tts.message}`);
});

chat.messages.onSFX((sfx) => {
  console.log(`SFX by ${sfx.displayName}: ${sfx.sound}`);
});

// After socket connects, start listening
chat.messages.startListening();

// Convenience helpers
chat.messages.isFishMessage(msg);     // boolean
chat.messages.isStaffMessage(msg);    // boolean
chat.messages.isModMessage(msg);      // boolean
chat.messages.isHappening(msg);       // boolean
chat.messages.mentionsUser(msg, 'username'); // boolean
```

### `chat.input` — Chat Input

```js
import { chat } from 'ftl-ext-sdk';

chat.input.focus();                      // Focus the input
chat.input.insertText('Hello world');    // Insert text
chat.input.mentionUser('username');      // Insert @mention
chat.input.getText();                    // Get current input text
chat.input.clear();                      // Clear the input
```

### `events` — Modal Events

```js
import { events } from 'ftl-ext-sdk';

// Open/close modals
events.openModal('craftItem', { someData: true });
events.closeModal();
events.isModalOpen(); // boolean

// Watch for specific modals
const unsub = events.onModalOpen('craftItem', (modalElement, data) => {
  // Inject your content into the modal
});

// Watch all modal events
events.onModalEvent((action, detail) => {
  // action: 'open' | 'close' | 'confirm'
});
```

### `ui.modals` — Modal Helpers

```js
import { ui } from 'ftl-ext-sdk';

// Open a modal and wait for it to render
const modal = await ui.modals.openAndWait('tip', { data: [] });

// Inject content into the current modal
ui.modals.injectIntoModal(myElement, { position: 'append' });
ui.modals.injectIntoModal('<p>Hello</p>', { position: 'prepend', id: 'my-content' });

// Wait for modal to close
await ui.modals.waitForClose();
```

### `ui.keyboard` — Keyboard Shortcuts

```js
import { ui } from 'ftl-ext-sdk';

// Register a shortcut (auto-skips when user is typing)
const unsub = ui.keyboard.register('my-shortcut', { key: 'e' }, () => {
  console.log('E pressed!');
});

// With modifiers
ui.keyboard.register('save', { key: 's', ctrl: true }, () => {
  console.log('Ctrl+S pressed!');
});

// Unregister
unsub();
// or
ui.keyboard.unregister('my-shortcut');
```

### `ui.toasts` — Toast Notifications

```js
import { ui } from 'ftl-ext-sdk';

// Show a toast
const id = ui.toasts.notify('Hello!', {
  description: 'This is a toast',
  type: 'success',    // 'default' | 'success' | 'error' | 'warning'
  duration: 5000,     // ms, 0 for persistent
});

// Dismiss
ui.toasts.dismiss(id);
ui.toasts.dismissAll();
```

### `dom` — DOM Helpers

```js
import { dom } from 'ftl-ext-sdk';

// Stable element access
dom.byId('chat-input');
dom.getChatContainer();
dom.getChatScrollContainer();
dom.getVideoElement();
dom.getVisibleChatMessages();

// Wait for elements
const el = await dom.waitForElement('#modal');

// Inject content (tagged for easy cleanup)
dom.inject(myElement, targetElement, 'append', 'my-injection');

// Remove injected content
dom.removeInjected('my-injection');  // specific
dom.removeInjected();                // all SDK injections
```

### `storage` — Local Storage

```js
import { storage } from 'ftl-ext-sdk';

// All keys are automatically prefixed with 'ftl-sdk:'
storage.set('myKey', { some: 'data' });
storage.get('myKey');          // { some: 'data' }
storage.get('missing', []);    // [] (default value)
storage.remove('myKey');
storage.keys();                // ['myKey', ...]
storage.clear();               // Clears only SDK keys
```

### `react` — React Fiber Access (Advanced)

```js
import { react } from 'ftl-ext-sdk';

// Check if React is available
react.isAvailable(); // boolean

// Get fiber for a DOM element
const fiber = react.getFiber(someElement);

// Get React props for a DOM element
const props = react.getProps(someElement);

// Walk the fiber tree
react.walkFiberUp(element, (fiber) => {
  // Return true to stop and return this fiber
  return fiber.memoizedProps?.someSpecificProp;
});
```

## Chat Message Object Reference

Messages received via `chat.messages.onMessage()`:

```js
{
  id: "e9d008d1-...",           // Message UUID
  user: {
    id: "6fac9c70-...",         // User UUID ("happening" for system events)
    displayName: "Ruby-",
    photoURL: "https://cdn.fishtank.live/avatars/rchl.png",
    customUsernameColor: "#966b9e",
    clan: null,                  // Clan tag or null
    medals: ["tinnitus", "swag", "season-pass", ...],
    xp: 451,
    endorsement: null,
    endorsementColor: null,
  },
  message: "UHM LOL",           // Message text
  type: "message",
  admin: false,
  timestamp: 1742519388236,      // Unix timestamp (ms)
  mentions: [],                  // Array of mentioned usernames
  clips: [],
  metadata: {
    isGrandMarshall: false,
    isEpic: false,
    isFish: false,               // Contestant
    isFree: false,               // No season pass
    isAdmin: false,
    isMod: false,
    watching: "",                // Room name being watched
  },
  tempId: "019d112d-...",
  nsp: "/",                      // Namespace ("/" = global chat)
}
```

## Building

```bash
npm install
npm run build    # Builds dist/ftl-ext-sdk.bundle.js
npm run watch    # Rebuild on changes
```

## Architecture

The SDK is organised into layers:

1. **Core** (`src/core/`) — Low-level access: React fiber, Socket.IO, DOM, events, storage
2. **Feature Modules** (`src/chat/`, `src/player/`, `src/ui/`) — High-level APIs built on core
3. **Adapters** (`src/adapters/`) — Site-version-specific configuration

### Design Principles

- **Data layer first** — Access Zustand stores and Socket.IO for data; DOM only for UI injection
- **No class name dependencies** — Never rely on Tailwind utility classes for element identification
- **Non-destructive** — Never modify the site's own connections, state, or event handlers
- **Extension-store friendly** — No monkey-patching, no remote code loading, no eval
- **Fail silently** — Missing elements return null, never throw in production paths
- **Namespaced DOM** — All injected elements use `data-ftl-sdk` attributes

## License

MIT
