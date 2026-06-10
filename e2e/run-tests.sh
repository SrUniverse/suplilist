#!/bin/bash

#
# SupliList E2E Test Runner
#
# Usage:
#   ./run-tests.sh [phase] [environment] [options]
#
# Examples:
#   ./run-tests.sh all local          # Run all phases locally
#   ./run-tests.sh phase1 staging     # Run PHASE 1 in staging
#   ./run-tests.sh phase2 prod        # Run PHASE 2 in production
#   ./run-tests.sh all local --headed # Run all phases with browser
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PHASE=${1:-all}
ENV=${2:-local}
EXTRA_ARGS="${@:3}"

# Environment configuration
case $ENV in
  local)
    API_URL="http://localhost:5000"
    PROMETHEUS_URL="http://localhost:9090"
    GRAFANA_URL="http://localhost:3000"
    ;;
  staging)
    API_URL="${STAGING_API_URL:-https://staging-api.suplilist.com}"
    PROMETHEUS_URL="${STAGING_PROMETHEUS_URL:-https://staging-prometheus.suplilist.com}"
    GRAFANA_URL="${STAGING_GRAFANA_URL:-https://staging-grafana.suplilist.com}"
    ;;
  prod)
    API_URL="${PROD_API_URL:-https://api.suplilist.com}"
    PROMETHEUS_URL="${PROD_PROMETHEUS_URL:-https://prometheus.suplilist.com}"
    GRAFANA_URL="${PROD_GRAFANA_URL:-https://grafana.suplilist.com}"
    ;;
  *)
    echo -e "${RED}Invalid environment: $ENV${NC}"
    echo "Valid options: local, staging, prod"
    exit 1
    ;;
esac

# Print header
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         SupliList E2E Test Suite - PHASE 1-4               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Phase: ${YELLOW}$PHASE${NC}"
echo -e "Environment: ${YELLOW}$ENV${NC}"
echo -e "API URL: ${YELLOW}$API_URL${NC}"
echo ""

# Function to run tests
run_phase() {
  local phase=$1
  local test_file=$2

  echo -e "${BLUE}Running $phase...${NC}"

  if [ "$phase" = "all" ]; then
    npx playwright test $test_file \
      --env API_URL=$API_URL \
      --env PROMETHEUS_URL=$PROMETHEUS_URL \
      --env GRAFANA_URL=$GRAFANA_URL \
      $EXTRA_ARGS
  else
    npx playwright test $test_file \
      --env API_URL=$API_URL \
      --env PROMETHEUS_URL=$PROMETHEUS_URL \
      --env GRAFANA_URL=$GRAFANA_URL \
      $EXTRA_ARGS
  fi
}

# Function to check API health
check_api_health() {
  echo -e "${YELLOW}Checking API health...${NC}"

  if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}✗ API is not responding at $API_URL${NC}"

    if [ "$ENV" = "local" ]; then
      echo -e "${YELLOW}Tip: Start the API with: npm run dev:server${NC}"
    fi

    exit 1
  fi

  echo -e "${GREEN}✓ API is healthy${NC}"
}

# Function to print summary
print_summary() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    Test Summary                            ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

  if [ -f "test-results/results.json" ]; then
    echo -e "${GREEN}✓ Results saved to test-results/results.json${NC}"
    echo -e "${GREEN}✓ HTML report saved to test-results/html/index.html${NC}"

    if command -v jq &> /dev/null; then
      echo ""
      echo "Test Statistics:"
      jq '.stats' test-results/results.json
    fi
  fi
}

# Main execution
echo -e "${YELLOW}Checking prerequisites...${NC}"
check_api_health

echo ""

case $PHASE in
  all)
    echo -e "${YELLOW}Running complete integration test suite...${NC}"
    run_phase "complete-integration" "complete-integration.test.ts"
    run_phase "PHASE 1" "phase1-validation.test.ts"
    run_phase "PHASE 2" "phase2-jit.test.ts"
    run_phase "PHASE 3" "phase3-async.test.ts"
    run_phase "PHASE 4" "phase4-telemetry.test.ts"
    ;;
  complete-integration)
    run_phase "complete-integration" "complete-integration.test.ts"
    ;;
  phase1)
    run_phase "PHASE 1 - Foundation" "phase1-validation.test.ts"
    ;;
  phase2)
    run_phase "PHASE 2 - JIT Endpoints" "phase2-jit.test.ts"
    ;;
  phase3)
    run_phase "PHASE 3 - Async Motor" "phase3-async.test.ts"
    ;;
  phase4)
    run_phase "PHASE 4 - Telemetry" "phase4-telemetry.test.ts"
    ;;
  *)
    echo -e "${RED}Invalid phase: $PHASE${NC}"
    echo "Valid options: all, complete-integration, phase1, phase2, phase3, phase4"
    exit 1
    ;;
esac

print_summary

echo ""
echo -e "${GREEN}✓ Tests completed!${NC}"
