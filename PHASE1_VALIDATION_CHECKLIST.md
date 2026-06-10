# FASE 1 - Checklist de Validação

**Data de Início**: 2026-06-09  
**Status**: Pronto para Implementação  
**Objetivo**: Validar que toda a infraestrutura está funcionando corretamente

---

## PARTE 1: VERIFICAÇÕES PRÉ-DEPLOYMENT

### 1.1 Arquivos Criados

- [ ] `server/database/migrations/001_initial_schema.sql`
- [ ] `server/database/seeds/001_initial_seed.sql`
- [ ] `server/database/scripts/init-db.sh`
- [ ] `server/database/scripts/migrate.sh`
- [ ] `server/database/scripts/rollback.sh`
- [ ] `server/redis/redis.conf`
- [ ] `docker-compose.yml` (reescrito)
- [ ] `.env.example` (atualizado)
- [ ] `server/src/shared/config/database.config.ts`
- [ ] `server/src/shared/config/redis.config.ts`
- [ ] `server/src/shared/config/env.config.ts` (atualizado)

### 1.2 Permissões de Scripts

```bash
# Tornar scripts executáveis (em Linux/Mac)
chmod +x server/database/scripts/init-db.sh
chmod +x server/database/scripts/migrate.sh
chmod +x server/database/scripts/rollback.sh
```

### 1.3 Atualizar package.json

```bash
cd server
npm install pg @types/pg
```

---

## PARTE 2: TESTS INICIAIS

### 2.1 Verificar Sintaxe SQL

```bash
# Validar arquivo de schema (sintaxe apenas, sem executar)
psql --echo-hidden -f server/database/migrations/001_initial_schema.sql < /dev/null

# Ou usando Docker
docker run -it --rm -v $(pwd):/workspace postgres:15-alpine \
  psql -f /workspace/server/database/migrations/001_initial_schema.sql --dry-run
```

### 2.2 Validar Zod Schema

```bash
cd server
npx tsx -e "import { envSchema } from './src/shared/config/env.config'; console.log('✓ Zod schema valid')"
```

### 2.3 Verificar YAML do Docker Compose

```bash
docker-compose config

# Esperado: output sem erros
```

---

## PARTE 3: DOCKER SETUP

### 3.1 Construir Imagens

```bash
# Build (ou pull) todas as imagens
docker-compose build

# Esperado: Sem erros
```

### 3.2 Iniciar Containers

```bash
# Iniciar em background
docker-compose up -d

# Monitorar logs
docker-compose logs -f

# Esperado após ~10s:
# - suplilist-postgres: "database system is ready to accept connections"
# - suplilist-redis: "Ready to accept connections"
# - suplilist-api: "SupliList backend server running on port 5000"
```

---

## PARTE 4: VALIDAÇÕES FUNCIONAIS

### 4.1 PostgreSQL - Healthcheck

```bash
# Verificar se container está saudável
docker ps | grep suplilist-postgres

# Esperado: status "healthy"

# Conectar ao banco
docker exec -it suplilist-postgres psql -U suplilist -d suplilist

# Dentro do psql:
\dt
# Esperado: lista de tabelas (users, profiles, products, lists, list_items, etc.)

\dx
# Esperado: extensões (uuid-ossp, pg_trgm, btree_gin, btree_gist)

SELECT COUNT(*) FROM users;
# Esperado: 2 (admin + test)

SELECT COUNT(*) FROM products;
# Esperado: 3 (produtos de seed)

\q
```

### 4.2 PostgreSQL - Verificar Índices

```bash
# Dentro do psql:
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

# Esperado: ~40+ índices criados
```

### 4.3 PostgreSQL - Verificar Triggers

```bash
# Dentro do psql:
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

# Esperado: triggers de update_updated_at em todas as tabelas
```

### 4.4 Redis - Healthcheck

```bash
# Verificar se container está saudável
docker ps | grep suplilist-redis

# Esperado: status "healthy"

# Conectar ao Redis
docker exec -it suplilist-redis redis-cli

# Dentro do redis-cli:
PING
# Esperado: PONG

CONFIG GET maxmemory
# Esperado: "512mb"

CONFIG GET maxmemory-policy
# Esperado: "allkeys-lru"

DBSIZE
# Esperado: 0 (vazio no início)

exit
```

### 4.5 Redis - Teste de Persistência

```bash
# Dentro do redis-cli:
SET test-key "Hello Redis"
GET test-key
# Esperado: "Hello Redis"

# Parar e reiniciar container
docker-compose restart redis

# Verificar se dados persistem
docker exec -it suplilist-redis redis-cli
GET test-key
# Esperado: "Hello Redis" (persistido)

DEL test-key
exit
```

### 4.6 API - Healthcheck

```bash
# Health check simples
curl -s http://localhost:5000/health | jq

# Esperado:
# {
#   "status": "ok",
#   "timestamp": "..."
# }

# Healthcheck com detalhes (se implementado)
curl -s http://localhost:5000/api/health | jq

# Esperado: informações de saúde do database e redis
```

### 4.7 API - Logs

```bash
# Ver logs da API
docker logs suplilist-api | tail -50

# Procurar por:
# ✅ PostgreSQL connected successfully
# ✅ Redis connected
# 🚀 SupliList backend server running on port 5000
```

---

## PARTE 5: TESTES DE INTEGRAÇÃO

### 5.1 Teste de Conexão PostgreSQL desde API

```bash
# Adicione um endpoint de teste temporário em src/app.ts:
// app.get('/test/db', async (req, res) => {
//   try {
//     const result = await getDatabasePool().query('SELECT COUNT(*) as count FROM users');
//     res.json({ users: result.rows[0].count });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

curl -s http://localhost:5000/test/db | jq

# Esperado:
# { "users": 2 }
```

### 5.2 Teste de Conexão Redis desde API

```bash
# Adicione um endpoint de teste temporário:
// app.get('/test/redis', async (req, res) => {
//   try {
//     const redis = getRedisClient();
//     const result = await redis.ping();
//     res.json({ redis: result });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

curl -s http://localhost:5000/test/redis | jq

# Esperado:
# { "redis": "PONG" }
```

### 5.3 Teste de Transação

```bash
# Verificar que transações funcionam no database.config.ts:
# Execute um teste simples de ROLLBACK

# No código:
// const result = await transaction(async (client) => {
//   await client.query('INSERT INTO users VALUES (...)');
//   throw new Error('Test rollback');
// });

# Esperado: usuário NÃO é inserido (ROLLBACK funcionou)
```

---

## PARTE 6: TESTES DE RESILIÊNCIA

### 6.1 Restart PostgreSQL

```bash
# Parar PostgreSQL
docker-compose stop postgresql

# Verificar que API tenta reconectar
docker logs -f suplilist-api

# Esperado: erros de conexão, logs de retry

# Reiniciar PostgreSQL
docker-compose start postgresql

# Esperado: API reconecta automaticamente
```

### 6.2 Restart Redis

```bash
# Parar Redis
docker-compose stop redis

# Verificar que API tenta reconectar
docker logs -f suplilist-api

# Esperado: warning sobre Redis offline

# Reiniciar Redis
docker-compose start redis

# Esperado: API reconecta automaticamente
```

### 6.3 Verificar Pool Cleanup

```bash
# Parar todos os containers
docker-compose down

# Esperado: containers foram parados corretamente
# Verificar que volumes continuam:
docker volume ls | grep suplilist

# Esperado: postgresql_data e redis_data ainda existem
```

---

## PARTE 7: TESTES DE DADOS

### 7.1 Verificar Seed Data

```bash
# Dentro do psql:
SELECT email, first_name FROM users ORDER BY created_at;
# Esperado:
# admin@suplilist.local    | Admin
# test@suplilist.local     | Test

SELECT COUNT(*) FROM profiles;
# Esperado: 2

SELECT COUNT(*) FROM products;
# Esperado: 3 (Notebook, Monitor, Teclado)

SELECT COUNT(*) FROM lists;
# Esperado: 2 (Setup para Home Office, Lista de Compras Familiar)

SELECT COUNT(*) FROM list_items;
# Esperado: 4 (3 produtos + 1 item customizado)

SELECT COUNT(*) FROM favorites;
# Esperado: 2
```

### 7.2 Verificar Triggers de Updated_at

```bash
# Dentro do psql:
SELECT id, created_at, updated_at FROM users WHERE email = 'admin@suplilist.local';

UPDATE users SET first_name = 'Admin Updated' WHERE email = 'admin@suplilist.local';

SELECT id, created_at, updated_at FROM users WHERE email = 'admin@suplilist.local';

# Esperado: updated_at é diferente de created_at
```

### 7.3 Verificar Constraints

```bash
# Dentro do psql:

-- Teste de email válido (deve falhar)
INSERT INTO users (email, password_hash) VALUES ('invalid-email', 'hash');
# Esperado: ERROR due to CHECK constraint

-- Teste de quantidade positiva (deve falhar)
INSERT INTO list_items (list_id, quantity) VALUES ('...', -1);
# Esperado: ERROR due to CHECK constraint
```

---

## PARTE 8: PERFORMANCE & MONITORING

### 8.1 Verificar Pool Stats

```bash
# No código, adicione:
// app.get('/test/pool-stats', (req, res) => {
//   res.json(getPoolStats());
// });

curl -s http://localhost:5000/test/pool-stats | jq

# Esperado:
# {
#   "totalCount": N,
#   "idleCount": M,
#   "waitingCount": 0
# }
```

### 8.2 Verificar Memory Usage

```bash
# Redis
docker exec -it suplilist-redis redis-cli INFO memory

# Esperado: used_memory é < 512mb

# PostgreSQL
docker stats suplilist-postgres --no-stream

# Esperado: memory < 200mb
```

### 8.3 Query Performance

```bash
# Dentro do psql:
EXPLAIN ANALYZE
SELECT * FROM products
WHERE title ILIKE '%notebook%';

# Esperado: usando índice pg_trgm
```

---

## PARTE 9: LIMPEZA & RESET

### 9.1 Rollback Completo

```bash
# Se precisar resetar o banco:
./server/database/scripts/rollback.sh --force

# Esperado: banco deletado e recriado vazio

# Reinicializar:
docker-compose up postgresql redis
./server/database/scripts/init-db.sh

# Esperado: schema + seed carregados novamente
```

### 9.2 Limpar Volumes

```bash
# CUIDADO: Isso deleta todos os dados!
docker-compose down -v

# Esperado: containers e volumes deletados

# Reiniciar do zero:
docker-compose up -d

# Esperado: tudo recriado
```

---

## PARTE 10: DOCUMENTAÇÃO & SIGN-OFF

### 10.1 Verificar Documentação

- [ ] `PHASE1_FOUNDATION_PLAN.md` completo
- [ ] Instruções de setup claro
- [ ] Comandos testáveis documentados
- [ ] Estrutura de diretórios explicada

### 10.2 Verificar Code Quality

```bash
# TypeScript compilation
cd server
npm run build

# Esperado: sem erros de TypeScript
```

### 10.3 Criar .env local

```bash
# Copiar .env.example para .env
cp .env.example .env

# Verificar que está no .gitignore
grep "^\.env" .gitignore

# Esperado: .env está ignorado
```

---

## FINAL SIGN-OFF

### Checklist Resumido

```
FASE 1 - FUNDAÇÃO CONCLUÍDA COM SUCESSO!

✓ Estrutura de diretórios criada
✓ PostgreSQL 15 com pg_trgm funcionando
✓ Redis 7 com maxmemory LRU configurado
✓ Migrations aplicadas automaticamente
✓ Seed data carregada
✓ Docker Compose com health checks
✓ Zod validation de environment
✓ Database pool connection management
✓ Redis client com retry automático
✓ Documentação completa

PRONTO PARA FASE 2: JIT Endpoints
```

### Próximos Passos

1. Remover endpoints `/test/*` de testes
2. Implementar Fase 2 - JIT endpoints
3. Criar migrations para tabelas adicionais (se necessário)
4. Configurar CI/CD para testes automáticos
5. Setup de production database

---

**Validação Completada em**: [DATA]  
**Responsável**: [NOME]  
**Status**: ✅ APROVADO
