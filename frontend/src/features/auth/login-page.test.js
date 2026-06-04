import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../platform/identity-service.js', () => ({
  identityService: {
    login: vi.fn(),
  },
}));

vi.mock('../../core/event-bus.js', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
  EVENTS: { ROUTER_NAVIGATE: 'router:navigate' },
}));

vi.mock('../../utils/escape.js', () => ({
  escapeHtml: (s) => String(s ?? ''),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeContainer() {
  const dom = new JSDOM('<!DOCTYPE html><div id="app"></div>');
  return dom.window.document.getElementById('app');
}

async function mountPage(container) {
  const { default: LoginPage } = await import('./login-page.js');
  const page = new LoginPage(container);
  page.mount();
  return page;
}

function submitForm(container, email = 'user@example.com', password = 'secret') {
  container.querySelector('[name="email"]').value = email;
  container.querySelector('[name="password"]').value = password;
  const form = container.querySelector('.login-form');
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

// ── Testes ───────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  let container;

  beforeEach(() => {
    container = makeContainer();
    vi.clearAllMocks();
  });

  // ── Renderização ────────────────────────────────────────────────────────────

  describe('Renderização', () => {
    it('renderiza o título da tela', async () => {
      await mountPage(container);
      expect(container.innerHTML).toContain('Entrar no SupliList');
    });

    it('renderiza campos de email e senha', async () => {
      await mountPage(container);
      expect(container.querySelector('[name="email"]')).not.toBeNull();
      expect(container.querySelector('[name="password"]')).not.toBeNull();
    });

    it('botão de submit começa habilitado', async () => {
      await mountPage(container);
      const btn = container.querySelector('#login-submit');
      expect(btn.disabled).toBe(false);
    });

    it('não renderiza mensagem de erro na inicialização', async () => {
      await mountPage(container);
      expect(container.querySelector('.onboarding-error')).toBeNull();
    });

    it('renderiza link "Criar conta"', async () => {
      await mountPage(container);
      expect(container.querySelector('#login-create-account')).not.toBeNull();
    });
  });

  // ── Submit ──────────────────────────────────────────────────────────────────

  describe('Submit — credenciais', () => {
    it('chama identityService.login com email e senha corretos', async () => {
      const { identityService } = await import('../../platform/identity-service.js');
      identityService.login.mockResolvedValue({});

      const _page = await mountPage(container);
      submitForm(container, 'test@example.com', 'mysecret');
      await Promise.resolve();

      expect(identityService.login).toHaveBeenCalledWith('test@example.com', 'mysecret');
    });

    it('faz trim no email antes de enviar', async () => {
      const { identityService } = await import('../../platform/identity-service.js');
      identityService.login.mockResolvedValue({});

      await mountPage(container);
      submitForm(container, '  padded@example.com  ', 'pass');
      await Promise.resolve();

      expect(identityService.login).toHaveBeenCalledWith('padded@example.com', 'pass');
    });
  });

  // ── Sucesso ─────────────────────────────────────────────────────────────────

  describe('Submit — sucesso', () => {
    it('navega para /home após login bem-sucedido', async () => {
      const { identityService } = await import('../../platform/identity-service.js');
      const { eventBus } = await import('../../core/event-bus.js');
      identityService.login.mockResolvedValue({});

      await mountPage(container);
      submitForm(container);
      await new Promise(r => setTimeout(r, 0));

      expect(eventBus.emit).toHaveBeenCalledWith('router:navigate', { path: '/home' });
    });

    it('não exibe erro após login bem-sucedido', async () => {
      const { identityService } = await import('../../platform/identity-service.js');
      identityService.login.mockResolvedValue({});

      await mountPage(container);
      submitForm(container);
      await new Promise(r => setTimeout(r, 0));

      expect(container.querySelector('.onboarding-error')).toBeNull();
    });
  });

  // ── Falha ───────────────────────────────────────────────────────────────────

  describe('Submit — falha', () => {
    it('exibe mensagem de erro quando login falha', async () => {
      const { identityService } = await import('../../platform/identity-service.js');
      identityService.login.mockRejectedValue(new Error('Credenciais inválidas.'));

      await mountPage(container);
      submitForm(container);
      await new Promise(r => setTimeout(r, 0));

      expect(container.querySelector('.onboarding-error').textContent).toBe('Credenciais inválidas.');
    });

    it('usa mensagem padrão quando o erro não tem message', async () => {
      const { identityService } = await import('../../platform/identity-service.js');
      identityService.login.mockRejectedValue({});

      await mountPage(container);
      submitForm(container);
      await new Promise(r => setTimeout(r, 0));

      expect(container.querySelector('.onboarding-error').textContent)
        .toBe('Falha ao conectar. Tente novamente.');
    });

    it('reabilita o botão de submit após falha', async () => {
      const { identityService } = await import('../../platform/identity-service.js');
      identityService.login.mockRejectedValue(new Error('Erro.'));

      await mountPage(container);
      submitForm(container);
      await new Promise(r => setTimeout(r, 0));

      const btn = container.querySelector('#login-submit');
      expect(btn.disabled).toBe(false);
      expect(btn.textContent).toBe('Entrar');
    });

    it('limpa o erro quando o usuário começa a digitar no email', async () => {
      const { identityService } = await import('../../platform/identity-service.js');
      identityService.login.mockRejectedValue(new Error('Erro.'));

      await mountPage(container);
      submitForm(container);
      await new Promise(r => setTimeout(r, 0));

      expect(container.querySelector('.onboarding-error')).not.toBeNull();
      container.querySelector('[name="email"]').dispatchEvent(new Event('input'));
      expect(container.querySelector('.onboarding-error')).toBeNull();
    });

    it('limpa o erro quando o usuário começa a digitar na senha', async () => {
      const { identityService } = await import('../../platform/identity-service.js');
      identityService.login.mockRejectedValue(new Error('Erro.'));

      await mountPage(container);
      submitForm(container);
      await new Promise(r => setTimeout(r, 0));

      expect(container.querySelector('.onboarding-error')).not.toBeNull();
      container.querySelector('[name="password"]').dispatchEvent(new Event('input'));
      expect(container.querySelector('.onboarding-error')).toBeNull();
    });
  });

  // ── Navegação ───────────────────────────────────────────────────────────────

  describe('Navegação', () => {
    it('"Criar conta" emite navegação para /onboarding', async () => {
      const { eventBus } = await import('../../core/event-bus.js');

      await mountPage(container);
      container.querySelector('#login-create-account').click();

      expect(eventBus.emit).toHaveBeenCalledWith('router:navigate', { path: '/onboarding' });
    });
  });

  // ── Guard de desmontagem ────────────────────────────────────────────────────

  describe('Guard de desmontagem (_isMounted)', () => {
    it('não muta o DOM após desmontagem (erro capturado pós-navigate)', async () => {
      const { identityService } = await import('../../platform/identity-service.js');

      // Simula: login falha DEPOIS que o componente já foi desmontado
      // (ex: router navegou no meio do voo por outra razão)
      let resolveReject;
      identityService.login.mockReturnValue(
        new Promise((_, reject) => { resolveReject = reject; })
      );

      const page = await mountPage(container);
      submitForm(container);

      // Desmonta antes do request terminar
      page.unmount();

      // Dispara o erro
      resolveReject(new Error('Erro pós-desmontagem'));
      await new Promise(r => setTimeout(r, 0));

      // Container deve estar limpo (unmount limpou) e não deve ter sido reescrito
      expect(container.innerHTML).toBe('');
    });

    it('unmount limpa errorMessage e isLoading para re-mount limpo', async () => {
      const { identityService } = await import('../../platform/identity-service.js');
      identityService.login.mockRejectedValue(new Error('Erro.'));

      const page = await mountPage(container);
      submitForm(container);
      await new Promise(r => setTimeout(r, 0));

      expect(page._errorMessage).not.toBeNull();
      expect(page._isLoading).toBe(false); // voltou para false após erro

      page.unmount();

      expect(page._errorMessage).toBeNull();
      expect(page._isMounted).toBe(false);
    });
  });
});
