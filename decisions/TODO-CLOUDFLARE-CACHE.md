# TODO: Otimizar Cache Lifetimes no Cloudflare

**Objetivo:** Aumentar Lighthouse de 96 → 97 resolvendo "Efficient Cache Lifetimes"  
**Economia esperada:** 55 KiB  
**Tempo:** 5 minutos  
**Status:** ⏳ PENDENTE

---

## 📋 Checklist

- [ ] Acessar Cloudflare Dashboard
- [ ] Criar Cache Rule
- [ ] Verificar com curl
- [ ] Rodar Lighthouse novamente

---

## 🚀 Passo 1: Acesse Cloudflare Dashboard

1. Vá para: **https://dash.cloudflare.com/**
2. Selecione seu domínio: **suplilist.com**
3. Menu esquerda → **Caching** → **Cache Rules**

---

## 🔧 Passo 2: Crie a Regra

Clique em **Create Rule**

### Nome da regra:
```
Immutable assets 1 year
```

### Condição (If incoming requests match):

Clique em **Edit Expression** e copie exatamente:
```
(http.request.uri.path matches "^/assets/.*\.[a-f0-9]{8}\.(js|css|woff2|png|jpg|svg)$")
```

---

## ⚙️ Passo 3: Configure a Ação

**When incoming requests match:**

| Campo | Valor |
|-------|-------|
| **Cache Status** | Cache |
| **Browser Cache TTL** | 1 year |
| **Cache Key** | Default |
| **Minimum TLS Version** | Default |

---

## ✅ Passo 4: Deploy

1. Clique em **Deploy** (canto inferior direito)
2. **Aguarde:** 1-2 minutos para ativar globalmente
3. Você verá: "✓ Rule deployed successfully"

---

## 🔍 Passo 5: Verificação Pós-Deploy

Abra terminal/PowerShell e execute:

```bash
curl -I https://suplilist.com/assets/main-DOmSCkCc.css
```

**Você deve ver:**
```
HTTP/2 200
Cache-Control: public, max-age=31536000, immutable
CF-Cache-Status: HIT
```

### Se vir `max-age=600`:
- Regra ainda não ativou
- Aguarde 5-10 minutos
- Tente novamente

---

## 📊 Resultado Esperado

- ✅ Lighthouse: 96 → 97 pontos
- ✅ Cache hit rate: +40% para repeat visitors
- ✅ Economia: 55 KiB por visita
- ✅ "Efficient Cache Lifetimes" desaparece do relatório

---

## 📝 Notas Técnicas

**Por que essa regra funciona:**

- Regex detecta **assets com hash de 8 caracteres** gerados pelo Vite
  - Exemplo: `main-DOmSCkCc.css` (hash = DOmSCkCc)
  - Exemplo: `vendor-A1B2C3D4.js` (hash = A1B2C3D4)

- **Immutable:** Quando conteúdo muda, Vite gera novo hash → novo filename
  - Navegador nunca reutiliza arquivo antigo (100% seguro)
  - Cache pode ser máximo (31536000 segundos = 1 ano)

- **Não afeta:** HTML, dados dinâmicos, ou arquivos sem hash

---

## 🎯 Próximo: Critical CSS (Problema 1)

Depois que fazer isso, o próximo fix é extrair Critical CSS:
- Arquivo: `CLOUDFLARE-CACHE-SETUP.md`
- Ação: Implementar lazy loading de CSS não-crítico
- Resultado: 96 → 100 (com ambos os fixes)

---

**Feito?** Avisa quando tiver implementado!
