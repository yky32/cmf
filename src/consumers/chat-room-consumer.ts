import {BaseConsumer} from "./base-consumer";
import {WebSocketService} from "../websocket-service";
import {KafkaTopics} from "../kafka-topics";

/**
 * ChatRoomCreatedEvent from Spring Boot (for chat room creation)
 */
export interface ChatRoomCreatedEvent {
    chatRoomId: string;
    type?: string;
    name?: string;
    participantIds?: string[];
    createdAt?: number;
}

/**
 * ChatRoomActivityEvent - Base interface for all chat room activity events
 */
export type ChatRoomActivityEvent = ChatRoomCreatedEvent;

/**
 * Consumer for messenger.chat-room topic
 *
 * Handles chat room activity events from Spring Boot (room creation, updates, etc.).
 * This consumer only handles events related to chat room lifecycle and activity,
 * not chat messages (which are handled by ChatMessageConsumer).
 */
export class ChatRoomConsumer implements BaseConsumer {
    private webSocketService: WebSocketService;

    constructor(webSocketService: WebSocketService) {
        this.webSocketService = webSocketService;
    }

    getTopic(): string {
        return KafkaTopics.CHAT_ROOM;
    }

    getGroupId(): string {
        return `${this.getTopic()}-group`;
    }

    async handleMessage(message: any): Promise<void> {
        try {
            // Handle chat room creation event
            if (message.chatRoomId || message.roomId || (message.type && message.type === "room.created")) {
                const roomEvent = message as ChatRoomCreatedEvent;
                const chatRoomId = roomEvent.chatRoomId || message.roomId;
                
                if (!chatRoomId) {
                    console.warn(`⚠️ [ChatRoomConsumer] Received room event without chatRoomId:`, message);
                    return;
                }
                
                console.log(`🏠 [ChatRoomConsumer] Received chat room creation event: Chat Room ${chatRoomId}`);
                
                // Create chat room in CMF
                this.webSocketService.createChatRoom(chatRoomId, {
                    type: roomEvent.type,
                    name: roomEvent.name,
                    participantIds: roomEvent.participantIds
                });
                
                console.log(`✅ [ChatRoomConsumer] Chat room ${chatRoomId} created in CMF`);
            } else {
                console.warn(`⚠️ [ChatRoomConsumer] Received unknown chat room activity event:`, message);
            }
        } catch (error) {
            console.error(`❌ [ChatRoomConsumer] Error processing chat room activity event:`, error);
            throw error;
        }
    }

    onInitialize(): void {
        console.log(`✅ [ChatRoomConsumer] Initialized for topic: ${this.getTopic()}`);
    }

    onDisconnect(): void {
        console.log(`🛑 [ChatRoomConsumer] Disconnected from topic: ${this.getTopic()}`);
    }
}
