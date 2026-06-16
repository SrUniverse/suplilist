#!/bin/bash
set -euo pipefail

# Database Restore Script
# Usage: ./scripts/restore-database.sh [staging|prod] backup-file.sql.gz

ENVIRONMENT=${1:-staging}
BACKUP_FILE=${2:-}
NAMESPACE="suplilist-${ENVIRONMENT}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    log_info "Usage: ./scripts/restore-database.sh [staging|prod] backup-file.sql.gz"
    exit 1
fi

log_warn "CAUTION: This will restore the database from backup and may overwrite existing data"
read -p "Are you sure you want to restore from $BACKUP_FILE? (yes/no): " -r
if [[ ! $REPLY =~ ^yes$ ]]; then
    log_info "Restore cancelled"
    exit 0
fi

log_info "Starting database restore for $ENVIRONMENT"

# Get database pod
DB_POD=$(kubectl get pods -n "$NAMESPACE" -l app=postgres -o jsonpath='{.items[0].metadata.name}')

if [ -z "$DB_POD" ]; then
    log_error "PostgreSQL pod not found in namespace $NAMESPACE"
    exit 1
fi

log_info "Found database pod: $DB_POD"

# Create a temporary directory in the pod
TEMP_DIR="/tmp/restore-$$"
kubectl exec -n "$NAMESPACE" "$DB_POD" -- mkdir -p "$TEMP_DIR"

# Copy backup to pod
log_info "Copying backup to pod..."
kubectl cp "$BACKUP_FILE" "$NAMESPACE/$DB_POD:$TEMP_DIR/backup.sql.gz"

# Restore database
log_info "Restoring database..."
kubectl exec -n "$NAMESPACE" "$DB_POD" -- \
    bash -c "gunzip -c $TEMP_DIR/backup.sql.gz | psql -U suplilist suplilist"

# Clean up temp directory
kubectl exec -n "$NAMESPACE" "$DB_POD" -- rm -rf "$TEMP_DIR"

log_info "Database restore completed successfully"
log_warn "Please verify the restored data before using in production"
