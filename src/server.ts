import {KafkaService} from "./service/kafka-service";
import {BaseKafkaManager} from "./manager/base-kafka-manager";
import {WebSocketService} from "./service/websocket-service";
import {ChatRoomConsumer} from "./consumers/chat-room-consumer";
import {ChatMessageConsumer} from "./consumers/chat-message-consumer";
import {KafkaTopics} from "./enu/kafka-topics";

const PORT = process.env.PORT || 8088;
const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";

async function startServer() {
    try {
        // Initialize Kafka producer service
        const kafkaService = new KafkaService({
            broker: KAFKA_BROKER,
            topic: KafkaTopics.WS_CHAT_MESSAGES, // Default topic for producer
            clientId: "cmf-producer"
        });

        await kafkaService.initialize();

        // Initialize WebSocket service
        const webSocketService = new WebSocketService({
            port: Number(PORT),
            kafkaService
        });

        // Initialize Kafka consumer manager
        const consumerManager = new BaseKafkaManager({
            broker: KAFKA_BROKER,
            clientId: "cmf-consumer-manager"
        });

        // Register all consumers
        // To add a new topic, just create a new consumer class and register it here
        console.log(`\n${"=".repeat(60)}`);
        console.log(`🔌 INITIALIZING KAFKA CONSUMERS`);
        console.log(`${"=".repeat(60)}`);

        await consumerManager.registerConsumer(
            new ChatRoomConsumer(webSocketService)
        );

        await consumerManager.registerConsumer(
            new ChatMessageConsumer(webSocketService)
        );

        // Add more consumers here as needed:
        // await consumerManager.registerConsumer(new YourNewConsumer(webSocketService));

        // Print summary of all connected consumers
        consumerManager.printSummary();

        console.log(`🚀 WebSocket server running on ws://0.0.0.0:${PORT}`);
        console.log(`📡 Kafka broker: ${KAFKA_BROKER}`);
        console.log(`📊 Connected WebSocket clients: ${webSocketService.getClientCount()}`);
        console.log(`📋 Available topics in config: ${Object.entries(KafkaTopics).map(([key, value]) => `${key}: ${value}`).join(", ")}`);

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