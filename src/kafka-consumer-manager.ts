import { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import { BaseConsumer } from "./consumers/base-consumer";

export interface KafkaConsumerManagerConfig {
  broker: string;
  clientId?: string;
}

/**
 * Kafka Consumer Manager
 * 
 * Manages multiple Kafka consumers for different topics.
 * Each consumer is handled by a separate IConsumer implementation.
 */
export class KafkaConsumerManager {
  private kafka: Kafka;
  private consumers: Map<string, Consumer> = new Map();
  private consumerHandlers: Map<string, BaseConsumer> = new Map();
  private config: KafkaConsumerManagerConfig;

  constructor(config: KafkaConsumerManagerConfig) {
    this.config = {
      clientId: "cmf-consumer-manager",
      ...config
    };

    // Parse broker string - support comma-separated list of brokers
    const brokers = this.config.broker
      .split(',')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    this.kafka = new Kafka({
      clientId: this.config.clientId!,
      brokers: brokers,
    });
  }

  /**
   * Register a consumer for a specific topic
   */
  async registerConsumer(consumer: BaseConsumer): Promise<void> {
    const topic = consumer.getTopic();
    const groupId = consumer.getGroupId();

    try {
      // Create a new consumer for this topic
      const kafkaConsumer = this.kafka.consumer({ 
        groupId: groupId 
      });

      await kafkaConsumer.connect();
      console.log(`✅ [ConsumerManager] Connected consumer for topic: ${topic}`);

      // Subscribe to the topic
      await kafkaConsumer.subscribe({ 
        topic: topic,
        fromBeginning: false 
      });
      console.log(`✅ [ConsumerManager] Subscribed to topic: ${topic} (groupId: ${groupId})`);

      // Store consumer and handler
      this.consumers.set(topic, kafkaConsumer);
      this.consumerHandlers.set(topic, consumer);

      // Call consumer's onInitialize if available
      if (consumer.onInitialize) {
        await consumer.onInitialize();
      }

      // Start consuming messages
      await kafkaConsumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(topic, payload);
        },
      });

      console.log(`🚀 [ConsumerManager] Started consuming from topic: ${topic}`);
    } catch (error) {
      console.error(`❌ [ConsumerManager] Error registering consumer for topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Handle incoming message from Kafka
   */
  private async handleMessage(topic: string, payload: EachMessagePayload): Promise<void> {
    try {
      const consumer = this.consumerHandlers.get(topic);
      if (!consumer) {
        console.error(`❌ [ConsumerManager] No handler found for topic: ${topic}`);
        return;
      }

      const messageValue = payload.message.value?.toString() ?? "";
      if (!messageValue) {
        console.warn(`⚠️ [ConsumerManager] Empty message received from topic: ${topic}`);
        return;
      }

      // Parse message
      const parsedMessage = JSON.parse(messageValue);

      // Delegate to consumer handler
      await consumer.handleMessage(parsedMessage, payload.message.value || undefined);
    } catch (error) {
      console.error(`❌ [ConsumerManager] Error handling message from topic ${topic}:`, error);
      // Don't throw - continue processing other messages
    }
  }

  /**
   * Disconnect all consumers
   */
  async disconnectAll(): Promise<void> {
    console.log(`🛑 [ConsumerManager] Disconnecting all consumers...`);

    // Call onDisconnect for each consumer
    for (const [topic, consumer] of this.consumerHandlers) {
      try {
        if (consumer.onDisconnect) {
          await consumer.onDisconnect();
        }
      } catch (error) {
        console.error(`❌ [ConsumerManager] Error in onDisconnect for topic ${topic}:`, error);
      }
    }

    // Disconnect all Kafka consumers
    const disconnectPromises = Array.from(this.consumers.values()).map(async (consumer) => {
      try {
        await consumer.disconnect();
      } catch (error) {
        console.error(`❌ [ConsumerManager] Error disconnecting consumer:`, error);
      }
    });

    await Promise.all(disconnectPromises);

    this.consumers.clear();
    this.consumerHandlers.clear();

    console.log(`✅ [ConsumerManager] All consumers disconnected`);
  }

  /**
   * Get list of all registered topics
   */
  getRegisteredTopics(): string[] {
    return Array.from(this.consumers.keys());
  }

  /**
   * Get consumer count
   */
  getConsumerCount(): number {
    return this.consumers.size;
  }
}
