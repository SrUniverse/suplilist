// ============================================================
// config/support.js — Canais de suporte (fonte única de verdade)
// ============================================================
// Para ativar o WhatsApp, preencha SUPPORT_WHATSAPP com o número no formato
// internacional, só dígitos (ex.: '5511999998888' = +55 11 99999-8888).
// Enquanto estiver vazio, o botão de WhatsApp simplesmente não é exibido —
// o e-mail continua funcionando normalmente.

export const SUPPORT_EMAIL = 'support@suplilist.com';

// Vazio = WhatsApp desativado. Preencher quando o número estiver pronto.
export const SUPPORT_WHATSAPP = '';

/**
 * Monta um link mailto com assunto e corpo pré-preenchidos.
 * @param {string} subject
 * @param {string} [body]
 * @returns {string}
 */
export function buildSupportMailto(subject, body = '') {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const qs = params.toString();
  return `mailto:${SUPPORT_EMAIL}${qs ? `?${qs}` : ''}`;
}

/**
 * Monta um link wa.me com mensagem pré-preenchida, ou null se o número
 * de WhatsApp ainda não foi configurado.
 * @param {string} [message]
 * @returns {string|null}
 */
export function buildSupportWhatsApp(message = '') {
  if (!SUPPORT_WHATSAPP) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${SUPPORT_WHATSAPP}${text}`;
}
