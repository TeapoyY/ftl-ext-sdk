/**
 * adapters/current.js — Current Site Adapter
 * 
 * Configuration for the current (new) fishtank.live site.
 * Used by SDK modules to locate elements and events.
 */

export const adapter = {
  version: 'current',
  
  // Stable DOM element IDs
  ids: {
    chatInput: 'chat-input',
    modal: 'modal',
    liveStreamPlayer: 'live-stream-player',
  },
  
  // Selectors for elements without stable IDs
  selectors: {
    chatMessageItem: '[data-react-window-index]',
    chatContainer: null, // Found via chatMessageItem parent
  },
  
  // Custom event names used by the site
  events: {
    modalOpen: 'modalOpen',
    modalClose: 'modalClose',
    modalOpenConfirm: 'modalOpenConfirm',
  },
  
  // Socket.IO configuration
  socket: {
    url: 'wss://ws.fishtank.live',
    encoding: 'msgpack',
    events: {
      chatMessage: 'chat:message',
      ttsUpdate: 'tts:update',
      sfxInsert: 'sfx:insert',
    },
  },
  
  // CSS framework
  styling: 'tailwind',
};
