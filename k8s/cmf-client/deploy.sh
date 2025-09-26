#!/bin/bash

# CMF Client Simulator Deployment Script
# Usage: ./deploy.sh [dev|prd] [install|upgrade|uninstall]

set -e

CHART_PATH="./k8s/cmf-client"
ENVIRONMENT=${1:-dev}
ACTION=${2:-upgrade}

# Validate environment
if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prd" ]]; then
    echo "❌ Error: Environment must be 'dev' or 'prd'"
    echo "Usage: $0 [dev|prd] [install|upgrade|uninstall]"
    exit 1
fi

# Validate action
if [[ "$ACTION" != "install" && "$ACTION" != "upgrade" && "$ACTION" != "uninstall" ]]; then
    echo "❌ Error: Action must be 'install', 'upgrade', or 'uninstall'"
    echo "Usage: $0 [dev|prd] [install|upgrade|uninstall]"
    exit 1
fi

VALUES_FILE="$CHART_PATH/values-$ENVIRONMENT.yaml"
RELEASE_NAME="cmf-client"

echo "🚀 CMF Client Simulator Deployment"
echo "Environment: $ENVIRONMENT"
echo "Action: $ACTION"
echo "Values file: $VALUES_FILE"
echo ""

# Check if values file exists
if [[ ! -f "$VALUES_FILE" ]]; then
    echo "❌ Error: Values file not found: $VALUES_FILE"
    exit 1
fi

# Check if chart directory exists
if [[ ! -d "$CHART_PATH" ]]; then
    echo "❌ Error: Chart directory not found: $CHART_PATH"
    exit 1
fi

case $ACTION in
    "install")
        echo "📦 Installing CMF Client Simulator..."
        helm install $RELEASE_NAME $CHART_PATH -f $VALUES_FILE
        ;;
    "upgrade")
        echo "🔄 Upgrading CMF Client Simulator..."
        helm upgrade $RELEASE_NAME $CHART_PATH -f $VALUES_FILE
        ;;
    "uninstall")
        echo "🗑️  Uninstalling CMF Client Simulator..."
        helm uninstall $RELEASE_NAME
        ;;
esac

if [[ "$ACTION" != "uninstall" ]]; then
    echo ""
    echo "✅ Deployment completed!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Check pod status:"
    echo "   kubectl get pods -l app.kubernetes.io/name=cmf-client"
    echo ""
    echo "2. Check service:"
    echo "   kubectl get svc cmf-client"
    echo ""
    echo "3. Check ingress:"
    echo "   kubectl get ingress cmf-client"
    echo ""
    if [[ "$ENVIRONMENT" == "dev" ]]; then
        echo "4. Access the client:"
        echo "   http://cmf-client-dev.local"
        echo "   (Add to /etc/hosts: 127.0.0.1 cmf-client-dev.local)"
    else
        echo "4. Access the client:"
        echo "   https://cmf-client.example.com"
    fi
    echo ""
    echo "5. Port forward (alternative):"
    echo "   kubectl port-forward service/cmf-client 8080:80"
    echo "   http://localhost:8080"
fi
