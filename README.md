# CMF - WebSocket + Kafka Server

v3

**CMF** (Communication Message Framework) is a high-performance, real-time messaging server that seamlessly integrates WebSocket connections with Apache Kafka. Built with TypeScript and Node.js, CMF enables scalable, distributed real-time communication by combining the low-latency benefits of WebSocket with the robust message streaming capabilities of Kafka.

## 🎯 What is CMF?

CMF bridges the gap between real-time client communication and distributed message processing. It's designed for applications that require:

- **Real-time bidirectional communication** between clients and servers
- **Scalable message broadcasting** across multiple server instances
- **Reliable message delivery** with Kafka's persistence and fault tolerance
- **Horizontal scalability** through Kafka's distributed architecture
- **Client management** capabilities for connection control and monitoring

Perfect for chat applications, real-time dashboards, live notifications, collaborative tools, gaming servers, and any system requiring instant message delivery at scale.

## 🚀 Features

### Core Architecture
- **WebSocket Server**: Real-time bidirectional communication on port 8088 (configurable)
- **Kafka Integration**: Full producer/consumer integration with Apache Kafka for scalable message streaming
- **HTTP Server**: Built-in HTTP server for health checks and monitoring
- **TypeScript**: Fully typed codebase for better maintainability and developer experience
- **Modular Design**: Separated concerns with dedicated Kafka and WebSocket service classes

### Messaging Capabilities
- 📡 **Broadcast Messaging**: Send messages to all connected clients via Kafka for distributed broadcasting
- 💬 **Direct Messaging**: Point-to-point communication between specific clients
- 🔄 **Real-time Delivery**: Instant message delivery with WebSocket's low-latency protocol
- 📨 **Message Persistence**: Messages stored in Kafka for reliability and replay capabilities
- ⏱️ **Timestamp Support**: Automatic timestamping of all messages for tracking and ordering
- 🔑 **Message Keys**: Kafka messages keyed by sender for efficient partitioning

### Client Management
- 🆔 **Unique Client IDs**: Automatic assignment of unique identifiers (`client-1`, `client-2`, etc.)
- 👥 **Client Tracking**: Real-time tracking of all connected clients with in-memory Map storage
- 📊 **Client Count**: Live monitoring of connected client count
- 📋 **Client List Broadcasting**: Automatic distribution of client list updates to all connected clients
- 🔔 **Connection Notifications**: Real-time notifications when clients connect or disconnect
- 👢 **Client Kicking**: Ability to disconnect individual clients or all clients simultaneously
- ✅ **Connection State Management**: Proper handling of WebSocket connection states (OPEN, CLOSED, etc.)

### Message Types

#### Client → Server Messages
- `broadcast-all` / `broadcast` - Broadcast message to all clients (via Kafka)
- `broadcast-one` - Send direct message to a specific client
- `kick-one` - Disconnect a specific client by ID
- `kick-all` - Disconnect all connected clients

#### Server → Client Messages
- `welcome` - Initial connection message with assigned client ID
- `kafka` - Broadcast message received from Kafka
- `direct` - Direct message from another client
- `error` - Error notification message
- `kicked` - Notification that client has been disconnected
- `client-list` - Updated list of all connected clients
- `client-connected` - Notification of a new client connection
- `client-disconnected` - Notification of a client disconnection

### Development & Testing
- 🔥 **Hot Reload**: Auto-reload development mode with `ts-node-dev` for rapid iteration
- 🌐 **Web Client Simulator**: Interactive HTML client (`client-simulator.html`) for testing:
  - Visual connection status indicator
  - Real-time message log with timestamps (HKT timezone)
  - Client list sidebar with current client highlighting
  - Toast notifications for incoming messages
  - Responsive design for mobile and desktop
  - Keyboard shortcuts (Enter to send messages)
- 🧪 **CI/CD Ready**: Test scripts included for continuous integration
- 📝 **Comprehensive Logging**: Detailed console logs for debugging and monitoring

### Infrastructure & Deployment
- 🐳 **Docker Support**: 
  - Production-ready Dockerfile with multi-stage builds
  - Non-root user for security
  - Optimized Alpine-based image
- 🐙 **Docker Compose**: Complete Kafka stack setup:
  - Zookeeper (port 2181)
  - Kafka broker (port 9092)
  - Kafka UI for monitoring (port 8095)
- ☸️ **Kubernetes Support**: 
  - Helm charts for both server and client simulator
  - Separate configurations for dev and production environments
  - Health check probes (liveness and readiness)
  - Horizontal Pod Autoscaling (HPA) support
  - ConfigMap and Service definitions
  - Ingress configuration

### Monitoring & Health
- ❤️ **Health Check Endpoint**: `/health` endpoint returning:
  - Server status
  - Current timestamp
  - Connected client count
  - Kafka connection status
- 📊 **Kafka UI Integration**: Web-based interface for Kafka topic and message monitoring
- 📈 **Connection Metrics**: Real-time tracking of WebSocket connections
- 🔍 **Error Handling**: Comprehensive error handling with user-friendly error messages

### Configuration & Flexibility
- ⚙️ **Environment Variables**:
  - `PORT` - WebSocket server port (default: 8088)
  - `KAFKA_BROKER` - Kafka broker address (default: localhost:9092)
  - `KAFKA_TOPIC` - Kafka topic name (default: ws-messages)
- 🔧 **Customizable Kafka Settings**:
  - Configurable client ID and consumer group ID
  - Topic subscription with `fromBeginning` option
  - Message handler pattern for extensibility

### Reliability & Performance
- 🛡️ **Graceful Shutdown**: Proper cleanup on SIGTERM and SIGINT signals
- 🔄 **Connection Recovery**: Automatic reconnection handling for Kafka consumers
- 💾 **Message Durability**: Kafka's persistent message storage
- ⚡ **Low Latency**: WebSocket for instant message delivery
- 📦 **Consumer Groups**: Kafka consumer group support for load balancing
- 🔐 **Error Resilience**: Robust error handling preventing server crashes

## 📋 Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- npm or yarn

## 🛠️ Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Kafka Services

```bash
docker-compose up -d
```

This will start:
- **Zookeeper** (port 2181)
- **Kafka** (port 9092)
- **Kafka UI** (port 8095) - Web interface for Kafka management

### 3. Start the WebSocket Server

```bash
# Development mode with auto-reload
npm run dev

# Or build and run in production
npm run build
npm start
```

The server will start on port **8088** by default.

## 🎯 Usage

### WebSocket Server

The server runs on `ws://localhost:8088` and supports the following message types:

#### Client → Server Messages

```javascript
// Broadcast message to all clients (via Kafka)
{
  "type": "broadcast-all",
  "message": "Hello everyone!"
}

// Send direct message to specific client
{
  "type": "broadcast-one", 
  "targetId": "client-1",
  "message": "Hello client-1!"
}

// Kick specific client
{
  "type": "kick-one",
  "targetId": "client-1"
}

// Kick all clients
{
  "type": "kick-all"
}
```

#### Server → Client Messages

```javascript
// Welcome message with client ID
{
  "type": "welcome",
  "clientId": "client-1"
}

// Kafka broadcast message
{
  "type": "kafka",
  "message": "Broadcasted message content"
}

// Direct message
{
  "type": "direct",
  "from": "server",
  "message": "Direct message content"
}

// Kick notification
{
  "type": "kick",
  "message": "You have been kicked out."
}

// Error message
{
  "type": "error", 
  "message": "Error description"
}
```

### Testing with Web Client

1. Open `client-simulator.html` in your browser
2. Click "Connect" to establish WebSocket connection
3. Use the interface to:
   - Send broadcast messages
   - Send direct messages to specific clients
   - Kick individual or all clients
   - View real-time message logs

### Testing with Command Line

You can also test using `wscat`:

```bash
# Install wscat globally
npm install -g wscat

# Connect to server
wscat -c ws://localhost:8088

# Send a broadcast message
{"type": "broadcast-all", "message": "Hello from command line!"}
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8088` | WebSocket server port |
| `KAFKA_BROKER` | `localhost:9092` | Kafka broker address |
| `KAFKA_TOPIC` | `ws-messages` | Kafka topic for messages |

### Example with custom configuration:

```bash
PORT=4000 KAFKA_BROKER=localhost:9092 KAFKA_TOPIC=my-topic npm run dev
```

## 🐳 Docker Deployment

### Build and run the application:

```bash
# Build the Docker image
docker build -t cmf .

# Run the container
docker run -p 8088:8088 \
  -e KAFKA_BROKER=your-kafka-broker:9092 \
  -e KAFKA_TOPIC=your-topic \
  cmf
```

### Kubernetes Deployment

The project includes Kubernetes manifests in the `k8s/` directory:

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/
```

## 📊 Monitoring

### Kafka UI

Access the Kafka UI at `http://localhost:8095` to:
- View topics and messages
- Monitor consumer groups
- Inspect message content
- Manage Kafka configuration

### Server Logs

The server provides detailed logging:
- Client connections/disconnections
- Message flow (WebSocket ↔ Kafka)
- Error handling and debugging info

## 🏗️ Architecture

```
┌─────────────────┐    WebSocket    ┌──────────────────┐
│   Web Client    │◄──────────────►│  WebSocket       │
│   (client-simulator.html) │       │  Server          │
└─────────────────┘                 │  (port 8088)     │
                                    └─────────┬────────┘
                                              │
                                              │ Kafka
                                              ▼
                                    ┌──────────────────┐
                                    │  Kafka Broker    │
                                    │  (port 9092)     │
                                    └──────────────────┘
```

## 🧪 Development

### Project Structure

```
├── src/
│   └── server.ts          # Main WebSocket + Kafka server
├── k8s/
│   ├── deployment.yaml    # Kubernetes deployment
│   └── service.yaml       # Kubernetes service
├── client-simulator.html  # Web client simulator for testing
├── docker-compose.yml     # Kafka development stack
├── Dockerfile            # Application container
└── package.json          # Dependencies and scripts
```

### Available Scripts

```bash
npm run dev      # Start development server with auto-reload
npm run build    # Compile TypeScript to JavaScript
npm start        # Start production server
```

### Adding New Features

1. **New Message Types**: Add new cases in the WebSocket message handler
2. **Kafka Topics**: Modify the `KAFKA_TOPIC` environment variable
3. **Client Management**: Extend the `clients` Map functionality
4. **Authentication**: Add authentication middleware before WebSocket upgrade

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 8088, 8080, 9092, and 2181 are available
2. **Kafka connection**: Verify Kafka is running with `docker-compose ps`
3. **WebSocket connection**: Check browser console for connection errors
4. **Message not received**: Verify Kafka topic exists and consumer is subscribed

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=* npm run dev
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review server logs for error details
