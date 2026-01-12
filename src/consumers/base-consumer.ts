/**
 * Base Consumer Interface
 * 
 * All Kafka consumers should implement this interface.
 * This allows for easy extension when adding new topics.
 */

export interface BaseConsumer {
  /**
   * Get the topic name this consumer listens to
   */
  getTopic(): string;

  /**
   * Get the consumer group ID
   */
  getGroupId(): string;

  /**
   * Process a message from Kafka
   * @param message - The parsed message from Kafka
   * @param rawMessage - The raw message buffer (optional, for debugging)
   */
  handleMessage(message: any, rawMessage?: Buffer): Promise<void> | void;

  /**
   * Called when consumer is initialized
   */
  onInitialize?(): Promise<void> | void;

  /**
   * Called when consumer is disconnected
   */
  onDisconnect?(): Promise<void> | void;
}
