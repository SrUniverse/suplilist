import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../state/state-manager.js', () => ({
  default: {
    dispatch: vi.fn(),
    select: vi.fn()
  },
  ACTIONS: {
    UPDATE_PROFILE: 'UPDATE_PROFILE'
  }
}));

vi.mock('../../core/router.js', () => ({
  default: {
    navigate: vi.fn()
  }
}));

describe('OnboardingPage', () => {
  let container;

  beforeEach(async () => {
    document.body.innerHTML = '<div id="app"></div>';
    container = document.getElementById('app');
    vi.clearAllMocks();
  });

  it('should render onboarding form', async () => {
    const OnboardingPage = (await import('./onboarding-page.js')).default;
    const page = new OnboardingPage(container);
    page.mount();
    expect(container.querySelector('form')).toBeTruthy();
  });

  it('should display multi-step form', async () => {
    const OnboardingPage = (await import('./onboarding-page.js')).default;
    const page = new OnboardingPage(container);
    page.mount();
    expect(container.querySelectorAll('[data-step]').length).toBeGreaterThan(1);
  });

  it('should progress through steps', async () => {
    const OnboardingPage = (await import('./onboarding-page.js')).default;
    const page = new OnboardingPage(container);
    page.mount();
    const nextBtn = container.querySelector('[data-action="next"]');
    nextBtn.click();
    expect(container.querySelector('[data-step="2"]')).toBeTruthy();
  });

  it('should collect user profile data', async () => {
    const StateManager = (await import('../../state/state-manager.js')).default;
    const OnboardingPage = (await import('./onboarding-page.js')).default;
    const page = new OnboardingPage(container);
    page.mount();
    
    const nameInput = container.querySelector('input[name="name"]');
    nameInput.value = 'João Silva';
    nameInput.dispatchEvent(new Event('change'));
    
    const form = container.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    
    expect(StateManager.dispatch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ name: 'João Silva' })
    );
  });

  it('should validate required fields', async () => {
    const OnboardingPage = (await import('./onboarding-page.js')).default;
    const page = new OnboardingPage(container);
    page.mount();
    
    const form = container.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    
    expect(container.querySelector('.error')).toBeTruthy();
  });

  it('should navigate to dashboard on completion', async () => {
    const Router = (await import('../../core/router.js')).default;
    const OnboardingPage = (await import('./onboarding-page.js')).default;
    const page = new OnboardingPage(container);
    page.mount();
    
    const inputs = container.querySelectorAll('input[required]');
    inputs.forEach(input => {
      input.value = 'test';
      input.dispatchEvent(new Event('change'));
    });
    
    const form = container.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    
    setTimeout(() => {
      expect(Router.navigate).toHaveBeenCalledWith('/dashboard');
    }, 100);
  });
});
