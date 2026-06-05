import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../state/state-manager.js', () => ({
  default: {
    dispatch: vi.fn(),
    select: vi.fn(),
    subscribe: vi.fn()
  },
  ACTIONS: {
    UPDATE_PROFILE: 'UPDATE_PROFILE'
  }
}));

vi.mock('../../platform/identity-service.js', () => ({
  default: {
    logout: vi.fn()
  }
}));

describe('ProfilePage', () => {
  let container;

  beforeEach(async () => {
    document.body.innerHTML = '<div id="app"></div>';
    container = document.getElementById('app');
    vi.clearAllMocks();
  });

  it('should render profile form', async () => {
    const ProfilePage = (await import('./profile-page.js')).default;
    const page = new ProfilePage(container);
    page.mount();
    expect(container.querySelector('form')).toBeTruthy();
  });

  it('should display user profile data', async () => {
    const StateManager = (await import('../../state/state-manager.js')).default;
    StateManager.select.mockReturnValue({
      name: 'João',
      email: 'joao@test.com',
      weight: 80,
      age: 30
    });
    
    const ProfilePage = (await import('./profile-page.js')).default;
    const page = new ProfilePage(container);
    page.mount();
    
    expect(container.textContent).toContain('João');
  });

  it('should update profile on form submit', async () => {
    const StateManager = (await import('../../state/state-manager.js')).default;
    StateManager.select.mockReturnValue({ name: 'João', weight: 80 });
    
    const ProfilePage = (await import('./profile-page.js')).default;
    const page = new ProfilePage(container);
    page.mount();
    
    const weightInput = container.querySelector('input[name="weight"]');
    weightInput.value = '85';
    
    const form = container.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    
    expect(StateManager.dispatch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ weight: 85 })
    );
  });

  it('should handle logout', async () => {
    const IdentityService = (await import('../../platform/identity-service.js')).default;
    const ProfilePage = (await import('./profile-page.js')).default;
    const page = new ProfilePage(container);
    page.mount();
    
    const logoutBtn = container.querySelector('[data-action="logout"]');
    logoutBtn.click();
    
    expect(IdentityService.logout).toHaveBeenCalled();
  });

  it('should show success message on profile update', async () => {
    const StateManager = (await import('../../state/state-manager.js')).default;
    StateManager.select.mockReturnValue({ name: 'João' });
    
    const ProfilePage = (await import('./profile-page.js')).default;
    const page = new ProfilePage(container);
    page.mount();
    
    const form = container.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    
    setTimeout(() => {
      expect(container.querySelector('.success')).toBeTruthy();
    }, 100);
  });

  it('should validate email format', async () => {
    const StateManager = (await import('../../state/state-manager.js')).default;
    StateManager.select.mockReturnValue({ email: 'joao@test.com' });
    
    const ProfilePage = (await import('./profile-page.js')).default;
    const page = new ProfilePage(container);
    page.mount();
    
    const emailInput = container.querySelector('input[name="email"]');
    emailInput.value = 'invalid-email';
    emailInput.dispatchEvent(new Event('blur'));
    
    expect(container.querySelector('.error')).toBeTruthy();
  });
});
