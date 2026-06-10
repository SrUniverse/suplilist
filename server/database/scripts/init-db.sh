#!/bin/bash
# SupliList PostgreSQL Database Initialization Script
# Version: 1.0.0
#
# This script:
# 1. Waits for PostgreSQL to be ready
# 2. Applies all migrations in order
# 3. Loads seed data
# 4. Verifies database integrity
#
# Usage: ./init-db.sh

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
SEEDS_DIR="${SCRIPT_DIR}/../seeds"

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

# Function to check if PostgreSQL is ready
wait_for_postgres() {
  local max_attempts=30
  local attempt=1

  log_info "Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}..."

  while [ $attempt -le $max_attempts ]; do
    if pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" 2>/dev/null; then
      log_success "PostgreSQL is ready"
      return 0
    fi

    echo -n "."
    sleep 1
    ((attempt++))
  done

  log_error "PostgreSQL did not become ready in ${max_attempts} seconds"
  return 1
}

# Function to run a SQL file
run_migration() {
  local file=$1
  local description=$2

  log_info "Applying: ${description}"

  if psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -f "${file}" > /dev/null 2>&1; then
    log_success "Migration applied: ${description}"
  else
    log_error "Failed to apply migration: ${description}"
    return 1
  fi
}

# Function to verify database
verify_database() {
  log_info "Verifying database..."

  local table_count=$(psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")

  if [ "$table_count" -gt 0 ]; then
    log_success "Database verified: ${table_count} tables created"
    return 0
  else
    log_error "Database verification failed: no tables found"
    return 1
  fi
}

# Main execution
main() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║      SupliList PostgreSQL Database Initialization         ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""

  # Step 1: Wait for PostgreSQL
  if ! wait_for_postgres; then
    log_error "Database initialization aborted"
    exit 1
  fi

  echo ""

  # Step 2: Apply migrations
  log_info "Applying database migrations..."
  echo ""

  if [ ! -d "${MIGRATIONS_DIR}" ]; then
    log_error "Migrations directory not found: ${MIGRATIONS_DIR}"
    exit 1
  fi

  # Find all .sql migration files and sort them
  while IFS= read -r migration_file; do
    if [ -f "${migration_file}" ]; then
      filename=$(basename "${migration_file}")
      run_migration "${migration_file}" "${filename}"
    fi
  done < <(find "${MIGRATIONS_DIR}" -name "*.sql" -type f | sort)

  echo ""

  # Step 3: Load seed data
  if [ -d "${SEEDS_DIR}" ]; then
    log_info "Loading seed data..."
    echo ""

    while IFS= read -r seed_file; do
      if [ -f "${seed_file}" ]; then
        filename=$(basename "${seed_file}")
        run_migration "${seed_file}" "Seed: ${filename}"
      fi
    done < <(find "${SEEDS_DIR}" -name "*.sql" -type f | sort)

    echo ""
  else
    log_warning "Seed directory not found: ${SEEDS_DIR}"
  fi

  # Step 4: Verify database
  echo ""
  if verify_database; then
    echo ""
    log_success "Database initialization completed successfully!"
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║           Database is ready for development                ║"
    echo "║                                                            ║"
    echo "║  Connection: postgresql://${POSTGRES_USER}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    exit 0
  else
    echo ""
    log_error "Database initialization failed!"
    exit 1
  fi
}

# Run main function
main "$@"
