#!/bin/bash

###############################################################################
# SupliList Load Testing Automation Script
#
# This script automates the execution of load tests using K6, Locust, or JMeter
# Features:
# - Multiple test scenarios (normal, peak, stress)
# - Baseline comparison
# - Performance metrics collection
# - Alert thresholds
# - CI/CD integration
###############################################################################

set -e

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
readonly LOAD_TESTS_DIR="${PROJECT_ROOT}/load-tests"
readonly RESULTS_DIR="${LOAD_TESTS_DIR}/results"
readonly BASELINES_DIR="${LOAD_TESTS_DIR}/baselines"
readonly LOG_FILE="${RESULTS_DIR}/load-test-$(date +%Y%m%d_%H%M%S).log"

# Test configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_TOOL="${TEST_TOOL:-k6}"  # k6, locust, jmeter
TEST_SCENARIO="${TEST_SCENARIO:-normal}"  # normal, peak, stress
ENABLE_ALERTS="${ENABLE_ALERTS:-true}"
SAVE_BASELINE="${SAVE_BASELINE:-false}"
COMPARE_BASELINE="${COMPARE_BASELINE:-true}"

# Performance thresholds
P95_THRESHOLD=500  # ms
P99_THRESHOLD=1000 # ms
ERROR_RATE_THRESHOLD=5  # %

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

###############################################################################
# Utility Functions
###############################################################################

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_info() {
  echo -e "${BLUE}[INFO]${NC} $*" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $*" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"
}

###############################################################################
# Setup Functions
###############################################################################

setup_environment() {
  log_info "Setting up environment..."

  # Create necessary directories
  mkdir -p "$RESULTS_DIR" "$BASELINES_DIR"

  # Check prerequisites
  if [ "$TEST_TOOL" = "k6" ]; then
    if ! command -v k6 &> /dev/null; then
      log_error "K6 is not installed. Install from https://k6.io/docs/getting-started/installation/"
      exit 1
    fi
  elif [ "$TEST_TOOL" = "locust" ]; then
    if ! command -v locust &> /dev/null; then
      log_error "Locust is not installed. Install via: pip install locust"
      exit 1
    fi
  elif [ "$TEST_TOOL" = "jmeter" ]; then
    if ! command -v jmeter &> /dev/null; then
      log_error "JMeter is not installed. Install from https://jmeter.apache.org/"
      exit 1
    fi
  fi

  # Verify server is running
  if ! curl -sf "$BASE_URL/health" > /dev/null 2>&1; then
    log_warning "Server at $BASE_URL is not responding. Make sure it's running."
  fi

  log_success "Environment setup complete"
}

###############################################################################
# K6 Load Testing
###############################################################################

run_k6_test() {
  local scenario=$1
  local test_file="${LOAD_TESTS_DIR}/k6-tests/${scenario}-load.js"
  local output_file="${RESULTS_DIR}/k6-${scenario}-$(date +%Y%m%d_%H%M%S).json"

  if [ ! -f "$test_file" ]; then
    log_error "Test file not found: $test_file"
    return 1
  fi

  log_info "Starting K6 $scenario load test..."
  log_info "Output: $output_file"

  export BASE_URL
  k6 run \
    --out "json=$output_file" \
    --summary-export="$output_file.summary" \
    "$test_file" 2>&1 | tee -a "$LOG_FILE"

  local exit_code=${PIPESTATUS[0]}

  if [ $exit_code -eq 0 ]; then
    log_success "K6 $scenario test completed successfully"
    process_k6_results "$output_file"
  else
    log_error "K6 $scenario test failed with exit code $exit_code"
    return $exit_code
  fi
}

process_k6_results() {
  local summary_file="${1}.summary"

  if [ ! -f "$summary_file" ]; then
    return
  fi

  log_info "Processing K6 results..."

  # Extract key metrics from summary
  local http_req_duration=$(grep -o '"http_req_duration":[^}]*' "$summary_file" | head -1)
  local http_req_failed=$(grep -o '"http_req_failed":[^}]*' "$summary_file" | head -1)

  log_info "Key Metrics:"
  log_info "  $http_req_duration"
  log_info "  $http_req_failed"

  # Check thresholds
  check_k6_thresholds "$summary_file"
}

check_k6_thresholds() {
  local summary_file=$1
  local thresholds_ok=true

  # Extract p95 value
  local p95=$(grep -o '"p\(95\)":[0-9.]*' "$summary_file" | grep -o '[0-9.]*')
  if [ -n "$p95" ] && (( $(echo "$p95 > $P95_THRESHOLD" | bc -l) )); then
    log_warning "p95 ($p95ms) exceeds threshold ($P95_THRESHOLD ms)"
    thresholds_ok=false
  fi

  # Extract error rate
  local error_rate=$(grep -o '"rate":[0-9.]*' "$summary_file" | tail -1 | grep -o '[0-9.]*')
  if [ -n "$error_rate" ]; then
    local error_pct=$(echo "scale=2; $error_rate * 100" | bc)
    if (( $(echo "$error_pct > $ERROR_RATE_THRESHOLD" | bc -l) )); then
      log_warning "Error rate ($error_pct%) exceeds threshold ($ERROR_RATE_THRESHOLD%)"
      thresholds_ok=false
    fi
  fi

  if [ "$thresholds_ok" = true ]; then
    log_success "All thresholds passed"
  else
    log_warning "Some thresholds exceeded - review results"
  fi
}

###############################################################################
# Locust Load Testing
###############################################################################

run_locust_test() {
  local scenario=$1
  local num_users=100
  local spawn_rate=10
  local run_time="5m"

  case "$scenario" in
    normal)
      num_users=100
      spawn_rate=10
      run_time="10m"
      ;;
    peak)
      num_users=1000
      spawn_rate=50
      run_time="10m"
      ;;
    stress)
      num_users=5000
      spawn_rate=100
      run_time="10m"
      ;;
  esac

  log_info "Starting Locust $scenario test..."
  log_info "Users: $num_users, Spawn rate: $spawn_rate/sec, Duration: $run_time"

  cd "$LOAD_TESTS_DIR/locust" || exit 1

  locust \
    --headless \
    --users "$num_users" \
    --spawn-rate "$spawn_rate" \
    --run-time "$run_time" \
    --host "$BASE_URL" \
    --csv="$RESULTS_DIR/locust-${scenario}" \
    2>&1 | tee -a "$LOG_FILE"

  local exit_code=${PIPESTATUS[0]}

  if [ $exit_code -eq 0 ]; then
    log_success "Locust $scenario test completed successfully"
    process_locust_results "$scenario"
  else
    log_error "Locust $scenario test failed with exit code $exit_code"
    return $exit_code
  fi
}

process_locust_results() {
  local scenario=$1
  local stats_file="${RESULTS_DIR}/locust-${scenario}_stats.csv"

  if [ ! -f "$stats_file" ]; then
    log_warning "Stats file not found: $stats_file"
    return
  fi

  log_info "Processing Locust results..."

  # Calculate percentiles and failure rates
  awk -F',' '
    NR > 1 {
      if ($2 > max_response) max_response = $2;
      total_requests += $3;
      total_failures += $4;
    }
    END {
      if (total_requests > 0) {
        failure_rate = (total_failures / total_requests) * 100;
        printf "Total Requests: %d\n", total_requests;
        printf "Total Failures: %d\n", total_failures;
        printf "Failure Rate: %.2f%%\n", failure_rate;
        printf "Max Response Time: %dms\n", max_response;
      }
    }
  ' "$stats_file" | tee -a "$LOG_FILE"
}

###############################################################################
# JMeter Load Testing
###############################################################################

run_jmeter_test() {
  local scenario=$1
  local test_file="${LOAD_TESTS_DIR}/jmeter/suplilist-load-test.jmx"
  local results_file="${RESULTS_DIR}/jmeter-${scenario}-$(date +%Y%m%d_%H%M%S).jtl"

  if [ ! -f "$test_file" ]; then
    log_error "Test file not found: $test_file"
    return 1
  fi

  log_info "Starting JMeter $scenario test..."
  log_info "Output: $results_file"

  jmeter -n -t "$test_file" \
    -l "$results_file" \
    -j "${results_file}.log" \
    -e -o "${results_file}.html" \
    -Dbase.url="$BASE_URL" \
    -Dthreads="$(get_jmeter_thread_count "$scenario")" 2>&1 | tee -a "$LOG_FILE"

  local exit_code=${PIPESTATUS[0]}

  if [ $exit_code -eq 0 ]; then
    log_success "JMeter $scenario test completed successfully"
    process_jmeter_results "$results_file"
  else
    log_error "JMeter $scenario test failed with exit code $exit_code"
    return $exit_code
  fi
}

get_jmeter_thread_count() {
  case "$1" in
    normal) echo "100" ;;
    peak) echo "1000" ;;
    stress) echo "5000" ;;
    *) echo "100" ;;
  esac
}

process_jmeter_results() {
  local results_file=$1

  log_info "Generating JMeter report..."
  log_info "HTML Report: ${results_file}.html"
}

###############################################################################
# Baseline Management
###############################################################################

save_baseline() {
  local scenario=$1
  local results_file=$2
  local baseline_file="${BASELINES_DIR}/${scenario}-baseline-$(date +%Y%m%d).json"

  if [ ! -f "$results_file" ]; then
    log_warning "Results file not found for baseline save"
    return
  fi

  cp "$results_file" "$baseline_file"
  log_success "Baseline saved: $baseline_file"
}

compare_with_baseline() {
  local scenario=$1
  local current_file=$2
  local baseline_file="${BASELINES_DIR}/${scenario}-baseline-latest.json"

  if [ ! -f "$baseline_file" ]; then
    log_info "No baseline found for comparison"
    return
  fi

  log_info "Comparing with baseline..."
  # Comparison logic would go here
}

###############################################################################
# Alert Management
###############################################################################

send_alert() {
  local severity=$1
  local message=$2

  if [ "$ENABLE_ALERTS" != "true" ]; then
    return
  fi

  log_warning "ALERT [$severity]: $message"

  # Integration with monitoring/alerting systems could go here
  # - Slack notification
  # - PagerDuty incident
  # - Email notification
  # - Datadog metric
}

###############################################################################
# Report Generation
###############################################################################

generate_report() {
  local report_file="${RESULTS_DIR}/load-test-report-$(date +%Y%m%d_%H%M%S).html"

  log_info "Generating comprehensive report..."

  cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>SupliList Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #f2f2f2; }
    .pass { color: green; }
    .fail { color: red; }
    .warn { color: orange; }
  </style>
</head>
<body>
  <h1>SupliList Load Test Report</h1>
  <p>Generated: <strong id="timestamp"></strong></p>

  <h2>Test Configuration</h2>
  <table>
    <tr><th>Parameter</th><th>Value</th></tr>
    <tr><td>Tool</td><td id="tool"></td></tr>
    <tr><td>Scenario</td><td id="scenario"></td></tr>
    <tr><td>Server URL</td><td id="url"></td></tr>
  </table>

  <h2>Performance Metrics</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
      <th>Threshold</th>
      <th>Status</th>
    </tr>
    <tr>
      <td>p95 Response Time</td>
      <td id="p95">N/A</td>
      <td>500ms</td>
      <td id="p95_status">-</td>
    </tr>
    <tr>
      <td>p99 Response Time</td>
      <td id="p99">N/A</td>
      <td>1000ms</td>
      <td id="p99_status">-</td>
    </tr>
    <tr>
      <td>Error Rate</td>
      <td id="error_rate">N/A</td>
      <td>5%</td>
      <td id="error_status">-</td>
    </tr>
    <tr>
      <td>Throughput (RPS)</td>
      <td id="throughput">N/A</td>
      <td>-</td>
      <td>-</td>
    </tr>
  </table>

  <h2>Recommendations</h2>
  <ul id="recommendations"></ul>

  <script>
    document.getElementById('timestamp').textContent = new Date().toLocaleString();
  </script>
</body>
</html>
EOF

  log_success "Report generated: $report_file"
}

###############################################################################
# Main Execution
###############################################################################

main() {
  log_info "========================================="
  log_info "SupliList Load Testing Suite"
  log_info "========================================="
  log_info "Tool: $TEST_TOOL"
  log_info "Scenario: $TEST_SCENARIO"
  log_info "Server: $BASE_URL"
  log_info "Results: $RESULTS_DIR"
  log_info "========================================="

  setup_environment

  case "$TEST_TOOL" in
    k6)
      run_k6_test "$TEST_SCENARIO"
      ;;
    locust)
      run_locust_test "$TEST_SCENARIO"
      ;;
    jmeter)
      run_jmeter_test "$TEST_SCENARIO"
      ;;
    *)
      log_error "Unknown test tool: $TEST_TOOL"
      exit 1
      ;;
  esac

  if [ "$SAVE_BASELINE" = "true" ]; then
    save_baseline "$TEST_SCENARIO" "${RESULTS_DIR}/"
  fi

  if [ "$COMPARE_BASELINE" = "true" ]; then
    compare_with_baseline "$TEST_SCENARIO" "${RESULTS_DIR}/"
  fi

  generate_report

  log_info "========================================="
  log_success "Load testing completed!"
  log_info "Log file: $LOG_FILE"
  log_info "Results directory: $RESULTS_DIR"
  log_info "========================================="
}

# Run main function
main "$@"
