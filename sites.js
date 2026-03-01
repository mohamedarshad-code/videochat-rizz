/**
 * Database of Random Video Chat & Stranger Chat platforms.
 * Designed for easy scalability and extensibility.
 */

const SITES_DATA = [
  {
    name: "OmeTV",
    url: "https://www.ometv.com/",
    domain: "ometv.com",
    category: "random-video-chat",
    tags: ["stranger", "cam", "global"],
    description: "Connect with real people worldwide on one of the most popular stranger chat apps."
  },
  {
    name: "Monkey",
    url: "https://www.monkey.app/",
    domain: "monkey.app",
    category: "random-video-chat",
    tags: ["social", "video", "friends"],
    description: "A fun way to meet new people and make friends over video chat."
  },
  {
    name: "Azar",
    url: "https://azarlive.com/",
    domain: "azarlive.com",
    category: "random-video-chat",
    tags: ["global", "video", "discovery"],
    description: "Discover and connect with people from different cultures in real-time."
  },
  {
    name: "Chatroulette",
    url: "https://chatroulette.com/",
    domain: "chatroulette.com",
    category: "random-video-chat",
    tags: ["classic", "stranger", "cam"],
    description: "The original random video chat platform connecting strangers since 2009."
  },
  {
    name: "Chatrandom",
    url: "https://chatrandom.com/",
    domain: "chatrandom.com",
    category: "random-video-chat",
    tags: ["filters", "cam", "stranger"],
    description: "Simple random video chat with gender and country filters."
  },
  {
    name: "CamSurf",
    url: "https://camsurf.com/",
    domain: "camsurf.com",
    category: "random-video-chat",
    tags: ["anonymous", "cam", "fast"],
    description: "A lightweight, fast, and anonymous random video chat service."
  },
  {
    name: "Emerald Chat",
    url: "https://www.emeraldchat.com/",
    domain: "emeraldchat.com",
    category: "random-video-chat",
    tags: ["moderated", "tags", "social"],
    description: "A clean and safe alternative to Omegle with interests-based matching."
  },
  {
    name: "Shagle",
    url: "https://shagle.com/",
    domain: "shagle.com",
    category: "random-video-chat",
    tags: ["filters", "cam", "global"],
    description: "Free random video chat with millions of users and gender filters."
  },
  {
    name: "Tinychat",
    url: "https://tinychat.com/",
    domain: "tinychat.com",
    category: "random-video-chat",
    tags: ["rooms", "cam", "community"],
    description: "Join themed chat rooms and video chat with groups of people."
  },
  {
    name: "HOLLA",
    url: "https://holla.world/",
    domain: "holla.world",
    category: "random-video-chat",
    tags: ["mobile", "video", "discovery"],
    description: "A fast way to discover new people around the world instantly."
  },
  {
    name: "LivU",
    url: "https://www.livu.me/",
    domain: "livu.me",
    category: "random-video-chat",
    tags: ["social", "video", "live"],
    description: "Dynamic video chat app with filters, stickers, and real-time translation."
  },
  {
    name: "Uhmegle",
    url: "https://uhmegle.com/",
    domain: "uhmegle.com",
    category: "random-video-chat",
    tags: ["clean", "alternative", "stranger"],
    description: "A clean, modern alternative for text and video stranger chat."
  },
  {
    name: "MiniChat",
    url: "https://minichat.com/",
    domain: "minichat.com",
    category: "random-video-chat",
    tags: ["stranger", "cam", "fast"],
    description: "A simple and fast random video chat to meet new people instantly."
  },
  {
    name: "iMeetzu",
    url: "https://www.imeetzu.com/",
    domain: "imeetzu.com",
    category: "random-video-chat",
    tags: ["social", "cam", "rooms"],
    description: "A social network centered around meeting new people through video."
  }
];

// Exporting using a global if in a standard script context, 
// or commonjs if needed, but for popup.js standard script is easier.
window.SITES_DATA = SITES_DATA;
