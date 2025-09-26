import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { KafkaService, KafkaMessage } from "./kafka-service";

export interface WebSocketMessage {
  type: string;
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
  private httpServer: any;
  private clients: Map<string, WebSocket> = new Map();
  private clientCounter = 1;
  private config: WebSocketServiceConfig;
  private kafkaService: KafkaService;

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
    this.setupKafkaMessageHandler();
    this.setupWebSocketHandlers();
    
    // Start the server
    this.httpServer.listen(config.port, () => {
      console.log(`🌐 HTTP server listening on port ${config.port}`);
    });
  }

  private setupKafkaMessageHandler(): void {
    this.kafkaService.onMessage((kafkaMessage: KafkaMessage) => {
      // Broadcast Kafka message to all connected WebSocket clients
      this.broadcastToAll({
        type: "kafka",
        from: kafkaMessage.from,
        message: kafkaMessage.message,
        timestamp: kafkaMessage.timestamp || Date.now()
      });
    });
  }

  private setupWebSocketHandlers(): void {
    this.wss.on("connection", (ws: WebSocket) => {
      const clientId = `client-${this.clientCounter++}`;
      this.clients.set(clientId, ws);

      console.log(`✅ >>${clientId} connected`);
      
      // Send welcome message
      this.sendToClient(ws, { type: "welcome", clientId });
      
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
          this.sendToClient(ws, { type: "error", message: "Invalid message format" });
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
      case "broadcast":
      case "broadcast-all":
        await this.handleBroadcast(clientId, message.message || "");
        break;

      case "broadcast-one":
        this.handleDirectMessage(clientId, message.targetId || "", message.message || "");
        break;

      case "kick-one":
        this.handleKickClient(clientId, message.targetId || "");
        break;

      case "kick-all":
        this.handleKickAllClients(clientId);
        break;

      default:
        console.log(`❓ Unknown message type: ${message.type}`);
        const client = this.clients.get(clientId);
        if (client) {
          this.sendToClient(client, { type: "error", message: "Unknown command" });
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
        type: "direct",
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
        type: "kicked", 
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
          type: "kicked", 
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

  private broadcastClientList(): void {
    const clientList = Array.from(this.clients.keys());
    this.broadcastToAll({ type: "client-list", clients: clientList });
  }

  private broadcastClientConnected(clientId: string): void {
    this.broadcastToAll({ type: "client-connected", clientId });
  }

  private broadcastClientDisconnected(clientId: string): void {
    this.broadcastToAll({ type: "client-disconnected", clientId });
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
    
    console.log("✅ >>WebSocket and HTTP servers closed");
  }

}
