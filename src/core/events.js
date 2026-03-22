/**
 * core/events.js — Site Custom Events
 * 
 * The site dispatches CustomEvents on `document` for modal management.
 * Event names are camelCase: modalOpen, modalClose, modalOpenConfirm.
 */

/**
 * All known modal names on the current site.
 */
export const MODALS = {
  CONFIRM: 'confirm',
  RENAME_CLIP: 'renameClip',
  SHARE_CLIP: 'shareClip',
  USE_ITEM: 'useItem',
  PRIZE_MACHINE: 'prizeMachine',
  TOKENS: 'tokens',
  SETTINGS: 'settings',
  SEASON_PASS: 'seasonPass',
  GIFT_SEASON_PASS: 'giftSeasonPass',
  MANAGE_POLL: 'managePoll',
  CRAFT_ITEM: 'craftItem',
  TRADE_ITEM: 'tradeItem',
  ITEM_MARKET: 'itemMarket',
  SAVE_CLIP: 'saveClip',
  GLOBAL_CHALLENGE: 'globalChallenge',
  TIP: 'tip',
  TTS: 'tts',
  SFX: 'sfx',
  FISHTOYS: 'fishtoys',
  SECRET_CODE: 'secretCode',
  EDIT_PROFILE: 'editProfile',
  CHANGE_PFP: 'changePFP',
  UPDATE_ANNOUNCEMENT: 'updateAnnouncement',
  MUTE_USER: 'muteUser',
  ADMIN: 'admin',
  HELP: 'help',
  AFTER_DARK: 'afterDark',
  BASEMENT: 'basement',
  CHANGE_CHAT_ROOM: 'changeChatRoom',
};

/**
 * Open a site modal by name.
 * 
 * @param {string} name - Modal name (use MODALS constants)
 * @param {Object} data - Optional data to pass to the modal
 */
export function openModal(name, data = {}) {
  document.dispatchEvent(new CustomEvent('modalOpen', {
    detail: {
      modal: name,
      data: JSON.stringify(data),
      callback: data?.callback || undefined,
    },
  }));
}

/**
 * Close the currently open modal.
 */
export function closeModal() {
  document.dispatchEvent(new CustomEvent('modalClose'));
}

/**
 * Open a confirm dialog.
 * 
 * @param {Object} data - Confirm dialog data
 * @param {Function} data.onConfirm - Called when user confirms
 * @param {Function} data.onClose - Called when dialog is closed
 */
export function openConfirmModal(data = {}) {
  document.dispatchEvent(new CustomEvent('modalOpenConfirm', {
    detail: {
      data: JSON.stringify(data),
      onConfirm: data?.onConfirm || undefined,
      onClose: data?.onClose || undefined,
    },
  }));
}

/**
 * Check if a modal is currently open.
 * The site gives modals id="modal".
 */
export function isModalOpen() {
  return !!document.getElementById('modal');
}

/**
 * Listen for modal events.
 * 
 * @param {Function} callback - Called with (action, detail)
 *   action: 'open' | 'close' | 'confirm'
 *   detail: { modal, data } for open, null for close
 * @returns {Function} Unsubscribe function
 */
export function onModalEvent(callback) {
  const onOpen = (e) => {
    try {
      callback('open', {
        modal: e.detail.modal,
        data: e.detail.data ? JSON.parse(e.detail.data) : null,
      });
    } catch {}
  };
  
  const onClose = () => callback('close', null);
  
  const onConfirm = (e) => {
    try {
      callback('confirm', {
        data: e.detail.data ? JSON.parse(e.detail.data) : null,
      });
    } catch {}
  };
  
  document.addEventListener('modalOpen', onOpen);
  document.addEventListener('modalClose', onClose);
  document.addEventListener('modalOpenConfirm', onConfirm);
  
  return () => {
    document.removeEventListener('modalOpen', onOpen);
    document.removeEventListener('modalClose', onClose);
    document.removeEventListener('modalOpenConfirm', onConfirm);
  };
}

/**
 * Watch for a specific modal to open.
 * Convenience wrapper around onModalEvent.
 * 
 * @param {string} modalName - Modal name to watch for
 * @param {Function} callback - Called with (modalElement, data) when the modal renders
 * @returns {Function} Unsubscribe function
 */
export function onModalOpen(modalName, callback) {
  return onModalEvent((action, detail) => {
    if (action === 'open' && detail?.modal === modalName) {
      // Wait for the modal DOM to render
      setTimeout(() => {
        const modal = document.getElementById('modal');
        if (modal) callback(modal, detail.data);
      }, 150);
    }
  });
}
