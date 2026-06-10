# FASE 1 - Quick Start Guide

**Tempo estimado**: 15 minutos do zero ao funcionando

---

## 1. PREPARAÇÃO (2 min)

```bash
# Copiar variáveis de ambiente
cp .env.example .env

# Instalar dependência PostgreSQL
cd server
npm install pg @types/pg
cd ..

# Tornar scripts executáveis (Linux/Mac)
chmod +x server/database/scripts/*.sh
```

---

## 2. INICIAR INFRAESTRUTURA (5 min)

```bash
# Build e start containers
docker-compose up -d

# Monitorar inicialização
docker-compose logs -f

# Aguardar até ver:
# ✓ suplilist-postgres: "database system is ready"
# ✓ suplilist-redis: "Ready to accept connections"
# ✓ suplilist-api: "SupliList backend server running"

# Ctrl+C para parar os logs (containers continuam rodando)
```

---

## 3. VALIDAR POSTGRESQL (2 min)

```bash
# Conectar ao banco
docker exec -it suplilist-postgres psql -U suplilist -d suplilist

# Verificar tabelas
\dt

# Verificar dados
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM lists;

# Sair
\q
```

---

## 4. VALIDAR REDIS (2 min)

```bash
# Conectar ao Redis
docker exec -it suplilist-redis redis-cli

# Verificar saúde
PING
# Esperado: PONG

# Verificar configuração
CONFIG GET maxmemory
CONFIG GET maxmemory-policy

# Sair
exit
```

---

## 5. VALIDAR API (2 min)

```bash
# Health check
curl http://localhost:5000/health

# Ver logs
docker logs suplilist-api | tail -20

# Procurar por:
# ✅ PostgreSQL connected
# ✅ Redis connected
```

---

## 6. PRONTO PARA DESENVOLVER!

```bash
# Ver estado de todos containers
docker ps

# Ver logs em tempo real
docker-compose logs -f

# Parar tudo (dados persistem)
docker-compose down

# Limpar tudo (dados deletados!)
docker-compose down -v

# Reiniciar tudo
docker-compose up -d
```

---

## TROUBLESHOOTING RÁPIDO

### PostgreSQL não conecta

```bash
# Verificar se container está rodando
docker ps | grep postgres

# Ver logs
docker logs suplilist-postgres

# Reiniciar
docker-compose restart postgresql

# Resetar banco (CUIDADO!)
docker-compose down postgresql
docker volume rm suplilist_postgresql_data
docker-compose up -d postgresql
```

### Redis não conecta

```bash
# Verificar se container está rodando
docker ps | grep redis

# Ver logs
docker logs suplilist-redis

# Testar conexão
docker exec -it suplilist-redis redis-cli ping

# Reiniciar
docker-compose restart redis
```

### API não inicia

```bash
# Ver logs completos
docker logs suplilist-api

# Procurar por erros de:
# - DATABASE_URL inválida
# - REDIS_URL inválida
# - Variáveis de JWT não configuradas

# Verificar .env
cat server/.env

# Reiniciar API
docker-compose restart api
```

---

## COMANDOS ÚTEIS

```bash
# Instalar novas dependências
docker exec suplilist-api npm install <package>

# Rodar migrations adicionais
docker exec suplilist-postgres psql -U suplilist -d suplilist \
  -f /docker-entrypoint-initdb.d/002_new_migration.sql

# Executar query SQL
docker exec suplilist-postgres psql -U suplilist -d suplilist \
  -c "SELECT * FROM users;"

# Limpar cache Redis
docker exec suplilist-redis redis-cli FLUSHALL

# Ver estatísticas de memória
docker exec suplilist-redis redis-cli INFO memory

# Acessar bash do container
docker exec -it suplilist-postgres bash
docker exec -it suplilist-redis bash
docker exec -it suplilist-api bash
```

---

## ESTRUTURA DE ARQUIVO

```
server/
├── database/
│   ├── migrations/        ← Schemas SQL versionadas
│   │   └── 001_initial_schema.sql
│   ├── seeds/             ← Dados iniciais
│   │   └── 001_initial_seed.sql
│   └── scripts/           ← Ferramentas
│       ├── init-db.sh
│       ├── migrate.sh
│       └── rollback.sh
├── redis/
│   └── redis.conf         ← Configuração Redis
└── src/
    └── shared/config/
        ├── database.config.ts
        ├── redis.config.ts
        └── env.config.ts
```

---

## PRÓXIMO PASSO

FASE 1 concluída! Agora você pode:

1. Desenvolver endpoints da API
2. Implementar JIT compilation (Fase 2)
3. Criar migrations adicionais
4. Adicionar dados via API

---

**Status**: ✅ Infraestrutura Pronta  
**Próximo**: Fase 2 - JIT Endpoints
