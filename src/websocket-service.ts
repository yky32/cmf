import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { KafkaService, KafkaMessage } from "./kafka-service";
import { ClientMessageType, ServerMessageType, MessageType } from "./message-types";

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

  constructor(config: WebSocketServiceConfig) {
    this.config = config;
    this.kafkaService = config.kafkaService;
    
    // Create HTTP server for health checks
    this.httpServer = createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          clients: this.clients.size,
          kafka: this.kafkaService ? 'connected' : 'disconnected'
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
        this.clients.delete(clientId);
        console.log(`❌ ${clientId} disconnected`);
        
        // Notify all remaining clients about the disconnection
        this.broadcastClientDisconnected(clientId);
        this.broadcastClientList();
      });

      ws.on("error", (error) => {
        console.error(`❌ WebSocket error for ${clientId}:`, error);
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
      client.send(JSON.stringify(message));
    }
  }

  private broadcastToAll(message: any): void {
    for (const [, client] of this.clients) {
      this.sendToClient(client, message);
    }
  }

  // Public method to broadcast chat messages (called from server.ts)
  broadcastChatMessage(message: any): void {
    this.broadcastToAll(message);
    console.log(`📤 Broadcasted chat message to ${this.clients.size} clients`);
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
