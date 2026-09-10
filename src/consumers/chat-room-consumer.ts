import {BaseConsumer} from "./base-consumer";
import {WebSocketService} from "../service/websocket-service";
import {KafkaTopics, instanceConsumerGroup} from "../enu/kafka-topics";
import {ChatRoomCreatedEvent, ChatRoomKickEvent} from "../enu/events";

/**
 * Consumer for messenger.chat-room topic
 *
 * create vs WSS kick are different types. Do not treat every chatRoomId as create.
 */
export class ChatRoomConsumer implements BaseConsumer {
    private webSocketService: WebSocketService;

    constructor(webSocketService: WebSocketService) {
        this.webSocketService = webSocketService;
    }

    getTopic(): string {
        return KafkaTopics.CHAT_ROOM;
    }

    getGroupId(): string {
        return instanceConsumerGroup(this.getTopic());
    }

    async handleMessage(message: any): Promise<void> {
        try {
            const type = message?.type;
            const chatRoomId = message?.chatRoomId;
            if (!chatRoomId) {
                console.warn(`⚠️ [ChatRoomConsumer] Received chat room event without chatRoomId:`, message);
                return;
            }

            if (type === "chat-room.kick") {
                const kick = message as ChatRoomKickEvent;
                this.webSocketService.kickAliasFromRoom(chatRoomId, kick.alias);
                return;
            }

            if (type === "chat-room.created") {
                const created = message as ChatRoomCreatedEvent;
                this.webSocketService.createChatRoom(chatRoomId, {
                    type: created.type,
                    name: created.name,
                    participantIds: created.participantIds
                });
                return;
            }

            console.warn(`⚠️ [ChatRoomConsumer] Received unknown chat room activity event:`, message);
        } catch (error) {
            console.error(`❌ [ChatRoomConsumer] Error processing chat room activity event:`, error);
            throw error;
        }
    }

    onInitialize(): void {
        console.log(`✅ [ChatRoomConsumer] Initialized for topic: ${this.getTopic()}`);
    }

    onDisconnect(): void {
        console.log(`🛑 [ChatRoomConsumer] Disconnected from topic: ${this.getTopic()}`);
    }
}
