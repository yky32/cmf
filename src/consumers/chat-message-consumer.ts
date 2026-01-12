import {BaseConsumer} from "./base-consumer";
import {WebSocketService} from "../websocket-service";
import {KafkaTopics} from "../kafka-topics";

/**
 * ChatMessageEvent interface for backward compatibility
 */
export interface ChatMessageEvent {
    from: string;
    message: string;
    timestamp?: number;
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
        return "cmf-chat-message-group";
    }

    async handleMessage(message: any): Promise<void> {
        try {
            const chatMessage: ChatMessageEvent = message;

            console.log(`📥 [ChatMessageConsumer] Received message from: ${chatMessage.from}`);

            // Broadcast to all connected WebSocket clients
            this.webSocketService.broadcastChatMessage({
                type: "kafka",
                from: chatMessage.from,
                message: chatMessage.message,
                timestamp: chatMessage.timestamp || Date.now()
            });

            console.log(`📤 [ChatMessageConsumer] Broadcasted message to WebSocket clients`);
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
