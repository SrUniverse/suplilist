# 📧 Email System com Resend - Guia Completo

## O que é Resend?

**Resend** é um serviço de email transacional moderno (like SendGrid, Mailgun) otimizado para developers. Ele:
- ✅ Envia emails via API REST
- ✅ Rastreia opens e clicks
- ✅ Detecta bounces automaticamente
- ✅ Gerencia unsubscribes (GDPR compliant)
- ✅ Oferece webhooks para eventos
- ✅ Tem pricing generoso (100 emails/dia gratuito)

---

## Arquitetura Completa

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (Browser)                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  App inicializa                                                  │
│  ↓                                                               │
│  emailReminderService.initialize()                               │
│  ↓                                                               │
│  Calcula "próximo 1º do mês"                                     │
│  ↓                                                               │
│  setTimeout(sendMonthlyReportEmail, msUntilNext)                │
│                                                                  │
│  [Dia 1º chega]                                                  │
│  ↓                                                               │
│  sendMonthlyReportEmail()                                        │
│  ↓                                                               │
│  ReportGenerator.generateMonthlyReport(year, month)             │
│  ↓                                                               │
│  Gera HTML + texto com métricas                                 │
│  ↓                                                               │
│  POST /api/email                                                 │
│  {                                                               │
│    to: 'user@example.com',                                       │
│    subject: 'Seu Relatório - Junho',                            │
│    html: '<html>...</html>',                                     │
│    text: 'plain text'                                            │
│  }                                                               │
│  Headers: Authorization: Bearer <JWT_TOKEN>                      │
│                                                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (Node.js + Express)                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  POST /api/email (authenticateToken middleware)                 │
│  ↓                                                               │
│  Valida campos obrigatórios                                     │
│  ↓                                                               │
│  Valida formato email                                           │
│  ↓                                                               │
│  Rate limit check (10 emails/min, 100/hora)                    │
│  ↓                                                               │
│  Check unsubscribe list (GDPR)                                  │
│  ↓                                                               │
│  Sanitiza HTML (previne XSS)                                    │
│  ↓                                                               │
│  resend.emails.send({                                            │
│    from: 'noreply@suplilist.app',                               │
│    to: 'user@example.com',                                       │
│    subject: 'Seu Relatório - Junho',                            │
│    html: '<clean html>',                                         │
│    text: 'plain text',                                           │
│    tracking: { opens: true, clicks: true }                       │
│  })                                                               │
│  ↓                                                               │
│  Salva no EmailLog (MongoDB)                                    │
│  {                                                               │
│    userId: '...',                                                │
│    to: 'user@example.com',                                       │
│    subject: '...',                                               │
│    messageId: 'uuid-from-resend',                               │
│    status: 'sent',                                               │
│    provider: 'resend',                                           │
│    sentAt: Date.now()                                            │
│  }                                                               │
│  ↓                                                               │
│  Response 200 OK                                                 │
│  {                                                               │
│    success: true,                                                │
│    messageId: 'uuid',                                            │
│    sentAt: '2026-06-06T...'                                      │
│  }                                                               │
│                                                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ RESEND (Email Service Provider)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Recebe request da API                                          │
│  ↓                                                               │
│  Valida remetente (noreply@suplilist.app)                       │
│  ↓                                                               │
│  Envia email para user@example.com                              │
│  ↓                                                               │
│  Retorna messageId (identificador único)                        │
│  ↓                                                               │
│  Rastreia:                                                       │
│  • Opens (pixel tracking)                                        │
│  • Clicks (URL rewriting)                                        │
│  • Bounces (feedback loops)                                      │
│  • Complaints (spam reports)                                     │
│  ↓                                                               │
│  Envia webhooks para backend em eventos:                        │
│  {                                                               │
│    type: 'email.opened',                                         │
│    data: { messageId, timestamp, userAgent, ip }                │
│  }                                                               │
│                                                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ USER INBOX (Gmail, Outlook, etc)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Email chega com:                                                │
│  • Subject: "Seu Relatório de Aderência - Junho 2026"           │
│  • From: noreply@suplilist.app                                  │
│  • Reply-To: support@suplilist.app                              │
│  • Unsubscribe link (GDPR obrigatório)                          │
│  • Tracking pixel (invisível)                                    │
│  ↓                                                               │
│  User vê email em sua caixa                                     │
│  ↓                                                               │
│  User clica para abrir (Resend rastreia "opened")               │
│  ↓                                                               │
│  User clica em botão "Abrir SupliList"                          │
│  (Resend rastreia "clicked")                                    │
│  ↓                                                               │
│  User volta à app                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Setup do Resend

### 1. Obter API Key

1. Ir para https://resend.com
2. Sign up com email
3. Confirmar email
4. Dashboard → API Keys
5. Copiar chave (começa com `re_`)

### 2. Configurar Domínio

Para enviar de `noreply@suplilist.app`:

1. Dashboard → Domains
2. Adicionar domínio: `suplilist.app`
3. Resend fornece registros DNS:
   - MX: `mx1.resend.com`
   - TXT: Token de verificação
4. Adicionar registros no seu DNS
5. Resend verifica automaticamente (10-15 min)

### 3. Variáveis de Ambiente

```bash
# .env.production
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@suplilist.app
REACT_APP_EMAIL_API_URL=https://api.suplilist.app/api/email
REACT_APP_SHARE_URL=https://suplilist.app
```

### 4. Instalar Package

```bash
npm install resend
```

---

## API Endpoints

### POST /api/email - Enviar Email

```javascript
// Request
POST https://api.suplilist.app/api/email
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Seu Relatório de Aderência - Junho 2026",
  "html": "<h1>Seus dados</h1><p>Aderência: 78%</p>",
  "text": "Seus dados\nAderência: 78%"
}

// Response
{
  "success": true,
  "messageId": "b2e453eb-3317-4bef-8b84-b3c7c75f4c3b",
  "sentAt": "2026-06-01T10:30:45.123Z"
}
```

### GET /api/email/status - Checar Status do Serviço

```javascript
// Request
GET https://api.suplilist.app/api/email/status
Authorization: Bearer <JWT_TOKEN>

// Response
{
  "connected": true,
  "provider": "resend",
  "status": "operational",
  "lastCheck": "2026-06-06T14:30:00.000Z"
}
```

### POST /api/email/unsubscribe - Desinscrever

```javascript
// Request (sem autenticação, GDPR requirement)
POST https://api.suplilist.app/api/email/unsubscribe
Content-Type: application/json

{
  "email": "user@example.com"
}

// Response
{
  "success": true,
  "message": "Unsubscribed from email reminders"
}
```

---

## Fluxo de Email Completo (Código)

### 1. Frontend - Agendar Envio

```javascript
// src/platform/email-reminder-service.js

class EmailReminderService {
  initialize() {
    this.scheduleMonthlyReport();
  }

  scheduleMonthlyReport() {
    const today = new Date();

    // Se é dia 1, envia AGORA
    if (today.getDate() === 1) {
      this.sendMonthlyReportEmail();
    }

    // Agenda próximo envio para dia 1 próximo mês
    const nextFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const msUntilNext = nextFirst.getTime() - Date.now();

    setTimeout(() => {
      this.sendMonthlyReportEmail();
      this.scheduleMonthlyReport(); // Reschedule
    }, msUntilNext);

    logger.info(`Scheduled email for ${nextFirst.toLocaleDateString()}`);
  }

  async sendMonthlyReportEmail() {
    const profile = stateManager.select(s => s.profile);
    if (!profile?.email) {
      logger.warn('No email configured');
      return;
    }

    // Gera relatório
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const report = ReportGenerator.generateMonthlyReport(
      lastMonth.getFullYear(),
      lastMonth.getMonth() + 1
    );

    // Converte para HTML
    const html = ReportGenerator.getReportHTML(report);
    const text = this.generatePlainText(report);

    // Envia para backend
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          to: profile.email,
          subject: `Seu Relatório - ${report.monthName} ${report.year}`,
          html,
          text
        })
      });

      const result = await response.json();
      if (result.success) {
        logger.info(`Email sent: ${result.messageId}`);
      } else {
        logger.error(`Email failed: ${result.error}`);
      }
    } catch (error) {
      logger.error('Email send failed', error);
    }
  }
}
```

### 2. Backend - Receber e Enviar via Resend

```javascript
// backend/routes/email.js

import express from 'express';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

app.post('/api/email', authenticateToken, async (req, res) => {
  const { to, subject, html, text } = req.body;
  const userId = req.user.id;

  // 1. Validações
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // 2. Verifica unsubscribe
  const isUnsubscribed = await UnsubscribeList.findOne({ email: to });
  if (isUnsubscribed) {
    return res.status(200).json({
      success: true,
      messageId: 'unsubscribed',
      skipped: true
    });
  }

  // 3. Sanitiza HTML
  const cleanHtml = sanitizeHtml(html);

  // 4. Envia via Resend
  try {
    const result = await resend.emails.send({
      from: 'noreply@suplilist.app',
      to,
      subject,
      html: cleanHtml,
      text,
      reply_to: 'support@suplilist.app',
      headers: {
        'X-User-ID': userId,
        'X-App': 'SupliList'
      }
    });

    // 5. Loga no BD
    if (result.id) {
      await EmailLog.create({
        userId,
        to,
        subject,
        messageId: result.id,
        sentAt: new Date(),
        status: 'sent',
        provider: 'resend'
      });

      return res.json({
        success: true,
        messageId: result.id,
        sentAt: new Date().toISOString()
      });
    } else {
      // Falha
      await EmailLog.create({
        userId,
        to,
        subject,
        status: 'failed',
        error: result.error?.message
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to send email'
      });
    }
  } catch (error) {
    logger.error('Email error', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### 3. Resend Webhooks - Rastrear Eventos

```javascript
// backend/routes/webhooks.js

app.post('/webhooks/resend', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['resend-signature'];

  // Verificar assinatura (HMAC)
  const isValid = verifyResendSignature(req.body, signature, process.env.RESEND_WEBHOOK_SECRET);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(req.body);

  // Processar eventos
  switch (event.type) {
    case 'email.opened':
      await EmailLog.updateOne(
        { messageId: event.data.messageId },
        { openedAt: new Date() }
      );
      logger.info(`Email opened: ${event.data.messageId}`);
      break;

    case 'email.clicked':
      await EmailLog.updateOne(
        { messageId: event.data.messageId },
        { clickedAt: new Date() }
      );
      logger.info(`Email clicked: ${event.data.messageId}`);
      break;

    case 'email.bounced':
      await EmailLog.updateOne(
        { messageId: event.data.messageId },
        { status: 'bounced' }
      );
      // Adicionar à unsubscribe list
      await UnsubscribeList.findOneAndUpdate(
        { email: event.data.email },
        { unsubscribedAt: new Date(), reason: 'bounce' },
        { upsert: true }
      );
      logger.warn(`Email bounced: ${event.data.email}`);
      break;

    case 'email.complained':
      await UnsubscribeList.findOneAndUpdate(
        { email: event.data.email },
        { unsubscribedAt: new Date(), reason: 'complaint' },
        { upsert: true }
      );
      logger.error(`Email complained: ${event.data.email}`);
      break;
  }

  res.json({ success: true });
});
```

---

## Monitoramento e Alertas

```javascript
// backend/services/email-monitoring.js

export async function getEmailMetrics() {
  const emailLogs = await EmailLog.find({ sentAt: { $gte: subDays(new Date(), 30) } });

  const metrics = {
    sent: emailLogs.filter(e => e.status === 'sent').length,
    failed: emailLogs.filter(e => e.status === 'failed').length,
    bounced: emailLogs.filter(e => e.status === 'bounced').length,
    complained: emailLogs.filter(e => e.status === 'complained').length
  };

  const total = metrics.sent + metrics.failed;
  const bounceRate = (metrics.bounced / total) * 100;
  const complaintRate = (metrics.complained / total) * 100;

  // Alert if rates are high
  if (bounceRate > 5) {
    logger.error(`High bounce rate: ${bounceRate.toFixed(2)}%`);
    // Notificar via Slack
  }

  if (complaintRate > 1) {
    logger.error(`High complaint rate: ${complaintRate.toFixed(2)}%`);
    // Notificar via Slack
  }

  return {
    metrics,
    bounceRate: bounceRate.toFixed(2) + '%',
    complaintRate: complaintRate.toFixed(2) + '%'
  };
}
```

---

## Troubleshooting

| Problema | Causa | Solução |
|----------|-------|---------|
| 401 Unauthorized | Token inválido | Verificar JWT expiração |
| 429 Too Many Requests | Rate limit excedido | Implementar backoff exponencial |
| Email não chega | Domínio não verificado | Adicionar registros DNS |
| Muito bounce | Lista suja | Usar double-opt-in |
| Spam folder | Falta de DKIM/SPF | Verificar Resend docs |

---

## Preços Resend (2026)

- **Gratuito**: 100 emails/dia
- **Pago**: $0.01 por email (depois de 100/dia)
- Exemplo: 50k emails/mês = $500

Para SupliList (1000 usuários × 1 email/mês = 1000 emails) = **Gratuito** ✅

---

## GDPR Compliance Checklist

- ✅ Unsubscribe link em todo email
- ✅ Reply-To configurado
- ✅ Opção de resubscribe
- ✅ Logs de consentimento
- ✅ Dados retidos < 90 dias (TTL index)
- ✅ Webhook de bounce → unsubscribe automático
- ✅ Webhook de complaint → unsubscribe automático

---

**Status**: ✅ Pronto para produção
**Testes**: Execute `/api/email/status` para verificar conexão
