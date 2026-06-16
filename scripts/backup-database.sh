#!/bin/bash
set -euo pipefail

# Database Backup Script
# Usage: ./scripts/backup-database.sh [staging|prod]

ENVIRONMENT=${1:-staging}
NAMESPACE="suplilist-${ENVIRONMENT}"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/suplilist-${ENVIRONMENT}-${TIMESTAMP}.sql.gz"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info "Starting database backup for $ENVIRONMENT"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Get database pod
DB_POD=$(kubectl get pods -n "$NAMESPACE" -l app=postgres -o jsonpath='{.items[0].metadata.name}')

if [ -z "$DB_POD" ]; then
    log_error "PostgreSQL pod not found in namespace $NAMESPACE"
    exit 1
fi

log_info "Found database pod: $DB_POD"

# Create backup
log_info "Creating backup..."

kubectl exec -n "$NAMESPACE" "$DB_POD" -- \
    pg_dump -U suplilist suplilist | gzip > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Backup created successfully: $BACKUP_FILE ($SIZE)"

    # Upload to S3 (optional)
    if command -v aws &> /dev/null; then
        log_info "Uploading backup to S3..."
        aws s3 cp "$BACKUP_FILE" \
            "s3://suplilist-backups/${ENVIRONMENT}/$(basename "$BACKUP_FILE")"
        log_info "Backup uploaded to S3"
    fi
else
    log_error "Backup creation failed"
    exit 1
fi

# Clean old backups (keep last 30 days)
log_info "Cleaning old backups (older than 30 days)..."
find "$BACKUP_DIR" -name "suplilist-${ENVIRONMENT}-*.sql.gz" -mtime +30 -delete

log_info "Backup completed successfully"
