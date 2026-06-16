#!/bin/bash
set -euo pipefail

# SupliList Deployment Script
# Usage: ./scripts/deploy.sh [staging|prod] [version]

ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
DOCKER_REGISTRY="ghcr.io"
IMAGE_NAME="suplilist/suplilist"
NAMESPACE="suplilist-${ENVIRONMENT}"
KUBE_CONTEXT="${ENVIRONMENT}-cluster"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|prod)$ ]]; then
    log_error "Invalid environment. Must be 'staging' or 'prod'"
    exit 1
fi

log_info "Starting deployment to $ENVIRONMENT"
log_info "Image: $DOCKER_REGISTRY/$IMAGE_NAME:$VERSION"
log_info "Namespace: $NAMESPACE"

# Check dependencies
check_dependencies() {
    local deps=("kubectl" "helm" "docker")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "$dep is not installed"
            exit 1
        fi
    done
    log_info "All dependencies found"
}

# Switch Kubernetes context
switch_context() {
    log_info "Switching to context: $KUBE_CONTEXT"
    if ! kubectl config use-context "$KUBE_CONTEXT" 2>/dev/null; then
        log_error "Failed to switch context. Available contexts:"
        kubectl config get-contexts
        exit 1
    fi
}

# Create namespace if needed
create_namespace() {
    if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
        log_info "Creating namespace: $NAMESPACE"
        kubectl create namespace "$NAMESPACE"
    fi
}

# Apply Kubernetes manifests
apply_manifests() {
    log_info "Applying Kubernetes manifests..."

    local manifest_dir="k8s"

    # Apply in order
    kubectl apply -f "$manifest_dir/configmap.yml" -n "$NAMESPACE"
    kubectl apply -f "$manifest_dir/secrets.yml" -n "$NAMESPACE"
    kubectl apply -f "$manifest_dir/rbac.yml" -n "$NAMESPACE"

    log_info "Manifests applied successfully"
}

# Update deployment image
update_deployment() {
    log_info "Updating deployment image: $IMAGE_NAME:$VERSION"

    kubectl set image deployment/suplilist-api \
        api="$DOCKER_REGISTRY/$IMAGE_NAME:$VERSION" \
        -n "$NAMESPACE"

    log_info "Image updated"
}

# Wait for rollout
wait_rollout() {
    log_info "Waiting for rollout to complete..."

    if kubectl rollout status deployment/suplilist-api \
        -n "$NAMESPACE" \
        --timeout=10m; then
        log_info "Rollout completed successfully"
    else
        log_error "Rollout failed or timed out"
        return 1
    fi
}

# Run smoke tests
smoke_tests() {
    log_info "Running smoke tests..."

    # Port-forward to test
    kubectl port-forward -n "$NAMESPACE" svc/suplilist-api 8080:80 &
    PF_PID=$!

    sleep 2

    # Test endpoints
    local endpoints=("/health" "/ready" "/api/supplements")
    local failed=0

    for endpoint in "${endpoints[@]}"; do
        log_info "Testing $endpoint..."
        if curl -sf "http://localhost:8080$endpoint" > /dev/null; then
            log_info "✓ $endpoint passed"
        else
            log_error "✗ $endpoint failed"
            ((failed++))
        fi
    done

    kill $PF_PID 2>/dev/null || true

    if [[ $failed -gt 0 ]]; then
        log_error "Smoke tests failed"
        return 1
    fi

    log_info "Smoke tests passed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    kubectl exec -it -n "$NAMESPACE" \
        deployment/suplilist-api -- \
        npm run migrate:up

    log_info "Migrations completed"
}

# Get deployment info
deployment_info() {
    log_info "Deployment Information:"
    log_info "========================"

    kubectl get deployment suplilist-api -n "$NAMESPACE" -o wide
    log_info ""

    log_info "Pods:"
    kubectl get pods -n "$NAMESPACE" -l app=suplilist
    log_info ""

    log_info "Services:"
    kubectl get svc -n "$NAMESPACE"
}

# Rollback deployment
rollback() {
    log_warn "Rolling back deployment..."

    kubectl rollout undo deployment/suplilist-api \
        -n "$NAMESPACE"

    if kubectl rollout status deployment/suplilist-api \
        -n "$NAMESPACE" \
        --timeout=10m; then
        log_info "Rollback completed successfully"
    else
        log_error "Rollback failed"
        exit 1
    fi
}

# Main execution
main() {
    trap 'log_error "Deployment failed"; rollback' ERR

    check_dependencies
    switch_context
    create_namespace

    log_info "Phase 1: Applying configurations"
    apply_manifests

    log_info "Phase 2: Updating deployment"
    update_deployment
    wait_rollout

    log_info "Phase 3: Running migrations"
    run_migrations

    log_info "Phase 4: Smoke tests"
    smoke_tests

    log_info "Phase 5: Deployment info"
    deployment_info

    log_info "Deployment completed successfully!"
}

# Script execution
main "$@"
