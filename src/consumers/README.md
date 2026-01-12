# Kafka Consumers Guide

This directory contains all Kafka consumer implementations. Each consumer handles messages from a specific Kafka topic.

## Architecture

- **Base Interface**: `base-consumer.ts` - Defines the `BaseConsumer` interface that all consumers must implement
- **Consumer Classes**: Individual consumer classes for each topic (e.g., `chat-room-consumer.ts`)
- **Consumer Manager**: `../kafka-consumer-manager.ts` - Manages all consumers and routes messages

## Adding a New Consumer

To add a new Kafka topic consumer, follow these steps:

### Step 1: Create Consumer Class

Create a new file in `src/consumers/` directory:

```typescript
// src/consumers/your-new-consumer.ts
import { IConsumer } from "./base-consumer";
import { WebSocketService } from "../websocket-service";

/**
 * Your event interface (matching Spring Boot event structure)
 */
export interface YourEvent {
  field1: string;
  field2: number;
  // ... other fields
}

/**
 * Consumer for your-topic-name topic
 */
export class YourNewConsumer implements IConsumer {
  private webSocketService: WebSocketService;

  constructor(webSocketService: WebSocketService) {
    this.webSocketService = webSocketService;
  }

  getTopic(): string {
    return process.env.YOUR_TOPIC_ENV || "your-topic-name";
  }

  getGroupId(): string {
    return "cmf-your-topic-group";
  }

  async handleMessage(message: any): Promise<void> {
    try {
      const event: YourEvent = message;
      
      console.log(`📥 [YourNewConsumer] Received event: ${JSON.stringify(event)}`);
      
      // Process the event and broadcast to WebSocket clients
      this.webSocketService.broadcastChatMessage({
        type: "your-message-type",
        // ... your message structure
      });

      console.log(`📤 [YourNewConsumer] Processed and broadcasted message`);
    } catch (error) {
      console.error(`❌ [YourNewConsumer] Error processing message:`, error);
      throw error;
    }
  }

  onInitialize(): void {
    console.log(`✅ [YourNewConsumer] Initialized for topic: ${this.getTopic()}`);
  }

  onDisconnect(): void {
    console.log(`🛑 [YourNewConsumer] Disconnected from topic: ${this.getTopic()}`);
  }
}
```

### Step 2: Register Consumer in server.ts

Add your consumer to `src/server.ts`:

```typescript
import { YourNewConsumer } from "./consumers/your-new-consumer";

// In startServer() function, after creating webSocketService:
await consumerManager.registerConsumer(
  new YourNewConsumer(webSocketService)
);
```

### Step 3: (Optional) Add Topic to kafka-topics.ts

If you want centralized topic configuration:

```typescript
// src/kafka-topics.ts
export const KafkaTopics = {
  // ... existing topics
  YOUR_TOPIC: process.env.YOUR_TOPIC_ENV || "your-topic-name",
} as const;
```

Then use it in your consumer:

```typescript
import { getTopic } from "../kafka-topics";

getTopic(): string {
  return getTopic("YOUR_TOPIC");
}
```

## Example: Existing Consumers

### ChatRoomConsumer
- **Topic**: `messenger.chat-room`
- **Handles**: Chat room events from Spring Boot
- **Action**: Broadcasts chat messages to WebSocket clients

### ChatMessageConsumer
- **Topic**: `messenger-ws.chat-messages`
- **Handles**: General chat messages (backward compatibility)
- **Action**: Broadcasts messages to WebSocket clients

## Benefits of This Architecture

1. **Scalable**: Easy to add new topics without modifying existing code
2. **Maintainable**: Each consumer is self-contained
3. **Testable**: Each consumer can be tested independently
4. **Type-Safe**: TypeScript interfaces ensure type safety
5. **Flexible**: Each consumer can have different group IDs and processing logic

## Consumer Lifecycle

1. **Registration**: Consumer is registered via `consumerManager.registerConsumer()`
2. **Initialization**: `onInitialize()` is called (if implemented)
3. **Message Processing**: `handleMessage()` is called for each message
4. **Disconnection**: `onDisconnect()` is called when shutting down

## Error Handling

- Errors in `handleMessage()` are caught and logged
- Consumer continues processing other messages even if one fails
- Errors don't crash the entire consumer manager
