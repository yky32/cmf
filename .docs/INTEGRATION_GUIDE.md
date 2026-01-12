# CMF ↔ Messenger Integration Guide

## Overview

This document explains how **CMF** (Communication Message Framework) integrates with the **Messenger** Spring Boot service to provide real-time chat functionality with chat rooms and participants. The architecture is **centralized through Spring Boot**, with all business logic and API interactions going through the Spring Boot service, while CMF acts as a **real-time WebSocket broadcasting layer** that receives messages from Kafka.

## Architecture Overview

### Centralized Architecture (Spring Boot First)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web Client                               │
│  • REST API calls → Spring Boot                                  │
│  • WebSocket connection → CMF (receive-only)                    │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
               │ REST API                     │ WebSocket (receive-only)
               │ (POST, GET)                  │ (ws://localhost:8088)
               │                              │
┌──────────────▼──────────────────────────────┴───────────────────┐
│              Spring Boot (Messenger Service)                     │
│  • REST API Endpoints (port 9010)                                │
│  • Business Logic & Validation                                   │
│  • Database Persistence (PostgreSQL)                             │
│  • Kafka Producer (publishes to Kafka)                           │
│  • Kafka Consumer (processes internal events)                     │
└──────────────┬───────────────────────────────────────────────────┘
               │ Kafka Producer
               │ Topic: messenger-ws.chat-messages
               │
┌──────────────▼───────────────────────────────────────────────────┐
│              Kafka Broker (localhost:9092)                        │
│  Topics:                                                          │
│  • messenger-ws.chat-messages (Spring Boot → CMF)                │
│  • messenger.chat (internal Spring Boot processing)               │
│  • messenger.chat-room (chat room events)                         │
└──────────────┬───────────────────────────────────────────────────┘
               │ Kafka Consumer
               │ Topic: messenger-ws.chat-messages
               │
┌──────────────▼───────────────────────────────────────────────────┐
│                    CMF (Node.js/TypeScript)                      │
│  • Kafka Consumer (consumes from messenger-ws.chat-messages)     │
│  • WebSocket Server (port 8088)                                  │
│  • Real-time message broadcasting to WebSocket clients          │
│  • NO direct message sending from clients                         │
└──────────────┬───────────────────────────────────────────────────┘
               │ WebSocket (broadcast only)
               │
┌──────────────▼───────────────────────────────────────────────────┐
│                         Web Client                               │
│  Receives real-time updates via WebSocket                        │
└──────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Spring Boot is the Single Source of Truth**
   - All business logic resides in Spring Boot
   - All API interactions go through Spring Boot REST endpoints
   - Spring Boot validates, processes, and stores all data

2. **CMF is a Broadcasting Layer**
   - CMF only receives messages from Kafka (consumes `messenger-ws.chat-messages`)
   - CMF broadcasts to WebSocket clients (one-way: server → client)
   - Web clients do NOT send messages through WebSocket to CMF
   - Web clients send messages via REST API to Spring Boot

3. **Kafka is the Communication Bridge**
   - Spring Boot publishes events to Kafka
   - CMF consumes from Kafka and broadcasts via WebSocket
   - Real-time, asynchronous communication

## Complete Data Flow

### 1. Creating a Chat Room with Participants

**Step 1: Web Client → Spring Boot REST API**
```http
POST http://localhost:9010/chat/my-rooms
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Project Discussion",
  "participantIds": ["profile_123", "profile_456", "profile_789"]
}
```

**Step 2: Spring Boot Processing**
- Validates request and authentication
- Creates `ChatRoom` entity (type: GROUP if >1 participant, DIRECT if 1)
- Creates `Participant` entities for each participant
- Stores in PostgreSQL database
- Returns chat room details with participants

**Step 3: Web Client Receives Response**
```json
{
  "code": 200,
  "data": {
    "id": "cr_1234567890",
    "name": "Project Discussion",
    "type": "GROUP",
    "metadata": {
      "ownerId": "profile_123",
      "participantCount": 3
    },
    "participants": [
      { "linkId": "profile_123", "joinedAt": "2024-01-06T10:00:00Z" },
      { "linkId": "profile_456", "joinedAt": "2024-01-06T10:00:00Z" },
      { "linkId": "profile_789", "joinedAt": "2024-01-06T10:00:00Z" }
    ]
  }
}
```

### 2. Sending a Chat Message (Centralized Flow)

**Step 1: Web Client → Spring Boot REST API**
```http
POST http://localhost:9010/chat/rooms/cr_1234567890/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hello everyone! Let's discuss the project."
}
```

**Step 2: Spring Boot Processing**
- Validates request (chat room exists, user is participant, etc.)
- Creates `ChatMessageEvent` and publishes to Kafka topic: `messenger.chat`

**Step 3: Spring Boot Kafka Listener Processes Event**
- `ChatMessageHandler` consumes from `messenger.chat` topic
- `MessengerUseCase.execute()`:
  1. **Stores message** in database (`ChatMessage` entity)
  2. **Publishes to WebSocket** via Kafka topic `messenger-ws.chat-messages`

**Step 4: CMF Consumes from Kafka**
- CMF's `KafkaService` consumes from `messenger-ws.chat-messages` topic
- Receives `ChatMessageEvent` and broadcasts to all connected WebSocket clients

**Step 5: Web Clients Receive Real-time Update**
- All connected WebSocket clients receive the message
- Clients update their UI in real-time

### 3. WebSocket Connection (Receive-Only)

**Step 1: Web Client Connects to CMF**
```javascript
const ws = new WebSocket('ws://localhost:8088');
```

**Step 2: CMF Sends Welcome Message**
```json
{
  "type": "welcome",
  "clientId": "client-1",
  "message": "Connected to chat server"
}
```

**Step 3: Client Listens for Messages**
```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch(message.type) {
    case 'kafka':
      // Handle chat message
      displayChatMessage(message);
      break;
    case 'client-connected':
      // Handle participant joined
      updateParticipantList(message);
      break;
  }
};
```

**Important:** Web clients do NOT send messages through WebSocket. All message sending goes through REST API to Spring Boot.

## Key Components

### Spring Boot (Messenger Service) - Central Integration Point

**Location:** `/Users/wayneyu/Documents/Development/Git/qs/tgt.messenger`

**Technology:** Spring Boot 3.1.0 + Java 17 + PostgreSQL + Kafka

**Key REST Endpoints:**
- `POST /chat/my-rooms` - Create chat room with participants
- `GET /chat/my-rooms` - List user's chat rooms
- `GET /chat/my-rooms/{id}/messages` - Get messages for a room
- `POST /chat/rooms/{id}/messages` - Send message (triggers Kafka)

**Kafka Topics:**
- `messenger-ws.chat-messages` - Messages to broadcast via WebSocket (Spring Boot → CMF)
- `messenger.chat` - Internal message processing (Spring Boot → Spring Boot)

**Key Classes:**
- `ChatRoomEndpoint` - REST API for chat rooms
- `ChatEndpoint` - REST API for sending messages
- `ChatMessageHandler` - Kafka listener for message processing
- `MessengerUseCase` - Business logic: stores message + publishes to WebSocket

### CMF (Communication Message Framework) - Broadcasting Layer

**Location:** `/Users/wayneyu/Documents/Development/Git/yky/cmf`

**Technology:** Node.js + TypeScript + WebSocket + Kafka

**Key Responsibilities:**
- ✅ Kafka consumer (consumes from `messenger-ws.chat-messages`)
- ✅ WebSocket server (broadcasts to connected clients)
- ❌ NO business logic
- ❌ NO message validation
- ❌ NO database access

**Configuration:**
- Port: `8088`
- Kafka Topic: `messenger-ws.chat-messages` (consumes from this topic)
- Kafka Broker: `localhost:9092`

## Setup Instructions

### 1. Start Kafka Infrastructure
```bash
cd /Users/wayneyu/Documents/Development/Git/yky/cmf
docker-compose up -d
```

### 2. Start CMF Server
```bash
cd /Users/wayneyu/Documents/Development/Git/yky/cmf
npm install
npm run dev
```

### 3. Start Messenger Service
```bash
cd /Users/wayneyu/Documents/Development/Git/qs/tgt.messenger
export JAVA_HOME=/Users/wayneyu/Library/Java/JavaVirtualMachines/corretto-17.0.16/Contents/Home
mvn clean package -DskipTests
java -jar target/messenger-1.0.0.jar
```

## Client Implementation

### Web Client - REST API Usage

**Send Message:**
```javascript
const response = await fetch(`http://localhost:9010/chat/rooms/${roomId}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Hello everyone!'
  })
});
```

### Web Client - WebSocket Usage (Receive-Only)

**Connect to WebSocket:**
```javascript
const ws = new WebSocket('ws://localhost:8088');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'kafka') {
    displayChatMessage(message);
  }
};
```

**Important:** Do NOT send messages through WebSocket. Always use REST API to send messages.

## Reference: Flow Diagram

Based on `flow_of_chat.pdf`, the architecture follows this centralized pattern:

```
Web Client
    │
    ├─→ REST API → Spring Boot → Database
    │                    │
    │                    └─→ Kafka → CMF → WebSocket → Web Client
    │
    └─→ WebSocket ← CMF ← Kafka ← Spring Boot
         (receive only)
```

All interactions flow through Spring Boot first, ensuring centralized control and validation.
