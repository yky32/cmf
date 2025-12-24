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
}

/**
 * Message types sent from Server → Client
 */
export enum ServerMessageType {
  /** Initial connection message with assigned client ID */
  WELCOME = "welcome",
  /** Broadcast message received from Kafka */
  KAFKA = "kafka",
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

