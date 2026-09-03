import { Kafka, Producer } from "kafkajs";

export interface KafkaMessage {
  from: string;
  message: string;
  timestamp?: number;
}

export interface KafkaServiceConfig {
  broker: string;
  topic: string;
  clientId?: string;
}

export class KafkaService {
  private kafka: Kafka;
  private producer: Producer;
  private config: KafkaServiceConfig;

  constructor(config: KafkaServiceConfig) {
    this.config = {
      clientId: "cmf-producer",
      ...config
    };

    const brokers = this.config.broker
      .split(",")
      .map(b => b.trim())
      .filter(b => b.length > 0);

    this.kafka = new Kafka({
      clientId: this.config.clientId!,
      brokers: brokers,
    });

    this.producer = this.kafka.producer();
  }

  async initialize(): Promise<void> {
    try {
      await this.producer.connect();
      console.log("✅ [KafkaService] Producer connected");
    } catch (error) {
      console.error("❌ [KafkaService] Producer initialization error:", error);
      throw error;
    }
  }

  async sendJson(topic: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(payload) }],
      });
    } catch (error) {
      console.error(`❌ [KafkaService] Error sending JSON to ${topic}:`, error);
      throw error;
    }
  }

  async sendMessage(message: KafkaMessage, topic?: string): Promise<void> {
    try {
      const targetTopic = topic || this.config.topic;
      await this.producer.send({
        topic: targetTopic,
        messages: [{
          value: JSON.stringify(message),
          key: message.from
        }],
      });
      console.log(`📤 [KafkaService] Sent message to topic ${targetTopic}: ${JSON.stringify(message)}`);
    } catch (error) {
      console.error("❌ [KafkaService] Error sending message to Kafka:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      console.log("✅ [KafkaService] Producer disconnected");
    } catch (error) {
      console.error("❌ [KafkaService] Error disconnecting producer:", error);
    }
  }
}
