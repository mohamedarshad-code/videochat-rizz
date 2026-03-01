/**
 * content.js - Gender Detection & Auto-Skip Module
 * Monitors video chats and automatically skips based on user preference.
 */

let isDetectionActive = false;
let skipPreference = 'none'; // 'none', 'male', 'female'
let detectionInterval = null;

// Selectors for popular random chat platforms
const SITE_SELECTORS = {
  'ometv.com': { next: '.chat-v__control-btn[data-type="next"]' },
  'minichat.com': { next: '.chat-v__control-btn[data-type="next"]' },
  'chatrandom.com': { next: '#next_btn' },
  'camsurf.com': { next: '.next-button' },
  'emeraldchat.com': { next: 'button.emerald-button' }, // General guess
  'uhmegle.com': { next: 'button:contains("Next")' }
};

const createOverlay = () => {
  let div = document.getElementById('gender-scanner-overlay');
  if (div) return div;
  div = document.createElement('div');
  div.id = 'gender-scanner-overlay';
  div.style.cssText = `
    position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8);
    color: white; padding: 8px 12px; border-radius: 8px; font-family: monospace;
    font-size: 12px; z-index: 2147483647; border: 1px solid #58a6ff;
    display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  `;
  document.body.appendChild(div);
  return div;
};

const overlay = createOverlay();

const getNextButton = () => {
  const host = window.location.hostname;
  for (const [domain, selectors] of Object.entries(SITE_SELECTORS)) {
    if (host.includes(domain)) {
      return document.querySelector(selectors.next);
    }
  }
  // Fallback: search for buttons with "Next" or "Skip"
  return Array.from(document.querySelectorAll('button, div[role="button"]'))
    .find(el => {
      const txt = el.innerText.toLowerCase();
      return txt.includes('next') || txt.includes('skip');
    });
};

const triggerSkip = () => {
  const nextBtn = getNextButton();
  if (nextBtn) {
    console.log('LiveChat Navigator: Triggering auto-skip...');
    overlay.querySelector('span').textContent = 'AUTO-SKIPPING...';
    overlay.style.borderColor = '#f85149';
    nextBtn.click();
  }
};

const captureAndScan = async () => {
  if (!isDetectionActive) return;

  const videos = Array.from(document.querySelectorAll('video'));
  const remoteVideo = videos.filter(v => v.videoWidth > 100 && v.className.toLowerCase().includes('remote'))[0] 
                    || videos.find(v => v.videoWidth > 0 && v.offsetParent !== null);

  if (!remoteVideo) return;

  const canvas = document.createElement('canvas');
  canvas.width = 224; canvas.height = 224; // Standard model input
  const ctx = canvas.getContext('2d');
  ctx.drawImage(remoteVideo, 0, 0, 224, 224);
  
  const imageData = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

  overlay.style.display = 'block';
  overlay.innerHTML = 'SCANNER: <span>Analyzing...</span>';

  chrome.runtime.sendMessage({ type: "DETECT_GENDER", image: imageData }, (response) => {
    if (!isDetectionActive) return;

    if (response && Array.isArray(response)) {
      const top = response.sort((a, b) => b.score - a.score)[0];
      const gender = top.label.toLowerCase(); // 'male' or 'female'
      const confidence = Math.round(top.score * 100);
      
      overlay.innerHTML = `SCANNER: <span style="color:${gender === 'female' ? '#ff7b72' : '#79c0ff'}">${gender.toUpperCase()} (${confidence}%)</span>`;
      
      // Auto-Skip logic: if found gender matches our skip preference and confidence is high (>70%)
      if (skipPreference !== 'none' && gender === skipPreference && top.score > 0.7) {
        setTimeout(triggerSkip, 1000); // Wait 1s before skip for realism
      }
    } else {
      overlay.innerHTML = 'SCANNER: <span style="color:#f85149">ERROR / OFFLINE</span>';
    }
  });
};

// Initial state fetch
chrome.storage.local.get(['detectorEnabled', 'skipPreference'], (data) => {
  isDetectionActive = !!data.detectorEnabled;
  skipPreference = data.skipPreference || 'none';
  if (isDetectionActive) {
    detectionInterval = setInterval(captureAndScan, 4000);
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "TOGGLE_DETECTOR") {
    isDetectionActive = request.active;
    if (isDetectionActive) {
      if (!detectionInterval) detectionInterval = setInterval(captureAndScan, 4000);
      captureAndScan(); 
    } else {
      clearInterval(detectionInterval);
      detectionInterval = null;
      overlay.style.display = 'none';
    }
  }
  if (request.type === "UPDATE_SKIP_PREF") {
    skipPreference = request.pref;
    console.log('LiveChat Navigator: Skip preference updated to', skipPreference);
  }
});
