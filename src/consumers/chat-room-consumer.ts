import {BaseConsumer} from "./base-consumer";
import {WebSocketService} from "../websocket-service";
import {KafkaTopics} from "../kafka-topics";

/**
 * ChatMessageEvent from Spring Boot (for chat messages)
 */
export interface ChatMessageEvent {
    chatRoomId: string;
    from: string;
    to?: string;
    content: string;
    sentTimestamp: number;
}

/**
 * RoomCreatedEvent from Spring Boot (for room creation)
 */
export interface RoomCreatedEvent {
    roomId: string;
    type?: string;
    name?: string;
    participantIds?: string[];
    createdAt?: number;
}

/**
 * Consumer for messenger.chat-room topic
 *
 * Handles chat room events from Spring Boot and broadcasts to WebSocket clients.
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
            // Check if this is a room creation event or a chat message event
            if (message.roomId || (message.type && message.type === "room.created")) {
                // Handle room creation event
                const roomEvent: RoomCreatedEvent = message;
                const roomId = roomEvent.roomId || message.roomId;
                
                console.log(`🏠 [ChatRoomConsumer] Received chat room creation event: Chat Room ${roomId}`);
                
                // Create chat room in CMF
                this.webSocketService.createChatRoom(roomId, {
                    type: roomEvent.type,
                    name: roomEvent.name,
                    participantIds: roomEvent.participantIds
                });
                
                console.log(`✅ [ChatRoomConsumer] Chat room ${roomId} created in CMF`);
            } else {
                // Handle chat message event
                const event: ChatMessageEvent = message;
                
                console.log(`📥 [ChatRoomConsumer] Received chat room message: Chat Room ${event.chatRoomId}, From: ${event.from}`);

                // Broadcast to specific chat room (not all clients)
                this.webSocketService.broadcastChatMessage({
                    chatRoomId: event.chatRoomId,
                    from: event.from,
                    to: event.to,
                    message: event.content,
                    content: event.content,
                    timestamp: event.sentTimestamp
                });

                console.log(`📤 [ChatRoomConsumer] Broadcasted chat room message to chat room ${event.chatRoomId}`);
            }
        } catch (error) {
            console.error(`❌ [ChatRoomConsumer] Error processing message:`, error);
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
