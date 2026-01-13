import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { KafkaService, KafkaMessage } from "./kafka-service";
import { ClientMessageType, ServerMessageType, MessageType } from "../enu/message-types";
import { ChatRoomManager } from "../manager/chat-room-manager";
import { ChatRoomInfo } from "../enu/events/chat-room-events";
import { KafkaTopics } from "../enu/kafka-topics";

export interface WebSocketMessage {
  type: MessageType;
  message?: string;
  targetId?: string;
  [key: string]: any;
}

export interface WebSocketServiceConfig {
  port: number;
  kafkaService: KafkaService;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private readonly httpServer: any;
  private clients: Map<string, WebSocket> = new Map();
  private clientCounter = 1;
  private config: WebSocketServiceConfig;
  private readonly kafkaService: KafkaService;
  private readonly chatRoomManager: ChatRoomManager;

  constructor(config: WebSocketServiceConfig) {
    this.config = config;
    this.kafkaService = config.kafkaService;
    this.chatRoomManager = new ChatRoomManager();
    
    // Create HTTP server for health checks and stats
    this.httpServer = createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          clients: this.clients.size,
          chatRooms: this.chatRoomManager.getChatRoomCount(),
          kafka: this.kafkaService ? 'connected' : 'disconnected'
        }));
      } else if (req.url === '/stats') {
        // Get detailed chat room statistics (optimized)
        const roomsWithStats = this.chatRoomManager.getAllChatRoomsWithStats();
        const chatRoomsStats = roomsWithStats.map(room => {
          const participants = room.participantCount > 0 
            ? Array.from(this.chatRoomManager.getChatRoomParticipants(room.chatRoomId))
            : [];
          return {
            chatRoomId: room.chatRoomId,
            participantCount: room.participantCount,
            participants: participants,
            info: room.info || null
          };
        });
        
        // Get manager stats for additional insights
        const managerStats = this.chatRoomManager.getStats();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          timestamp: new Date().toISOString(),
          totalClients: this.clients.size,
          totalChatRooms: this.chatRoomManager.getChatRoomCount(),
          chatRooms: chatRoomsStats,
          managerStats: managerStats
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });
    
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.setupWebSocketHandlers();
    
    // Start the server
    this.httpServer.listen(config.port, () => {
      console.log(`🌐 HTTP server listening on port ${config.port}`);
    });
  }

  private setupWebSocketHandlers(): void {
    this.wss.on("connection", (ws: WebSocket) => {
      const clientId = `client-${this.clientCounter++}`;
      this.clients.set(clientId, ws);

      console.log(`✅ ${clientId} connected`);
      
      // Send welcome message
      this.sendToClient(ws, { type: ServerMessageType.WELCOME, clientId });
      
      // Send current client list to the new client
      this.broadcastClientList();
      
      // Notify all clients about the new connection
      this.broadcastClientConnected(clientId);

      ws.on("message", async (rawData: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(rawData.toString());
          await this.handleMessage(clientId, message);
        } catch (err) {
          console.error("❌ Error parsing message:", err);
          this.sendToClient(ws, { type: ServerMessageType.ERROR, message: "Invalid message format" });
        }
      });

      ws.on("close", () => {
        // Remove client from all chat rooms
        this.chatRoomManager.leaveAllChatRooms(clientId);
        
        this.clients.delete(clientId);
        console.log(`❌ ${clientId} disconnected`);
        
        // Notify all remaining clients about the disconnection
        this.broadcastClientDisconnected(clientId);
        this.broadcastClientList();
      });

      ws.on("error", (error) => {
        console.error(`❌ WebSocket error for ${clientId}:`, error);
        this.chatRoomManager.leaveAllChatRooms(clientId);
        this.clients.delete(clientId);
        this.broadcastClientDisconnected(clientId);
        this.broadcastClientList();
      });
    });
  }

  private async handleMessage(clientId: string, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case ClientMessageType.BROADCAST_ALL:
        await this.handleBroadcast(clientId, message.message || "");
        break;

      case ClientMessageType.BROADCAST_ONE:
        this.handleDirectMessage(clientId, message.targetId || "", message.message || "");
        break;

      case ClientMessageType.KICK_ONE:
        this.handleKickClient(clientId, message.targetId || "");
        break;

      case ClientMessageType.KICK_ALL:
        this.handleKickAllClients(clientId);
        break;

      case ClientMessageType.JOIN_CHAT_ROOM:
        this.handleJoinRoom(clientId, message.chatRoomId);
        break;

      case ClientMessageType.LEAVE_CHAT_ROOM:
        this.handleLeaveRoom(clientId, message.chatRoomId);
        break;

      case ClientMessageType.GET_CHAT_ROOMS:
        this.handleGetChatRooms(clientId);
        break;

      case ClientMessageType.SEND_CHAT_ROOM_MESSAGE:
        await this.handleSendChatRoomMessage(clientId, message.chatRoomId, message.message || message.content || "");
        break;

      default:
        console.log(`❓ Unknown message type: ${message.type}`);
        const client = this.clients.get(clientId);
        if (client) {
          this.sendToClient(client, { type: ServerMessageType.ERROR, message: "Unknown command" });
        }
    }
  }

  private async handleBroadcast(from: string, message: string): Promise<void> {
    try {
      const kafkaMessage: KafkaMessage = {
        from,
        message,
        timestamp: Date.now()
      };
      
      await this.kafkaService.sendMessage(kafkaMessage);
    } catch (error) {
      console.error("Error sending broadcast to Kafka:", error);
    }
  }

  private async handleSendChatRoomMessage(from: string, chatRoomId: string | undefined, message: string): Promise<void> {
    if (!chatRoomId) {
      const client = this.clients.get(from);
      if (client) {
        this.sendToClient(client, { 
          type: ServerMessageType.ERROR, 
          message: "chatRoomId is required for sending chat room messages" 
        });
      }
      return;
    }

    if (!message || message.trim() === "") {
      const client = this.clients.get(from);
      if (client) {
        this.sendToClient(client, { 
          type: ServerMessageType.ERROR, 
          message: "Message content is required" 
        });
      }
      return;
    }

    // Check if client is in the chat room (optimized check)
    if (!this.chatRoomManager.isClientInRoom(from, chatRoomId)) {
      const client = this.clients.get(from);
      if (client) {
        this.sendToClient(client, { 
          type: ServerMessageType.ERROR, 
          message: `You must join chat room ${chatRoomId} before sending messages` 
        });
      }
      return;
    }

    try {
      // Send message to Kafka with chatRoomId
      // The ChatMessageConsumer will pick it up and broadcast to all participants in the room
      const kafkaMessage: KafkaMessage & { chatRoomId: string; content?: string } = {
        from,
        message,
        content: message, // Include both for compatibility
        chatRoomId: chatRoomId,
        timestamp: Date.now()
      };
      
      await this.kafkaService.sendMessage(kafkaMessage, KafkaTopics.WS_CHAT_MESSAGES);
      
      console.log(`📤 [WebSocketService] Client ${from} sent message to chat room ${chatRoomId} via Kafka`);
    } catch (error) {
      console.error("Error sending chat room message to Kafka:", error);
      const client = this.clients.get(from);
      if (client) {
        this.sendToClient(client, { 
          type: ServerMessageType.ERROR, 
          message: "Failed to send message to chat room" 
        });
      }
    }
  }

  private handleDirectMessage(from: string, targetId: string, message: string): void {
    const targetClient = this.clients.get(targetId);
    if (targetClient && targetClient.readyState === WebSocket.OPEN) {
      this.sendToClient(targetClient, {
        type: ServerMessageType.DIRECT,
        from,
        message,
        timestamp: Date.now()
      });
      console.log(`📤 Direct: ${from} → ${targetId}: ${message}`);
    } else {
      console.log(`❌ Target client ${targetId} not found or not connected`);
    }
  }

  private handleKickClient(from: string, targetId: string): void {
    const targetClient = this.clients.get(targetId);
    if (targetClient) {
      this.sendToClient(targetClient, { 
        type: ServerMessageType.KICKED, 
        message: "You have been kicked out." 
      });
      targetClient.close();
      this.clients.delete(targetId);
      console.log(`👢 ${from} kicked ${targetId}`);
      this.broadcastClientList();
    }
  }

  private handleKickAllClients(from: string): void {
    console.log(`👢 ${from} kicked all clients`);
    for (const [clientId, client] of this.clients) {
      if (clientId !== from) {
        this.sendToClient(client, { 
          type: ServerMessageType.KICKED, 
          message: "All clients disconnected." 
        });
        client.close();
      }
    }
    this.clients.clear();
  }

  private sendToClient(client: WebSocket, message: any): void {
    if (client.readyState === WebSocket.OPEN) {
      // Add direction field to all server messages
      const messageWithDirection = {
        ...message,
        direction: "SEND_IN"
      };
      client.send(JSON.stringify(messageWithDirection));
    }
  }

  private broadcastToAll(message: any): void {
    for (const [, client] of this.clients) {
      this.sendToClient(client, message);
    }
  }

  /**
   * Handle join chat room request from client
   */
  private handleJoinRoom(clientId: string, chatRoomId: string | undefined): void {
    if (!chatRoomId) {
      const client = this.clients.get(clientId);
      if (client) {
        this.sendToClient(client, { 
          type: ServerMessageType.ERROR, 
          message: "chatRoomId is required" 
        });
      }
      return;
    }

    const success = this.chatRoomManager.joinChatRoom(clientId, chatRoomId);
    const client = this.clients.get(clientId);
    
    if (client && success) {
      // Send confirmation
      this.sendToClient(client, {
        type: ServerMessageType.CHAT_ROOM_JOINED,
        chatRoomId: chatRoomId,
        message: `Successfully joined chat room ${chatRoomId}`
      });

      // Send current online participants in the chat room
      // Use optimized method to get participant count first
      const participantCount = this.chatRoomManager.getChatRoomParticipantCount(chatRoomId);
      const participants = participantCount > 0 
        ? Array.from(this.chatRoomManager.getChatRoomParticipants(chatRoomId))
        : [];
      this.sendToClient(client, {
        type: ServerMessageType.CHAT_ROOM_PARTICIPANTS_ONLINE,
        chatRoomId: chatRoomId,
        participants: participants
      });

      console.log(`✅ [WebSocketService] Client ${clientId} joined chat room ${chatRoomId}`);
    }
  }

  /**
   * Handle leave chat room request from client
   */
  private handleLeaveRoom(clientId: string, chatRoomId: string | undefined): void {
    if (!chatRoomId) {
      const client = this.clients.get(clientId);
      if (client) {
        this.sendToClient(client, { 
          type: ServerMessageType.ERROR, 
          message: "chatRoomId is required" 
        });
      }
      return;
    }

    this.chatRoomManager.leaveChatRoom(clientId, chatRoomId);
    const client = this.clients.get(clientId);
    
    if (client) {
      this.sendToClient(client, {
        type: ServerMessageType.CHAT_ROOM_LEFT,
        chatRoomId: chatRoomId,
        message: `Left chat room ${chatRoomId}`
      });
      console.log(`👋 [WebSocketService] Client ${clientId} left chat room ${chatRoomId}`);
    }
  }

  /**
   * Handle get chat rooms request from client
   * Optimized to use getAllChatRoomsWithStats for better performance
   */
  private handleGetChatRooms(clientId: string): void {
    // Use optimized method that returns stats in one call
    const roomsWithStats = this.chatRoomManager.getAllChatRoomsWithStats();
    const chatRoomsInfo = roomsWithStats.map(room => {
      const participants = Array.from(this.chatRoomManager.getChatRoomParticipants(room.chatRoomId));
      return {
        chatRoomId: room.chatRoomId,
        name: room.info?.name,
        type: room.info?.type,
        participantCount: room.participantCount,
        participants: participants,
        createdAt: room.info?.createdAt,
        participantIds: room.info?.participantIds
      };
    });

    const client = this.clients.get(clientId);
    if (client) {
      this.sendToClient(client, {
        type: ServerMessageType.CHAT_ROOM_LIST,
        totalCount: roomsWithStats.length,
        chatRooms: chatRoomsInfo
      });
      console.log(`📋 [WebSocketService] Sent chat room list to client ${clientId}: ${roomsWithStats.length} rooms`);
    }
  }

  /**
   * Create a chat room (called when Spring Boot creates a chat room via Kafka)
   */
  createChatRoom(chatRoomId: string, info?: Partial<ChatRoomInfo>): void {
    this.chatRoomManager.createChatRoom(chatRoomId, info);
    
    // Notify all clients that a new chat room was created
    this.broadcastToAll({
      type: ServerMessageType.CHAT_ROOM_CREATED,
      chatRoomId: chatRoomId,
      ...info
    });
    
    console.log(`🏠 [WebSocketService] Chat room created: chat_room_${chatRoomId}`);
  }

  /**
   * Broadcast chat room message to a specific chat room (not all clients)
   */
  broadcastToChatRoom(chatRoomId: string, message: any): void {
    const participants = this.chatRoomManager.getChatRoomParticipants(chatRoomId);
    let sentCount = 0;

    console.log(`📡 [WebSocketService] Broadcasting to chat room ${chatRoomId}`);
    console.log(`   Total participants in room: ${participants.size}`);
    console.log(`   Connected clients: ${this.clients.size}`);

    for (const clientId of participants) {
      const client = this.clients.get(clientId);
      if (client) {
        this.sendToClient(client, message);
        sentCount++;
        console.log(`   ✅ Sent to client: ${clientId}`);
      } else {
        console.log(`   ⚠️ Client ${clientId} not found in connected clients`);
      }
    }

    if (sentCount === 0) {
      console.log(`⚠️ [WebSocketService] No participants received message in chat room ${chatRoomId}`);
      console.log(`   Participants in room: ${Array.from(participants).join(', ') || 'none'}`);
    } else {
      console.log(`✅ [WebSocketService] Broadcasted to chat room ${chatRoomId}: ${sentCount}/${participants.size} participants received`);
    }
  }

  /**
   * Broadcast chat room message to a specific chat room
   * Falls back to broadcasting to all if chatRoomId is not provided
   */
  broadcastChatMessage(message: any): void {
    const chatRoomId = message.chatRoomId;
    
    if (chatRoomId) {
      // Broadcast to specific chat room
      this.broadcastToChatRoom(chatRoomId, {
        type: ServerMessageType.CHAT_ROOM_MESSAGE_RECEIVED,
        ...message
      });
    } else {
      // Fallback: broadcast to all (backward compatibility)
      this.broadcastToAll({
        type: ServerMessageType.CHAT_ROOM_MESSAGE_RECEIVED,
        ...message
      });
      console.log(`📤 [WebSocketService] Broadcasted chat room message to all ${this.clients.size} clients (no chatRoomId)`);
    }
  }

  /**
   * Get chat room manager instance (for consumers to use)
   */
  getChatRoomManager(): ChatRoomManager {
    return this.chatRoomManager;
  }

  private broadcastClientList(): void {
    const clientList = Array.from(this.clients.keys());
    this.broadcastToAll({ type: ServerMessageType.CLIENT_LIST, clients: clientList });
  }

  private broadcastClientConnected(clientId: string): void {
    this.broadcastToAll({ type: ServerMessageType.CLIENT_CONNECTED, clientId });
  }

  private broadcastClientDisconnected(clientId: string): void {
    this.broadcastToAll({ type: ServerMessageType.CLIENT_DISCONNECTED, clientId });
  }


  getClientCount(): number {
    return this.clients.size;
  }

  close(): void {
    // Close all WebSocket connections
    for (const [, client] of this.clients) {
      client.close();
    }
    this.clients.clear();
    
    // Close WebSocket server
    this.wss.close();
    
    // Close HTTP server
    if (this.httpServer) {
      this.httpServer.close();
    }
    
    console.log("✅ WebSocket and HTTP servers closed");
  }

}
