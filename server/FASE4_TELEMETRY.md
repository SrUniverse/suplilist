# FASE 4: Telemetria, Monitoring e Dashboards

## Visão Geral

FASE 4 implementa observabilidade completa para o SupliList com:
- **Prometheus**: Coleta de métricas em tempo real
- **Grafana**: Dashboards intuitivos de monitoramento
- **Winston**: Logging estruturado em JSON
- **Alertas Automáticos**: Regras Prometheus com notificações

---

## 1. Arquitetura de Métricas

### 1.1 Prometheus Client (`src/shared/utils/metrics.ts`)

Implementa clients Prometheus para todos os tipos de métrica:

#### Counters (incrementam monotonicamente)
```
- http_requests_total               (por method, endpoint, status)
- rate_limit_hits_total             (por endpoint)
- jit_timeout_total                 (por reason)
- cache_hits_total                  (por operation, key_type)
- cache_misses_total                (por operation, key_type)
- conversion_errors_total           (por source, error_type)
- worker_jobs_total                 (por job_type, status)
- outbox_events_processed_total     (por status)
```

#### Histograms (distribuição de valores)
```
- http_request_duration_seconds     (latência HTTP por method/endpoint)
- conversion_latency_seconds        (latência de conversão por source)
- cache_operation_duration_seconds  (latência de cache por operation)
- db_query_duration_seconds         (latência de BD por operation/collection)
- worker_job_duration_seconds       (tempo de execução por job_type)
```

#### Gauges (snapshot de valor)
```
- worker_queue_depth                (jobs pendentes por queue_name)
- cache_size_bytes                  (memória usada por cache)
- active_connections                (conexões BD por database)
- http_requests_in_flight           (requisições sendo processadas)
- error_rate                        (taxa de erros por endpoint)
```

### 1.2 Exemplos de Uso

#### Registrar métrica HTTP
```typescript
import { recordHttpMetrics } from './shared/utils/metrics.js';

const startTime = Date.now();
// ... processar requisição ...
const durationSeconds = (Date.now() - startTime) / 1000;
recordHttpMetrics('GET', '/api/supplements', 200, durationSeconds);
```

#### Registrar métrica de cache
```typescript
import { recordCacheMetrics } from './shared/utils/metrics.js';

const hit = cache.has(key);
const durationSeconds = (Date.now() - startTime) / 1000;
recordCacheMetrics('get', 'supplement', hit, durationSeconds);
```

#### Registrar métrica de conversão
```typescript
import { recordConversionMetrics } from './shared/utils/metrics.js';

recordConversionMetrics('firecrawl', durationSeconds, error?.message);
```

#### Registrar métrica de worker
```typescript
import { recordWorkerMetrics } from './shared/utils/metrics.js';

recordWorkerMetrics('crawl-supplements', 'success', durationSeconds);
```

---

## 2. Middleware de Coleta Automática

### 2.1 Metrics Middleware (`middleware/metrics.middleware.ts`)

Coleta automaticamente:
- **Request latency**: Tempo total de processamento
- **Request counts**: Por método, endpoint e status code
- **In-flight requests**: Requisições sendo processadas
- **Error rates**: Percentual de 5xx por endpoint (janela móvel de 5 minutos)

Normaliza endpoints automaticamente:
```
/api/users/123/posts/456  →  /api/users/:id/posts/:id
```

Previne cardinality explosion em Prometheus.

### 2.2 Integração no Express

```typescript
import { metricsMiddleware, startErrorRateCleanup } from './middleware/metrics.middleware.js';

app.use(metricsMiddleware);
startErrorRateCleanup(); // Inicia limpeza periódica
```

---

## 3. Logging Estruturado

### 3.1 Winston Logger (`src/shared/utils/logger.ts`)

Configuração com:
- **JSON output**: ECS-compatible structured logs
- **Request correlation IDs**: Rastreia requisição através do sistema
- **Error stack traces**: Completo para debugging
- **Multiple transports**: Arquivos + console (dev)

### 3.2 Níveis de Log

```
- error (0)   - Erros críticos
- warn (1)    - Avisos (pode degradar performance)
- info (2)    - Eventos importantes
- debug (3)   - Informações de debug
- trace (4)   - Rastreamento detalhado
```

### 3.3 Exemplos de Uso

```typescript
import { logRequest, logError, logCache, logWorkerJob } from './shared/utils/logger.js';

// Log de requisição HTTP
logRequest('GET', '/api/supplements', 200, 145, requestId);

// Log de erro
logError('Conversão falhou', error, { source: 'firecrawl', requestId });

// Log de operação de cache
logCache('get', 'supplement:123', true, requestId);

// Log de job de worker
logWorkerJob('crawl-supplements', jobId, 'completed', 5000);
```

---

## 4. Endpoint Prometheus

### 4.1 `/metrics` Endpoint

```
GET /metrics
Content-Type: text/plain; charset=utf-8; version=0.0.4

# Prometheus text exposition format
http_requests_total{method="GET",endpoint="/api/supplements",status="200"} 1234
http_request_duration_seconds_bucket{method="GET",endpoint="/api/supplements",le="0.1"} 45
...
```

**Acesso:**
- Desenvolvimento: `http://localhost:5000/metrics`
- Produção: `https://api.example.com/metrics` (sem autenticação para Prometheus)

---

## 5. Configuração Prometheus

### 5.1 `prometheus.yml`

Define scrape targets:
```yaml
scrape_configs:
  - job_name: 'suplilist-api'
    static_configs:
      - targets: ['api:5000']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

**Arquivo de configuração**: `server/prometheus.yml`

### 5.2 Regras de Alerta (`prometheus-rules.yml`)

Define condições que acionam alertas:

#### JIT Timeout Rate > 10%
```yaml
- alert: JITTimeoutRateTooHigh
  expr: |
    (increase(jit_timeout_total[5m]) /
     increase(http_requests_total{endpoint=~"/api/jit.*"}[5m])) > 0.1
  for: 5m
```

#### Conversion Error Rate > 1%
```yaml
- alert: ConversionErrorRateTooHigh
  expr: |
    (increase(conversion_errors_total[5m]) /
     increase(conversion_latency_seconds_count[5m])) > 0.01
```

#### Worker Queue Depth > 1000
```yaml
- alert: WorkerQueueDepthTooHigh
  expr: worker_queue_depth > 1000
  for: 5m
```

#### Worker Job Failure Rate > 5%
```yaml
- alert: WorkerJobFailureRate
  expr: |
    (increase(worker_jobs_total{status="failed"}[5m]) /
     (increase(worker_jobs_total{status="success"}[5m]) +
      increase(worker_jobs_total{status="failed"}[5m]))) > 0.05
```

#### HTTP 5xx Error Rate > 5%
```yaml
- alert: HighErrorRate
  expr: |
    (increase(http_requests_total{status=~"5.."}[5m]) /
     increase(http_requests_total[5m])) > 0.05
```

#### Request Latency p95 > 2s
```yaml
- alert: HighRequestLatency
  expr: |
    histogram_quantile(0.95,
      rate(http_request_duration_seconds_bucket[5m])
    ) > 2
```

---

## 6. Grafana Dashboards

### 6.1 Dashboard Padrão

**Arquivo**: `grafana-dashboard.json`

Painéis inclusos:

1. **HTTP Request Rate** (timeseries)
   - Taxa de requisições por segundo (últimas 1h)
   - Média e máximo por série

2. **Cache Hit Rate** (gauge)
   - Percentual de acertos de cache
   - Cores: vermelho (<50%), amarelo (50-80%), verde (>80%)

3. **HTTP Latency Percentiles** (timeseries)
   - p95 e p99 da latência HTTP
   - Identifica lentidão em cauda

4. **Worker Queue Depth** (timeseries)
   - Número de jobs pendentes por queue
   - Alerta visual em 500 e 1000 jobs

5. **5xx Errors by Endpoint** (timeseries)
   - Taxa de erros 5xx por endpoint
   - Ajuda a identificar qual rota está problema

6. **Worker Job Processing Rate** (timeseries)
   - Jobs bem-sucedidos vs. falhados
   - Identifica degradação de performance

### 6.2 Importar Dashboard

1. Acesse http://localhost:3000 (Grafana)
2. Clique em "Create" → "Import"
3. Cole conteúdo de `grafana-dashboard.json`
4. Selecione Prometheus como datasource
5. Clique "Import"

---

## 7. Health Checks (Kubernetes)

### 7.1 Liveness Probe

```bash
GET /health/live
```

Resposta imediata (200 OK) sem checar dependências. Usada para detectar processo travado.

### 7.2 Readiness Probe

```bash
GET /health/ready
```

Verifica:
- MongoDB connection
- Redis connection
- Memory usage
- Uptime

Retorna 200 (healthy) ou 503 (degraded) se alguma dependência crítica estiver down.

---

## 8. Docker Compose Setup

### 8.1 Novos Serviços

#### Prometheus
```yaml
prometheus:
  image: prom/prometheus:latest
  ports:
    - "9090:9090"
  volumes:
    - ./server/prometheus.yml:/etc/prometheus/prometheus.yml
    - ./server/prometheus-rules.yml:/etc/prometheus/prometheus-rules.yml
```

#### Grafana
```yaml
grafana:
  image: grafana/grafana:latest
  ports:
    - "3000:3000"
  environment:
    GF_SECURITY_ADMIN_PASSWORD: admin
```

### 8.2 Iniciar Stack

```bash
# Com métricas ativadas
docker compose up -d

# Acesse:
# - API: http://localhost:5000
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3000
```

### 8.3 Prometheus Targets

Verifique em http://localhost:9090/targets:
```
- suplilist-api (http://api:5000/metrics) — GREEN
- redis (http://redis:6379/metrics) — opcional
- postgresql (http://postgresql:5432/metrics) — opcional
```

---

## 9. Exporters Opcionais

Para enhanced monitoring, implante exporters:

### 9.1 Redis Exporter

```yaml
redis_exporter:
  image: oliver006/redis_exporter:latest
  ports:
    - "9121:9121"
  environment:
    REDIS_ADDR: "redis:6379"
```

Adicione ao `prometheus.yml`:
```yaml
- job_name: 'redis'
  static_configs:
    - targets: ['redis_exporter:9121']
```

### 9.2 PostgreSQL Exporter

```yaml
postgres_exporter:
  image: prometheuscommunity/postgres-exporter:latest
  ports:
    - "9187:9187"
  environment:
    DATA_SOURCE_NAME: "postgresql://user:password@postgresql:5432/suplilist?sslmode=disable"
```

---

## 10. Alerting Setup

### 10.1 Configurar Alertmanager

```bash
# 1. Instale Alertmanager localmente
docker pull prom/alertmanager:latest

# 2. Configure alertmanager.yml
# 3. Adicione ao docker-compose.yml
# 4. Configure notificações (Slack, PagerDuty, email, etc.)
```

### 10.2 Exemplo: Notificação Slack

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  receiver: 'slack'

receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        title: 'SupliList Alert: {{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.description }}'
```

---

## 11. Boas Práticas

### 11.1 Métricas

✅ DO:
- Usar labels consistentes (mesmo nome/valores)
- Limitar cardinalidade (máx. 10 labels por métrica)
- Usar nomes descritivos (ex: `http_request_duration_seconds`)
- Incluir unidade no nome (seconds, bytes, etc.)

❌ DON'T:
- Incrementar contador em loop (batch em intervals)
- Labels com valores aleatórios (user_id, request_id)
- Métrica por endpoint diferente (normalizar com :id)
- Carregar histograms com valores fora do range

### 11.2 Logging

✅ DO:
- Estruturar logs em JSON com schema consistente
- Incluir correlation ID em todo log
- Log em níveis apropriados (error/warn/info/debug)
- Rotacionar arquivos de log (5x 5MB default)

❌ DON'T:
- Logar tokens, senhas ou PII
- Usar console.log em produção
- Log em níveis INFO para cada requisição
- Strings de log com valores dinâmicos sem estrutura

### 11.3 Alertas

✅ DO:
- Alertas acionáveis (indique ação a tomar)
- Durações apropriadas (evitar flapping)
- Severidade clara (info, warning, critical)
- Anotações detalhadas

❌ DON'T:
- Alertas ruidosos (resolva false positives)
- Limiares muito sensíveis (< 1 minuto)
- Sem contexto (qual endpoint? qual worker?)

---

## 12. Troubleshooting

### Prometheus não scrapa métricas

```bash
# 1. Verifique conectividade
curl http://localhost:5000/metrics

# 2. Verifique prometheus.yml
docker exec suplilist-prometheus cat /etc/prometheus/prometheus.yml

# 3. Verifique logs
docker logs suplilist-prometheus | tail -20

# 4. Reinicie Prometheus
docker restart suplilist-prometheus
```

### Métricas não aparecem em Grafana

```bash
# 1. Verifique datasource Prometheus em Grafana
# Settings → Data Sources → Prometheus
# Test datasource deve passar

# 2. Verifique query PromQL
# Em Explore → escolha métrica

# 3. Limpe cache Grafana
# Settings → Preferences → Clear cache
```

### Memory leak em Prometheus

```bash
# Prometheus store timeseries na RAM. Se crescer muito:

# 1. Reduza retention period
docker compose down
# Edite docker-compose.yml:
# command: --storage.tsdb.retention.time=7d
docker compose up

# 2. Ou reduza scrape interval
# Em prometheus.yml: scrape_interval: 30s
```

---

## 13. Métricas por Camada

### 13.1 HTTP API Layer
- `http_requests_total`
- `http_request_duration_seconds`
- `error_rate`
- `rate_limit_hits_total`

### 13.2 Conversion Layer (JIT)
- `jit_timeout_total`
- `conversion_latency_seconds`
- `conversion_errors_total`

### 13.3 Cache Layer
- `cache_hits_total`
- `cache_misses_total`
- `cache_operation_duration_seconds`
- `cache_size_bytes`

### 13.4 Worker Layer (BullMQ)
- `worker_jobs_total`
- `worker_job_duration_seconds`
- `worker_queue_depth`

### 13.5 Database Layer
- `db_query_duration_seconds`
- `active_connections`

### 13.6 Outbox Pattern
- `outbox_events_processed_total`

---

## 14. Roadmap Futuro

- [ ] Jaeger tracing (distributed tracing)
- [ ] ELK stack (Elasticsearch + Logstash + Kibana)
- [ ] Custom metrics para conversions (origem vs. destino)
- [ ] SLO/SLI tracking (Service Level Objectives)
- [ ] Cost analysis dashboard (por endpoint, por worker type)
- [ ] Machine learning anomaly detection

---

## Checklist de Implementação

- [x] Prometheus client setup (`src/shared/utils/metrics.ts`)
- [x] Winston logger setup (`src/shared/utils/logger.ts`)
- [x] Metrics middleware (`middleware/metrics.middleware.ts`)
- [x] Metrics endpoint route (`routes/metrics.route.ts`)
- [x] Prometheus configuration (`prometheus.yml`)
- [x] Alert rules (`prometheus-rules.yml`)
- [x] Grafana dashboard (`grafana-dashboard.json`)
- [x] Grafana datasources (`grafana-datasources.yml`)
- [x] Docker Compose updates
- [x] package.json dependencies (prom-client, winston)
- [x] Health check routes (já existiam)

---

## Contato e Suporte

Para dúvidas sobre FASE 4, consulte:
1. Documentação Prometheus: https://prometheus.io/docs
2. Documentação Grafana: https://grafana.com/docs
3. Documentação prom-client: https://github.com/siimon/prom-client
4. Documentação Winston: https://github.com/winstonjs/winston
