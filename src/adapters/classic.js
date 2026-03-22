/**
 * adapters/classic.js — Classic Site Adapter
 * 
 * Configuration for classic.fishtank.live.
 * This is a stub — will be populated when classic support is implemented.
 * 
 * The classic site uses CSS modules (module_localName__hash pattern)
 * and a different event system (lowercase event names).
 */

export const adapter = {
  version: 'classic',
  
  // Stable DOM element IDs
  ids: {
    chatInput: 'chat-input',
    modal: 'modal',
    mainPanel: 'main-panel',
    chatMessages: 'chat-messages',
    hlsStreamPlayer: 'hls-stream-player',
  },
  
  // CSS module prefix patterns (resolved at runtime)
  prefixes: {
    chatContainer: 'chat_chat',
    chatMessages: 'chat-messages_chat-messages',
    topBar: 'top-bar_top-bar',
    mainPanel: 'main-panel_main-panel',
    streamGrid: 'live-streams_live-streams-grid',
    streamPlayer: 'live-stream-player_live-stream-player',
    streamName: 'live-stream-player_name',
    modalBody: 'modal_body',
    modalTitle: 'modal_title',
  },
  
  // Custom event names used by the classic site
  events: {
    modalOpen: 'modalopen',
    modalClose: 'modalclose',
    toastOpen: 'toastopen',
    toastClose: 'toastclose',
  },
  
  // CSS framework
  styling: 'css-modules',
};
