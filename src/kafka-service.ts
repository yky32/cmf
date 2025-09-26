import { Kafka, Producer, Consumer } from "kafkajs";

export interface KafkaMessage {
  from: string;
  message: string;
  timestamp?: number;
}

export interface KafkaServiceConfig {
  broker: string;
  topic: string;
  clientId?: string;
  groupId?: string;
}

export class KafkaService {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private config: KafkaServiceConfig;
  private messageHandlers: ((message: KafkaMessage) => void)[] = [];

  constructor(config: KafkaServiceConfig) {
    this.config = {
      clientId: "ws-server",
      groupId: "ws-group",
      ...config
    };

    this.kafka = new Kafka({
      clientId: this.config.clientId!,
      brokers: [this.config.broker],
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: this.config.groupId! });
  }

  async initialize(): Promise<void> {
    try {
      await this.producer.connect();
      console.log("✅ Kafka producer connected");

      await this.consumer.connect();
      console.log("✅ Kafka consumer connected");

      await this.consumer.subscribe({ 
        topic: this.config.topic, 
        fromBeginning: false 
      });
      console.log(`✅ Subscribed to topic: ${this.config.topic}`);

      await this.consumer.run({
        eachMessage: async ({ message }) => {
          try {
            const msg = message.value?.toString() ?? "";
            const parsedMessage: KafkaMessage = JSON.parse(msg);
            console.log(`📥 Kafka → WS: ${msg}`);

            // Notify all registered message handlers
            this.messageHandlers.forEach(handler => {
              try {
                handler(parsedMessage);
              } catch (error) {
                console.error("Error in message handler:", error);
              }
            });
          } catch (error) {
            console.error("Error processing Kafka message:", error);
          }
        },
      });
    } catch (error) {
      console.error("Kafka initialization error:", error);
      throw error;
    }
  }

  async sendMessage(message: KafkaMessage): Promise<void> {
    try {
      await this.producer.send({
        topic: this.config.topic,
        messages: [{ 
          value: JSON.stringify(message),
          key: message.from 
        }],
      });
      console.log(`📤 WS → Kafka: ${JSON.stringify(message)}`);
    } catch (error) {
      console.error("Error sending message to Kafka:", error);
      throw error;
    }
  }

  onMessage(handler: (message: KafkaMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  removeMessageHandler(handler: (message: KafkaMessage) => void): void {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      console.log("✅ Kafka disconnected");
    } catch (error) {
      console.error("Error disconnecting from Kafka:", error);
    }
  }

  getConfig(): KafkaServiceConfig {
    return { ...this.config };
  }

  isConnected(): boolean {
    return !!(this.producer && this.consumer);
  }
}
