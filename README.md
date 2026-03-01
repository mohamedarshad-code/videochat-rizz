# LiveChat Navigator - Chrome Extension

LiveChat Navigator is a premium, AI-powered Chrome Extension designed to enhance the random video chat experience on platforms like OmeTV, Minichat, and Chatrandom. It provides real-time gender detection, automated skipping based on user preferences, and localized "Rizz" (pickup lines) for over 50+ countries.

## 🚀 Key Features

- **AI Gender Scanner**: Uses Deep Learning (Hugging Face Inference) to identify genders in video feeds in real-time.
- **Smart Auto-Skip**: Automatically clicks "Next" when a specific gender (e.g., Skip Men) is detected with high confidence (>70%).
- **Global Rizz Engine**: Fetches localized pickup lines via API for different countries and languages.
- **Trending Topics**: Analyzes OmeTV/Omegle dataset logs to show what people are currently talking about.
- **Side Panel UI**: Sleek, modern design that sits perfectly alongside your browser without obscuring the chat.

## 🛠 Project Architecture

The extension follows the **Manifest V3** standard and is split into modular components:

### 1. `manifest.json`

The configuration hub. It defines permissions (`sidePanel`, `scripting`, `storage`), content script injection rules, and the background service worker.

### 2. `background.js` (Service Worker)

The "brain" of the extension. It:

- Handles API requests (Hugging Face for AI, RizzAPI for lines).
- Manages the side panel behavior.
- Acts as a message bridge between the Popup and Content Scripts.

### 3. `content.js` (Content Script)

Injected into chat sites. It:

- Captures video frames from remote video elements.
- Creates the on-page "AI Scanner" overlay.
- Simulates clicks on "Next/Skip" buttons for the Auto-Skip feature.

### 4. `popup.js` & `popup.html` (Side Panel UI)

The user interface. It contains:

- Feature toggles (AI Scanner, Auto-Skip).
- Country selection for Global Rizz.
- Trending topic pills.
- Style implementation using `styles.css` for a premium dark mode aesthetic.

### 5. `topicAnalyzer.js` & `datasetService.js`

Back-end logic for processing the `Omegle_logs_dataset`. It helps identify "Trending Topics" to keep conversations fresh.

## 📦 API Integrations

- **Logic Analysis**: `anon8231489123/Omegle_logs_dataset` (Hugging Face)
- **Gender Classification**: `rizal72/gender-classification-v2` (Hugging Face)
- **Rizz Lines**: `rizzapi.vercel.app` (Custom Vercel API)

## 🔧 Installation

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer Mode** (top right).
4. Click **Load unpacked** and select the extension folder.
5. Click the extension icon to open the **Side Panel** and start chatting!

---

_Created for enhanced social interaction and safer browsing._
