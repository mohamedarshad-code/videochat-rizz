/**
 * ice_relay.js - Universal ICE Candidate Relay
 * Runs in ALL frames on ALL pages.
 * Purpose: Inject the WebRTC interceptor and relay discovered IPs to the parent/top frame.
 * This ensures we catch candidates even in cross-origin iframes that content.js doesn't run in.
 */
(function() {
  // Inject the ICE interceptor script into the page context
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  // Listen for ICE_CANDIDATE messages from inject.js (same-origin postMessage)
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'ICE_CANDIDATE') return;

    const candidateStr = event.data.candidate || '';
    const match = candidateStr.match(/([0-9]{1,3}(?:\.[0-9]{1,3}){3})/);
    if (!match) return;

    const ip = match[1];
    const isLocal = ip.startsWith('192.168.') || ip.startsWith('10.') ||
                    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip) ||
                    ip === '0.0.0.0' || ip.startsWith('127.');
    if (isLocal) return;

    // If we are in a sub-frame, bubble the found IP up to the top-level window.
    // The main-frame content.js will pick this up.
    const target = (window !== window.top) ? window.top : null;
    if (target) {
      try {
        target.postMessage({ type: 'NAVIGATOR_IP_FOUND', ip: ip }, '*');
      } catch(e) {
        // Cross-origin top frame; use chrome message passing as fallback
        chrome.runtime.sendMessage({ type: 'RELAY_IP', ip: ip });
      }
    }
  });
})();
