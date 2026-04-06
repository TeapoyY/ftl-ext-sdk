// ==UserScript==
// @name         FTL SDK Tampermonkey Example
// @namespace    https://fishtank.live
// @version      1.1.0
// @description  Example userscript using FTL SDK for Fishtank Live — bundles socket.io deps so no separate @require entries are needed.
// @author       FTL SDK Contributors
// @match        https://fishtank.live/*
// @grant        none
// @require      https://github.com/TeapoyY/ftl-ext-sdk/releases/download/v0.1.0/ftl-ext-sdk.bundle.js
// @downloadURL  https://raw.githubusercontent.com/TeapoyY/ftl-ext-sdk/master/examples/tampermonkey-example.user.js
// @updateURL    https://raw.githubusercontent.com/TeapoyY/ftl-ext-sdk/master/examples/tampermonkey-example.user.js
// ==/UserScript==

/**
 * FTL SDK Tampermonkey / Greasemonkey Example
 *
 * This userscript demonstrates how to use the FTL SDK in a Tampermonkey
 * or Greasemonkey userscript context.  All socket.io dependencies are
 * bundled into the SDK UMD bundle — no separate @require entries are
 * needed.
 *
 * Features demonstrated:
 *  - Site detection
 *  - Real-time chat message listening via Socket.IO
 *  - TTS / SFX event listening
 *  - Toast notifications
 *  - Firefox ArrayBuffer compatibility (patched at bundle time)
 */

(function () {
    'use strict';

    console.log('[FTL SDK Example] Userscript starting...');

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        console.log('[FTL SDK Example] Initializing...');

        const FTL = window.FTL;

        if (!FTL) {
            console.error('[FTL SDK Example] FTL SDK not loaded! Check @require URL.');
            return;
        }

        console.log('[FTL SDK Example] FTL SDK loaded:', Object.keys(FTL));

        initSiteDetection(FTL);
        initChat(FTL);
        initToasts(FTL);
        connectSocket(FTL);

        console.log('[FTL SDK Example] Initialization complete!');
        showToast('FTL SDK Example: loaded!', 'success');
    }

    function initSiteDetection(FTL) {
        const { site } = FTL;

        console.log('[FTL SDK Example] Site version:', site.getSiteVersion());
        console.log('[FTL SDK Example] Fishtank Live detected:', site.isFishtankLive);

        if (site.isFishtankLive) {
            document.body.classList.add('ftl-sdk-loaded');
        }
    }

    /**
     * Set up normalised chat listeners via chat.messages.
     * Uses the Socket.IO connection so every message is captured
     * (unlike the DOM observer which can miss messages during re-renders).
     */
    function initChat(FTL) {
        const { chat } = FTL;

        if (!chat || !chat.messages) {
            console.log('[FTL SDK Example] chat.messages not available');
            return;
        }

        // Normalised chat messages
        chat.messages.onMessage(function (msg) {
            console.log(
                '[CHAT] ' + (msg.role ? '[' + msg.role + '] ' : '') +
                msg.username + ': ' + msg.message
            );
        });

        // TTS events (deduplicated — fires on both tts:insert and tts:update)
        chat.messages.onTTS(function (tts) {
            console.log('[TTS] ' + tts.username + ': "' + tts.message + '" (' + tts.voice + ')');
            // CDN URL: https://cdn.fishtank.live/tts/{audioId}.mp3
            showToast('TTS: ' + tts.message.substring(0, 60), 'info');
        });

        // SFX events (deduplicated)
        chat.messages.onSFX(function (sfx) {
            console.log('[SFX] ' + sfx.username + ': ' + sfx.message);
        });

        console.log('[FTL SDK Example] Chat listeners registered');
    }

    /**
     * Show toast notifications using ui.toasts (the SDK's own toasts module).
     */
    function initToasts(FTL) {
        const { ui } = FTL;

        if (!ui || !ui.toasts) {
            console.log('[FTL SDK Example] ui.toasts not available');
            return;
        }

        // Intercept the site's own toast observer and forward to SDK toasts
        ui.toasts.notify('FTL SDK userscript active!', { type: 'info', duration: 4000 });
        console.log('[FTL SDK Example] Toast system ready');
    }

    /**
     * Connect to the fishtank.live WebSocket server using the bundled
     * socket.io-client and msgpack parser.  No external @require needed —
     * both libraries are statically included in the UMD bundle.
     *
     * Works on both Chrome (Tampermonkey) and Firefox (Tampermonkey/Greasemonkey).
     * The Firefox ArrayBuffer cross-realm issue is patched at bundle build time.
     *
     * @param {Object} FTL - The window.FTL namespace
     */
    async function connectSocket(FTL) {
        const { socket } = FTL;

        if (!socket) {
            console.warn('[FTL SDK Example] socket module not available');
            return;
        }

        try {
            // token: null — anonymous (read-only) connection.
            // The bundled socket.io-client and socket.io-msgpack-parser are
            // used automatically; no need to pass them explicitly.
            await socket.connect({ token: null });
            console.log('[FTL SDK Example] Socket connected (anonymous)');

            socket.on('disconnect', function (reason) {
                console.warn('[FTL SDK Example] Socket disconnected:', reason);
            });

        } catch (err) {
            console.error('[FTL SDK Example] Socket connection failed:', err.message);
            console.info(
                '[FTL SDK Example] On Firefox this may be the ArrayBuffer cross-realm bug. ' +
                'Verify the bundle includes the ArrayBuffer fix (search for ' +
                '"Object.prototype.toString.call" in the bundle).'
            );
        }
    }

    // ── Simple toast helper (fallback when ui.toasts is unavailable) ────────

    function showToast(message, type) {
        type = type || 'info';

        var colors = {
            success: '#4CAF50',
            error: '#F44336',
            info: '#2196F3',
            warning: '#FF9800',
        };

        var toast = document.createElement('div');
        toast.style.cssText = [
            'position:fixed',
            'bottom:20px',
            'right:20px',
            'padding:12px 24px',
            'background:' + (colors[type] || colors.info),
            'color:white',
            'border-radius:4px',
            'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
            'z-index:999999',
            'font-family:sans-serif',
            'font-size:14px',
            'animation:ftl-toast-in 0.3s ease',
        ].join(';');

        toast.textContent = message;

        if (!document.getElementById('ftl-toast-styles')) {
            var style = document.createElement('style');
            style.id = 'ftl-toast-styles';
            style.textContent = '@keyframes ftl-toast-in{' +
                'from{transform:translateX(100%);opacity:0}' +
                'to{transform:translateX(0);opacity:1}}';
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        setTimeout(function () {
            toast.style.animation = 'ftl-toast-in 0.3s ease reverse';
            setTimeout(function () { toast.remove(); }, 300);
        }, 5000);
    }
})();
