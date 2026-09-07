import {BaseConsumer} from "./base-consumer";
import {WebSocketService} from "../service/websocket-service";
import {KafkaTopics, instanceConsumerGroup} from "../enu/kafka-topics";
import {ServerMessageType} from "../enu/message-types";

export class ChatReactionConsumer implements BaseConsumer {
    private webSocketService: WebSocketService;

    constructor(webSocketService: WebSocketService) {
        this.webSocketService = webSocketService;
    }

    getTopic(): string {
        return KafkaTopics.WS_CHAT_REACTIONS;
    }

    getGroupId(): string {
        return instanceConsumerGroup(this.getTopic());
    }

    async handleMessage(message: any): Promise<void> {
        const chatRoomId = message?.chatRoomId as string | undefined;
        if (!chatRoomId) {
            return;
        }
        this.webSocketService.broadcastToChatRoom(chatRoomId, {
            type: ServerMessageType.CHAT_ROOM_REACTION,
            chatRoomId,
            messageId: message.messageId,
            from: message.from,
            emoji: message.emoji,
            removed: Boolean(message.removed),
            reactions: message.reactions || [],
        });
    }
}
