/**
 * Message types for WebSocket communication in CMF
 * 
 * These enums define all possible message types that can be sent
 * between clients and the server.
 */

/**
 * Message types sent from Client → Server
 */
export enum ClientMessageType {
  /** Broadcast message to all clients via Kafka */
  BROADCAST_ALL = "broadcast-all",
  /** Send direct message to a specific client */
  BROADCAST_ONE = "broadcast-one",
  /** Disconnect a specific client by ID */
  KICK_ONE = "kick-one",
  /** Disconnect all connected clients */
  KICK_ALL = "kick-all",
  /** Join a chat room */
  JOIN_CHAT_ROOM = "join-chat-room",
  /** Leave a chat room */
  LEAVE_CHAT_ROOM = "leave-chat-room",
  /** Query all chat rooms (get list and count) */
  GET_CHAT_ROOMS = "get-chat-rooms",
  /** Send a message to a specific chat room */
  SEND_CHAT_ROOM_MESSAGE = "send-chat-room-message",
}

/**
 * Message types sent from Server → Client
 */
export enum ServerMessageType {
  /** Initial connection message with assigned client ID */
  WELCOME = "welcome",
  /** Direct message from another client */
  DIRECT = "direct",
  /** Error notification message */
  ERROR = "error",
  /** Notification that client has been disconnected */
  KICKED = "kicked",
  /** Updated list of all connected clients */
  CLIENT_LIST = "client-list",
  /** Notification of a new client connection */
  CLIENT_CONNECTED = "client-connected",
  /** Notification of a client disconnection */
  CLIENT_DISCONNECTED = "client-disconnected",
  /** Chat room message received */
  CHAT_ROOM_MESSAGE_RECEIVED = "chat-room-message-received",
  /** Chat room created notification */
  CHAT_ROOM_CREATED = "chat-room.created",
  /** Successfully joined a chat room */
  CHAT_ROOM_JOINED = "chat-room-joined",
  /** Left a chat room */
  CHAT_ROOM_LEFT = "chat-room-left",
  /** Online participants in a chat room */
  CHAT_ROOM_PARTICIPANTS_ONLINE = "chat-room-participants-online",
  /** Notification that a participant joined the chat room (real-time update) */
  CHAT_ROOM_PARTICIPANT_JOINED = "chat-room-participant-joined",
  /** Notification that a participant left the chat room (real-time update) */
  CHAT_ROOM_PARTICIPANT_LEFT = "chat-room-participant-left",
  /** Response with list of all chat rooms and their info */
  CHAT_ROOM_LIST = "chat-room-list",
}

/**
 * Union type of all message types
 */
export type MessageType = ClientMessageType | ServerMessageType;

/**
 * Type guard to check if a message type is a client message type
 */
export function isClientMessageType(type: string): type is ClientMessageType {
  return Object.values(ClientMessageType).includes(type as ClientMessageType);
}

/**
 * Type guard to check if a message type is a server message type
 */
export function isServerMessageType(type: string): type is ServerMessageType {
  return Object.values(ServerMessageType).includes(type as ServerMessageType);
}

