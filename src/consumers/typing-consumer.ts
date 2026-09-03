import {BaseConsumer} from "./base-consumer";
import {WebSocketService} from "../service/websocket-service";
import {KafkaTopics, instanceConsumerGroup} from "../enu/kafka-topics";
import {ServerMessageType} from "../enu/message-types";

/**
 * Every CMF pod consumes typing events and fans out to local sockets in the room.
 */
export class TypingConsumer implements BaseConsumer {
    private webSocketService: WebSocketService;

    constructor(webSocketService: WebSocketService) {
        this.webSocketService = webSocketService;
    }

    getTopic(): string {
        return KafkaTopics.WS_TYPING;
    }

    getGroupId(): string {
        return instanceConsumerGroup(this.getTopic());
    }

    async handleMessage(message: any): Promise<void> {
        const chatRoomId = message?.chatRoomId as string | undefined;
        if (!chatRoomId) {
            return;
        }
        const isTyping = Boolean(message.isTyping);
        this.webSocketService.deliverDirectedToRoom(
            chatRoomId,
            {
                type: isTyping
                    ? ServerMessageType.CHAT_ROOM_TYPING
                    : ServerMessageType.CHAT_ROOM_TYPING_STOPPED,
                chatRoomId,
                participantId: message.participantId,
                isTyping,
            },
            { originClientId: message.originClientId }
        );
    }
}
