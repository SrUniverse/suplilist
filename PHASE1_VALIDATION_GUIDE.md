# FASE 1 - Validation Guide

Use este guia para validar manualmente se algo der errado com o script automático.

---

## 1. Verificar Docker Containers

```powershell
# Ver status de todos containers
docker ps

# Esperado:
# suplilist-postgres    RUNNING
# suplilist-redis       RUNNING
# suplilist-api         RUNNING
```

---

## 2. Validar PostgreSQL

### Conectar ao banco
```powershell
docker exec -it suplilist-postgres psql -U suplilist -d suplilist
```

### Dentro do psql, verificar:

**Tabelas (deve ter 11):**
```sql
\dt
-- Esperado: 11 tabelas (users, profiles, products, lists, list_items, favorites, user_settings, user_consents, refresh_tokens, audit_logs, outbox_events)
```

**Extensões (deve ter 4):**
```sql
SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm', 'btree_gin', 'btree_gist');
-- Esperado: uuid-ossp, pg_trgm, btree_gin, btree_gist
```

**Índices (deve ter 40+):**
```sql
SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';
-- Esperado: ~40+
```

**Dados Seed:**
```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM lists;
-- Esperado: pelo menos 1-2 de cada
```

**Funções (deve ter 2):**
```sql
SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Esperado: update_updated_at, search_products
```

**Triggers (deve ter 7):**
```sql
SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public';
-- Esperado: 7
```

### Sair do psql
```sql
\q
```

---

## 3. Validar Redis

```powershell
# Conectar ao Redis
docker exec -it suplilist-redis redis-cli

# Dentro do redis-cli:

# Verificar PING
PING
# Esperado: PONG

# Verificar maxmemory
CONFIG GET maxmemory
# Esperado: 512mb

# Verificar política de evicção
CONFIG GET maxmemory-policy
# Esperado: allkeys-lru

# Verificar databases
CONFIG GET databases
# Esperado: 3

# Ver memória em uso
INFO memory
# Esperado: used_memory_human deve ser < 512mb

# Sair
exit
```

---

## 4. Validar API

```powershell
# Health check
curl http://localhost:5000/health
# Esperado: { "status": "healthy" } ou similar

# Ver logs
docker logs suplilist-api

# Procurar por:
# ✅ "PostgreSQL connected successfully"
# ✅ "Redis connected"
# ✅ "Server running on port 5000"
```

---

## 5. Troubleshooting

### PostgreSQL não conecta

```powershell
# Ver logs
docker logs suplilist-postgres

# Reiniciar
docker-compose restart postgresql

# Resetar banco (CUIDADO - deleta dados!)
docker-compose down postgresql
docker volume rm suplilist_postgresql_data
docker-compose up -d postgresql
```

### Redis não conecta

```powershell
# Ver logs
docker logs suplilist-redis

# Reiniciar
docker-compose restart redis

# Verificar porta
netstat -ano | findstr :6379
```

### API não inicia

```powershell
# Ver logs completos
docker logs suplilist-api

# Procurar por erros de:
# - DATABASE_URL inválida
# - REDIS_URL inválida
# - Variáveis JWT não configuradas

# Reiniciar
docker-compose restart api
```

### Limpar tudo e começar de novo

```powershell
# Parar containers
docker-compose down

# Remover volumes (dados deletados!)
docker volume rm suplilist_postgresql_data suplilist_redis_data

# Reiniciar
docker-compose up -d

# Monitorar logs
docker-compose logs -f
```

---

## 6. Checklist Final

- [ ] 3 containers rodando (docker ps)
- [ ] PostgreSQL respondendo a conexões
- [ ] 11 tabelas em PostgreSQL
- [ ] 4 extensões PostgreSQL carregadas
- [ ] 40+ índices em PostgreSQL
- [ ] 7 triggers em PostgreSQL
- [ ] Redis respondendo a PING
- [ ] Redis maxmemory = 512mb
- [ ] Redis maxmemory-policy = allkeys-lru
- [ ] API respondendo em localhost:5000/health
- [ ] Logs mostram "PostgreSQL connected successfully"
- [ ] Logs mostram "Redis connected"

---

## 7. Próximos Passos

Se tudo passou no checklist, você está pronto para:

**FASE 2 - JIT Endpoints**
- Implementar `/out` endpoint
- Regex defenses (Amazon, Shopee)
- Rate limiting
- BullMQ workers

Execute: `npm run dev` no backend para começar a desenvolver

---

**Última atualização:** 2026-06-09
