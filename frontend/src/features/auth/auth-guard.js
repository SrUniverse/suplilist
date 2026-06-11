/**
 * Auth Guard - Middleware de Roteamento
 * Centraliza a checagem de estado do usuário antes de qualquer renderização.
 */

export const authGuard = {
  // Rotas que não exigem login
  publicRoutes: [
    '/login', '/register', '/forgot-password', '/verify-otp', '/reset-password',
    '/', '/home',
    '/list', '/lista',   // catálogo — acessível sem conta
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
    const isVerified = user?.emailVerified;

    // 1. Caso o usuário não esteja logado
    if (!isAuth && !this.publicRoutes.includes(currentPath)) {
      window.history.replaceState(null, null, '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return false;
    }

    // 2. Caso o usuário esteja logado, mas o e-mail não foi verificado
    if (isAuth && !isVerified && currentPath !== '/verify-otp') {
      window.history.replaceState(null, null, '/verify-otp');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return false;
    }

    // 3. Caso o usuário já esteja verificado e tente acessar a tela de OTP ou Login
    if (isAuth && isVerified && (currentPath === '/login' || currentPath === '/verify-otp' || currentPath === '/register')) {
      window.history.replaceState(null, null, '/my-stack'); // 'my-stack' is the dashboard in this app
      window.dispatchEvent(new PopStateEvent('popstate'));
      return false;
    }

    // 4. Rotas admin: exigem role === 'admin' — não-admin recebe redirecionamento ao login
    if (this.adminRoutes.includes(currentPath) && user?.role !== 'admin') {
      window.history.replaceState(null, null, '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return false;
    }

    return true;
  }
};
