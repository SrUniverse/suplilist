# ── Estágio 1: Build (builder) ────────────────────────────────────────────────
FROM node:20 AS builder

WORKDIR /usr/src/app

# Copia os manifestos do workspace inteiro (raiz + sub-pacotes)
COPY package*.json ./
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/

# Instala todas as dependências do monorepo (incluindo TS e @types)
RUN npm install

# Copia o código-fonte do shared e do server
COPY shared/ ./shared/
COPY server/ ./server/

# Compila o shared e o server
WORKDIR /usr/src/app/server
RUN npm run build

# ── Estágio 2: Runtime (production) ───────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copia os manifestos para recriar o workspace enxuto
COPY package*.json ./
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/

# Instala apenas as dependências de produção do workspace (--omit=dev)
RUN npm ci --omit=dev

# Copia o JavaScript transpilado do shared e do server
COPY --from=builder /usr/src/app/shared/dist ./shared/dist
COPY --from=builder /usr/src/app/server/dist ./server/dist

# Adiciona usuário não-root por segurança
USER node

EXPOSE 5000

WORKDIR /usr/src/app/server

# Inicia direto do binário (preserva sinais do Linux)
CMD ["node", "dist/server.js"]
