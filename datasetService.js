/**
 * Dataset Service - Configuration and Constants for External Data
 */

export const DATASET_CONFIG = {
  HF_JSON_URL: "https://datasets-server.huggingface.co/rows?dataset=anon8231489123%2FOmegle_logs_dataset&config=default&split=train&offset=0&limit=100",
  CACHE_KEY: "chatLogsTopics",
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  MAX_ENTRIES: 300,
  BLACKLIST: ["kik", "snapchat", "instagram", "skype", "telegram", "whatsapp", "phone", "number", "sex", "porn", "nude"]
};
