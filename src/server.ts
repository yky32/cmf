import { KafkaService } from "./kafka-service";
import { WebSocketService } from "./websocket-service";

const PORT = process.env.PORT || 3000;
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

    // Initialize WebSocket service
    const webSocketService = new WebSocketService({
      port: Number(PORT),
      kafkaService
    });

    console.log(`🚀 WebSocket server running on ws://0.0.0.0:${PORT}`);
    console.log(`📡 Kafka broker: ${KAFKA_BROKER}`);
    console.log(`📊 Connected clients: ${webSocketService.getClientCount()}`);

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