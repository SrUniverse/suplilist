# FASE 1 - Fundação da Arquitetura do SupliList
## Plano Detalhado de Implementação

**Status**: Documento de Planejamento Completo  
**Data**: 2026-06-09  
**Objetivo**: Estabelecer infraestrutura Docker + PostgreSQL + Redis  
**Resultado Final**: `docker-compose up` funciona completamente para Fase 2 (JIT endpoints)

---

## 1. VISÃO GERAL DA FASE 1

### 1.1 Mudança de Stack
**De**: MongoDB + Redis  
**Para**: PostgreSQL 15+ + Redis 7+

### 1.2 Entregáveis
1. `docker-compose.yml` completo e validado
2. `.env.example` com variáveis necessárias
3. Migrations SQL com schema inicial
4. Scripts de inicialização e seed
5. Documentação de setup e validação
6. Estrutura de diretórios no `server/`

### 1.3 Requisitos Técnicos
- PostgreSQL 15+ com extensão `pg_trgm` para busca full-text
- Redis 7+ com configuração de evicção LRU (maxmemory 512mb, allkeys-lru)
- Volumes persistence para dados
- Health checks configurados
- Suporte a transações (sem ReplicaSet)
- Variables de ambiente tipadas via Zod

---

## 2. PASSO A PASSO - ORDEM DE EXECUÇÃO

### PASSO 1: Criar Estrutura de Diretórios no Server
```bash
# Caminhos absolutos completos:

server/
  ├── database/
  │   ├── migrations/           # Arquivos SQL versionados
  │   │   └── 001_initial_schema.sql
  │   ├── seeds/                # Dados iniciais
  │   │   └── 001_initial_seed.sql
  │   └── scripts/              # Utilitários
  │       ├── init-db.sh
  │       ├── rollback.sh
  │       └── migrate.sh
  ├── redis/
  │   └── redis.conf            # Configuração personalizada
  └── src/
      ├── shared/
      │   └── config/
      │       ├── database.config.ts    # Pool e conexão PostgreSQL
      │       ├── redis.config.ts       # Cliente Redis com retry
      │       └── env.config.ts         # Zod validation
```

**Arquivos a criar**:
1. `C:\Users\User\Desktop\suplilist\server\database\migrations\001_initial_schema.sql`
2. `C:\Users\User\Desktop\suplilist\server\database\seeds\001_initial_seed.sql`
3. `C:\Users\User\Desktop\suplilist\server\database\scripts\init-db.sh`
4. `C:\Users\User\Desktop\suplilist\server\database\scripts\migrate.sh`
5. `C:\Users\User\Desktop\suplilist\server\database\scripts\rollback.sh`
6. `C:\Users\User\Desktop\suplilist\server\redis\redis.conf`
7. `C:\Users\User\Desktop\suplilist\docker-compose.yml` (REWRITE)
8. `C:\Users\User\Desktop\suplilist\.env.example` (UPDATE)

---

### PASSO 2: Criar Migration SQL Inicial

**Arquivo**: `C:\Users\User\Desktop\suplilist\server\database\migrations\001_initial_schema.sql`

Conteúdo: Schema completo com:
- Extensão `pg_trgm` para busca full-text
- Tabelas base: `users`, `profiles`, `products`, `lists`, `list_items`
- Índices para performance
- Triggers de auditoria
- Constraints de integridade

---

### PASSO 3: Criar Seed de Dados

**Arquivo**: `C:\Users\User\Desktop\suplilist\server\database\seeds\001_initial_seed.sql`

Dados iniciais mínimos para testes (usuários demo, categorias, etc.)

---

### PASSO 4: Criar Scripts de Inicialização

**Arquivos**:
- `init-db.sh` - Cria banco, executa migrations e seed
- `migrate.sh` - Aplica apenas migrations
- `rollback.sh` - Desfaz última migration

---

### PASSO 5: Criar Redis Config

**Arquivo**: `C:\Users\User\Desktop\suplilist\server\redis\redis.conf`

Configurações:
- `maxmemory 512mb`
- `maxmemory-policy allkeys-lru`
- `appendonly yes` (persistence)
- `timeout 0` (no auto-disconnect)
- `databases 3` (default, cache, sessions)

---

### PASSO 6: Reescrever docker-compose.yml

**Arquivo**: `C:\Users\User\Desktop\suplilist\docker-compose.yml`

Mudanças:
- Remover MongoDB
- Adicionar PostgreSQL 15
- Atualizar Redis com volume customizado
- Health checks para ambos
- Corrigir volumes
- Adicionar network explícita
- Comando `depends_on` com conditions

---

### PASSO 7: Atualizar .env.example

**Arquivo**: `C:\Users\User\Desktop\suplilist\.env.example`

Novas variáveis:
- `DATABASE_URL=postgresql://suplilist:suplilist_dev@localhost:5432/suplilist`
- `REDIS_URL=redis://localhost:6379/0`
- `POSTGRES_USER=suplilist`
- `POSTGRES_PASSWORD=suplilist_dev`
- `POSTGRES_DB=suplilist`
- Outras configurações existentes (JWT, OAuth, etc.)

---

### PASSO 8: Criar Arquivos de Configuração TypeScript

**Arquivos**:
- `C:\Users\User\Desktop\suplilist\server\src\shared\config\database.config.ts`
  - Pool de conexões PostgreSQL via `pg`
  - Retry automático
  - Connection pooling
  
- `C:\Users\User\Desktop\suplilist\server\src\shared\config\redis.config.ts`
  - Cliente Redis (já existente `ioredis`)
  - Atualizar para usar `REDIS_URL` do .env

- `C:\Users\User\Desktop\suplilist\server\src\shared\config\env.config.ts`
  - Atualizar schema Zod com variáveis PostgreSQL
  - Validação em tempo de startup

---

## 3. ESTRUTURA DETALHADA DE ARQUIVOS

### 3.1 docker-compose.yml (Completo)

```yaml
version: '3.8'

services:
  postgresql:
    image: postgres:15-alpine
    container_name: suplilist-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-suplilist}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-suplilist_dev}
      POSTGRES_DB: ${POSTGRES_DB:-suplilist}
      POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8"
    volumes:
      - postgresql_data:/var/lib/postgresql/data
      - ./server/database/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-suplilist} -d ${POSTGRES_DB:-suplilist}"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - suplilist-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: suplilist-redis
    ports:
      - "6379:6379"
    command: redis-server /usr/local/etc/redis/redis.conf
    volumes:
      - ./server/redis/redis.conf:/usr/local/etc/redis/redis.conf
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 10s
    networks:
      - suplilist-network
    restart: unless-stopped

  api:
    image: node:20-alpine
    container_name: suplilist-api
    working_dir: /app/server
    volumes:
      - .:/app
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://${POSTGRES_USER:-suplilist}:${POSTGRES_PASSWORD:-suplilist_dev}@postgresql:5432/${POSTGRES_DB:-suplilist}
      REDIS_URL: redis://redis:6379/0
    command: npm run dev
    env_file:
      - ./server/.env
    depends_on:
      postgresql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - suplilist-network
    restart: unless-stopped

networks:
  suplilist-network:
    driver: bridge

volumes:
  postgresql_data:
  redis_data:
```

### 3.2 .env.example (Atualizado)

```env
# SupliList — Variáveis de Ambiente
# Copie este arquivo para .env e preencha os valores
# NUNCA commite o .env real

# ── Banco de Dados PostgreSQL ────────────────────────────────
DATABASE_URL=postgresql://suplilist:suplilist_dev@localhost:5432/suplilist
POSTGRES_USER=suplilist
POSTGRES_PASSWORD=suplilist_dev
POSTGRES_DB=suplilist

# ── Redis (Cache/Sessions) ───────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── Autenticação (JWT) ───────────────────────────────────────
JWT_SECRET=your-secret-key-min-32-chars-production-only
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your-refresh-secret-min-32-chars
REFRESH_TOKEN_EXPIRES_IN=7d

# ── Afiliados (Tracking de Links) ────────────────────────────
VITE_AMAZON_AFFILIATE_ID=suplilist01-20
VITE_ML_AFFILIATE_ID=
VITE_SHOPEE_AFFILIATE_ID=

# ── Push Notifications (Firebase) ────────────────────────────
FCM_SERVER_KEY=
VITE_FCM_VAPID_KEY=

# ── Analytics ────────────────────────────────────────────────
VITE_GA_MEASUREMENT_ID=

# ── Email (Resend) ───────────────────────────────────────────
RESEND_API_KEY=

# ── AWS S3 (Avatar Upload) ───────────────────────────────────
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_S3_REGION=us-east-1

# ── Google OAuth ─────────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── Ambiente ─────────────────────────────────────────────────
NODE_ENV=development
PORT=5000
```

### 3.3 Migration SQL Inicial

**Arquivo**: `001_initial_schema.sql`

```sql
-- Create extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(50),
  verification_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE is_deleted = TRUE;

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  avatar_url VARCHAR(500),
  bio TEXT,
  phone VARCHAR(20),
  locale VARCHAR(10) DEFAULT 'pt-BR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table (Mercado Livre sync)
CREATE TABLE products (
  id BIGINT PRIMARY KEY,
  ml_id BIGINT UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id BIGINT,
  price DECIMAL(10, 2),
  image_url VARCHAR(500),
  url VARCHAR(500),
  affiliate_url VARCHAR(500),
  stock_available INTEGER,
  rating DECIMAL(3, 2),
  reviews_count INTEGER,
  ml_vendor_id BIGINT,
  ml_seller_reputation VARCHAR(50),
  is_meli_plus BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX idx_products_title_trgm ON products USING GIN(title gin_trgm_ops);
CREATE INDEX idx_products_description_trgm ON products USING GIN(description gin_trgm_ops);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_ml_id ON products(ml_id);

-- Lists (Listas de Compras)
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_shared BOOLEAN DEFAULT FALSE,
  shared_token VARCHAR(50) UNIQUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lists_user_id ON lists(user_id);
CREATE INDEX idx_lists_shared_token ON lists(shared_token);
CREATE INDEX idx_lists_created_at ON lists(created_at);

-- List Items
CREATE TABLE list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  custom_name VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  unit VARCHAR(20),
  price_override DECIMAL(10, 2),
  is_checked BOOLEAN DEFAULT FALSE,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_list_items_list_id ON list_items(list_id);
CREATE INDEX idx_list_items_product_id ON list_items(product_id);
CREATE INDEX idx_list_items_is_checked ON list_items(is_checked);

-- Settings
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_summary BOOLEAN DEFAULT TRUE,
  summary_frequency VARCHAR(20) DEFAULT 'daily',
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log (para compliance)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Sessions (para refresh tokens)
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER lists_updated_at BEFORE UPDATE ON lists
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER list_items_updated_at BEFORE UPDATE ON list_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.4 Seed SQL Inicial

**Arquivo**: `001_initial_seed.sql`

```sql
-- Seed de usuários de teste
INSERT INTO users (email, password_hash, first_name, last_name, is_verified, is_active)
VALUES 
  ('admin@suplilist.local', '$2b$10$...', 'Admin', 'User', TRUE, TRUE),
  ('test@suplilist.local', '$2b$10$...', 'Test', 'User', TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

-- Seed de profiles
INSERT INTO profiles (user_id, bio, locale)
SELECT id, 'Admin user', 'pt-BR' FROM users WHERE email = 'admin@suplilist.local'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO profiles (user_id, bio, locale)
SELECT id, 'Test user', 'pt-BR' FROM users WHERE email = 'test@suplilist.local'
ON CONFLICT (user_id) DO NOTHING;

-- Seed de settings
INSERT INTO user_settings (user_id)
SELECT id FROM users ON CONFLICT (user_id) DO NOTHING;
```

### 3.5 Script init-db.sh

```bash
#!/bin/bash
set -e

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Starting PostgreSQL initialization...${NC}"

# Espera PostgreSQL estar pronto
until pg_isready -h localhost -p 5432; do
  echo "Waiting for PostgreSQL..."
  sleep 1
done

echo -e "${GREEN}✓ PostgreSQL is ready${NC}"

# Conecta e executa migrations
psql -h localhost -U "${POSTGRES_USER:-suplilist}" -d "${POSTGRES_DB:-suplilist}" \
  -f "$(dirname "$0")/migrations/001_initial_schema.sql"

echo -e "${GREEN}✓ Schema created${NC}"

# Executa seeds
psql -h localhost -U "${POSTGRES_USER:-suplilist}" -d "${POSTGRES_DB:-suplilist}" \
  -f "$(dirname "$0")/seeds/001_initial_seed.sql"

echo -e "${GREEN}✓ Seed data inserted${NC}"

echo -e "${BLUE}Database initialization complete!${NC}"
```

### 3.6 Script migrate.sh

```bash
#!/bin/bash
set -e

MIGRATION_FILE="${1:?Migration file path required}"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Error: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "Applying migration: $MIGRATION_FILE"

psql -h localhost -U "${POSTGRES_USER:-suplilist}" -d "${POSTGRES_DB:-suplilist}" \
  -f "$MIGRATION_FILE"

echo "Migration applied successfully"
```

---

## 4. ARQUIVOS DE CONFIGURAÇÃO TYPESCRIPT

### 4.1 database.config.ts

```typescript
import { Pool } from 'pg';
import { env } from './env.config.js';

let pool: Pool | null = null;

export function getDatabasePool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return pool;
}

export async function initializeDatabase(): Promise<void> {
  const pool = getDatabasePool();
  
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0]);
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
```

### 4.2 redis.config.ts (Atualizar existente)

```typescript
import Redis from 'ioredis';
import { env } from './env.config.js';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: true,
      enableOfflineQueue: true,
    });

    redis.on('connect', () => {
      console.log('Redis connected');
    });

    redis.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
```

### 4.3 env.config.ts (Atualizar)

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),

  // Database
  DATABASE_URL: z.string().url(),
  POSTGRES_USER: z.string().default('suplilist'),
  POSTGRES_PASSWORD: z.string().default('suplilist_dev'),
  POSTGRES_DB: z.string().default('suplilist'),

  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379/0'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('24h'),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  // AWS S3
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_REGION: z.string().default('us-east-1'),

  // Email
  RESEND_API_KEY: z.string().optional(),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Affiliates
  VITE_AMAZON_AFFILIATE_ID: z.string().optional(),
  VITE_ML_AFFILIATE_ID: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Environment = z.infer<typeof envSchema>;
```

---

## 5. MUDANÇAS NO CÓDIGO EXISTENTE

### 5.1 Atualizar server.ts

Adicionar inicialização do PostgreSQL:

```typescript
import { initializeDatabase, closeDatabase } from './shared/config/database.config.js';

// Na conexão, substituir MongoDB por PostgreSQL
await initializeDatabase()
  .then(async () => {
    console.log('✅ PostgreSQL connected successfully');
    // ... resto do código
  })
  .catch((err) => {
    console.error('❌ Failed to connect to PostgreSQL on startup:', err);
    process.exit(1);
  });

// No shutdown, adicionar close do PostgreSQL
const shutdown = (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  scheduler.stop();
  clearInterval(outboxInterval);
  clearInterval(auditInterval);
  clearInterval(purgeInterval);

  server.close(async () => {
    console.log('HTTP server closed.');

    await cacheService.close();
    await closeDatabase();  // ADICIONAR

    console.log('PostgreSQL connection closed.');
    process.exit(0);
  });
};
```

### 5.2 Atualizar package.json (server)

Adicionar `pg` para driver PostgreSQL:

```json
{
  "dependencies": {
    "pg": "^8.11.3",
    // ... resto dos dependentes
  }
}
```

### 5.3 Remover Mongoose Gradualmente

- Manter ioredis (Redis continua)
- Manter rate-limit-redis
- Não usar mais `mongoose.connect()`
- Migrations de Mongoose → SQL virão na Fase 2

---

## 6. CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1a: Estrutura
- [ ] Criar diretório `server/database/migrations/`
- [ ] Criar diretório `server/database/seeds/`
- [ ] Criar diretório `server/database/scripts/`
- [ ] Criar diretório `server/redis/`

### Fase 1b: Arquivos SQL
- [ ] Criar `001_initial_schema.sql`
- [ ] Criar `001_initial_seed.sql`
- [ ] Validar SQL com `pg_dump` (dry-run)

### Fase 1c: Scripts Bash
- [ ] Criar `init-db.sh` (executável)
- [ ] Criar `migrate.sh` (executável)
- [ ] Criar `rollback.sh` (executável)
- [ ] Testar scripts localmente

### Fase 1d: Configuração
- [ ] Criar `redis.conf`
- [ ] Criar `docker-compose.yml` (novo)
- [ ] Atualizar `.env.example`

### Fase 1e: TypeScript Configs
- [ ] Criar `database.config.ts`
- [ ] Atualizar `redis.config.ts`
- [ ] Atualizar `env.config.ts`
- [ ] Atualizar `server.ts` (conexão)

### Fase 1f: Dependências
- [ ] `npm install pg` no workspace `server`
- [ ] Verificar tipos: `npm install --save-dev @types/pg`

### Fase 1g: Testes
- [ ] `docker-compose build`
- [ ] `docker-compose up`
- [ ] Verificar logs PostgreSQL
- [ ] Verificar logs Redis
- [ ] Verificar logs API
- [ ] Testar conexão: `psql -h localhost -U suplilist -d suplilist`
- [ ] Testar Redis: `redis-cli ping`

---

## 7. COMANDOS PARA TESTAR CADA PARTE

### 7.1 Teste PostgreSQL

```bash
# Conectar ao container
docker exec -it suplilist-postgres psql -U suplilist -d suplilist

# Listar tabelas
\dt

# Ver extensions
\dx

# Sair
\q
```

### 7.2 Teste Redis

```bash
# Conectar ao container
docker exec -it suplilist-redis redis-cli

# Verificar saúde
PING
# Esperado: PONG

# Verificar config
CONFIG GET maxmemory
# Esperado: 512mb

CONFIG GET maxmemory-policy
# Esperado: allkeys-lru

# Sair
exit
```

### 7.3 Teste API

```bash
# Health check
curl http://localhost:5000/health

# Ver logs
docker logs -f suplilist-api

# Testar database
curl http://localhost:5000/api/health/database
```

### 7.4 Teste Integração

```bash
# Iniciar tudo
docker-compose up

# Verificar containers rodando
docker ps

# Verificar volumes
docker volume ls

# Verificar networks
docker network ls

# Parar tudo
docker-compose down

# Limpar dados (CUIDADO!)
docker-compose down -v
```

---

## 8. VALIDAÇÃO FINAL (CHECKLIST)

- [ ] `docker-compose up` inicia sem erros
- [ ] PostgreSQL healthcheck passa em < 10s
- [ ] Redis healthcheck passa em < 10s
- [ ] API conecta ao PostgreSQL com sucesso
- [ ] API conecta ao Redis com sucesso
- [ ] Migrations aplicadas automaticamente
- [ ] Seed data inserida automaticamente
- [ ] Schema possui extensão `pg_trgm`
- [ ] Índices full-text criados
- [ ] Triggers de auditoria funcionam
- [ ] Volumes persistence funcionam (persist dados após restart)
- [ ] `.env.example` contém todas as variáveis necessárias
- [ ] Zod valida ambiente com sucesso na startup
- [ ] Sem erros de conexão nos logs
- [ ] Sem warnings sobre deprecated features

---

## 9. NOTAS IMPORTANTES

### 9.1 Segurança em Produção
- Mudar `POSTGRES_PASSWORD` em `.env`
- Gerar `JWT_SECRET` com `openssl rand -base64 32`
- Usar variáveis de `RESEND_API_KEY`, `AWS_*`, etc. em produção
- Não commitar `.env` real

### 9.2 Performance
- Pool PostgreSQL: `max: 20` (ajustar conforme carga)
- Redis: `maxmemory 512mb` (aumentar se necessário)
- Índices criados em colunas de busca frequente
- pg_trgm habilitado para full-text search

### 9.3 Migrations Futuras
- Colocar versionamento semântico em nomes
- Exemplo: `002_add_ratings_table.sql`
- Sempre criar script de rollback
- Testar em dev antes de prod

### 9.4 Transições MongoDB → PostgreSQL
- Fase 1: Infraestrutura (AGORA)
- Fase 2: Migrations de dados (depois)
- Fase 3: Remover Mongoose completamente
- Usar API de migração de dados sem downtime

---

## 10. ESTRUTURA FINAL

```
C:\Users\User\Desktop\suplilist/
├── docker-compose.yml                    [NOVO/MODIFICADO]
├── .env.example                          [MODIFICADO]
├── server/
│   ├── database/
│   │   ├── migrations/
│   │   │   └── 001_initial_schema.sql   [NOVO]
│   │   ├── seeds/
│   │   │   └── 001_initial_seed.sql     [NOVO]
│   │   └── scripts/
│   │       ├── init-db.sh               [NOVO]
│   │       ├── migrate.sh               [NOVO]
│   │       └── rollback.sh              [NOVO]
│   ├── redis/
│   │   └── redis.conf                   [NOVO]
│   ├── src/
│   │   ├── shared/
│   │   │   └── config/
│   │   │       ├── database.config.ts   [NOVO]
│   │   │       ├── redis.config.ts      [MODIFICADO]
│   │   │       └── env.config.ts        [MODIFICADO]
│   │   └── server.ts                    [MODIFICADO]
│   └── package.json                     [MODIFICADO - adicionar pg]
```

---

## 11. PRÓXIMOS PASSOS (FASE 2)

Após conclusão da Fase 1:
1. Criar JIT endpoints (Just-In-Time compiling)
2. Migração gradual de dados MongoDB → PostgreSQL
3. Testes de carga e performance
4. Documentação de API
5. Deploy para staging

---

**Preparado por**: Claude Agent  
**Data**: 2026-06-09  
**Status**: Pronto para Implementação
