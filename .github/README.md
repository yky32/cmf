# CMF GitHub Actions CI/CD Pipeline

This directory contains the GitHub Actions workflows and custom actions for the CMF (WebSocket Kafka Server) project.

## 🚀 Workflows

### 1. **cmf-deploy.yml** - Production Deployment
- **Trigger**: Push to `main` branch
- **Purpose**: Build, test, and deploy CMF server and client to production
- **Steps**:
  1. Run tests and linting
  2. Build and push Docker image to DOCR
  3. Deploy CMF server using Helm
  4. Deploy CMF client using Helm
  5. Send Discord notifications

### 2. **cmf-dev.yml** - Development Deployment
- **Trigger**: Push to `develop` branch
- **Purpose**: Deploy to development environment
- **Steps**:
  1. Run tests and linting
  2. Build and push Docker image with dev tag
  3. Deploy to development environment
  4. Send Discord notifications

### 3. **cmf-client-only.yml** - Client-Only Deployment
- **Trigger**: Manual workflow dispatch
- **Purpose**: Deploy only the client simulator
- **Options**:
  - Environment: `dev` or `prd`
  - Release name: Customizable

### 4. **docker-test.yml** - Docker Build Testing
- **Trigger**: Push to `main`/`develop` or PR
- **Purpose**: Test Docker build and container functionality
- **Steps**:
  1. Build Docker image
  2. Test container startup
  3. Test health endpoint
  4. Analyze image size

## 🛠️ Custom Actions

### 1. **nodejs-build** - Node.js Build and Test
- **Purpose**: Setup Node.js, install dependencies, build TypeScript, run tests
- **Inputs**:
  - `node_version`: Node.js version (default: 20)
  - `cache`: Enable npm cache (default: npm)

### 2. **k8s-helm-deploy** - Kubernetes Helm Deployment
- **Purpose**: Deploy applications to Kubernetes using Helm
- **Inputs**:
  - `cluster_name`: DigitalOcean Kubernetes cluster name
  - `namespace`: Kubernetes namespace
  - `chart_path`: Path to Helm chart
  - `release_name`: Helm release name
  - `values_file`: Path to values file (optional)

### 3. **doctl-auth** - DigitalOcean Authentication
- **Purpose**: Authenticate with DigitalOcean and setup doctl
- **Inputs**:
  - `token`: DigitalOcean API token
  - `doctl_version`: DigitalOcean CLI version

### 4. **docker-push** - Docker Build and Push
- **Purpose**: Build and push Docker images to DOCR
- **Inputs**:
  - `repo`: Docker repository URL
  - `image_tag`: Image tag

### 5. **notify-discord** - Discord Notifications
- **Purpose**: Send deployment notifications to Discord
- **Inputs**:
  - `webhook`: Discord webhook URL
  - `status`: success/failure
  - `repo`: Repository name
  - `run_number`: GitHub run number
  - `message`: Custom message

## 🔧 Configuration

### Required Secrets

Add these secrets to your GitHub repository:

```bash
# DigitalOcean
DIGITAL_OCEAN_DEPLOY_TOKEN=your_do_token_here

# Discord Notifications
DISCORD_WEBHOOK=your_discord_webhook_url_here
```

### Environment Variables

The workflows use these environment variables:

```yaml
NODE_VERSION: "20"
DOCTL_VERSION: "1.127.0"
CLUSTER_NAME: "k8s-tgt"
NAMESPACE: "default"
IMAGE_REPO: "registry.digitalocean.com/qs-ecr/cmf"
```

## 📋 Deployment Process

### Production Deployment (main branch)
1. **Code Push** → Triggers `cmf-deploy.yml`
2. **Test** → Run tests and linting
3. **Build** → Build TypeScript and Docker image
4. **Push** → Push to DigitalOcean Container Registry
5. **Deploy Server** → Deploy CMF server using Helm
6. **Deploy Client** → Deploy CMF client using Helm
7. **Notify** → Send Discord notification

### Development Deployment (develop branch)
1. **Code Push** → Triggers `cmf-dev.yml`
2. **Test** → Run tests and linting
3. **Build** → Build with dev tag
4. **Deploy** → Deploy to development environment
5. **Notify** → Send Discord notification

### Manual Client Deployment
1. **Manual Trigger** → Go to Actions → CMF Client Only
2. **Select Environment** → Choose dev or prd
3. **Deploy** → Deploy client simulator only

## 🐳 Docker Integration

### Build Process
- Uses optimized multi-stage Dockerfile
- Builds TypeScript to JavaScript
- Creates minimal production image
- Includes health check endpoint

### Testing
- Tests Docker build locally
- Verifies container startup
- Tests health endpoint
- Analyzes image size

## 🎯 Helm Integration

### Server Deployment
- **Chart**: `./k8s/helm/cmf`
- **Values**: Environment-specific values files
- **Features**: HPA, nginx-ingress, health checks

### Client Deployment
- **Chart**: `./k8s/cmf-client`
- **Values**: Environment-specific values files
- **Features**: nginx-ingress, static file serving

## 📊 Monitoring

### Health Checks
- **Server**: `/health` endpoint
- **Client**: nginx health check
- **Kubernetes**: Liveness and readiness probes

### Notifications
- **Discord**: Success/failure notifications
- **GitHub**: Workflow status in PRs
- **Logs**: Detailed build and deployment logs

## 🔍 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check Node.js version
   node --version
   
   # Check dependencies
   npm ci
   
   # Check TypeScript build
   npm run build
   ```

2. **Docker Build Issues**
   ```bash
   # Test Docker build locally
   npm run docker:test
   
   # Check Dockerfile
   docker build -t cmf:test .
   ```

3. **Kubernetes Deployment Issues**
   ```bash
   # Check pod status
   kubectl get pods -l app.kubernetes.io/name=cmf
   
   # Check logs
   kubectl logs -l app.kubernetes.io/name=cmf
   
   # Check ingress
   kubectl get ingress cmf
   ```

### Debug Commands

```bash
# Check workflow logs
gh run list
gh run view <run-id>

# Check deployment status
kubectl get all -l app.kubernetes.io/name=cmf

# Check Helm releases
helm list -n default
```

## 🚀 Quick Start

1. **Setup Secrets**: Add required secrets to GitHub repository
2. **Push to main**: Triggers production deployment
3. **Push to develop**: Triggers development deployment
4. **Manual deploy**: Use client-only workflow for quick client updates

## 📝 Notes

- All workflows use Ubuntu latest runners
- Docker images are pushed to DigitalOcean Container Registry
- Helm charts are deployed to DigitalOcean Kubernetes
- Discord notifications are sent for all deployments
- Health checks ensure deployments are successful
