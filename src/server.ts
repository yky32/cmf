import { KafkaService } from "./kafka-service";
import { WebSocketService } from "./websocket-service";
import { createServer } from "http";

const PORT = process.env.PORT || 8088;
const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "ws-messages";

async function startServer() {
  try {
    // Initialize Kafka service
    const kafkaService = new KafkaService({
      broker: KAFKA_BROKER,
      topic: KAFKA_TOPIC,
      clientId: "ws-server",
      groupId: "ws-group"
    });

    await kafkaService.initialize();

    // Create HTTP server for health checks
    const httpServer = createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          clients: webSocketService.getClientCount()
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    // Initialize WebSocket service
    const webSocketService = new WebSocketService({
      port: Number(PORT),
      kafkaService,
      server: httpServer
    });

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 HTTP server running on http://0.0.0.0:${PORT}`);
      console.log(`🔗 WebSocket server running on ws://0.0.0.0:${PORT}`);
      console.log(`📡 Kafka broker: ${KAFKA_BROKER}`);
      console.log(`📊 Connected clients: ${webSocketService.getClientCount()}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("🛑 Received SIGTERM, shutting down gracefully...");
      webSocketService.close();
      await kafkaService.disconnect();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      console.log("🛑 Received SIGINT, shutting down gracefully...");
      webSocketService.close();
      await kafkaService.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();