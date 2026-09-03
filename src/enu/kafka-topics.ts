/**
 * Kafka Topics Configuration
 *
 * Centralized configuration for all Kafka topics used in CMF.
 * Add new topics here when integrating with new Spring Boot services.
 */

import { randomUUID } from "crypto";

export const KafkaTopics = {
  // WebSocket chat messages (for broadcasting)
  WS_CHAT_MESSAGES: process.env.WS_CHAT_MESSAGES_TOPIC || "messenger-ws.chat-messages",

  // Chat room events from Spring Boot
  CHAT_ROOM: process.env.CHAT_ROOM_TOPIC || "messenger.chat-room",

  // Chat room last activity at events from Spring Boot
  CHAT_ROOM_LAST_ACTIVITY_AT:
    process.env.CHAT_ROOM_LAST_ACTIVITY_AT_TOPIC || "messenger.chat-room.last-activity-at",

  // Internal chat processing (if needed)
  CHAT: process.env.CHAT_TOPIC || "messenger.chat",

  /** Typing indicators — CMF produces, every CMF pod consumes */
  WS_TYPING: process.env.WS_TYPING_TOPIC || "cmf.ws.typing",
} as const;

/**
 * Unique consumer group per pod so every replica receives every message
 * and fans out to its local WebSocket clients (in-memory rooms).
 */
export function instanceConsumerGroup(topic: string): string {
  const instance = process.env.HOSTNAME || process.env.POD_NAME || randomUUID();
  return `${topic}-group-${instance}`;
}

export function getAllTopics(): string[] {
  return Object.values(KafkaTopics);
}

export function getTopic(key: keyof typeof KafkaTopics): string {
  return KafkaTopics[key];
}
