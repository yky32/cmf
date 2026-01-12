import { BaseConsumer } from "./base-consumer";
import { WebSocketService } from "../websocket-service";

/**
 * ChatMessageEvent from Spring Boot
 */
export interface ChatMessageEvent {
  chatRoomId: string;
  from: string;
  to?: string;
  content: string;
  sentTimestamp: number;
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
    return process.env.CHAT_ROOM_TOPIC || "messenger.chat-room";
  }

  getGroupId(): string {
    return "cmf-chat-room-group";
  }

  async handleMessage(message: any): Promise<void> {
    try {
      const event: ChatMessageEvent = message;
      
      console.log(`📥 [ChatRoomConsumer] Received event: Room ${event.chatRoomId}, From: ${event.from}`);
      
      // Broadcast to all connected WebSocket clients
      this.webSocketService.broadcastChatMessage({
        type: "kafka",
        chatRoomId: event.chatRoomId,
        from: event.from,
        to: event.to,
        message: event.content,
        timestamp: event.sentTimestamp
      });

      console.log(`📤 [ChatRoomConsumer] Broadcasted message to WebSocket clients`);
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
