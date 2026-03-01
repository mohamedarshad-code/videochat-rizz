// background.js - LiveChat Navigator background worker
// Handles fetching data from external datasets (Hugging Face) to generate trending topics.

const HF_API_URL = "https://datasets-server.huggingface.co/rows?dataset=anon8231489123%2FOmegle_logs_dataset&config=default&split=train&offset=0&limit=200";
const HF_GENDER_API = "https://api-inference.huggingface.co/models/rizal72/gender-classification-v2";
const RIZZ_API_BASE = "https://rizzapi.vercel.app/api/v1/lines";
// Fallback data if API is down or country not supported
const RIZZ_FALLBACK = {
  "in": ["Are you from Mumbai? Because you're a Bollywood dream.", "Are you a spice? Because you add flavor to my life.", "Is your name Taj? Because you're a wonder of the world."],
  "br": ["Você é carioca? Porque você é uma obra de arte.", "Seu sorriso é mais brilhante que o sol da Bahia.", "Você é do Brasil? Porque você é nota dez!"],
  "mx": ["¿Eres de México? Porque eres picante como un chile.", "Tu sonrisa es más dulce que el chocolate de Oaxaca."],
  "ph": ["Are you a jeepney? Because I'd ride with you anywhere.", "Is your name Manila? Because you're the heart of my world."],
  "tr": ["İstanbul gibi güzelsin.", "Sihirli bir halın mı var? Beni benden aldın."],
  "ar": ["ابتسامتك أجمل من القمر.", "جمالك لا يوصف."],
  "default": ["Are you a camera? Every time I look at you, I smile.", "Do you have a map? I just got lost in your eyes."]
};

/**
 * Sanitizes logs for security and performance:
 * - Removes links, emails, and phone-like numbers
 * - Filters by blacklist
 * - Limits length
 */
function sanitizeDataset(data) {
  // Hugging Face rows API returns {rows: [{row: {message: ...}}]} for this specific dataset
  const rows = data.rows || [];
  
  const blacklist = ["kik", "snapchat", "instagram", "skype", "telegram", "whatsapp", "sex", "porn", "nude", "horny", "m4f", "f4m", "snap"];
  const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|@\w+|\d{5,})/g;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  return rows
    .map(r => r.row)
    .filter(item => {
      // The Omegle dataset uses 'message', but we check alternatives for robustness
      const text = item.message || item.content || item.text || "";
      // Conversations can be long, so we allow up to 5000 chars for analysis
      if (!text || text.length < 5 || text.length > 5000) return false;
      
      const t = text.toLowerCase();
      // Filter out thirsty/spammy logs
      return !blacklist.some(word => t.includes(word));
    })
    .map(item => {
      let text = item.message || item.content || item.text || "";
      // Clean text by removing links, emails, and long numbers
      text = text.replace(linkRegex, "[LINK]")
                 .replace(emailRegex, "[EMAIL]");
      return { text: text.trim() };
    })
    .slice(0, 300);
}

/**
 * Fetches the Hugging Face dataset
 */
async function fetchDataset() {
  try {
    const response = await fetch(HF_API_URL);
    if (!response.ok) throw new Error("HF Fetch error: " + response.statusText);
    const data = await response.json();
    return sanitizeDataset(data);
  } catch (error) {
    console.error("Dataset fetch failed:", error);
    return [];
  }
}

// Background Listener for getting the dataset
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
      // If API returns lines, use them, otherwise fallback
      if (data.lines && data.lines.length > 0) {
         sendResponse(data.lines);
      } else {
         sendResponse(RIZZ_FALLBACK[request.lang] || RIZZ_FALLBACK["default"]);
      }
    }).catch(err => {
      console.error("Rizz API failed, using fallback", err);
      sendResponse(RIZZ_FALLBACK[request.lang] || RIZZ_FALLBACK["default"]);
    });
    return true;
  }

  if (request.type === "DETECT_GENDER") {
    // Convert base64 back to binary for HF API compatibility
    const binaryData = Uint8Array.from(atob(request.image), c => c.charCodeAt(0));
    
    fetch(HF_GENDER_API, {
      method: "POST",
      headers: { 
        "Content-Type": "application/octet-stream"
      },
      body: binaryData
    })
    .then(res => res.json())
    .then(data => {
      // Data is usually [{label: 'Male', score: ...}, {label: 'Female', score: ...}]
      sendResponse(data);
    })
    .catch(err => {
      console.error("Gender detection failed", err);
      sendResponse({ error: true });
    });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  // Set the side panel to open when the action is clicked.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
  console.log('LiveChat Navigator background service ready.');
});
