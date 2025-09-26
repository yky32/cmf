# CMF Client Simulator Helm Chart

This Helm chart deploys the CMF WebSocket Client Simulator to Kubernetes using nginx-ingress.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- nginx-ingress controller installed

## Installation

### Development Environment

```bash
# Install with dev values
helm install cmf-client ./k8s/cmf-client -f ./k8s/cmf-client/values-dev.yaml

# Or upgrade if already installed
helm upgrade cmf-client ./k8s/cmf-client -f ./k8s/cmf-client/values-dev.yaml
```

### Production Environment

```bash
# Install with production values
helm install cmf-client ./k8s/cmf-client -f ./k8s/cmf-client/values-prd.yaml

# Or upgrade if already installed
helm upgrade cmf-client ./k8s/cmf-client -f ./k8s/cmf-client/values-prd.yaml
```

## Configuration

### Key Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | Container image repository | `nginx` |
| `image.tag` | Container image tag | `1.25-alpine` |
| `service.port` | Service port | `80` |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.hosts[0].host` | Ingress hostname | `cmf-client.local` |
| `env.WEBSOCKET_URL` | WebSocket server URL | `ws://cmf.local` |
| `env.API_BASE_URL` | API base URL | `http://cmf.local` |
| `replicaCount` | Number of replicas | `1` |

### Environment Variables

- `WEBSOCKET_URL`: WebSocket server connection URL
- `API_BASE_URL`: Base URL for API calls

### Ingress Configuration

The chart configures nginx-ingress with the following features:

- **Development**: HTTP access with `cmf-client-dev.local`
- **Production**: HTTPS access with `cmf-client.example.com`
- **WebSocket Support**: Configured for WebSocket connections
- **SSL Redirect**: Enabled in production

## Accessing the Client

### Development
```bash
# Add to /etc/hosts
127.0.0.1 cmf-client-dev.local

# Access via browser
http://cmf-client-dev.local
```

### Production
```bash
# Access via browser
https://cmf-client.example.com
```

## Port Forwarding (Alternative Access)

```bash
# Port forward to local machine
kubectl port-forward service/cmf-client 8080:80

# Access via browser
http://localhost:8080
```

## Uninstalling

```bash
helm uninstall cmf-client
```

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -l app.kubernetes.io/name=cmf-client
```

### Check Service
```bash
kubectl get svc cmf-client
```

### Check Ingress
```bash
kubectl get ingress cmf-client
```

### View Logs
```bash
kubectl logs -l app.kubernetes.io/name=cmf-client
```

### Test WebSocket Connection
```bash
# Check if WebSocket URL is accessible
curl -I http://cmf-client-dev.local
```

## Customization

### Custom WebSocket URL
```yaml
# values-custom.yaml
env:
  WEBSOCKET_URL: "ws://your-websocket-server:8088"
  API_BASE_URL: "http://your-api-server"
```

### Custom Ingress Host
```yaml
# values-custom.yaml
ingress:
  hosts:
    - host: your-custom-host.local
      paths:
        - path: /
          pathType: Prefix
```

## Architecture

The client simulator consists of:

1. **nginx Container**: Serves the HTML client
2. **ConfigMap**: Contains nginx configuration and HTML content
3. **Service**: Exposes the nginx container
4. **Ingress**: Provides external access via nginx-ingress

## Features

- ✅ WebSocket connection testing
- ✅ Real-time message broadcasting
- ✅ Direct client messaging
- ✅ Client management (kick, list)
- ✅ Toast notifications
- ✅ Responsive design
- ✅ Hong Kong timezone display
- ✅ Health check endpoint
