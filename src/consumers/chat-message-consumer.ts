import {BaseConsumer} from "./base-consumer";
import {WebSocketService} from "../service/websocket-service";
import {KafkaTopics} from "../enu/kafka-topics";
import {ChatMessageEvent} from "../enu/events";

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
            console.log(`📨 [ChatMessageConsumer] Raw Kafka message received:`, JSON.stringify(message, null, 2));
            
            const chatMessage: ChatMessageEvent = message;
            const chatRoomId = chatMessage.chatRoomId;

            if (!chatRoomId) {
                console.warn(`⚠️ [ChatMessageConsumer] Received message without chatRoomId:`, message);
                return;
            }

            const messageContent = chatMessage.content || 'Not Found...';
            // Prefer sentTimestamp, fallback to timestamp for backward compatibility, then current time
            // Note: timestamp is deprecated but kept for backward compatibility
            const timestamp = chatMessage.sentTimestamp ?? chatMessage.timestamp ?? Date.now();

            if (!messageContent) {
                console.warn(`⚠️ [ChatMessageConsumer] Received message without content:`, message);
                return;
            }

            console.log(`📥 [ChatMessageConsumer] Processing message for chat room ${chatRoomId}`);
            console.log(`   MessageId: ${chatMessage.messageId || 'N/A'}`);
            console.log(`   From: ${chatMessage.from}`);
            console.log(`   To: ${chatMessage.to || 'N/A (broadcast)'}`);
            console.log(`   Content: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`);
            console.log(`   SentTimestamp: ${timestamp}`);
            console.log(`   ReadAt: ${chatMessage.readAt || 'N/A'}`);

            // Extract sender's client ID to exclude from receiving their own message
            // The sender already sees their message as SEND_OUT, so we don't need to send it back via websocket
            const senderClientId = chatMessage.from;

            // Broadcast to participants in the specific chat room only, excluding the sender
            this.webSocketService.broadcastChatMessage({
                chatRoomId: chatRoomId,
                messageId: chatMessage.messageId,
                from: chatMessage.from,
                to: chatMessage.to,
                message: messageContent,
                content: messageContent,  // Include both for compatibility
                sentTimestamp: timestamp,
                readAt: chatMessage.readAt,
                timestamp: timestamp  // Include for backward compatibility
            }, senderClientId); // Exclude sender from receiving their own message

            console.log(`✅ [ChatMessageConsumer] Successfully broadcasted message to chat room ${chatRoomId} participants (excluded sender: ${senderClientId})`);
        } catch (error) {
            console.error(`❌ [ChatMessageConsumer] Error processing message:`, error);
            console.error(`   Message that caused error:`, JSON.stringify(message, null, 2));
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
