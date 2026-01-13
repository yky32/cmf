/**
 * Chat Room Events and Interfaces
 * 
 * Defines interfaces and types related to chat room events and metadata.
 * This module decouples chat room data structures from the ChatRoomManager implementation.
 */

/**
 * Chat Room Information
 * 
 * Contains metadata about a chat room including its ID, type, name, creation time,
 * and optional list of participant IDs (for reference, not real-time tracking).
 */
export interface ChatRoomInfo {
    /** Unique identifier for the chat room */
    chatRoomId: string;
    /** Type of chat room (e.g., "group", "direct", "channel") */
    type?: string;
    /** Display name of the chat room */
    name?: string;
    /** Timestamp when the chat room was created */
    createdAt: number;
    /** Optional list of participant IDs (for reference/initial setup) */
    participantIds?: string[];
}

/**
 * Chat Room Metadata
 * 
 * Internal structure used by ChatRoomManager to combine real-time participant tracking
 * with chat room information. This is an internal implementation detail.
 */
export interface ChatRoomMetadata {
    /** Set of currently active participant client IDs */
    participants: Set<string>;
    /** Chat room information and metadata */
    info: ChatRoomInfo;
}

/**
 * Chat Room Created Event
 * 
 * Event structure received from Spring Boot when a chat room is created.
 * This is the Kafka message format for chat room creation events.
 */
export interface ChatRoomCreatedEvent {
    /** Unique identifier for the chat room */
    chatRoomId: string;
    /** Type of chat room (e.g., "group", "direct", "channel") */
    type?: string;
    /** Display name of the chat room */
    name?: string;
    /** Optional list of participant IDs (for initial setup) */
    participantIds?: string[];
    /** Timestamp when the chat room was created (optional, defaults to current time if not provided) */
    createdAt?: number;
}

/**
 * Chat Message Event
 * 
 * Event structure received from Spring Boot when a chat message is sent.
 * Aligned with: com.quinsic.messenger.entity.dto.events.ChatMessageEvent.java
 * This is the Kafka message format for chat message events.
 * Extends BaseEvent (which may contain common fields like eventId, eventType, etc.)
 */
export interface ChatMessageEvent {
    /** Chat room ID where the message belongs */
    chatRoomId: string;
    /** Unique message ID */
    messageId?: string;
    /** User ID who sent the message */
    from: string;
    /** User ID who receives the message (optional, for direct messages) */
    to?: string;
    /** Message content */
    content?: string;
    /** Timestamp when message was sent (Instant.now().toEpochMilli()) */
    sentTimestamp?: number;
    /** Timestamp when message was read (Instant.now().toEpochMilli()) */
    readAt?: number;
    /** @deprecated Use sentTimestamp instead. Kept for backward compatibility */
    timestamp?: number;
}