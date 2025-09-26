# CMF - Helm Chart

This Helm chart deploys CMF (WebSocket Kafka Server) with nginx-ingress and Horizontal Pod Autoscaler (HPA) on a Kubernetes cluster.

## Prerequisites

- Kubernetes 1.20+
- Helm 3.0+
- nginx-ingress controller installed
- Metrics Server installed (required for HPA)

## Installation

### Quick Start

```bash
# Install with default values
helm install cmf ./k8s/helm/cmf

# Install with environment-specific values
helm install cmf ./k8s/helm/cmf -f values-dev.yaml
```

### Environment-Specific Deployments

#### Development Environment
```bash
helm install cmf-dev ./k8s/helm/cmf \
  --namespace default \
  -f values-dev.yaml
```

#### Production Environment
```bash
helm install cmf-prd ./k8s/helm/cmf \
  --namespace default \
  -f values-prd.yaml
```

## Configuration

### Key Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | Image repository | `cmf` |
| `image.tag` | Image tag | `latest` |
| `replicaCount` | Number of replicas | `2` |
| `service.type` | Service type | `ClusterIP` |
| `service.port` | Service port | `8088` |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.hosts[0].host` | Ingress host | `cmf.local` |
| `autoscaling.enabled` | Enable HPA | `true` |
| `autoscaling.minReplicas` | Minimum replicas | `2` |
| `autoscaling.maxReplicas` | Maximum replicas | `10` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.requests.memory` | Memory request | `128Mi` |
| `resources.limits.cpu` | CPU limit | `500m` |
| `resources.limits.memory` | Memory limit | `512Mi` |

### Environment Variables

Configure Kafka and application settings via the `env` section:

```yaml
env:
  PORT: "8088"
  KAFKA_TOPIC: "ws-messages"
  KAFKA_CLIENT_ID: "cmf-server"
  KAFKA_GROUP_ID: "cmf-group"
  KAFKA_BROKER: "kafka-service:9092"
```

### Ingress Configuration

#### Basic Ingress
```yaml
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: cmf.local
      paths:
        - path: /
          pathType: Prefix
```

#### Production Ingress with TLS
```yaml
ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: cmf.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: cmf-tls
      hosts:
        - cmf.example.com
```

### HPA Configuration

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Max
```

## Upgrading

```bash
# Upgrade with new values
helm upgrade cmf ./k8s/helm/cmf -f values-prd.yaml

# Upgrade with specific image tag
helm upgrade cmf ./k8s/helm/cmf \
  --set image.tag=v1.1.0
```

## Uninstalling

```bash
# Uninstall the release
helm uninstall cmf
```

## Monitoring

### Check Release Status
```bash
helm status cmf
helm list
```

### Check Pod Status
```bash
kubectl get pods -n cmf
kubectl logs -f deployment/cmf -n cmf
```

### Check HPA Status
```bash
kubectl get hpa -n cmf
kubectl describe hpa cmf-hpa -n cmf
```

### Check Ingress Status
```bash
kubectl get ingress -n cmf
kubectl describe ingress cmf-ingress -n cmf
```

## Troubleshooting

### Common Issues

1. **HPA not scaling**: Ensure metrics-server is installed
2. **WebSocket connections failing**: Check nginx-ingress annotations
3. **Image pull errors**: Verify image name and registry access
4. **Kafka connection issues**: Ensure Kafka service is accessible

### Debug Commands
```bash
# Check all resources
kubectl get all -n cmf

# View events
kubectl get events -n cmf --sort-by='.lastTimestamp'

# Port forward for testing
kubectl port-forward service/cmf 8088:8088 -n cmf

# Test WebSocket connection
wscat -c ws://localhost:8088
```

### Values File Examples

#### Custom Values Override
```yaml
# custom-values.yaml
image:
  repository: my-registry.com/cmf
  tag: v1.0.0

ingress:
  hosts:
    - host: my-cmf.example.com
      paths:
        - path: /
          pathType: Prefix

autoscaling:
  minReplicas: 3
  maxReplicas: 15
  targetCPUUtilizationPercentage: 60
```

Deploy with custom values:
```bash
helm install cmf ./k8s/helm/cmf -f custom-values.yaml
```

## Development

### Local Testing
```bash
# Template and validate
helm template cmf ./k8s/helm/cmf

# Dry run
helm install cmf ./k8s/helm/cmf --dry-run --debug

# Lint
helm lint ./k8s/helm/cmf
```

### Package Chart
```bash
# Package the chart
helm package ./k8s/helm/cmf

# Install from package
helm install cmf cmf-0.1.0.tgz
```

## Support

For issues and questions:
- Check the troubleshooting section above
- Review Kubernetes and Helm documentation
- Check nginx-ingress controller logs
- Verify metrics-server installation
