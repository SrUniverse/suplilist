# Load Testing Setup and Installation

## System Requirements

### Minimum Hardware
- **CPU:** 8 cores (for load generation)
- **Memory:** 16 GB RAM
- **Storage:** 20 GB free space (for results and baselines)
- **Network:** 1 Gbps connection
- **Disk I/O:** SSD recommended for logging

### Recommended Hardware (Production-grade Testing)
- **CPU:** 16+ cores
- **Memory:** 32 GB RAM
- **Storage:** 100 GB SSD
- **Network:** 10 Gbps connection
- **Dedicated machine:** Isolated from other workloads

### Operating Systems
- macOS 11+
- Linux (Ubuntu 20.04+, CentOS 8+)
- Windows 10/11 (with WSL2 recommended)

### Browser (for Locust UI)
- Chrome 90+
- Firefox 88+
- Safari 14+

## Software Dependencies

### Required

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 24.0.0+ | Run SupliList server |
| npm | 10.0.0+ | Package management |
| Git | 2.30.0+ | Version control |
| Bash | 4.0+ | Script execution |
| curl | 7.0+ | HTTP requests |

### Load Testing Tools (Choose at least one)

#### K6 (Recommended)
- **Version:** 0.48.0+
- **Use Case:** Modern, JavaScript-based, easy to integrate
- **Documentation:** https://k6.io/docs/

#### Locust
- **Version:** 2.15.0+
- **Language:** Python
- **Use Case:** Distributed testing, web UI for control

#### JMeter
- **Version:** 5.6.0+
- **Use Case:** Enterprise testing, detailed reporting

### Database & Caching

| Service | Version | Purpose |
|---------|---------|---------|
| MongoDB | 5.0+ | Application database |
| Redis | 6.0+ | Caching and rate limiting |
| Docker | 20.10+ | Container orchestration |

## Installation Steps

### 1. Install K6 (Recommended)

#### macOS
```bash
# Using Homebrew
brew install k6

# Verify installation
k6 version
```

#### Linux (Ubuntu/Debian)
```bash
# Add K6 repository
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69

echo "deb https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6-stable.list

sudo apt-get update
sudo apt-get install k6

# Verify
k6 version
```

#### Linux (CentOS/RHEL)
```bash
# Using dnf
sudo dnf install https://dl.k6.io/rpm/k6-latest-1.x86_64.rpm

# Verify
k6 version
```

#### Windows (PowerShell)
```powershell
# Using Chocolatey
choco install k6

# Or using Scoop
scoop install k6

# Verify
k6 version
```

#### Docker
```bash
docker pull grafana/k6:latest

# Run K6 in container
docker run --rm -v "$(pwd):/scripts" \
  grafana/k6:latest run /scripts/load-tests/k6-tests/normal-load.js
```

### 2. Install Locust

#### Using pip
```bash
# Python 3.7+
pip install locust==2.15.0+

# Verify installation
locust --version
```

#### Using Conda
```bash
conda install -c conda-forge locust

# Verify
locust --version
```

#### Using Docker
```bash
docker pull locustio/locust:latest

# Run in container
docker run -p 8089:8089 -v "$(pwd):/home/locust" \
  locustio/locust:latest -f /home/locust/load-tests/locust/locustfile.py
```

### 3. Install JMeter

#### macOS
```bash
# Using Homebrew
brew install jmeter

# Verify
jmeter --version
```

#### Linux
```bash
# Download latest version
wget https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-5.6.2.tgz

# Extract
tar xzf apache-jmeter-5.6.2.tgz
sudo mv apache-jmeter-5.6.2 /opt/jmeter

# Add to PATH
echo 'export PATH=/opt/jmeter/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Verify
jmeter --version
```

#### Windows
```powershell
# Using Chocolatey
choco install jmeter

# Or download from https://jmeter.apache.org/download_jmeter.cgi
# Extract and add to PATH
```

#### Docker
```bash
docker pull justb4/jmeter:latest

docker run -v "$(pwd):/work" justb4/jmeter:latest \
  -n -t /work/load-tests/jmeter/suplilist-load-test.jmx
```

### 4. Install Python Dependencies (for Locust)

```bash
# Navigate to load tests directory
cd load-tests/locust

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# If requirements.txt doesn't exist, install manually
pip install locust==2.15.0+ requests>=2.28.0
```

### 5. Setup SupliList Server

```bash
# Navigate to project root
cd /path/to/suplilist

# Install dependencies
npm install

# Build server
npm run build -w @suplilist/server

# Start MongoDB and Redis
docker compose up -d mongodb redis

# Start development server
npm run dev:server

# Verify server is running
curl http://localhost:3000/health
```

### 6. Make Scripts Executable

```bash
# Navigate to load tests directory
cd load-tests/scripts

# Make all scripts executable
chmod +x *.sh

# Verify
ls -la *.sh  # Should show x permissions
```

## Environment Configuration

### Create .env File

```bash
# Create environment configuration
cat > load-tests/.env << 'EOF'
# Server configuration
BASE_URL=http://localhost:3000
SERVER_TIMEOUT=30s

# Test configuration
TEST_TOOL=k6  # k6, locust, or jmeter
TEST_SCENARIO=normal  # normal, peak, stress

# Performance thresholds
P95_THRESHOLD=500
P99_THRESHOLD=1000
ERROR_RATE_THRESHOLD=5
DEGRADATION_THRESHOLD=10

# Features
SAVE_BASELINE=false
COMPARE_BASELINE=true
ENABLE_ALERTS=true

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
PAGERDUTY_KEY=xxxxx

# Database (for result storage)
DB_HOST=localhost
DB_PORT=27017
DB_NAME=suplilist-metrics

# CI/CD
CI_PLATFORM=unknown
EOF
```

### Load Configuration

```bash
# Source environment before running tests
source load-tests/.env

# Or export variables
export BASE_URL=http://localhost:3000
export TEST_SCENARIO=normal
```

## Docker Setup (Recommended)

### Docker Compose for Complete Stack

```yaml
# Create docker-compose.load-test.yml
version: '3.8'

services:
  k6:
    image: grafana/k6:latest
    volumes:
      - ./load-tests/k6-tests:/scripts
      - ./load-tests/results:/results
    environment:
      - BASE_URL=http://server:3000
    depends_on:
      - server
    command: run /scripts/normal-load.js

  server:
    image: suplilist-server:latest
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - MONGO_URI=mongodb://mongodb:27017/suplilist
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis

  mongodb:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  locust:
    image: locustio/locust:latest
    ports:
      - "8089:8089"
    volumes:
      - ./load-tests/locust:/home/locust
    environment:
      - HOST=http://server:3000
    depends_on:
      - server
    command: -f /home/locust/locustfile.py

volumes:
  mongo_data:
  redis_data:
```

Run with:
```bash
docker compose -f docker-compose.load-test.yml up
```

## Verification

### Verify K6 Installation
```bash
k6 version
k6 run --help
```

### Verify Locust Installation
```bash
locust --version
locust --help
```

### Verify JMeter Installation
```bash
jmeter --version
jmeter -h | head -20
```

### Verify Server Connectivity
```bash
# Check server health
curl -v http://localhost:3000/health

# Test with K6
k6 run -e BASE_URL=http://localhost:3000 \
  load-tests/k6-tests/normal-load.js --vus 1 --duration 10s
```

## Troubleshooting Installation

### K6 Permission Denied
```bash
# Make K6 executable
chmod +x $(which k6)

# Or reinstall
brew uninstall k6
brew install k6
```

### Locust ModuleNotFoundError
```bash
# Verify Python version
python3 --version  # Should be 3.7+

# Reinstall in virtual environment
python3 -m venv venv
source venv/bin/activate
pip install --upgrade locust
```

### JMeter Port Already in Use
```bash
# Find process using port
lsof -i :1099

# Kill process
kill -9 <PID>

# Or use different port
jmeter -Jserver.rmi.localport=1100
```

### Server Connection Refused
```bash
# Check if server is running
ps aux | grep "node dist/server.js"

# Check port
netstat -an | grep 3000

# Start server
npm run dev:server

# Wait for startup (may take 10-30s)
sleep 10
curl http://localhost:3000/health
```

### MongoDB Connection Error
```bash
# Check MongoDB status
mongosh --version

# Start MongoDB
docker compose up -d mongodb

# Verify connection
mongosh --eval "db.adminCommand('ping')"
```

### Redis Connection Error
```bash
# Check Redis status
redis-cli ping  # Should respond with PONG

# Start Redis
docker compose up -d redis

# Verify connection
redis-cli INFO
```

## System Tuning

### Increase File Descriptors (Linux/macOS)

```bash
# Check current limit
ulimit -n

# Increase for session
ulimit -n 65536

# Make permanent
echo "ulimit -n 65536" >> ~/.bashrc
```

### Network Tuning

```bash
# Linux network tuning
sudo sysctl -w net.core.somaxconn=65536
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65536
sudo sysctl -w net.ipv4.tcp_tw_reuse=1
```

### Database Connection Pool

```bash
# MongoDB connection pool (in env or code)
export MONGODB_MAX_POOL_SIZE=100
export MONGODB_MIN_POOL_SIZE=10

# Redis connection pool
export REDIS_MAX_RETRIES=3
export REDIS_RETRY_DELAY=100
```

## Post-Installation

### Create Test Results Directory
```bash
mkdir -p load-tests/results
mkdir -p load-tests/baselines
chmod 755 load-tests/results load-tests/baselines
```

### Initialize Baseline
```bash
# Run first baseline test
SAVE_BASELINE=true TEST_SCENARIO=normal ./load-tests/scripts/run-load-tests.sh
```

### Setup Monitoring (Optional)
```bash
# Install Prometheus (for metrics collection)
brew install prometheus

# Install Grafana (for visualization)
brew install grafana

# Start services
brew services start prometheus
brew services start grafana
```

### Verify Complete Setup
```bash
# Run all checks
./load-tests/scripts/verify-setup.sh

# Expected output:
# ✓ K6 installed
# ✓ Locust installed
# ✓ JMeter installed
# ✓ Server running
# ✓ MongoDB running
# ✓ Redis running
# ✓ Results directory ready
```

## Next Steps

After successful installation:

1. **Read the main guide:** [Load Testing Guide](./README.md)
2. **Review test procedures:** [Test Procedures](./TEST_PROCEDURES.md)
3. **Run first test:** `./load-tests/scripts/run-load-tests.sh`
4. **Check performance:** `./load-tests/scripts/performance-validation.sh`
5. **Set up alerts:** Configure Slack/PagerDuty webhooks

## Support & Resources

- **K6 Community:** https://community.k6.io/
- **Locust Docs:** https://docs.locust.io/
- **JMeter Wiki:** https://jmeter.apache.org/usermanual/
- **SupliList Docs:** See parent project documentation

## Uninstallation

### Remove K6
```bash
# macOS
brew uninstall k6

# Linux
sudo apt-get remove k6

# Or just remove binary
rm $(which k6)
```

### Remove Locust
```bash
# Using pip
pip uninstall locust

# Using conda
conda remove locust
```

### Clean Up Test Data
```bash
# Remove results
rm -rf load-tests/results/*

# Remove baselines
rm -rf load-tests/baselines/*

# Remove Docker volumes
docker volume rm suplilist_mongo_data suplilist_redis_data
```
