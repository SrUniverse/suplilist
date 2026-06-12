/**
 * Auth Guard - Middleware de Roteamento
 * Centraliza a checagem de estado do usuário antes de qualquer renderização.
 */

export const authGuard = {
  // Rotas que não exigem login.
  // O SupliList é local-first ("100% offline, sem assinatura"): o app inteiro
  // funciona anonimamente sobre o IndexedDB; a conta apenas adiciona sync na
  // nuvem. Por isso as features core são públicas — só /profile e /admin (que
  // dependem de identidade) ficam protegidas.
  publicRoutes: [
    '/login', '/register', '/forgot-password', '/verify-otp', '/reset-password',
    '/', '/home',
    '/list', '/lista',   // catálogo
    '/my-stack',         // stack local-first
    '/checkin',          // check-in de adesão (local)
    '/history',          // histórico (local)
    '/favorites',        // favoritos (local)
    '/dosage',           // calculadora de dose (local)
    '/settings',         // preferências e dados locais (export/reset)
    '/faq', '/legal',    // conteúdo informativo
    '/onboarding',       // fluxo de entrada
    '/phone-login',      // login por SMS
    // Retorno do Stripe Hosted Checkout — a sessão é restaurada de forma
    // assíncrona no boot; bloquear aqui perderia a página de confirmação.
    '/subscription/success', '/subscription/cancel',
  ],

  // Rotas que exigem role === 'admin' (além de estar logado e verificado)
  adminRoutes: [
    '/admin', '/admin/products', '/admin/orders',
  ],

  /**
   * Checa o acesso à rota atual com base no usuário logado
   * @param {string} currentPath Rota atual (ex: '/dashboard')
   * @param {Object|null} user O objeto user (com emailVerified, role, etc) ou null
   * @returns {boolean} true se o acesso for permitido, false se interceptado
   */
  checkAccess(currentPath, user) {
    const isAuth = user?.isAuthenticated;

    // 1. Usuário não logado tentando acessar rota protegida → login
    if (!isAuth && !this.publicRoutes.includes(currentPath)) {
      window.history.replaceState(null, null, '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return false;
    }

    // 2. Usuário logado não deve ficar preso nas telas de autenticação → app.
    //    A verificação de e-mail é feita pelo link de verificação do Firebase
    //    (enviado no cadastro) e NÃO é um bloqueio rígido. O gate antigo
    //    redirecionava para uma página de OTP não-funcional (endpoints de
    //    backend inexistentes, código de 6 dígitos que o Firebase nunca envia),
    //    trancando todas as contas novas para fora do app — voltando ao /login
    //    sem qualquer feedback. Removido para que cadastro e login funcionem.
    if (isAuth && (currentPath === '/login' || currentPath === '/register' || currentPath === '/verify-otp')) {
      window.history.replaceState(null, null, '/home');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return false;
    }

    // 3. Rotas admin: exigem role === 'admin' — não-admin recebe redirecionamento ao login
    if (this.adminRoutes.includes(currentPath) && user?.role !== 'admin') {
      window.history.replaceState(null, null, '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return false;
    }

    return true;
  }
};
