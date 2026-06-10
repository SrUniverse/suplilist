#!/bin/bash
# SupliList PostgreSQL Migration Script
# Version: 1.0.0
#
# This script applies a specific migration file to the database
#
# Usage: ./migrate.sh <migration-file>
#        ./migrate.sh 002_add_ratings_table.sql

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

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/../migrations"

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

# Validate arguments
if [ $# -eq 0 ]; then
  log_error "No migration file specified"
  echo ""
  echo "Usage: $0 <migration-file>"
  echo "Example: $0 002_add_ratings_table.sql"
  echo ""
  echo "Available migrations:"
  ls -1 "${MIGRATIONS_DIR}" 2>/dev/null || echo "  No migrations found"
  exit 1
fi

MIGRATION_FILE=$1

# Check if file path is absolute or relative
if [[ "${MIGRATION_FILE}" == /* ]]; then
  # Absolute path
  FULL_PATH="${MIGRATION_FILE}"
else
  # Relative path - look in migrations directory
  FULL_PATH="${MIGRATIONS_DIR}/${MIGRATION_FILE}"
fi

# Validate file exists
if [ ! -f "${FULL_PATH}" ]; then
  log_error "Migration file not found: ${FULL_PATH}"
  exit 1
fi

# Validate file is SQL
if [[ "${FULL_PATH}" != *.sql ]]; then
  log_warning "File does not have .sql extension"
fi

# Main execution
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          SupliList PostgreSQL Migration Tool              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

log_info "Migration file: $(basename "${FULL_PATH}")"
log_info "Database: postgresql://${POSTGRES_USER}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
echo ""

# Check PostgreSQL connection
log_info "Checking database connection..."
if ! pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
  log_error "Cannot connect to PostgreSQL"
  exit 1
fi
log_success "Database connection established"
echo ""

# Apply migration
log_info "Applying migration..."
echo ""

if psql \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  -f "${FULL_PATH}"; then
  echo ""
  log_success "Migration applied successfully!"
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║         Migration completed without errors                 ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  exit 0
else
  echo ""
  log_error "Migration failed!"
  exit 1
fi
