#!/bin/bash

###############################################################################
# Performance Validation Script
#
# Automated performance validation and SLA checking
# - Validates against performance baselines
# - Checks SLA compliance
# - Generates alerts on degradation
# - Provides recommendations
###############################################################################

set -e

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOAD_TESTS_DIR="$(dirname "$SCRIPT_DIR")"
readonly RESULTS_DIR="${LOAD_TESTS_DIR}/results"
readonly BASELINES_DIR="${LOAD_TESTS_DIR}/baselines"
readonly CONFIG_DIR="${LOAD_TESTS_DIR}/config"

# SLA Configuration (in milliseconds)
declare -A SLA_TARGETS=(
  [p50]=100
  [p95]=500
  [p99]=1000
  [p100]=2000
  [error_rate]=5
  [throughput]=1000
)

declare -A CRITICAL_THRESHOLDS=(
  [p99]=2000
  [error_rate]=10
)

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

###############################################################################
# Validation Functions
###############################################################################

validate_response_times() {
  local test_file=$1
  local violations=0

  echo -e "${BLUE}=== Response Time Validation ===${NC}"

  for metric in "${!SLA_TARGETS[@]}"; do
    case "$metric" in
      p50|p95|p99|p100)
        local actual=$(extract_percentile "$test_file" "$metric")
        local target=${SLA_TARGETS[$metric]}

        if (( $(echo "$actual > $target" | bc -l) )); then
          echo -e "${RED}✗ $metric: ${actual}ms (target: ${target}ms)${NC}"
          violations=$((violations + 1))
        else
          echo -e "${GREEN}✓ $metric: ${actual}ms (target: ${target}ms)${NC}"
        fi
        ;;
    esac
  done

  return $violations
}

validate_error_rate() {
  local test_file=$1

  echo -e "${BLUE}=== Error Rate Validation ===${NC}"

  local error_rate=$(extract_error_rate "$test_file")
  local target=${SLA_TARGETS[error_rate]}
  local critical=${CRITICAL_THRESHOLDS[error_rate]}

  if (( $(echo "$error_rate > $critical" | bc -l) )); then
    echo -e "${RED}✗ CRITICAL: Error rate ${error_rate}% exceeds critical threshold ${critical}%${NC}"
    return 2
  elif (( $(echo "$error_rate > $target" | bc -l) )); then
    echo -e "${YELLOW}⚠ WARNING: Error rate ${error_rate}% exceeds target ${target}%${NC}"
    return 1
  else
    echo -e "${GREEN}✓ Error rate ${error_rate}% within target${NC}"
    return 0
  fi
}

validate_throughput() {
  local test_file=$1

  echo -e "${BLUE}=== Throughput Validation ===${NC}"

  local throughput=$(extract_throughput "$test_file")
  local target=${SLA_TARGETS[throughput]}

  if (( $(echo "$throughput < $target" | bc -l) )); then
    echo -e "${YELLOW}⚠ Throughput ${throughput} RPS below target ${target} RPS${NC}"
    return 1
  else
    echo -e "${GREEN}✓ Throughput ${throughput} RPS meets target${NC}"
    return 0
  fi
}

###############################################################################
# Metric Extraction Functions
###############################################################################

extract_percentile() {
  local test_file=$1
  local percentile=$2

  if [ -f "$test_file" ]; then
    # K6 JSON format
    if [[ "$test_file" == *.json ]]; then
      grep -o "\"p(${percentile})\":[0-9.]*" "$test_file" | grep -o '[0-9.]*' | head -1
    fi
  fi

  echo "0"
}

extract_error_rate() {
  local test_file=$1

  if [ -f "$test_file" ]; then
    if [[ "$test_file" == *.json ]]; then
      # Extract from K6 metrics
      grep -o '"errors":{[^}]*}' "$test_file" | grep -o '"rate":[0-9.]*' | grep -o '[0-9.]*' | head -1
    fi
  fi

  echo "0"
}

extract_throughput() {
  local test_file=$1

  if [ -f "$test_file" ]; then
    if [[ "$test_file" == *.json ]]; then
      # Calculate RPS from duration and request count
      grep -o '"http_reqs":{[^}]*}' "$test_file" | grep -o '"rate":[0-9.]*' | grep -o '[0-9.]*' | head -1
    fi
  fi

  echo "0"
}

###############################################################################
# Baseline Comparison
###############################################################################

compare_with_baseline() {
  local current_file=$1
  local scenario=$2

  echo -e "${BLUE}=== Baseline Comparison ===${NC}"

  local baseline_file="${BASELINES_DIR}/${scenario}-baseline.json"

  if [ ! -f "$baseline_file" ]; then
    echo -e "${YELLOW}No baseline found for comparison${NC}"
    return 0
  fi

  local current_p95=$(extract_percentile "$current_file" "95")
  local baseline_p95=$(extract_percentile "$baseline_file" "95")

  if [ -n "$current_p95" ] && [ -n "$baseline_p95" ]; then
    local degradation=$(echo "scale=2; (($current_p95 - $baseline_p95) / $baseline_p95) * 100" | bc)

    if (( $(echo "$degradation > 10" | bc -l) )); then
      echo -e "${RED}✗ Performance degradation of ${degradation}% detected${NC}"
      echo "  Baseline p95: ${baseline_p95}ms"
      echo "  Current p95:  ${current_p95}ms"
      return 1
    else
      echo -e "${GREEN}✓ Within acceptable degradation threshold${NC}"
      echo "  Baseline p95: ${baseline_p95}ms"
      echo "  Current p95:  ${current_p95}ms"
      return 0
    fi
  fi

  return 0
}

###############################################################################
# Report Generation
###############################################################################

generate_validation_report() {
  local test_file=$1
  local scenario=$2
  local report_file="${RESULTS_DIR}/validation-report-$(date +%Y%m%d_%H%M%S).txt"

  {
    echo "SupliList Performance Validation Report"
    echo "========================================"
    echo "Generated: $(date)"
    echo "Scenario: $scenario"
    echo "Test File: $test_file"
    echo ""

    echo "Performance Targets (SLA)"
    echo "------------------------"
    for metric in "${!SLA_TARGETS[@]}"; do
      echo "  $metric: ${SLA_TARGETS[$metric]}"
    done
    echo ""

    echo "Test Results"
    echo "-----------"
    echo "p50 Response Time: $(extract_percentile "$test_file" "50")ms"
    echo "p95 Response Time: $(extract_percentile "$test_file" "95")ms"
    echo "p99 Response Time: $(extract_percentile "$test_file" "99")ms"
    echo "Error Rate: $(extract_error_rate "$test_file")%"
    echo "Throughput: $(extract_throughput "$test_file") RPS"
    echo ""

    echo "Validation Results"
    echo "-----------------"
    validate_response_times "$test_file"
    validate_error_rate "$test_file"
    validate_throughput "$test_file"

  } | tee "$report_file"

  echo -e "${GREEN}Report saved to: $report_file${NC}"
}

###############################################################################
# Recommendations Engine
###############################################################################

provide_recommendations() {
  local test_file=$1

  echo -e "${BLUE}=== Performance Recommendations ===${NC}"

  local p95=$(extract_percentile "$test_file" "95")
  local error_rate=$(extract_error_rate "$test_file")
  local throughput=$(extract_throughput "$test_file")

  local recommendations=()

  # Check response times
  if (( $(echo "$p95 > 1000" | bc -l) )); then
    recommendations+=("• Database Query Optimization: p95 response time is high. Review slow queries and add indexes.")
    recommendations+=("• Caching Strategy: Implement Redis caching for frequently accessed data.")
    recommendations+=("• API Response Optimization: Reduce payload sizes, use field selection.")
  fi

  # Check error rate
  if (( $(echo "$error_rate > 5" | bc -l) )); then
    recommendations+=("• Error Handling: High error rate detected. Review application logs for errors.")
    recommendations+=("• Resource Limits: Verify database connection pool and memory limits.")
    recommendations+=("• Load Balancing: Consider distributing load across multiple instances.")
  fi

  # Check throughput
  if (( $(echo "$throughput < 500" | bc -l) )); then
    recommendations+=("• Horizontal Scaling: Current throughput is low. Consider adding more servers.")
    recommendations+=("• Connection Pooling: Optimize database connection pool settings.")
    recommendations+=("• Async Operations: Move long-running operations to background jobs.")
  fi

  if [ ${#recommendations[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ No critical recommendations at this time${NC}"
  else
    for rec in "${recommendations[@]}"; do
      echo -e "${YELLOW}$rec${NC}"
    done
  fi
}

###############################################################################
# Capacity Planning
###############################################################################

estimate_capacity() {
  local test_file=$1

  echo -e "${BLUE}=== Capacity Planning Estimate ===${NC}"

  local current_throughput=$(extract_throughput "$test_file")
  local target_throughput=5000  # RPS

  if [ -n "$current_throughput" ] && [ "$current_throughput" != "0" ]; then
    local required_servers=$(echo "scale=0; $target_throughput / $current_throughput" | bc)
    echo "Current throughput: ${current_throughput} RPS (based on test)"
    echo "Target throughput: ${target_throughput} RPS"
    echo "Estimated servers needed: $required_servers"
  fi
}

###############################################################################
# Health Check
###############################################################################

run_health_check() {
  echo -e "${BLUE}=== System Health Check ===${NC}"

  # Check server availability
  if curl -sf "${BASE_URL:-http://localhost:3000}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is healthy${NC}"
  else
    echo -e "${RED}✗ Server is not responding${NC}"
    return 1
  fi

  # Check database
  # Check Redis
  # Check other dependencies

  return 0
}

###############################################################################
# Main Execution
###############################################################################

main() {
  local test_file=${1:-}
  local scenario=${2:-"normal"}

  if [ -z "$test_file" ]; then
    echo "Usage: $0 <test_file> [scenario]"
    echo "Example: $0 results/k6-normal-20240101_120000.json normal"
    exit 1
  fi

  if [ ! -f "$test_file" ]; then
    echo "Test file not found: $test_file"
    exit 1
  fi

  echo -e "${BLUE}=========================================${NC}"
  echo -e "${BLUE}SupliList Performance Validation${NC}"
  echo -e "${BLUE}=========================================${NC}"

  # Run all validations
  run_health_check
  validate_response_times "$test_file"
  validate_error_rate "$test_file"
  validate_throughput "$test_file"
  compare_with_baseline "$test_file" "$scenario"

  # Generate reports and recommendations
  generate_validation_report "$test_file" "$scenario"
  provide_recommendations "$test_file"
  estimate_capacity "$test_file"

  echo -e "${BLUE}=========================================${NC}"
  echo -e "${GREEN}Validation complete${NC}"
  echo -e "${BLUE}=========================================${NC}"
}

main "$@"
