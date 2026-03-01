/**
 * topicAnalyzer.js - Lightweight keyword-based clustering
 * analyzed datasets for trending topics
 */

export function extractTopics(logs) {
  // Related terms dictionary for better extraction
  const topicMap = {
    'dating': ['date', 'love', 'girl', 'boy', 'relationship', 'meet', 'single', 'flirt', 'gf', 'bf', 'm or f', 'looking for'],
    'music': ['song', 'band', 'spotify', 'guitar', 'instrument', 'concert', 'playlist', 'singing'],
    'games': ['gaming', 'roblox', 'fortnite', 'minecraft', 'steam', 'playstation', 'xbox', 'nintendo'],
    'movies': ['film', 'netflix', 'anime', 'cinema', 'actor', 'watching', 'series', 'disney'],
    'school': ['university', 'college', 'exam', 'student', 'homework', 'study', 'class', 'teacher'],
    'travel': ['country', 'vacation', 'flight', 'world', 'trip', 'traveling', 'visit'],
    'food': ['pizza', 'cooking', 'restaurant', 'coffee', 'hungry', 'eating', 'drink']
  };

  const counts = {};
  if (!logs || !Array.isArray(logs)) return [];

  logs.forEach(log => {
    const text = (typeof log === 'string' ? log : (log.text || "")).toLowerCase();
    
    // Check for any term in the topic maps
    Object.entries(topicMap).forEach(([topic, variations]) => {
      if (variations.some(v => text.includes(v))) {
        counts[topic] = (counts[topic] || 0) + 1;
      }
    });
  });

  // Sort by frequency and take top 5
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1]) // highest frequency first
    .map(([name, count]) => ({ name, count }))
    .slice(0, 5);
}
