import {BaseConsumer} from "./base-consumer";
import {WebSocketService} from "../websocket-service";
import {KafkaTopics} from "../kafka-topics";

/**
 * ChatMessageEvent from Spring Boot
 * Contains chat room message information
 */
export interface ChatMessageEvent {
    chatRoomId: string;  // Required: which chat room this message belongs to
    from: string;        // User ID who sent the message
    message?: string;    // Message content (optional, could be in 'content' field)
    content?: string;    // Alternative field name for message content
    timestamp?: number;
    sentTimestamp?: number;  // Alternative field name for timestamp
}

/**
 * Consumer for messenger-ws.chat-messages topic
 *
 * Handles general chat messages and broadcasts to WebSocket clients.
 * This is for backward compatibility with the original implementation.
 */
export class ChatMessageConsumer implements BaseConsumer {
    private webSocketService: WebSocketService;

    constructor(webSocketService: WebSocketService) {
        this.webSocketService = webSocketService;
    }

    getTopic(): string {
        return KafkaTopics.WS_CHAT_MESSAGES;
    }

    getGroupId(): string {
        return `${this.getTopic()}-group`;
    }

    async handleMessage(message: any): Promise<void> {
        try {
            const chatMessage: ChatMessageEvent = message;
            const chatRoomId = chatMessage.chatRoomId;

            if (!chatRoomId) {
                console.warn(`⚠️ [ChatMessageConsumer] Received message without chatRoomId:`, message);
                return;
            }

            // Get message content (support both 'message' and 'content' fields)
            const messageContent = chatMessage.message || chatMessage.content || '';
            const timestamp = chatMessage.timestamp || chatMessage.sentTimestamp || Date.now();

            console.log(`📥 [ChatMessageConsumer] Received message for chat room ${chatRoomId} from: ${chatMessage.from}`);

            // Broadcast to participants in the specific chat room only
            this.webSocketService.broadcastChatMessage({
                chatRoomId: chatRoomId,
                from: chatMessage.from,
                message: messageContent,
                content: messageContent,  // Include both for compatibility
                timestamp: timestamp
            });

            console.log(`📤 [ChatMessageConsumer] Broadcasted message to chat room ${chatRoomId} participants`);
        } catch (error) {
            console.error(`❌ [ChatMessageConsumer] Error processing message:`, error);
            throw error;
        }
    }

    onInitialize(): void {
        console.log(`✅ [ChatMessageConsumer] Initialized for topic: ${this.getTopic()}`);
    }

    onDisconnect(): void {
        console.log(`🛑 [ChatMessageConsumer] Disconnected from topic: ${this.getTopic()}`);
    }
}
