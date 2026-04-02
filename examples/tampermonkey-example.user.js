// ==UserScript==
// @name         FTL SDK Tampermonkey Example
// @namespace    https://fishtank.live
// @version      1.0.0
// @description  Example userscript using FTL SDK for Fishtank Live
// @author       FTL SDK Contributors
// @match        https://fishtank.live/*
// @grant        none
// @require      https://github.com/BarryThePirate/ftl-ext-sdk/releases/download/v0.1.0/ftl-ext-sdk.bundle.js
// @downloadURL  https://raw.githubusercontent.com/BarryThePirate/ftl-ext-sdk/master/examples/tampermonkey-example.user.js
// @updateURL    https://raw.githubusercontent.com/BarryThePirate/ftl-ext-sdk/master/examples/tampermonkey-example.user.js
// ==/UserScript==

/**
 * FTL SDK Tampermonkey Example
 * 
 * This userscript demonstrates how to use the FTL SDK
 * in a Tampermonkey or Greasemonkey userscript context.
 * 
 * Features demonstrated:
 * - Site detection
 * - Chat message listening
 * - Toast notifications
 * - Socket connection (optional)
 */

(function() {
    'use strict';
    
    console.log('[FTL SDK Example] Userscript starting...');
    
    // Wait for page to fully load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        console.log('[FTL SDK Example] Initializing...');
        
        // Access SDK via window.FTL (UMD bundle)
        const FTL = window.FTL;
        
        if (!FTL) {
            console.error('[FTL SDK Example] FTL SDK not loaded! Check @require URL.');
            showToast('FTL SDK failed to load. Check console for errors.', 'error');
            return;
        }
        
        console.log('[FTL SDK Example] FTL SDK loaded:', Object.keys(FTL));
        
        // Initialize site detection
        initSiteDetection(FTL);
        
        // Initialize chat listeners
        initChat(FTL);
        
        // Initialize UI
        initUI(FTL);
        
        console.log('[FTL SDK Example] Initialization complete!');
        showToast('FTL SDK Example: Userscript loaded successfully!', 'success');
    }
    
    function initSiteDetection(FTL) {
        const { site } = FTL;
        
        console.log('[FTL SDK Example] Site info:', site);
        
        if (site.isFishtankLive) {
            console.log('[FTL SDK Example] Detected Fishtank Live!');
            document.body.classList.add('ftl-sdk-loaded');
        }
    }
    
    function initChat(FTL) {
        const { chat } = FTL;
        
        if (!chat) {
            console.log('[FTL SDK Example] Chat module not available');
            return;
        }
        
        // Listen for chat messages
        chat.onMessage((message) => {
            console.log('[FTL SDK Example] Chat message:', message);
            
            // Example: Log message author and content
            const author = message.author || 'Anonymous';
            const content = message.content || '';
            console.log(`[CHAT] ${author}: ${content}`);
        });
        
        // Listen for system messages
        chat.onSystem((message) => {
            console.log('[FTL SDK Example] System message:', message);
        });
        
        console.log('[FTL SDK Example] Chat listeners initialized');
    }
    
    function initUI(FTL) {
        const { ui } = FTL;
        
        if (!ui) {
            console.log('[FTL SDK Example] UI module not available');
            return;
        }
        
        // Add a simple info panel
        const panel = ui.createPanel({
            id: 'ftl-sdk-example-panel',
            title: 'FTL SDK Example',
            position: 'top-right',
            closable: true
        });
        
        panel.innerHTML = `
            <div style="padding: 10px; font-family: sans-serif;">
                <h3 style="margin: 0 0 10px 0;">FTL SDK Example</h3>
                <p style="margin: 0;">Userscript is running!</p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
                    Check console for details.
                </p>
            </div>
        `;
        
        ui.addPanel(panel);
        console.log('[FTL SDK Example] UI panel created');
    }
    
    /**
     * Show a toast notification (simple implementation)
     */
    function showToast(message, type = 'info') {
        type = type || 'info';
        
        const colors = {
            success: '#4CAF50',
            error: '#F44336',
            info: '#2196F3',
            warning: '#FF9800'
        };
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${colors[type] || colors.info};
            color: white;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            z-index: 999999;
            font-family: sans-serif;
            font-size: 14px;
            animation: ftl-toast-in 0.3s ease;
        `;
        toast.textContent = message;
        
        // Add animation keyframes if not already present
        if (!document.getElementById('ftl-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'ftl-toast-styles';
            style.textContent = `
                @keyframes ftl-toast-in {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'ftl-toast-in 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
    
    /**
     * Optional: Connect to socket for real-time features
     * Uncomment if you need real-time socket connection
     */
    /*
    async function connectSocket(FTL) {
        const { socket } = FTL;
        
        try {
            // Connect without authentication (anonymous)
            await socket.connect({ token: null });
            console.log('[FTL SDK Example] Socket connected!');
            
            socket.on('disconnect', () => {
                console.log('[FTL SDK Example] Socket disconnected');
            });
            
        } catch (error) {
            console.error('[FTL SDK Example] Socket connection failed:', error);
        }
    }
    */
})();
