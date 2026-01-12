import { KafkaService } from "./kafka-service";
import { KafkaConsumerManager } from "./kafka-consumer-manager";
import { WebSocketService } from "./websocket-service";
import { ChatRoomConsumer } from "./consumers/chat-room-consumer";
import { ChatMessageConsumer } from "./consumers/chat-message-consumer";

const PORT = process.env.PORT || 8088;
const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "messenger-ws.chat-messages";

async function startServer() {
  try {
    // Initialize Kafka producer service
    const kafkaService = new KafkaService({
      broker: KAFKA_BROKER,
      topic: KAFKA_TOPIC,
      clientId: "cmf-producer"
    });

    await kafkaService.initialize();

    // Initialize WebSocket service
    const webSocketService = new WebSocketService({
      port: Number(PORT),
      kafkaService
    });

    // Initialize Kafka consumer manager
    const consumerManager = new KafkaConsumerManager({
      broker: KAFKA_BROKER,
      clientId: "cmf-consumer-manager"
    });

    // Register all consumers
    // To add a new topic, just create a new consumer class and register it here
    await consumerManager.registerConsumer(
      new ChatRoomConsumer(webSocketService)
    );

    await consumerManager.registerConsumer(
      new ChatMessageConsumer(webSocketService)
    );

    // Add more consumers here as needed:
    // await consumerManager.registerConsumer(new YourNewConsumer(webSocketService));

    console.log(`🚀 WebSocket server running on ws://0.0.0.0:${PORT}`);
    console.log(`📡 Kafka broker: ${KAFKA_BROKER}`);
    console.log(`📊 Registered topics: ${consumerManager.getRegisteredTopics().join(", ")}`);
    console.log(`📊 Total consumers: ${consumerManager.getConsumerCount()}`);
    console.log(`📊 Connected clients: ${webSocketService.getClientCount()}`);

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("🛑 Received SIGTERM, shutting down gracefully...");
      webSocketService.close();
      await consumerManager.disconnectAll();
      await kafkaService.disconnect();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      console.log("🛑 Received SIGINT, shutting down gracefully...");
      webSocketService.close();
      await consumerManager.disconnectAll();
      await kafkaService.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();