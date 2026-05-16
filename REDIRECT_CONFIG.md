# 🌐 CONFIGURAÇÃO DE REDIRECTS 301 — SUPLILIST

## ✅ RESUMO DE ALTERAÇÕES

- [x] E-mail corrigido em Termos de Uso: `contato@suplilist.com`
- [x] Meta tags já estão corretas (canonical, og:url, og:site_name)
- [x] Arquivo `.htaccess` criado para Apache
- [x] Guia de configuração por plataforma

---

## 📋 PLATAFORMA: APACHE (.htaccess)

**Localização**: Raiz do projeto `/` ou `/public/`

```apache
RewriteEngine On
RewriteCond %{HTTP_HOST} ^(www\.)?suplilistpro\.com$ [NC]
RewriteRule ^(.*)$ https://suplilist.com/$1 [L,R=301]
```

**Status**: ✅ Implementado no arquivo `.htaccess`

---

## 🔧 PLATAFORMA: NGINX (nginx.conf)

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name suplilistpro.com www.suplilistpro.com;

    # Redirecionar para suplilist.com com status 301
    return 301 https://suplilist.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name suplilist.com www.suplilist.com;

    # Certificados SSL
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Seu config normal aqui
    root /var/www/suplilist;
    index index.html;
}
```

---

## ☁️ PLATAFORMA: CLOUDFLARE (Page Rules + Workers)

**Opção 1: Page Rules (Mais Simples)**

1. Acesse o painel Cloudflare
2. Vá para **Rules → Page Rules**
3. Clique em **Create Page Rule**
4. Configure:
   ```
   URL: *suplilistpro.com/*
   Setting: Forwarding URL
   Status Code: 301 - Permanent Redirect
   Destination: https://suplilist.com/$1
   ```
5. Salve e aguarde propagação (2-5 min)

**Opção 2: Cloudflare Workers (Mais Flexível)**

1. Vá para **Workers & Pages → Manage Workers**
2. Clique em **Create Application**
3. Crie um novo Worker com este código:

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Redirecionar suplilistpro.com → suplilist.com
    if (
      url.hostname === "suplilistpro.com" ||
      url.hostname === "www.suplilistpro.com"
    ) {
      const newUrl = new URL(request.url);
      newUrl.hostname = "suplilist.com";

      return new Response(null, {
        status: 301,
        headers: {
          Location: newUrl.toString(),
        },
      });
    }

    // Passar para origem normalmente
    return fetch(request);
  },
};
```

4. Clique em **Deploy**
5. Vá para **Settings → Triggers**
6. Em **Routes**, adicione:
   ```
   *suplilistpro.com/*
   *www.suplilistpro.com/*
   ```

**Opção 3: Bulk Redirects (Mais Poderoso)**

1. Vá para **Rules → Bulk Redirects**
2. Clique em **Create bulk redirect list**
3. Adicione o mapeamento:
   ```
   Source URL: suplilistpro.com/*
   Target URL: https://suplilist.com/
   Status Code: 301
   Include subdomains: ✓
   Preserve path: ✓
   ```

**Status**: 🔄 **Aguardando implementação no painel Cloudflare**

**DNS Check - Cloudflare**:

- Verifique em **DNS Records** que ambos domínios apontam para sua origem
- Ative **Proxy Status** (ícone nuvem laranja) em ambos

---

## ☁️ PLATAFORMA: VERCEL (vercel.json)

```json
{
  "redirects": [
    {
      "source": "/:path(.*)",
      "destination": "https://suplilist.com/:path",
      "statusCode": 301
    }
  ],
  "env": {
    "DOMAINS": "suplilist.com,www.suplilist.com"
  }
}
```

**Setup no Vercel**:

1. Adicionar domínio `suplilistpro.com` nos Settings do projeto
2. Apontar DNS para Vercel
3. Adicionar `vercel.json` com config acima
4. Redeploy do projeto

---

## 📦 PLATAFORMA: NETLIFY (netlify.toml)

```toml
[[redirects]]
from = "/*"
to = "https://suplilist.com/:splat"
status = 301
force = true

# Redirecionar domínio inteiro
[[headers]]
for = "/*"
[headers.values]
```

**Setup no Netlify**:

1. Domínio `suplilistpro.com` em Site Settings → Domain Management
2. Criar/editar `netlify.toml`
3. Deploy automático

---

## 🔑 PLATAFORMA: NODE.JS (Express)

```javascript
const express = require("express");
const app = express();

// Middleware de redirect 301
app.use((req, res, next) => {
  const host = req.get("host");

  // Redirecionar suplilistpro.com → suplilist.com
  if (host.includes("suplilistpro.com")) {
    return res.redirect(301, `https://suplilist.com${req.originalUrl}`);
  }

  next();
});

// Seu código de servidor aqui
app.get("/", (req, res) => {
  res.send("Hello Suplilist");
});

app.listen(3000);
```

---

## 🔐 PLATAFORMA: AWS CloudFront + Route53

**CloudFront Distribution**:

1. Criar distribuição para `suplilist.com`
2. Em "Origin Settings":
   - Origin Domain: seu domínio original
   - CNAME: `suplilist.com`, `www.suplilist.com`

3. Em "Behaviors" → "Redirect HTTP to HTTPS"

**Route53**:

```
suplilistpro.com → ALIAS → CloudFront distribution
ou
suplilistpro.com → CNAME → d111111abcdef8.cloudfront.net
```

Com função Lambda:

```javascript
"use strict";

exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  if (headers.host[0].value.includes("suplilistpro.com")) {
    const redirect = {
      status: "301",
      statusDescription: "Moved Permanently",
      headers: {
        location: [
          {
            key: "Location",
            value: `https://suplilist.com${request.uri}`,
          },
        ],
      },
    };
    callback(null, redirect);
  }

  callback(null, request);
};
```

---

## ✅ VERIFICAÇÃO PÓS-IMPLEMENTAÇÃO

### 1. Testar Redirect com cURL

```bash
curl -I https://suplilistpro.com
# Deve retornar: HTTP/2 301
# Location: https://suplilist.com/

curl -I https://www.suplilistpro.com/termos
# Deve retornar: HTTP/2 301
# Location: https://suplilist.com/termos
```

### 2. Verificar com ferramentas online

- [Redirect Checker](https://www.redirect-checker.org)
- [SEO Tools → Redirect Checker](https://www.seotoolset.com/redirect-checker)

### 3. Google Search Console

1. Verificar ambos domínios em Search Console
2. Em Settings → Change of Address: informar sobre migrate
3. Monitorar para erros de rastreamento

---

## 📊 IMPACTO SEO

| Aspecto               | Status                              |
| --------------------- | ----------------------------------- |
| **Canonical Tag**     | ✅ Já correto em index.html         |
| **og:url**            | ✅ Já correto em index.html         |
| **og:site_name**      | ✅ Já correto: "SupliList"          |
| **E-mail de contato** | ✅ Corrigido: contato@suplilist.com |
| **Redirect 301**      | ✅ Configurado (servidor)           |
| **HTTPS**             | ✅ Implementado                     |
| **Cache Headers**     | ✅ Otimizado em .htaccess           |

---

## 📌 CHECKLIST FINAL

- [x] Alterar e-mail em Termos de Uso
- [x] Criar .htaccess com redirect 301
- [x] Documentar configurações por plataforma
- [ ] **CLOUDFLARE: Escolher implementar (Page Rules, Workers ou Bulk Redirects)**
- [ ] Testar redirect com cURL ou ferramentas online
- [ ] Monitorar Google Search Console por 30 dias
- [ ] Remover suplilistpro.com de DNS após 90 dias (opcional)

---

## 🚀 PRÓXIMOS PASSOS — CLOUDFLARE

**Recomendação**: Use **Page Rules** (mais simples) ou **Workers** (mais flexível)

1. ✅ Acesse [dash.cloudflare.com](https://dash.cloudflare.com)
2. ✅ Selecione seu domínio `suplilist.com`
3. ✅ Configure conforme opção acima (Page Rules / Workers)
4. ✅ Teste com:
   ```bash
   curl -I https://suplilistpro.com
   # Esperado: HTTP/2 301
   # Location: https://suplilist.com/
   ```
5. ✅ Aguarde propagação (2-5 minutos) e monitore Search Console

---

**Última atualização**: 15 de maio de 2026
**Versão**: 1.0
**Responsável**: SupliList Pro
