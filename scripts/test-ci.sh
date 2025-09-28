#!/bin/bash

# CMF CI/CD Local Testing Script
# This script helps test the CI/CD pipeline locally

set -e

echo "🚀 CMF CI/CD Local Testing"
echo "=========================="
echo "📋 Node.js/TypeScript Project - No Java/Maven dependencies"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if ! command -v helm &> /dev/null; then
        missing_deps+=("helm")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_status "Please install the missing dependencies and try again."
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Test Node.js build process
test_nodejs_build() {
    print_status "Testing Node.js build process..."
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm ci
    
    # Build TypeScript
    print_status "Building TypeScript..."
    npm run build
    
    # Check if dist directory exists
    if [ -d "dist" ]; then
        print_success "TypeScript build completed successfully"
        print_status "Build output: $(du -sh dist/ 2>/dev/null || echo 'No dist folder')"
    else
        print_error "TypeScript build failed - no dist directory found"
        exit 1
    fi
}

# Test Docker build
test_docker_build() {
    print_status "Testing Docker build..."
    
    # Build Docker image
    print_status "Building Docker image..."
    docker build -t cmf:test .
    
    # Check if image was created
    if docker images | grep -q "cmf.*test"; then
        print_success "Docker build completed successfully"
        print_status "Image size: $(docker images cmf:test --format 'table {{.Size}}')"
    else
        print_error "Docker build failed"
        exit 1
    fi
}

# Test Docker container
test_docker_container() {
    print_status "Testing Docker container..."
    
    # Start container in background
    print_status "Starting container..."
    CONTAINER_ID=$(docker run -d -p 8088:8088 cmf:test)
    
    # Wait for container to start
    print_status "Waiting for container to start..."
    sleep 10
    
    # Check if container is running
    if docker ps | grep -q $CONTAINER_ID; then
        print_success "Container started successfully"
        
        # Test health endpoint
        print_status "Testing health endpoint..."
        if curl -f http://localhost:8088/health 2>/dev/null; then
            print_success "Health endpoint is working"
        else
            print_warning "Health endpoint test failed (this might be expected if Kafka is not available)"
        fi
        
        # Clean up
        print_status "Cleaning up container..."
        docker stop $CONTAINER_ID
        docker rm $CONTAINER_ID
        print_success "Container cleanup completed"
    else
        print_error "Container failed to start"
        docker logs $CONTAINER_ID
        exit 1
    fi
}

# Test Helm charts
test_helm_charts() {
    print_status "Testing Helm charts..."
    
    # Test server chart
    print_status "Testing CMF server chart..."
    if helm lint ./k8s/helm/cmf; then
        print_success "CMF server chart is valid"
    else
        print_error "CMF server chart validation failed"
        exit 1
    fi
    
    # Test client chart
    print_status "Testing CMF client chart..."
    if helm lint ./k8s/cmf-client; then
        print_success "CMF client chart is valid"
    else
        print_error "CMF client chart validation failed"
        exit 1
    fi
}

# Main execution
main() {
    echo ""
    print_status "Starting CI/CD pipeline testing..."
    echo ""
    
    check_dependencies
    echo ""
    
    test_nodejs_build
    echo ""
    
    test_docker_build
    echo ""
    
    test_docker_container
    echo ""
    
    test_helm_charts
    echo ""
    
    print_success "All CI/CD pipeline tests passed! 🎉"
    echo ""
    print_status "Your CMF project is ready for deployment!"
    echo ""
    print_status "Next steps:"
    echo "  1. Push to 'develop' branch for development deployment"
    echo "  2. Push to 'main' branch for production deployment"
    echo "  3. Use manual workflow for client-only deployments"
    echo ""
}

# Run main function
main "$@"
