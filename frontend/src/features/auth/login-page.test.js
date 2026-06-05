import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/identity-service.js', () => ({
  default: {
    login: vi.fn(),
    isAuthenticated: vi.fn()
  }
}));

vi.mock('../../core/router.js', () => ({
  default: {
    navigate: vi.fn()
  }
}));

describe('LoginPage', () => {
  let container;

  beforeEach(async () => {
    document.body.innerHTML = '<div id="app"></div>';
    container = document.getElementById('app');
    vi.clearAllMocks();
  });

  it('should render login form', async () => {
    const LoginPage = (await import('./login-page.js')).default;
    const page = new LoginPage(container);
    page.mount();
    expect(container.querySelector('form')).toBeTruthy();
  });

  it('should validate email format', async () => {
    const LoginPage = (await import('./login-page.js')).default;
    const page = new LoginPage(container);
    page.mount();
    const emailInput = container.querySelector('input[type="email"]');
    emailInput.value = 'invalid-email';
    emailInput.dispatchEvent(new Event('blur'));
    expect(container.querySelector('.error')).toBeTruthy();
  });

  it('should call identity service on form submit', async () => {
    const IdentityService = (await import('../../platform/identity-service.js')).default;
    const LoginPage = (await import('./login-page.js')).default;
    const page = new LoginPage(container);
    page.mount();
    const form = container.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    expect(IdentityService.login).toHaveBeenCalled();
  });

  it('should navigate on successful login', async () => {
    const Router = (await import('../../core/router.js')).default;
    const IdentityService = (await import('../../platform/identity-service.js')).default;
    IdentityService.login.mockResolvedValue({ token: 'jwt' });
    
    const LoginPage = (await import('./login-page.js')).default;
    const page = new LoginPage(container);
    page.mount();
    const form = container.querySelector('form');
    await new Promise(r => {
      form.addEventListener('submit', () => setTimeout(r, 100));
      form.dispatchEvent(new Event('submit'));
    });
    expect(Router.navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('should display error on failed login', async () => {
    const IdentityService = (await import('../../platform/identity-service.js')).default;
    IdentityService.login.mockRejectedValue(new Error('Invalid credentials'));
    
    const LoginPage = (await import('./login-page.js')).default;
    const page = new LoginPage(container);
    page.mount();
    const form = container.querySelector('form');
    await new Promise(r => {
      form.addEventListener('submit', () => setTimeout(r, 100));
      form.dispatchEvent(new Event('submit'));
    });
    expect(container.querySelector('.error')).toBeTruthy();
  });
});
