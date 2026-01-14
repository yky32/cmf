/**
 * Kafka Topics Configuration
 * 
 * Centralized configuration for all Kafka topics used in CMF.
 * Add new topics here when integrating with new Spring Boot services.
 */

export const KafkaTopics = {
  // WebSocket chat messages (for broadcasting)
  WS_CHAT_MESSAGES: process.env.WS_CHAT_MESSAGES_TOPIC || "messenger-ws.chat-messages",
  
  // Chat room events from Spring Boot
  CHAT_ROOM: process.env.CHAT_ROOM_TOPIC || "messenger.chat-room",

  // Chat room last activity at events from Spring Boot
  CHAT_ROOM_LAST_ACTIVITY_AT: process.env.CHAT_ROOM_LAST_ACTIVITY_AT = "messenger.chat-room.last-activity-at",

  // Internal chat processing (if needed)
  CHAT: process.env.CHAT_TOPIC || "messenger.chat",
} as const;

/**
 * Get all topics as an array
 */
export function getAllTopics(): string[] {
  return Object.values(KafkaTopics);
}

/**
 * Get topic by key
 */
export function getTopic(key: keyof typeof KafkaTopics): string {
  return KafkaTopics[key];
}
