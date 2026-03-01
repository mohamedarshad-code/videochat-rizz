// background.js - LiveChat Navigator background worker
// Handles fetching data, gender detection, and geolocation.

const HF_API_URL = "https://datasets-server.huggingface.co/rows?dataset=anon8231489123%2FOmegle_logs_dataset&config=default&split=train&offset=0&limit=200";
const RIZZ_API_BASE = "https://rizzapi.vercel.app/api/v1/lines";

// Fallback data if API is down or country not supported
const RIZZ_FALLBACK = {
  "in": ["Are you from Mumbai? Because you're a Bollywood dream.", "Are you a spice? Because you add flavor to my life.", "Is your name Taj? Because you're a wonder of the world."],
  "br": ["Você é carioca? Porque você é uma obra de arte.", "Seu sorriso é mais brilhante que o sol da Bahia.", "Você é do Brasil? Porque você é nota dez!"],
  "default": ["Are you a camera? Every time I look at you, I smile.", "Do you have a map? I just got lost in your eyes."]
};

/**
 * Sanitizes logs for security and performance
 */
function sanitizeDataset(data) {
  const rows = data.rows || [];
  const blacklist = ["kik", "snapchat", "instagram", "sex", "porn", "nude", "m4f", "f4m"];
  const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|@\w+|\d{5,})/g;

  return rows
    .map(r => r.row)
    .filter(item => {
      const text = item.message || item.content || item.text || "";
      if (!text || text.length < 5 || text.length > 5000) return false;
      const t = text.toLowerCase();
      return !blacklist.some(word => t.includes(word));
    })
    .map(item => {
      let text = item.message || item.content || item.text || "";
      text = text.replace(linkRegex, "[LINK]");
      return { text: text.trim() };
    })
    .slice(0, 300);
}

async function fetchDataset() {
  try {
    const response = await fetch(HF_API_URL);
    if (!response.ok) throw new Error("HF Fetch error");
    const data = await response.json();
    return sanitizeDataset(data);
  } catch (error) {
    console.error("Dataset fetch failed:", error);
    return [];
  }
}

// Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_DATASET") {
    fetchDataset().then(data => {
      chrome.storage.session.set({ chatLogs: data, lastFetch: Date.now() }, () => {
        sendResponse(data);
      });
    });
    return true;
  }

  if (request.type === "GET_COUNTRY_RIZZ") {
    const url = `${RIZZ_API_BASE}?lang=${request.lang}`;
    fetch(url).then(res => res.json()).then(data => {
      if (data.lines && data.lines.length > 0) {
         sendResponse(data.lines);
      } else {
         sendResponse(RIZZ_FALLBACK[request.lang] || RIZZ_FALLBACK["default"]);
      }
    }).catch(() => {
      sendResponse(RIZZ_FALLBACK[request.lang] || RIZZ_FALLBACK["default"]);
    });
    return true;
  }


  if (request.type === "GEOLOCATE_IP") {
    const url = `http://ip-api.com/json/${request.ip}?fields=status,message,country,countryCode,regionName,city,isp,query`;
    fetch(url)
      .then(res => res.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ status: "fail", message: err.message }));
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  console.log('LiveChat Navigator background service ready.');
});
