/**
 * Database of Random Video Chat & Stranger Chat platforms.
 * Includes automation selectors for the LiveChat Navigator engine.
 */

const SITES_DATA = [
  {
    name: "Chatruletka",
    domain: "chatruletka.com",
    selectors: {
      start: ".buttons__button.start-button",
      stop: ".buttons__button.stop-button",
      video: "#remote-video",
      container: ".video-container"
    },
    clones: [
      "chatruletka.ua", "ruletka.chat", "videochatar.com", "videochatau.com",
      "videochatbr.com", "brvideochat.com", "videochatca.com", "videochatde.com",
      "videochatfr.com", "frvideochat.com", "roulettefrancais.com", "videochatit.com",
      "videochatjp.com", "videochatmx.com", "videochatnl.com", "videochatpl.com",
      "videochatpt.com", "videochatru.com", "videochatuk.com", "videochatus.com",
      "roulette-espanol.com", "ruletaespanol.com", "ruletkavideochat.com", "turkishvideochat.com"
    ]
  },
  {
    name: "OmeTV",
    domain: "ome.tv",
    selectors: {
      start: ".buttons__button.start-button",
      stop: ".buttons__button.stop-button",
      video: "#remote-video",
      container: ".video-container"
    },
    clones: [
      "ome.chat", "camki.com", "chatalternative.com", "chatrooms.chat",
      "chatrooms.pro", "chat-brasil.com", "chat-de.com", "chat-fr.com",
      "chat-nl.com", "chat-pl.com", "chat-pt.com", "chatgenerator.com",
      "prostochat.com", "stickam.chat", "chatbizar.com", "ukr.chat",
      "cafeclub.ua", "indiavideochat.com", "webcamchatta.com"
    ]
  },
  {
    name: "Minichat",
    domain: "minichat.com",
    selectors: {
      start: ".buttons__button.start-button",
      stop: ".buttons__button.stop-button",
      video: "#remote-video",
      container: ".video-container"
    }
  },
  {
    name: "Omegle",
    domain: "omegle.com",
    selectors: {
      start: ".disconnectbtn",
      stop: ".disconnectbtn",
      video: "video",
      container: ".logbox"
    },
    clones: ["omegle.tv"]
  },
  {
    name: "Coomeet",
    domain: "free.coomeet.com",
    selectors: {
      start: ".button-stop",
      stop: ".button-stop",
      video: "video",
      container: ".video-container"
    },
    clones: ["rusvideochat.ru", "video-roulette24.ru", "chatroulette.msk.ru"]
  }
];

// Helper to get site config by current hostname
function getSiteConfig() {
  const host = window.location.hostname;
  return SITES_DATA.find(s => 
    host.includes(s.domain) || (s.clones && s.clones.some(c => host.includes(c)))
  );
}

window.SITES_DATA = SITES_DATA;
window.getSiteConfig = getSiteConfig;
