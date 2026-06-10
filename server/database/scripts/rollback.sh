#!/bin/bash
# SupliList PostgreSQL Rollback Script
# Version: 1.0.0
#
# This script DROPS the entire database (development use only!)
# WARNING: This is destructive and cannot be undone!
#
# Usage: ./rollback.sh [--force]

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
POSTGRES_HOST="${POSTGRES_HOST:-postgresql}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-suplilist}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-suplilist_dev}"
POSTGRES_DB="${POSTGRES_DB:-suplilist}"

# Export password for psql
export PGPASSWORD="${POSTGRES_PASSWORD}"

# Function to print colored output
log_info() {
  echo -e "${BLUE}ℹ ${1}${NC}"
}

log_success() {
  echo -e "${GREEN}✓ ${1}${NC}"
}

log_error() {
  echo -e "${RED}✗ ${1}${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠ ${1}${NC}"
}

# Main execution
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        SupliList PostgreSQL Rollback Tool                  ║"
echo "║                                                            ║"
echo "║              ⚠️  WARNING: DESTRUCTIVE OPERATION  ⚠️        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

log_warning "This script will DROP the entire database: ${POSTGRES_DB}"
log_warning "All data will be permanently deleted!"
echo ""

# Check if --force flag is provided
if [ "$1" != "--force" ]; then
  echo "This operation CANNOT be undone!"
  echo ""
  read -p "Type 'yes' to confirm deletion: " confirmation

  if [ "${confirmation}" != "yes" ]; then
    log_info "Rollback cancelled"
    exit 0
  fi
else
  log_warning "Force flag detected - skipping confirmation"
fi

echo ""

# Check PostgreSQL connection
log_info "Checking database connection..."
if ! pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" >/dev/null 2>&1; then
  log_error "Cannot connect to PostgreSQL"
  exit 1
fi
log_success "Database connection established"
echo ""

# Drop database
log_info "Dropping database: ${POSTGRES_DB}..."

if psql \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "postgres" \
  -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"; then
  log_success "Database dropped"
else
  log_error "Failed to drop database"
  exit 1
fi

echo ""

# Create database
log_info "Creating new database: ${POSTGRES_DB}..."

if psql \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "postgres" \
  -c "CREATE DATABASE ${POSTGRES_DB} ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C';"; then
  log_success "Database created"
else
  log_error "Failed to create database"
  exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          Database rollback completed successfully          ║"
echo "║                                                            ║"
echo "║  Next step: Run init-db.sh to recreate schema and seed    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

log_success "Rollback complete!"
exit 0
