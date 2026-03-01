# LiveChat Navigator - Chrome Extension

LiveChat Navigator is a premium, AI-powered Chrome Extension designed to enhance the random video chat experience on platforms like OmeTV, Minichat, and Chatrandom. It provides real-time gender detection, automated skipping based on user preferences, and localized "Rizz" (pickup lines) for over 50+ countries.

## 🚀 Key Features

- **Local AI Gender Scanner**: Uses `face-api.js` for **on-device** deep learning to identify genders in real-time. No data leaves your browser.
- **Smart Auto-Skip**: Automatically clicks "Skip" when a specific gender (e.g., Skip Men) is detected with high confidence (>70%).
- **IP Geolocation**: Intercepts WebRTC ICE candidates to show the remote stranger's City, Country, Flag, and ISP.
- **Global Rizz Engine**: Fetches localized pickup lines for **50+ countries** including USA, India, Brazil, Turkey, and more.
- **Trending Topics**: Analyzes chat dataset logs to show what people are currently talking about.
- **Hotkeys**: Press `Esc` to Skip and `F` for Fullscreen mode.

## 🛠 Project Architecture

The extension follows the **Manifest V3** standard:

### 1. `content.js` (The Core Engine)

Injected into chat sites. It:

- Loads local AI models (`tinyFaceDetector`, `ageGenderNet`) from the extension directory.
- Captures video frames and performs inference locally.
- Creates the on-page "AI Scanner" and "IP Info" overlays.
- Handles hotkeys and automated click simulations.

### 2. `background.js` (Service Worker)

Handles background logic including:

- Fetching IP Geolocation data from external APIs.
- Managing Rizz queries for the popup.

### 3. `popup.js` & `popup.html` (The UI)

A modern dark-mode side panel for controlling the extension features (Toggles, Radios, Country Dropdowns).

### 4. `sites.js` & `libs/`

- `sites.js`: Contains selectors for **50+ platforms** and their clones.
- `libs/`: Includes `face-api.min.js` and `arrive.js` for efficient DOM monitoring.

## 🔧 Installation

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer Mode**.
4. Click **Load unpacked** and select the extension folder.
5. Refresh your video chat page and enjoy!

---

_Created for enhanced social interaction and safer browsing._
