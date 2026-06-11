/**
 * error-handler.js — Centralizado error handling e user feedback
 *
 * Responsabilidades:
 * 1. Converter ApiError em mensagens user-friendly em português
 * 2. Logar erros com contexto para debugging
 * 3. Emitir eventos no eventBus para que componentes reajam
 * 4. Nunca expor erros técnicos ao usuário
 *
 * @module platform/error-handler
 */

import { ApiError } from './api-client.js';
import { eventBus, EVENTS } from '../core/event-bus.js';
import { logger } from '../utils/logger.js';
import { toastService } from './toast-service.js';

/**
 * Mapeia status HTTP e error codes para mensagens user-friendly em português
 * @type {Record<number, Record<string, string>>}
 */
const ERROR_MESSAGE_MAP = {
  0: {
    network_error: 'Sem conexão. Verifique sua internet.',
    timeout: 'Requisição expirou. Tente novamente.',
  },
  400: {
    validation_error: 'Dados inválidos. Verifique o formulário.',
    invalid_request: 'Requisição inválida.',
  },
  401: {
    unauthorized: 'Faça login novamente.',
    expired_token: 'Sessão expirada. Faça login novamente.',
    missing_token: 'Autenticação necessária.',
    invalid_credentials: 'Email ou senha incorretos.',
  },
  403: {
    forbidden: 'Você não tem permissão para fazer isso.',
    permission_denied: 'Acesso negado.',
    csrf_protection_triggered: 'Requisição bloqueada por segurança. Recarregue a página.',
  },
  404: {
    not_found: 'Recurso não encontrado.',
  },
  409: {
    conflict: 'Conflito de dados. Recarregue a página.',
    duplicate: 'Este item já existe.',
  },
  412: {
    precondition_failed: 'Dados foram alterados por outro usuário. Recarregue.',
  },
  429: {
    rate_limit: 'Muitas requisições. Aguarde alguns segundos.',
    too_many_attempts: 'Muitas tentativas. Tente novamente em alguns minutos.',
  },
  500: {
    internal_error: 'Erro no servidor. Tente novamente.',
    database_error: 'Erro ao acessar dados. Tente novamente.',
  },
  503: {
    service_unavailable: 'Serviço indisponível. Tente novamente em alguns minutos.',
  },
};

/**
 * Obter mensagem user-friendly para um erro
 * @param {ApiError | Error | any} error
 * @returns {string}
 */
export function getUserFriendlyMessage(error) {
  if (error instanceof ApiError) {
    const messages = ERROR_MESSAGE_MAP[error.status];
    if (messages && messages[error.error]) {
      return messages[error.error];
    }
  }

  // Firebase Auth Error Handling
  if (error && error.code && error.code.startsWith('auth/')) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'E-mail ou senha incorretos.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está em uso.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Escolha uma senha mais forte.';
      case 'auth/invalid-email':
        return 'Formato de e-mail inválido.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas fracassadas. Tente novamente mais tarde.';
      case 'auth/network-request-failed':
        return 'Erro de conexão. Verifique sua internet.';
      default:
        return 'Ocorreu um erro na autenticação. Tente novamente.';
    }
  }

  // Fallback genérico
  if (error instanceof Error) {
    return error.message.includes('network')
      ? 'Erro de conexão. Verifique sua internet.'
      : 'Algo deu errado. Tente novamente.';
  }

  return 'Um erro desconhecido ocorreu.';
}

/**
 * Tratar um erro: logar, emitir evento, mostrar feedback ao usuário
 * @param {Error | ApiError} error
 * @param {string} [context] - Contexto onde o erro ocorreu (ex: 'login', 'profile-update')
 * @param {object} [options] - Opções de tratamento
 * @param {boolean} [options.silent=false] - Se true, não mostra toast ao usuário
 * @param {boolean} [options.logServer=true] - Se true, loga no servidor (prod only)
 */
export function handleError(error, context = 'unknown', options = {}) {
  const ctx = context ?? 'unknown';
  const { silent = false, logServer = true } = options;

  // 1. Log estruturado
  const errorLog = {
    type: error instanceof ApiError ? 'API_ERROR' : 'CLIENT_ERROR',
    context: ctx,
    message: error.message,
    status: error instanceof ApiError ? error.status : undefined,
    code: error instanceof ApiError ? error.error : undefined,
    stack: error.stack,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  };

  logger.error(`[ErrorHandler] ${ctx}:`, errorLog);

  // 2. Log para servidor em produção
  if (logServer && import.meta.env.PROD) {
    try {
      fetch(
        `${import.meta.env.VITE_API_BASE_URL || ''}/api/logs/errors`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SupliList-Client': '1'
          },
          body: JSON.stringify(errorLog),
          keepalive: true
        }
      ).catch(() => {});
    } catch (_e) {
      // Silent fail for logging errors
    }
  }

  // 3. Emitir evento para componentes reagirem (ex: auth expiry)
  if (error instanceof ApiError) {
    if (error.status === 401) {
      // Session expired — trigger logout and redirect to login
      eventBus.emit(EVENTS.AUTH_EXPIRED, { reason: error.error });
      // Show warning message before auto-logout
      if (!silent) {
        toastService.error('Sessão expirada. Redirecionando para login...');
      }
      // Auto-logout after 2 seconds to allow user to read the message
      setTimeout(() => {
        // Emit AUTH_LOGOUT to trigger full logout flow
        eventBus.emit(EVENTS.AUTH_LOGOUT);
      }, 2000);
      return error;
    } else if (error.status === 403) {
      eventBus.emit(EVENTS.PERMISSION_DENIED, { context });
    } else if (error.status === 429) {
      eventBus.emit(EVENTS.RATE_LIMIT, { context });
    }
  }

  // 4. Mostrar feedback ao usuário
  if (!silent && (!(error instanceof ApiError) || error.status !== 401)) {
    const userMessage = getUserFriendlyMessage(error);
    toastService.error(userMessage);
  }

  return error;
}

/**
 * Validar resposta da API e lançar erro se necessário
 * Útil para endpoints que podem retornar 200 mas com sucesso=false
 * @param {any} responseData
 * @param {number} status
 * @throws {ApiError}
 */
export function validateApiResponse(responseData, status = 200) {
  if (responseData?.success === false) {
    throw new ApiError(
      status,
      responseData.error || 'api_error',
      responseData.message || responseData.error || 'Erro desconhecido'
    );
  }
  return responseData;
}

/**
 * Wrapper para async operations com error handling automático
 * @param {() => Promise<T>} operation
 * @param {string} context
 * @param {object} options
 * @returns {Promise<T | null>}
 */
export async function tryOperation(operation, context, options = {}) {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context, options);
    return null;
  }
}

export const errorHandler = Object.freeze({
  handleError,
  validateApiResponse,
  tryOperation,
  getUserFriendlyMessage,
});
