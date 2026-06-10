#
# SupliList E2E Test Runner (PowerShell)
#
# Usage:
#   .\run-tests.ps1 -Phase "all" -Environment "local"
#   .\run-tests.ps1 -Phase "phase1" -Environment "staging"
#   .\run-tests.ps1 -Phase "all" -Environment "prod" -Headed
#

param(
    [ValidateSet("all", "complete-integration", "phase1", "phase2", "phase3", "phase4")]
    [string]$Phase = "all",

    [ValidateSet("local", "staging", "prod")]
    [string]$Environment = "local",

    [switch]$Headed,
    [switch]$Debug
)

# Colors for output
function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
    Write-Host "║" -NoNewline -ForegroundColor Blue
    Write-Host "  $Message" -NoNewline
    Write-Host " " * (56 - $Message.Length) -NoNewline
    Write-Host "║" -ForegroundColor Blue
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

# Set environment variables based on environment
switch ($Environment) {
    "local" {
        $env:API_URL = "http://localhost:5000"
        $env:PROMETHEUS_URL = "http://localhost:9090"
        $env:GRAFANA_URL = "http://localhost:3000"
    }
    "staging" {
        $env:API_URL = $env:STAGING_API_URL ?? "https://staging-api.suplilist.com"
        $env:PROMETHEUS_URL = $env:STAGING_PROMETHEUS_URL ?? "https://staging-prometheus.suplilist.com"
        $env:GRAFANA_URL = $env:STAGING_GRAFANA_URL ?? "https://staging-grafana.suplilist.com"
    }
    "prod" {
        $env:API_URL = $env:PROD_API_URL ?? "https://api.suplilist.com"
        $env:PROMETHEUS_URL = $env:PROD_PROMETHEUS_URL ?? "https://prometheus.suplilist.com"
        $env:GRAFANA_URL = $env:PROD_GRAFANA_URL ?? "https://grafana.suplilist.com"
    }
}

# Print header
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║         SupliList E2E Test Suite - PHASE 1-4               ║" -ForegroundColor Blue
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

Write-Host "Phase: " -NoNewline
Write-Host $Phase -ForegroundColor Yellow
Write-Host "Environment: " -NoNewline
Write-Host $Environment -ForegroundColor Yellow
Write-Host "API URL: " -NoNewline
Write-Host $env:API_URL -ForegroundColor Yellow
Write-Host ""

# Function to check API health
function Test-APIHealth {
    Write-Warning-Custom "Checking API health..."

    try {
        $response = Invoke-WebRequest -Uri "$($env:API_URL)/health" -Method Get -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Success "API is healthy"
            return $true
        }
    }
    catch {
        Write-Error-Custom "API is not responding at $($env:API_URL)"

        if ($Environment -eq "local") {
            Write-Warning-Custom "Tip: Start the API with: npm run dev:server"
        }

        return $false
    }
}

# Function to run tests
function Invoke-TestPhase {
    param(
        [string]$PhaseName,
        [string]$TestFile
    )

    Write-Host ""
    Write-Info "Running $PhaseName..."

    $playwrightArgs = @(
        "test",
        $TestFile,
        "--env", "API_URL=$($env:API_URL)",
        "--env", "PROMETHEUS_URL=$($env:PROMETHEUS_URL)",
        "--env", "GRAFANA_URL=$($env:GRAFANA_URL)"
    )

    if ($Headed) {
        $playwrightArgs += "--headed"
    }

    if ($Debug) {
        $playwrightArgs += "--debug"
    }

    & npx @playwrightArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Success "$PhaseName passed"
    }
    else {
        Write-Error-Custom "$PhaseName failed"
    }
}

# Function to print summary
function Print-TestSummary {
    Write-Host ""
    Write-Header "Test Summary"

    if (Test-Path "test-results/results.json") {
        Write-Success "Results saved to test-results/results.json"
        Write-Success "HTML report saved to test-results/html/index.html"

        Write-Host ""
        Write-Host "Test Statistics:"

        # Try to parse and display JSON if ConvertFrom-Json is available
        try {
            $json = Get-Content "test-results/results.json" | ConvertFrom-Json
            if ($json.stats) {
                Write-Host "  Total Tests: $($json.stats.expected)"
                Write-Host "  Passed: $($json.stats.passed)"
                Write-Host "  Failed: $($json.stats.failed)"
                Write-Host "  Skipped: $($json.stats.skipped)"
                Write-Host "  Duration: $([math]::Round($json.stats.duration / 1000, 2))s"
            }
        }
        catch {
            Write-Info "Unable to parse test statistics"
        }

        # Try to open HTML report
        if ($Environment -eq "local") {
            try {
                $htmlPath = Resolve-Path "test-results/html/index.html"
                Write-Host ""
                Write-Info "Opening HTML report..."
                Start-Process $htmlPath
            }
            catch {
                Write-Info "HTML report available at: test-results/html/index.html"
            }
        }
    }
}

# Main execution
if (-not (Test-APIHealth)) {
    exit 1
}

Write-Host ""

switch ($Phase) {
    "all" {
        Write-Info "Running complete integration test suite..."
        Invoke-TestPhase "Complete Integration" "complete-integration.test.ts"
        Invoke-TestPhase "PHASE 1 - Foundation" "phase1-validation.test.ts"
        Invoke-TestPhase "PHASE 2 - JIT Endpoints" "phase2-jit.test.ts"
        Invoke-TestPhase "PHASE 3 - Async Motor" "phase3-async.test.ts"
        Invoke-TestPhase "PHASE 4 - Telemetry" "phase4-telemetry.test.ts"
    }
    "complete-integration" {
        Invoke-TestPhase "Complete Integration" "complete-integration.test.ts"
    }
    "phase1" {
        Invoke-TestPhase "PHASE 1 - Foundation" "phase1-validation.test.ts"
    }
    "phase2" {
        Invoke-TestPhase "PHASE 2 - JIT Endpoints" "phase2-jit.test.ts"
    }
    "phase3" {
        Invoke-TestPhase "PHASE 3 - Async Motor" "phase3-async.test.ts"
    }
    "phase4" {
        Invoke-TestPhase "PHASE 4 - Telemetry" "phase4-telemetry.test.ts"
    }
}

Print-TestSummary

Write-Host ""
Write-Success "Tests completed!"
Write-Host ""
