# CMF - WebSocket + Kafka Server

CMF is a real-time messaging server that combines WebSocket connections with Apache Kafka for scalable message broadcasting and direct messaging capabilities.

## 🚀 Features

### Core Functionality
- **WebSocket Server**: Real-time bidirectional communication on port 8088
- **Kafka Integration**: Scalable message streaming and broadcasting
- **Client Management**: Track and manage connected clients with unique IDs
- **Auto-reload Development**: Hot reloading with ts-node-dev for rapid development

### Key Features Available
- 📡 **Broadcast messaging** via Kafka - Send messages to all connected clients
- 💬 **Direct client-to-client messaging** - Send targeted messages to specific clients
- 👥 **Client management** - Kick individual clients or all clients at once
- 🔄 **Real-time message streaming** - Instant message delivery and updates
- 📊 **Kafka monitoring** via web UI at http://localhost:8095
- 🐳 **Docker support** - Easy local development with Kafka stack
- 🌐 **Web UI client** - Interactive HTML client simulator for testing functionality
- ⚡ **Message Types**:
  - `broadcast-all` - Broadcast to all clients (via Kafka)
  - `broadcast-one` - Direct messaging between clients
  - `kick-one` - Kick specific client
  - `kick-all` - Kick all connected clients

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
