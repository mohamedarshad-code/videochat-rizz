/**
 * content.js - LiveChat Navigator
 * Performance-optimized video chat integration using arrive.js
 */

(function() {
  let siteConfig = null;
  let currentIp = null;
  let infoOverlay = null;
  
  // AI Detection State
  let detectorEnabled = false;
  let skipPreference = 'none'; // 'none', 'male', 'female'
  let detectionInterval = null;
  let isProcessing = false;
  let modelsLoaded = false;

  // Frame filtering: Only run UI/Logic in the main frame or frames with video
  if (window.top !== window && !document.querySelector('video') && !document.querySelector('canvas')) {
    // Check again after a short delay for dynamic video elements
    setTimeout(() => {
      if (document.querySelector('video') || document.querySelector('canvas')) {
        init();
      }
    }, 5000);
    return;
  }

  // 1. Initialization
  function init() {
    siteConfig = window.getSiteConfig ? window.getSiteConfig() : null;
    if (!siteConfig) return;

    console.log(`[Navigator] Initialized for ${siteConfig.name}`);
    
    // Inject ICE Interceptor
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);

    // Initial state from storage
    chrome.storage.local.get(['detectorEnabled', 'skipPreference'], (res) => {
      detectorEnabled = res.detectorEnabled || false;
      skipPreference = res.skipPreference || 'none';
      if (detectorEnabled) startDetectionLoop();
    });

    setupHotkeys();
    setupArriveListeners();
    createOverlay();
    setupMessageListeners();
  }

  // 2. UI Overlay for IP/Rizz Info
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

    // Style for the header
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

  // 3. Automation & Hotkeys
  function setupHotkeys() {
    document.addEventListener('keydown', (e) => {
      if (!siteConfig) return;

      // ESC to Skip
      if (e.key === 'Escape') {
        skip();
      }

      // F for Fullscreen Video
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

  // 4. Efficient Element Detection via Arrive.js
  function setupArriveListeners() {
    if (!siteConfig.selectors.video) return;

    document.arrive(siteConfig.selectors.video, { existing: true }, function(el) {
      console.log("[Navigator] Remote video detected.");
      el.addEventListener('loadedmetadata', () => {
        // Triggered when video starts playing
      });
    });

    if (siteConfig.selectors.container) {
      document.arrive(siteConfig.selectors.container, { existing: true }, function(el) {
         console.log("[Navigator] Chat container ready.");
      });
    }
  }

  // 5. Message Handling (from Background & Popup)
  function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === "TOGGLE_DETECTOR") {
        detectorEnabled = msg.active;
        if (detectorEnabled) startDetectionLoop();
        else stopDetectionLoop();
      }
      if (msg.type === "UPDATE_SKIP_PREF") {
        skipPreference = msg.pref;
      }
    });

    window.addEventListener('message', (event) => {
      // 1. IP found directly (legacy or other scripts)
      if (event.data && event.data.type === 'IP_FOUND') {
        const ip = event.data.ip;
        if (ip === currentIp) return;
        currentIp = ip;
        updateIpDisplay(ip);
        geolocate(ip);
      }
      
      // 2. Parse IP from intercepted WebRTC ICE candidates
      if (event.data && event.data.type === 'ICE_CANDIDATE') {
        const candidateStr = event.data.candidate || "";
        // Simple regex to match an IPv4 address
        const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
        const match = candidateStr.match(ipRegex);
        
        if (match) {
          const ip = match[1];
          // Filter out local, private, or loopback IPs
          const isLocal = ip.startsWith('192.168.') || 
                          ip.startsWith('10.') || 
                          ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) || 
                          ip === '0.0.0.0' || 
                          ip.startsWith('127.');
          
          if (!isLocal && ip !== currentIp) {
            currentIp = ip;
            updateIpDisplay(ip);
            geolocate(ip);
          }
        }
      }
    });
  }

  // 6. AI Gender Detection Loop
  async function loadModels() {
    if (modelsLoaded) return true;
    updateAiStatusUI("Loading AI...");
    try {
      // Use 'models' without a leading slash for getURL
      const MODEL_URL = chrome.runtime.getURL('models');
      console.log(`[Navigator] Loading models from: ${MODEL_URL}`);
      
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
      
      modelsLoaded = true;
      console.log("[Navigator] AI Models loaded successfully.");
      return true;
    } catch (err) {
      console.error("[Navigator] Model loading failed:", err);
      updateAiStatusUI("AI Load Error", true);
      return false;
    }
  }

  async function startDetectionLoop() {
    if (detectionInterval) return;
    
    const success = await loadModels();
    if (!success) return;

    updateAiStatusUI("ON (Scanning...)");
    
    detectionInterval = setInterval(async () => {
      if (isProcessing || !detectorEnabled || skipPreference === 'none') return;
      
      // Try configured selector first
      let video = document.querySelector(siteConfig.selectors.video);
      
      // Fallback: If no video is found using the selector, dynamically find the remote video.
      // Remote videos are typically unmuted, or they are the second video element in the DOM.
      if (!video) {
        const allVideos = Array.from(document.querySelectorAll('video'));
        // Find the first video that is NOT muted, otherwise default to the second video if it exists.
        video = allVideos.find(v => !v.muted) || allVideos[1] || allVideos[0];
      }

      if (!video || video.paused || video.readyState < 2 || video.videoWidth === 0) return;

      isProcessing = true;
      try {
        const result = await captureAndDetect(video);
        if (result && result.length > 0) {
          const topResult = result[0]; // {label: "male", score: 0.9}
          const gender = topResult.label.toLowerCase();
          
          updateAiStatusUI(`Detected: ${gender.toUpperCase()}`, true);

          if (gender === skipPreference) {
            console.log(`[Navigator] Skipping ${gender} as per preference.`);
            updateAiStatusUI(`Skipping ${gender}...`, true);
            setTimeout(() => skip(), 500);
          }
        }
      } catch (err) {
        console.error("[Navigator] Detection error:", err);
      } finally {
        isProcessing = false;
      }
    }, 3000); // Check every 3 seconds for performance
  }

  function stopDetectionLoop() {
    if (detectionInterval) {
      clearInterval(detectionInterval);
      detectionInterval = null;
    }
    updateAiStatusUI("OFF");
  }

  function updateAiStatusUI(text, isResult = false) {
    const el = document.getElementById('ai-state-text');
    if (!el) return;
    el.textContent = text;
    el.className = isResult ? 'ai-detected' : 'ai-scanning';
    if (text === "OFF") el.className = "";
  }

  async function captureAndDetect(video) {
    if (!modelsLoaded) return null;

    // Use TinyFaceDetector for performance
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
    const detection = await faceapi.detectSingleFace(video, options).withAgeAndGender();
    
    if (detection) {
      return [{
        label: detection.gender,
        score: detection.genderProbability
      }];
    }
    return null;
  }

  // 7. IP & Geolocation
  function updateIpDisplay(ip) {
    const el = document.getElementById('nav-ip-info');
    if (el) el.innerHTML = `<span class="nav-label">IP Address:</span> <span class="nav-value">${ip}</span>`;
  }

  function geolocate(ip) {
    chrome.runtime.sendMessage({ type: "GEOLOCATE_IP", ip: ip }, (data) => {
      if (data && data.status !== "fail") {
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
    chrome.runtime.sendMessage({ type: "GET_COUNTRY_RIZZ", lang: countryCode }, (lines) => {
      const rizzEl = document.getElementById('nav-rizz-suggestion');
      if (rizzEl && lines && lines.length > 0) {
        const line = lines[Math.floor(Math.random() * lines.length)];
        rizzEl.innerHTML = `<div class="nav-header" style="margin-top:10px; color:#fb7185">Rizz Tip</div><div style="font-style:italic">${line}</div>`;
      }
    });
  }

  // Self-start
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();

