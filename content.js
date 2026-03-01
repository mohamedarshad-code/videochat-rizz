/**
 * content.js - LiveChat Navigator
 * Architecture: The main frame owns the UI overlay.
 * Iframes only do silent WebRTC/AI detection and report up to the parent.
 */

(function() {
  const IS_MAIN_FRAME = window === window.top;

  let siteConfig = null;
  let currentIp = null;
  let infoOverlay = null;
  
  // AI Detection State
  let detectorEnabled = false;
  let skipPreference = 'none'; // 'none', 'male', 'female'
  let detectionInterval = null;
  let isProcessing = false;
  let modelsLoaded = false;

  // ─── ENTRY POINT ─────────────────────────────────────────────────────────────

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  function init() {
    siteConfig = window.getSiteConfig ? window.getSiteConfig() : null;
    if (!siteConfig) return; // Not a supported site

    if (IS_MAIN_FRAME) {
      initMainFrame();
    } else {
      initSubFrame();
    }
  }

  // ─── MAIN FRAME LOGIC ─────────────────────────────────────────────────────────
  // The main frame owns: the UI overlay, hotkeys, and reacts to results from iframes.

  function initMainFrame() {
    console.log(`[Navigator] Main frame init for ${siteConfig.name}`);
    // ICE interception is handled globally by ice_relay.js on all frames
    chrome.storage.local.get(['detectorEnabled', 'skipPreference'], (res) => {
      detectorEnabled = res.detectorEnabled || false;
      skipPreference = res.skipPreference || 'none';
      if (detectorEnabled) startDetectionLoop();
    });

    setupHotkeys();
    createOverlay();
    setupMainFrameMessageListeners();
  }

  // ─── SUB-FRAME (IFRAME) LOGIC ─────────────────────────────────────────────────
  // Iframes are silent: they inject ICE interceptor and run AI. They post results up.

  function initSubFrame() {
    // Only bother if there's video here, or check after a delay
    const run = () => {
      if (!document.querySelector('video') && !document.querySelector('canvas')) return;
      console.log(`[Navigator] Sub-frame init for ${siteConfig.name} (has video)`);
      // Note: ICE interception is handled globally by ice_relay.js
      // Run AI detection in the iframe and post gender results to parent
      chrome.storage.local.get(['detectorEnabled', 'skipPreference'], (res) => {
        detectorEnabled = res.detectorEnabled || false;
        skipPreference = res.skipPreference || 'none';
        if (detectorEnabled) startSubFrameDetectionLoop();
      });

      // Also listen for toggle messages relayed from popup
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'TOGGLE_DETECTOR') {
          detectorEnabled = msg.active;
          if (detectorEnabled) startSubFrameDetectionLoop();
          else { if (detectionInterval) { clearInterval(detectionInterval); detectionInterval = null; } }
        }
        if (msg.type === 'UPDATE_SKIP_PREF') {
          skipPreference = msg.pref;
        }
      });
    };

    if (document.querySelector('video') || document.querySelector('canvas')) {
      run();
    } else {
      setTimeout(run, 3000); // Give the iframe time to load video elements
    }
  }

  // ─── SHARED UTILITIES ─────────────────────────────────────────────────────────
  // (ICE injection now handled globally by ice_relay.js)

  // ─── UI OVERLAY (MAIN FRAME ONLY) ─────────────────────────────────────────────

  function createOverlay() {
    if (document.getElementById('navigator-overlay')) return;

    infoOverlay = document.createElement('div');
    infoOverlay.id = 'navigator-overlay';
    infoOverlay.innerHTML = `
      <div class="nav-header"> Navigator IP Tracker </div>
      <div id="nav-ip-info">Waiting for connection...</div>
      <div id="nav-geo-info"></div>
      <div id="nav-ai-status" style="margin-top: 8px; font-size: 11px; color: #94a3b8;">AI Scanner: <span id="ai-state-text">OFF</span></div>
      <div id="nav-rizz-suggestion"></div>
    `;

    Object.assign(infoOverlay.style, {
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '240px',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      color: '#fff',
      padding: '12px',
      borderRadius: '12px',
      fontSize: '13px',
      zIndex: '999999',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(8px)',
      transition: 'all 0.3s ease'
    });

    document.body.appendChild(infoOverlay);

    const style = document.createElement('style');
    style.id = 'navigator-styles';
    style.textContent = `
      #navigator-overlay .nav-header { font-weight: bold; margin-bottom: 8px; color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 4px; }
      #navigator-overlay div { margin-top: 4px; }
      .nav-label { color: #94a3b8; font-size: 11px; }
      .nav-value { font-weight: 500; color: #f8fafc; }
      .ai-scanning { color: #fbbf24 !important; }
      .ai-detected { color: #10b981 !important; font-weight: bold; }
    `;
    document.head.appendChild(style);
  }

  // ─── HOTKEYS (MAIN FRAME ONLY) ─────────────────────────────────────────────────

  function setupHotkeys() {
    document.addEventListener('keydown', (e) => {
      if (!siteConfig) return;
      if (e.key === 'Escape') skip();
      if (e.key.toLowerCase() === 'f') {
        const video = document.querySelector(siteConfig.selectors.video);
        if (video) {
          if (video.requestFullscreen) video.requestFullscreen();
          else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
        }
      }
    });
  }

  function skip() {
    if (!siteConfig) return;
    const btn = document.querySelector(siteConfig.selectors.stop);
    if (btn) btn.click();
  }

  // ─── MESSAGE HANDLING (MAIN FRAME ONLY) ────────────────────────────────────────

  function setupMainFrameMessageListeners() {
    // From popup/background
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'TOGGLE_DETECTOR') {
        detectorEnabled = msg.active;
        if (detectorEnabled) startDetectionLoop();
        else stopDetectionLoop();
      }
      if (msg.type === 'UPDATE_SKIP_PREF') {
        skipPreference = msg.pref;
      }
    });

    // From the page context (inject.js) and iframes
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data) return;

      // Direct IP from some scripts
      if (data.type === 'IP_FOUND') handleCandidateIp(data.ip);

      // IP relayed from an iframe by ice_relay.js (cross-origin safe)
      if (data.type === 'NAVIGATOR_IP_FOUND') handleCandidateIp(data.ip);

      // WebRTC ICE candidates from the main frame itself
      if (data.type === 'ICE_CANDIDATE') {
        const candidateStr = data.candidate || '';
        const match = candidateStr.match(/([0-9]{1,3}(?:\.[0-9]{1,3}){3})/);
        if (match) handleCandidateIp(match[1]);
      }

      // Gender detection result relayed from an iframe
      if (data.type === 'NAVIGATOR_GENDER_DETECTED') {
        const { gender } = data;
        updateAiStatusUI(`Detected: ${gender.toUpperCase()}`, true);
        if (gender === skipPreference) {
          updateAiStatusUI(`Skipping ${gender}...`, true);
          setTimeout(() => skip(), 500);
        }
      }
    });
  }

  function handleCandidateIp(ip) {
    if (!ip) return;
    const isLocal = ip.startsWith('192.168.') || ip.startsWith('10.') ||
                    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip) ||
                    ip === '0.0.0.0' || ip.startsWith('127.');
    if (!isLocal && ip !== currentIp) {
      currentIp = ip;
      updateIpDisplay(ip);
      geolocate(ip);
    }
  }

  // ─── AI DETECTION (MAIN FRAME) ──────────────────────────────────────────────────

  async function loadModels() {
    if (modelsLoaded) return true;
    updateAiStatusUI('Loading AI...');
    try {
      const MODEL_URL = chrome.runtime.getURL('models');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
      ]);
      modelsLoaded = true;
      console.log('[Navigator] AI Models loaded.');
      return true;
    } catch (err) {
      console.error('[Navigator] Model load failed:', err);
      updateAiStatusUI('AI Load Error', true);
      return false;
    }
  }

  async function startDetectionLoop() {
    if (detectionInterval) return;
    const ok = await loadModels();
    if (!ok) return;
    updateAiStatusUI('ON (Scanning...)');
    detectionInterval = setInterval(() => runDetection(), 3000);
  }

  async function startSubFrameDetectionLoop() {
    if (detectionInterval) return;
    const ok = await loadModels();
    if (!ok) return;
    detectionInterval = setInterval(() => runSubFrameDetection(), 3000);
  }

  function stopDetectionLoop() {
    if (detectionInterval) { clearInterval(detectionInterval); detectionInterval = null; }
    updateAiStatusUI('OFF');
  }

  async function runDetection() {
    if (isProcessing || !detectorEnabled || skipPreference === 'none') return;
    const video = findRemoteVideo();
    if (!video) return;
    isProcessing = true;
    try {
      const result = await captureAndDetect(video);
      if (result) {
        const gender = result.label.toLowerCase();
        updateAiStatusUI(`Detected: ${gender.toUpperCase()}`, true);
        if (gender === skipPreference) {
          updateAiStatusUI(`Skipping ${gender}...`, true);
          setTimeout(() => skip(), 500);
        }
      }
    } catch (e) { console.error('[Navigator] Detection error:', e); }
    finally { isProcessing = false; }
  }

  async function runSubFrameDetection() {
    if (isProcessing || !detectorEnabled || skipPreference === 'none') return;
    const video = findRemoteVideo();
    if (!video) return;
    isProcessing = true;
    try {
      const result = await captureAndDetect(video);
      if (result) {
        // Post result up to the parent (main frame UI)
        window.parent.postMessage({ type: 'NAVIGATOR_GENDER_DETECTED', gender: result.label.toLowerCase() }, '*');
      }
    } catch (e) { console.error('[Navigator] Sub-frame detection error:', e); }
    finally { isProcessing = false; }
  }

  function findRemoteVideo() {
    // Prefer the configured selector
    let video = siteConfig && siteConfig.selectors.video ? document.querySelector(siteConfig.selectors.video) : null;
    // Fallback: find a playing, non-muted video (the stranger's feed)
    if (!video || video.paused || video.readyState < 2 || video.videoWidth === 0) {
      const all = Array.from(document.querySelectorAll('video'));
      video = all.find(v => !v.muted && v.readyState >= 2 && v.videoWidth > 0)
           || all.find(v => v.readyState >= 2 && v.videoWidth > 0);
    }
    return (video && !video.paused && video.readyState >= 2 && video.videoWidth > 0) ? video : null;
  }

  async function captureAndDetect(video) {
    if (!modelsLoaded) return null;
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
    const detection = await faceapi.detectSingleFace(video, options).withAgeAndGender();
    if (detection) return { label: detection.gender, score: detection.genderProbability };
    return null;
  }

  // ─── IP & GEOLOCATION ─────────────────────────────────────────────────────────

  function updateIpDisplay(ip) {
    const el = document.getElementById('nav-ip-info');
    if (el) el.innerHTML = `<span class="nav-label">IP Address:</span> <span class="nav-value">${ip}</span>`;
  }

  function geolocate(ip) {
    chrome.runtime.sendMessage({ type: 'GEOLOCATE_IP', ip }, (data) => {
      if (data && data.status !== 'fail') {
        const geoEl = document.getElementById('nav-geo-info');
        if (geoEl) {
          geoEl.innerHTML = `
            <div><span class="nav-label">Location:</span> <span class="nav-value">${data.city}, ${data.country}</span></div>
            <div><span class="nav-label">ISP:</span> <span class="nav-value">${data.isp}</span></div>
          `;
        }
        fetchRizz(data.countryCode.toLowerCase());
      }
    });
  }

  function fetchRizz(countryCode) {
    chrome.runtime.sendMessage({ type: 'GET_COUNTRY_RIZZ', lang: countryCode }, (lines) => {
      const rizzEl = document.getElementById('nav-rizz-suggestion');
      if (rizzEl && lines && lines.length > 0) {
        const line = lines[Math.floor(Math.random() * lines.length)];
        rizzEl.innerHTML = `<div class="nav-header" style="margin-top:10px;color:#fb7185">Rizz Tip</div><div style="font-style:italic">${line}</div>`;
      }
    });
  }

  function updateAiStatusUI(text, isResult = false) {
    const el = document.getElementById('ai-state-text');
    if (!el) return;
    el.textContent = text;
    el.className = isResult ? 'ai-detected' : 'ai-scanning';
    if (text === 'OFF') el.className = '';
  }

})();
