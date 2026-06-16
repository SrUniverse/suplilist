#!/bin/bash

###############################################################################
# CI/CD Integration Script for Load Testing
#
# Integrates load testing into CI/CD pipelines:
# - GitHub Actions
# - GitLab CI
# - Jenkins
# - CircleCI
#
# Automatically triggered on:
# - Scheduled runs (daily/weekly)
# - Manual triggers
# - Post-deployment
# - Performance regression detection
###############################################################################

set -e

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOAD_TESTS_DIR="$(dirname "$SCRIPT_DIR")"
readonly PROJECT_ROOT="$(dirname "$(dirname "$LOAD_TESTS_DIR")")"
readonly RESULTS_DIR="${LOAD_TESTS_DIR}/results"
readonly BASELINES_DIR="${LOAD_TESTS_DIR}/baselines"

# CI/CD Platform Detection
CI_PLATFORM=${CI_PLATFORM:-"unknown"}
if [ -n "$GITHUB_ACTIONS" ]; then
  CI_PLATFORM="github"
elif [ -n "$GITLAB_CI" ]; then
  CI_PLATFORM="gitlab"
elif [ -n "$JENKINS_HOME" ]; then
  CI_PLATFORM="jenkins"
elif [ -n "$CIRCLECI" ]; then
  CI_PLATFORM="circleci"
fi

# Configuration from environment
BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_SCENARIO="${TEST_SCENARIO:-normal}"
SAVE_BASELINE="${SAVE_BASELINE:-false}"
UPLOAD_RESULTS="${UPLOAD_RESULTS:-true}"
NOTIFY_ON_FAILURE="${NOTIFY_ON_FAILURE:-true}"

# Thresholds
P95_THRESHOLD=500
ERROR_RATE_THRESHOLD=5
DEGRADATION_THRESHOLD=10

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

###############################################################################
# Platform-specific Output
###############################################################################

output_github_actions() {
  local level=$1
  local message=$2

  case "$level" in
    error)
      echo "::error::$message"
      ;;
    warning)
      echo "::warning::$message"
      ;;
    info)
      echo "::notice::$message"
      ;;
    debug)
      echo "::debug::$message"
      ;;
  esac
}

output_gitlab_ci() {
  local level=$1
  local message=$2

  # GitLab CI doesn't have built-in annotations, use ANSI colors
  case "$level" in
    error)
      echo -e "${RED}ERROR: $message${NC}"
      ;;
    warning)
      echo -e "${YELLOW}WARNING: $message${NC}"
      ;;
    *)
      echo "$message"
      ;;
  esac
}

output_jenkins() {
  local level=$1
  local message=$2

  # Jenkins log annotations
  echo "[$level] $message"
}

output_to_ci() {
  local level=$1
  local message=$2

  case "$CI_PLATFORM" in
    github)
      output_github_actions "$level" "$message"
      ;;
    gitlab)
      output_gitlab_ci "$level" "$message"
      ;;
    jenkins)
      output_jenkins "$level" "$message"
      ;;
    *)
      echo "[$level] $message"
      ;;
  esac
}

###############################################################################
# Pre-test Checks
###############################################################################

check_prerequisites() {
  output_to_ci "info" "Checking prerequisites..."

  # Check if server is running
  local max_attempts=30
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    if curl -sf "$BASE_URL/health" > /dev/null 2>&1; then
      output_to_ci "info" "Server is healthy at $BASE_URL"
      return 0
    fi

    echo "Waiting for server... ($attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
  done

  output_to_ci "error" "Server at $BASE_URL did not become healthy in time"
  return 1
}

check_test_tools() {
  output_to_ci "info" "Checking test tools..."

  case "$TEST_SCENARIO" in
    normal|peak|stress)
      if ! command -v k6 &> /dev/null; then
        output_to_ci "error" "K6 not found in PATH"
        return 1
      fi
      ;;
  esac

  return 0
}

###############################################################################
# Test Execution
###############################################################################

run_load_test() {
  local scenario=$1

  output_to_ci "info" "Starting load test: $scenario"

  export BASE_URL
  export TEST_SCENARIO="$scenario"
  export TEST_TOOL="k6"

  # Run test with error handling
  if ! "$LOAD_TESTS_DIR/scripts/run-load-tests.sh"; then
    output_to_ci "error" "Load test failed: $scenario"
    return 1
  fi

  output_to_ci "info" "Load test completed: $scenario"
  return 0
}

###############################################################################
# Results Analysis
###############################################################################

analyze_results() {
  local results_file=$1
  local scenario=$2

  output_to_ci "info" "Analyzing test results..."

  # Extract metrics from results
  local p95=$(extract_percentile "$results_file" "95")
  local error_rate=$(extract_error_rate "$results_file")
  local throughput=$(extract_throughput "$results_file")

  # Store metrics for reporting
  {
    echo "scenario=$scenario"
    echo "p95=$p95"
    echo "error_rate=$error_rate"
    echo "throughput=$throughput"
    echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$RESULTS_DIR/metrics.env"

  # Check thresholds
  local threshold_violations=0

  if [ -n "$p95" ] && (( $(echo "$p95 > $P95_THRESHOLD" | bc -l) )); then
    output_to_ci "warning" "p95 response time ($p95ms) exceeds threshold ($P95_THRESHOLD ms)"
    threshold_violations=$((threshold_violations + 1))
  fi

  if [ -n "$error_rate" ] && (( $(echo "$error_rate > $ERROR_RATE_THRESHOLD" | bc -l) )); then
    output_to_ci "error" "Error rate ($error_rate%) exceeds threshold ($ERROR_RATE_THRESHOLD%)"
    threshold_violations=$((threshold_violations + 1))
  fi

  return $threshold_violations
}

extract_percentile() {
  local file=$1
  local percentile=$2

  if [ -f "$file" ]; then
    grep -o "\"p(${percentile})\":[0-9.]*" "$file" | grep -o '[0-9.]*' | head -1
  fi
}

extract_error_rate() {
  local file=$1

  if [ -f "$file" ]; then
    grep -o '"errors":{[^}]*}' "$file" | grep -o '"rate":[0-9.]*' | grep -o '[0-9.]*' | head -1
  fi
}

extract_throughput() {
  local file=$1

  if [ -f "$file" ]; then
    grep -o '"http_reqs":{[^}]*}' "$file" | grep -o '"rate":[0-9.]*' | grep -o '[0-9.]*' | head -1
  fi
}

###############################################################################
# Baseline Comparison
###############################################################################

compare_with_baseline() {
  local scenario=$1
  local current_file=$2

  local baseline_file="${BASELINES_DIR}/${scenario}-baseline.json"

  if [ ! -f "$baseline_file" ]; then
    output_to_ci "info" "No baseline found for comparison"
    return 0
  fi

  local baseline_p95=$(extract_percentile "$baseline_file" "95")
  local current_p95=$(extract_percentile "$current_file" "95")

  if [ -z "$baseline_p95" ] || [ -z "$current_p95" ]; then
    return 0
  fi

  local degradation=$(echo "scale=2; (($current_p95 - $baseline_p95) / $baseline_p95) * 100" | bc)

  if (( $(echo "$degradation > $DEGRADATION_THRESHOLD" | bc -l) )); then
    output_to_ci "warning" "Performance degradation of ${degradation}% detected"
    output_to_ci "info" "Baseline p95: ${baseline_p95}ms, Current p95: ${current_p95}ms"
    return 1
  else
    output_to_ci "info" "Performance within acceptable threshold"
    return 0
  fi
}

###############################################################################
# Result Upload/Storage
###############################################################################

upload_results() {
  local results_dir=$1

  output_to_ci "info" "Uploading test results..."

  if [ "$CI_PLATFORM" = "github" ]; then
    upload_github_artifacts "$results_dir"
  elif [ "$CI_PLATFORM" = "gitlab" ]; then
    upload_gitlab_artifacts "$results_dir"
  elif [ "$CI_PLATFORM" = "jenkins" ]; then
    upload_jenkins_artifacts "$results_dir"
  fi
}

upload_github_artifacts() {
  local results_dir=$1

  # GitHub Actions handles artifact upload automatically
  # Results in RESULTS_DIR are available as artifacts
  output_to_ci "info" "Results available as GitHub Actions artifacts"
}

upload_gitlab_artifacts() {
  local results_dir=$1

  # GitLab CI uses artifacts specified in .gitlab-ci.yml
  # Just ensure files are in the right place
  output_to_ci "info" "Results in $results_dir for GitLab artifact upload"
}

upload_jenkins_artifacts() {
  local results_dir=$1

  # Archive results for Jenkins
  if command -v zip &> /dev/null; then
    zip -r "load-test-results-$(date +%Y%m%d_%H%M%S).zip" "$results_dir"
    output_to_ci "info" "Results archived"
  fi
}

###############################################################################
# Notifications
###############################################################################

notify_slack() {
  local status=$1
  local message=$2

  if [ -z "$SLACK_WEBHOOK_URL" ]; then
    return
  fi

  local color="danger"
  [ "$status" = "success" ] && color="good"
  [ "$status" = "warning" ] && color="warning"

  local payload=$(cat <<EOF
{
  "attachments": [
    {
      "color": "$color",
      "title": "SupliList Load Test - $status",
      "text": "$message",
      "fields": [
        {
          "title": "Scenario",
          "value": "$TEST_SCENARIO",
          "short": true
        },
        {
          "title": "Platform",
          "value": "$CI_PLATFORM",
          "short": true
        },
        {
          "title": "Build",
          "value": "${BUILD_URL:-N/A}",
          "short": false
        }
      ],
      "footer": "Load Testing Bot",
      "ts": $(date +%s)
    }
  ]
}
EOF
)

  curl -X POST -H 'Content-type: application/json' \
    --data "$payload" \
    "$SLACK_WEBHOOK_URL" || true
}

notify_pagerduty() {
  local status=$1
  local message=$2

  if [ -z "$PAGERDUTY_KEY" ] || [ "$status" != "failure" ]; then
    return
  fi

  local payload=$(cat <<EOF
{
  "routing_key": "$PAGERDUTY_KEY",
  "event_action": "trigger",
  "dedup_key": "load-test-$(date +%Y%m%d-%H%M)",
  "payload": {
    "summary": "Load test failure: $TEST_SCENARIO",
    "severity": "critical",
    "source": "SupliList Load Testing",
    "custom_details": {
      "scenario": "$TEST_SCENARIO",
      "message": "$message",
      "platform": "$CI_PLATFORM"
    }
  }
}
EOF
)

  curl -X POST https://events.pagerduty.com/v2/enqueue \
    -H 'Content-Type: application/json' \
    -d "$payload" || true
}

###############################################################################
# Report Generation
###############################################################################

generate_ci_report() {
  local scenario=$1
  local results_dir=$2

  output_to_ci "info" "Generating CI report..."

  local report_file="${results_dir}/ci-report-$(date +%Y%m%d_%H%M%S).txt"

  {
    echo "=== SupliList Load Test CI Report ==="
    echo "Timestamp: $(date)"
    echo "Scenario: $scenario"
    echo "Platform: $CI_PLATFORM"
    echo "Build URL: ${BUILD_URL:-N/A}"
    echo ""
    echo "=== Test Results ==="

    if [ -f "$results_dir/metrics.env" ]; then
      source "$results_dir/metrics.env"
      echo "p95 Response Time: ${p95}ms"
      echo "Error Rate: ${error_rate}%"
      echo "Throughput: ${throughput} RPS"
    fi

    echo ""
    echo "=== Artifacts ==="
    ls -la "$results_dir"/*.json 2>/dev/null || echo "No JSON results"

  } | tee "$report_file"

  # Output key metrics to CI
  if [ -f "$results_dir/metrics.env" ]; then
    source "$results_dir/metrics.env"
    output_to_ci "info" "p95: ${p95}ms | Error Rate: ${error_rate}% | Throughput: ${throughput} RPS"
  fi
}

###############################################################################
# Post-test Cleanup
###############################################################################

cleanup() {
  output_to_ci "info" "Cleaning up..."

  # Remove large temporary files
  find "$RESULTS_DIR" -name "*.log" -type f -size +100M -delete

  # Keep latest results for debugging
  output_to_ci "info" "Cleanup complete"
}

###############################################################################
# Main Execution
###############################################################################

main() {
  output_to_ci "info" "========================================="
  output_to_ci "info" "SupliList Load Test CI/CD Integration"
  output_to_ci "info" "========================================="
  output_to_ci "info" "Platform: $CI_PLATFORM"
  output_to_ci "info" "Scenario: $TEST_SCENARIO"
  output_to_ci "info" "Server: $BASE_URL"

  # Pre-test checks
  if ! check_prerequisites; then
    output_to_ci "error" "Prerequisites check failed"
    notify_slack "failure" "Server health check failed"
    exit 1
  fi

  if ! check_test_tools; then
    output_to_ci "error" "Test tools not available"
    notify_slack "failure" "Test tools check failed"
    exit 1
  fi

  # Create results directory
  mkdir -p "$RESULTS_DIR"

  # Run load test
  if ! run_load_test "$TEST_SCENARIO"; then
    output_to_ci "error" "Load test execution failed"
    notify_slack "failure" "Load test execution failed"
    notify_pagerduty "failure" "Load test execution failed"
    exit 1
  fi

  # Find latest results
  local latest_results=$(ls -t "$RESULTS_DIR"/*.json 2>/dev/null | head -1)

  if [ -z "$latest_results" ]; then
    output_to_ci "warning" "No results file found"
  else
    # Analyze results
    if ! analyze_results "$latest_results" "$TEST_SCENARIO"; then
      output_to_ci "warning" "Some performance thresholds exceeded"
    fi

    # Compare with baseline
    if ! compare_with_baseline "$TEST_SCENARIO" "$latest_results"; then
      output_to_ci "warning" "Performance degradation detected"
    fi

    # Save new baseline if requested
    if [ "$SAVE_BASELINE" = "true" ]; then
      cp "$latest_results" "${BASELINES_DIR}/${TEST_SCENARIO}-baseline.json"
      output_to_ci "info" "Baseline saved"
    fi

    # Upload results
    if [ "$UPLOAD_RESULTS" = "true" ]; then
      upload_results "$RESULTS_DIR"
    fi

    # Generate report
    generate_ci_report "$TEST_SCENARIO" "$RESULTS_DIR"
  fi

  # Cleanup
  cleanup

  output_to_ci "info" "========================================="
  output_to_ci "info" "Load test completed successfully"
  output_to_ci "info" "========================================="

  # Send success notification
  notify_slack "success" "Load test $TEST_SCENARIO completed successfully"
}

# Run main function with error handling
if ! main "$@"; then
  exit 1
fi

exit 0
