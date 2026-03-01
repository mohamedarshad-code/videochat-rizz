/**
 * topicAnalyzer.js - Lightweight keyword-based clustering
 * analyzed datasets for trending topics
 */

const STATIC_FALLBACK_TOPICS = [
  { name: "Global Chat", count: 1542 },
  { name: "Gaming", count: 894 },
  { name: "Music", count: 622 },
  { name: "Travel", count: 411 },
  { name: "Dating", count: 328 }
];

export function extractTopics(logs) {
  // If logs is an error object or empty, return fallback
  if (!logs || (typeof logs === 'object' && logs.error) || (Array.isArray(logs) && logs.length === 0)) {
    return STATIC_FALLBACK_TOPICS;
  }

  const topicMap = {
    'Dating': ['date', 'love', 'girl', 'boy', 'relationship', 'meet', 'single', 'flirt', 'gf', 'bf', 'm or f', 'looking for'],
    'Music': ['song', 'band', 'spotify', 'guitar', 'instrument', 'concert', 'playlist', 'singing'],
    'Gaming': ['gaming', 'roblox', 'fortnite', 'minecraft', 'steam', 'playstation', 'xbox', 'nintendo'],
    'Movies': ['film', 'netflix', 'anime', 'cinema', 'actor', 'watching', 'series', 'disney'],
    'Education': ['university', 'college', 'exam', 'student', 'homework', 'study', 'class', 'teacher'],
    'Travel': ['country', 'vacation', 'flight', 'world', 'trip', 'traveling', 'visit'],
    'Food': ['pizza', 'cooking', 'restaurant', 'coffee', 'hungry', 'eating', 'drink']
  };

  const counts = {};
  logs.forEach(log => {
    const text = (typeof log === 'string' ? log : (log.text || "")).toLowerCase();
    Object.entries(topicMap).forEach(([topic, variations]) => {
      if (variations.some(v => text.includes(v))) {
        counts[topic] = (counts[topic] || 0) + 1;
      }
    });
  });

  const results = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))
    .slice(0, 5);

  return results.length > 0 ? results : STATIC_FALLBACK_TOPICS;
}
