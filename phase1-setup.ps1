# SupliList FASE 1 - Automated Setup Script
# This script automates the entire Phase 1 setup

param(
    [switch]$SkipDocker = $false,
    [switch]$Clean = $false
)

# Color output
function Write-Header {
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ $args[0]" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
}

function Write-Success {
    Write-Host "✅ $args[0]" -ForegroundColor Green
}

function Write-Error-Custom {
    Write-Host "❌ $args[0]" -ForegroundColor Red
}

function Write-Info {
    Write-Host "ℹ️  $args[0]" -ForegroundColor Yellow
}

# Start setup
Write-Header "FASE 1 - SupliList Infrastructure Setup"

# Check if docker is installed
Write-Info "Checking Docker installation..."
try {
    $dockerVersion = docker --version
    Write-Success "Docker found: $dockerVersion"
} catch {
    Write-Error-Custom "Docker not installed or not in PATH"
    Write-Info "Install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
}

# Step 1: Copy .env file
Write-Header "Step 1: Setting up Environment Variables"
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Success ".env created from .env.example"
    } else {
        Write-Error-Custom ".env.example not found"
        exit 1
    }
} else {
    Write-Info ".env already exists (keeping existing file)"
}

# Step 2: Install Node dependencies
Write-Header "Step 2: Installing Node.js Dependencies"
if (Test-Path "server") {
    Push-Location server
    Write-Info "Running: npm install"
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Success "npm install completed"
    } else {
        Write-Error-Custom "npm install failed"
        Pop-Location
        exit 1
    }
    Pop-Location
} else {
    Write-Info "server directory not found, skipping npm install"
}

# Step 3: Clean Docker containers (optional)
if ($Clean) {
    Write-Header "Step 3: Cleaning up Docker Containers"
    Write-Info "Stopping and removing containers..."
    docker-compose down -v
    Write-Success "Docker cleanup completed"
}

# Step 4: Start Docker containers
Write-Header "Step 4: Starting Docker Containers"
Write-Info "Running: docker-compose up -d"
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Success "docker-compose up completed"
} else {
    Write-Error-Custom "docker-compose up failed"
    exit 1
}

# Step 5: Wait for services to be healthy
Write-Header "Step 5: Waiting for Services to be Ready"
Write-Info "This may take 30-60 seconds..."

$maxAttempts = 30
$attempt = 0
$allHealthy = $false

while ($attempt -lt $maxAttempts -and -not $allHealthy) {
    $attempt++
    Write-Info "Attempt $attempt/$maxAttempts..."

    # Check PostgreSQL
    try {
        $pgHealthy = docker exec suplilist-postgres pg_isready -U suplilist -d suplilist 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "PostgreSQL is ready"
            $pgOk = $true
        } else {
            $pgOk = $false
        }
    } catch {
        $pgOk = $false
    }

    # Check Redis
    try {
        $redisHealthy = docker exec suplilist-redis redis-cli ping 2>$null
        if ($LASTEXITCODE -eq 0 -and $redisHealthy -eq "PONG") {
            Write-Success "Redis is ready"
            $redisOk = $true
        } else {
            $redisOk = $false
        }
    } catch {
        $redisOk = $false
    }

    if ($pgOk -and $redisOk) {
        $allHealthy = $true
        Write-Success "All services are healthy!"
    } else {
        Start-Sleep -Seconds 2
    }
}

if (-not $allHealthy) {
    Write-Error-Custom "Services failed to become healthy within timeout"
    Write-Header "Docker Logs"
    docker-compose logs
    exit 1
}

# Step 6: Validate PostgreSQL
Write-Header "Step 6: Validating PostgreSQL"
Write-Info "Checking schema and seed data..."

$pgQuery = @"
SELECT
    COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
"@

try {
    $result = docker exec suplilist-postgres psql -U suplilist -d suplilist -t -c $pgQuery 2>$null
    $tableCount = [int]($result.Trim())
    Write-Success "PostgreSQL: $tableCount tables found"

    # Check for seed data
    $userCount = docker exec suplilist-postgres psql -U suplilist -d suplilist -t -c "SELECT COUNT(*) FROM users;" 2>$null
    $productCount = docker exec suplilist-postgres psql -U suplilist -d suplilist -t -c "SELECT COUNT(*) FROM products;" 2>$null

    Write-Info "  - Users: $userCount"
    Write-Info "  - Products: $productCount"
} catch {
    Write-Error-Custom "Failed to validate PostgreSQL"
}

# Step 7: Validate Redis
Write-Header "Step 7: Validating Redis"
Write-Info "Checking configuration..."

try {
    $maxMemory = docker exec suplilist-redis redis-cli CONFIG GET maxmemory 2>$null
    $policy = docker exec suplilist-redis redis-cli CONFIG GET maxmemory-policy 2>$null

    Write-Success "Redis Configuration:"
    Write-Info "  - maxmemory: $($maxMemory[1])"
    Write-Info "  - maxmemory-policy: $($policy[1])"

    $info = docker exec suplilist-redis redis-cli INFO memory 2>$null
    Write-Info "  - Memory usage: $(($info | Select-String 'used_memory_human').ToString().Split(':')[1])"
} catch {
    Write-Error-Custom "Failed to validate Redis"
}

# Step 8: Validate API
Write-Header "Step 8: Validating API"
Write-Info "Waiting for API to start (this may take 10-20 seconds)..."

$apiHealthy = $false
$apiAttempts = 0
$maxApiAttempts = 20

while ($apiAttempts -lt $maxApiAttempts -and -not $apiHealthy) {
    $apiAttempts++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Success "API is responding on port 5000"
            $apiHealthy = $true
        }
    } catch {
        # API not ready yet
        Start-Sleep -Seconds 1
    }
}

if (-not $apiHealthy) {
    Write-Error-Custom "API health check failed"
    Write-Header "API Logs"
    docker logs suplilist-api | Select-Object -Last 50
} else {
    Write-Success "API is healthy"
}

# Final Summary
Write-Header "Setup Summary"
Write-Success "FASE 1 - Fundação Completa!"
Write-Info "Services running:"
Write-Info "  - PostgreSQL: localhost:5432"
Write-Info "  - Redis: localhost:6379"
Write-Info "  - API: http://localhost:5000"
Write-Info ""
Write-Info "Next steps:"
Write-Info "  1. Verify data: docker exec -it suplilist-postgres psql -U suplilist -d suplilist"
Write-Info "  2. Check API logs: docker logs -f suplilist-api"
Write-Info "  3. Proceed to FASE 2: JIT Endpoints"
Write-Info ""
Write-Success "Setup completed at $(Get-Date)"
