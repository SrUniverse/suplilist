/**
 * admin-error.js — Turn an admin API failure into a clear, actionable message.
 *
 * Admin endpoints reject callers without admin rights with 403 (current API) or
 * 401 (older deploys returned 401 for non-admins). Both mean the same thing to
 * the operator: "your account can't manage the catalog yet". A generic
 * "Erro ao carregar" hides that, so the panel looks broken when it is really an
 * access/config gap. This maps the common cases to plain pt-BR guidance.
 */

import { ApiError } from '../../platform/api-client.js';

/**
 * @param {unknown} err - Error thrown by apiFetch (usually an ApiError).
 * @returns {string} Operator-facing message in pt-BR.
 */
export function describeAdminError(err) {
  const status = err instanceof ApiError ? err.status : null;
  const code = err && typeof err === 'object' ? err.error : null;

  // Network / offline
  if (status === 0 || code === 'network_error') {
    return 'Falha de conexão. Verifique sua internet e tente novamente.';
  }

  // Access denied — the dominant case for the owner setting up the panel.
  if (status === 401 || status === 403) {
    if (code === 'account_inactive') {
      return 'Sua conta está inativa. Reative-a antes de acessar o painel administrativo.';
    }
    if (code === 'invalid_token' || code === 'missing_token') {
      return 'Sua sessão expirou. Saia e entre novamente para continuar.';
    }
    return 'Sua conta ainda não tem acesso de administrador. '
      + 'Confirme que ela foi promovida a admin e que seu e-mail está na allowlist ADMIN_EMAILS, '
      + 'depois recarregue a página.';
  }

  // Anything else (5xx, unexpected) — surface the server message when present.
  const detail = err && typeof err === 'object' && err.message ? ` (${err.message})` : '';
  return `Não foi possível carregar os dados do painel. Tente novamente.${detail}`;
}

export default describeAdminError;
