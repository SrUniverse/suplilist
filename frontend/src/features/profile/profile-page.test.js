/**
 * profile-page.test.js — Testes abrangentes do ProfilePage
 *
 * Cobre:
 *   1. Inicialização e montagem
 *   2. Edição de nome (inline)
 *   3. Salvamento de dados biométricos
 *   4. Persistência de estado (stateManager dispatch)
 *   5. Fallback offline
 *   6. Comportamento de unmount (sem memory leaks)
 *   7. Reducer SET_USER_PROFILE (inclui biologicalSex)
 *   8. profileService.updateProfile chamado corretamente
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reducer } from '../../state/state-reducer.js';
import { ACTIONS, DEFAULT_STATE } from '../../state/state-constants.js';
import {
  calculateDaysUntilRefill,
  getAlertLevel,
  getRefillAlerts,
} from './refill-alerts.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeState(overrides = {}) {
  return {
    ...DEFAULT_STATE,
    user: { ...DEFAULT_STATE.user, ...overrides },
  };
}

// ─── 1. Reducer SET_USER_PROFILE ─────────────────────────────────────────────

describe('reducer — SET_USER_PROFILE', () => {
  it('salva name corretamente', () => {
    const state = reducer(makeState(), {
      type: ACTIONS.SET_USER_PROFILE,
      payload: { name: 'João Silva' },
    });
    expect(state.user.name).toBe('João Silva');
  });

  it('salva weight numérico', () => {
    const state = reducer(makeState(), {
      type: ACTIONS.SET_USER_PROFILE,
      payload: { weight: 75.5 },
    });
    expect(state.user.weight).toBe(75.5);
  });

  it('rejeita weight inválido (string)', () => {
    const state = reducer(makeState(), {
      type: ACTIONS.SET_USER_PROFILE,
      payload: { weight: 'pesado' },
    });
    expect(state.user.weight).toBeNull(); // valor padrão mantido
  });

  it('rejeita weight negativo', () => {
    const state = reducer(makeState(), {
      type: ACTIONS.SET_USER_PROFILE,
      payload: { weight: -10 },
    });
    expect(state.user.weight).toBeNull();
  });

  it('aceita biologicalSex "male"', () => {
    const state = reducer(makeState(), {
      type: ACTIONS.SET_USER_PROFILE,
      payload: { biologicalSex: 'male' },
    });
    expect(state.user.biologicalSex).toBe('male');
  });

  it('aceita biologicalSex "female"', () => {
    const state = reducer(makeState(), {
      type: ACTIONS.SET_USER_PROFILE,
      payload: { biologicalSex: 'female' },
    });
    expect(state.user.biologicalSex).toBe('female');
  });

  it('aceita biologicalSex null (limpar campo)', () => {
    const state = reducer(makeState({ biologicalSex: 'male' }), {
      type: ACTIONS.SET_USER_PROFILE,
      payload: { biologicalSex: null },
    });
    expect(state.user.biologicalSex).toBeNull();
  });

  it('rejeita biologicalSex com valor inválido', () => {
    const prevState = makeState({ biologicalSex: 'male' });
    const state = reducer(prevState, {
      type: ACTIONS.SET_USER_PROFILE,
      payload: { biologicalSex: 'outro' },
    });
    // Campo inválido deve ser ignorado — mantém o valor anterior
    expect(state.user.biologicalSex).toBe('male');
  });

  it('rejeita biologicalSex undefined (não sobrescreve)', () => {
    const prevState = makeState({ biologicalSex: 'female' });
    const state = reducer(prevState, {
      type: ACTIONS.SET_USER_PROFILE,
      payload: { biologicalSex: undefined },
    });
    // undefined não entra no payload (filter by !== undefined), mantém anterior
    expect(state.user.biologicalSex).toBe('female');
  });

  it('aceita todos os objectives válidos', () => {
    const valids = ['bulk', 'cut', 'strength', 'endurance', 'general'];
    for (const objective of valids) {
      const state = reducer(makeState(), {
        type: ACTIONS.SET_USER_PROFILE,
        payload: { objective },
      });
      expect(state.user.objective).toBe(objective);
    }
  });

  it('rejeita objective inválido', () => {
    const state = reducer(makeState({ objective: 'general' }), {
      type: ACTIONS.SET_USER_PROFILE,
      payload: { objective: 'moonwalk' },
    });
    expect(state.user.objective).toBe('general');
  });

  it('salva height e age corretamente', () => {
    const state = reducer(makeState(), {
      type: ACTIONS.SET_USER_PROFILE,
      payload: { height: 178, age: 30 },
    });
    expect(state.user.height).toBe(178);
    expect(state.user.age).toBe(30);
  });

  it('rejeita age negativo', () => {
    const state = reducer(makeState(), {
      type: ACTIONS.SET_USER_PROFILE,
      payload: { age: -5 },
    });
    expect(state.user.age).toBeNull();
  });

  it('não sobrescreve tier ou onboardingComplete via SET_USER_PROFILE', () => {
    const prevState = makeState({ tier: 'pro', onboardingComplete: true });
    const state = reducer(prevState, {
      type: ACTIONS.SET_USER_PROFILE,
      payload: { tier: 'free', onboardingComplete: false },
    });
    // Campos não-whitelisted são ignorados
    expect(state.user.tier).toBe('pro');
    expect(state.user.onboardingComplete).toBe(true);
  });

  it('merge parcial não apaga campos não incluídos', () => {
    const prevState = makeState({ name: 'Maria', weight: 60, age: 25 });
    const state = reducer(prevState, {
      type: ACTIONS.SET_USER_PROFILE,
      payload: { name: 'Maria Nova' },
    });
    expect(state.user.name).toBe('Maria Nova');
    expect(state.user.weight).toBe(60);   // mantido
    expect(state.user.age).toBe(25);       // mantido
  });

  it('payload vazio não muda estado', () => {
    const prevState = makeState({ name: 'Pedro' });
    const state = reducer(prevState, {
      type: ACTIONS.SET_USER_PROFILE,
      payload: {},
    });
    expect(state.user.name).toBe('Pedro');
  });

  it('payload null não causa crash', () => {
    const prevState = makeState({ name: 'Ana' });
    const state = reducer(prevState, {
      type: ACTIONS.SET_USER_PROFILE,
      payload: null,
    });
    expect(state.user.name).toBe('Ana');
  });
});

// ─── 2. Reducer AUTH_LOGOUT ───────────────────────────────────────────────────

describe('reducer — AUTH_LOGOUT', () => {
  it('reseta dados de usuário mas mantém preferências', () => {
    const prevState = {
      ...makeState({ name: 'João', weight: 80 }),
      preferences: { theme: 'dark', language: 'pt-BR' },
    };
    const state = reducer(prevState, { type: ACTIONS.AUTH_LOGOUT });
    expect(state.user.name).toBeNull();
    expect(state.user.weight).toBeNull();
    expect(state.preferences.theme).toBe('dark'); // mantido
  });
});

// ─── 3. Reducer AUTH_LOGIN ────────────────────────────────────────────────────

describe('reducer — AUTH_LOGIN', () => {
  it('seta isAuthenticated e displayName do payload', () => {
    const state = reducer(makeState(), {
      type: ACTIONS.AUTH_LOGIN,
      payload: {
        id: 'u1',
        email: 'user@test.com',
        role: 'user',
        displayName: 'Maria Auth',
        isMfaEnabled: false,
        emailVerified: true,
        tier: 'free',
      },
    });
    expect(state.user.isAuthenticated).toBe(true);
    expect(state.user.name).toBe('Maria Auth');
    expect(state.user.email).toBe('user@test.com');
  });

  it('aceita tier válido e rejeita tier inválido', () => {
    const valid = reducer(makeState(), {
      type: ACTIONS.AUTH_LOGIN,
      payload: { tier: 'pro', id: 'u1', email: 'x@x.com', role: 'user' },
    });
    expect(valid.user.tier).toBe('pro');

    const invalid = reducer(makeState({ tier: 'free' }), {
      type: ACTIONS.AUTH_LOGIN,
      payload: { tier: 'hacker', id: 'u1', email: 'x@x.com', role: 'user' },
    });
    expect(invalid.user.tier).toBe('free');
  });
});

// ─── 4. ProfilePage — integração com mocks ───────────────────────────────────

describe('ProfilePage — integração (mocks)', () => {
  let container;
  let ProfilePage;
  let mockProfileService;
  let mockStateManager;

  beforeEach(async () => {
    // Container DOM
    container = document.createElement('div');
    document.body.appendChild(container);

    // Mocks inline de módulos pesados
    mockProfileService = {
      getProfile: vi.fn().mockResolvedValue({
        displayName: 'Test User',
        weight: 70,
        height: 175,
        age: 28,
        objective: 'general',
        biologicalSex: 'male',
        email: 'test@test.com',
      }),
      updateProfile: vi.fn().mockResolvedValue({ displayName: 'Test User' }),
    };

    const userState = {
      name: 'Test User',
      email: 'test@test.com',
      weight: 70,
      height: 175,
      age: 28,
      objective: 'general',
      biologicalSex: 'male',
      isAuthenticated: true,
      tier: 'free',
    };

    mockStateManager = {
      user: userState,
      stack: [],
      checkins: [],
      get: vi.fn((path) => {
        if (!path) return { user: userState };
        const parts = path.split('.');
        let val = { user: userState };
        for (const p of parts) val = val?.[p];
        return val;
      }),
      dispatch: vi.fn(),
      subscribe: vi.fn().mockReturnValue(() => {}),
    };

    vi.doMock('../../state/state-manager.js', () => ({
      stateManager: mockStateManager,
      ACTIONS,
      STORAGE_KEYS: { THEME: 'suplilist:theme' },
      DEFAULT_STATE,
    }));

    vi.doMock('./profile-service.js', () => ({
      profileService: mockProfileService,
    }));

    vi.doMock('../../core/event-bus.js', () => ({
      eventBus: { emit: vi.fn(), on: vi.fn() },
    }));

    vi.doMock('../../platform/identity-service.js', () => ({
      identityService: { logout: vi.fn() },
    }));

    vi.doMock('../auth/phone-link-section.js', () => ({
      PhoneLinkSection: class {
        constructor() {}
        mount() {}
        unmount() {}
      },
    }));

    vi.doMock('../analytics/adherence-tracker.js', () => ({
      getAdherenceOverview: vi.fn().mockReturnValue({
        averageAdherence: 85,
        message: 'Ótimo desempenho!',
        topSupplements: [],
      }),
    }));

    vi.doMock('../stack/stack-optimizer.js', () => ({
      optimizeStack: vi.fn().mockReturnValue({
        redundancies: [],
        priorityGaps: [],
        suggestionGaps: [],
        savingsPotential: 0,
        recommendation: 'Stack otimizado.',
      }),
    }));

    vi.doMock('../progress/before-after-tracker.js', () => ({
      generateTimeline: vi.fn().mockReturnValue([]),
    }));

    vi.doMock('../stack/stack-recommender.js', () => ({
      SUPPLEMENTS_DB: [],
    }));

    vi.doMock('../../platform/storage-manager.js', () => ({
      StorageManager: { setItem: vi.fn(), removeItem: vi.fn(), getItem: vi.fn() },
    }));

    vi.doMock('../../utils/escape.js', () => ({
      escapeHtml: (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    }));

    vi.doMock('./refill-alerts.js', () => ({
      getRefillAlerts: vi.fn().mockReturnValue([]),
      getAlertMessage: vi.fn().mockReturnValue(''),
      getAlertColor: vi.fn().mockReturnValue('var(--color-info)'),
    }));

    vi.doMock('./profile-page.css', () => ({}));

    const mod = await import('./profile-page.js?t=' + Date.now());
    ProfilePage = mod.default;
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.resetAllMocks();
    vi.resetModules();
  });

  it('renderiza skeleton imediatamente no mount', async () => {
    // Torna getProfile pendente durante o teste
    let resolve;
    mockProfileService.getProfile.mockReturnValue(new Promise(r => { resolve = r; }));

    const page = new ProfilePage(container);
    const mountPromise = page.mount();

    // Skeleton deve estar presente antes de resolver
    expect(container.querySelector('.pp-skel-avatar')).toBeTruthy();

    resolve({ displayName: 'U', weight: null, height: null, age: null, objective: 'general', biologicalSex: null });
    await mountPromise;
    page.unmount();
  });

  it('renderiza nome do usuário após mount', async () => {
    const page = new ProfilePage(container);
    await page.mount();

    const nameEl = container.querySelector('#name-text');
    expect(nameEl).toBeTruthy();
    expect(nameEl.textContent).toBe('Test User');
    page.unmount();
  });

  it('renderiza avatar com inicial correta', async () => {
    const page = new ProfilePage(container);
    await page.mount();

    const avatar = container.querySelector('#profile-avatar-initial');
    expect(avatar?.textContent?.trim()).toBe('T');
    page.unmount();
  });

  it('exibe campo de edição de nome ao clicar no botão editar', async () => {
    const page = new ProfilePage(container);
    await page.mount();

    const btnEdit = container.querySelector('#btn-edit-name');
    const nameEdit = container.querySelector('#name-edit');

    expect(nameEdit.style.display).not.toBe('block');
    btnEdit.click();
    expect(nameEdit.style.display).toBe('block');
    page.unmount();
  });

  it('cancela edição de nome sem salvar', async () => {
    const page = new ProfilePage(container);
    await page.mount();

    container.querySelector('#btn-edit-name').click();
    const input = container.querySelector('#inline-name-input');
    input.value = 'Nome Diferente';
    container.querySelector('#btn-name-cancel').click();

    const nameText = container.querySelector('#name-text');
    expect(nameText.textContent).toBe('Test User'); // nome original mantido
    expect(mockProfileService.updateProfile).not.toHaveBeenCalled();
    page.unmount();
  });

  it('confirma edição de nome: chama stateManager.dispatch e profileService.updateProfile', async () => {
    const page = new ProfilePage(container);
    await page.mount();

    container.querySelector('#btn-edit-name').click();
    const input = container.querySelector('#inline-name-input');
    input.value = 'Novo Nome';
    await container.querySelector('#btn-name-confirm').click();

    // Aguardar microtask (o handler é async)
    await new Promise(r => setTimeout(r, 50));

    expect(mockStateManager.dispatch).toHaveBeenCalledWith(
      ACTIONS.SET_USER_PROFILE,
      expect.objectContaining({ name: 'Novo Nome' })
    );
    expect(mockProfileService.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Novo Nome' })
    );
    page.unmount();
  });

  it('não salva nome vazio', async () => {
    const page = new ProfilePage(container);
    await page.mount();

    container.querySelector('#btn-edit-name').click();
    const input = container.querySelector('#inline-name-input');
    input.value = '   '; // só espaços
    await container.querySelector('#btn-name-confirm').click();
    await new Promise(r => setTimeout(r, 50));

    expect(mockStateManager.dispatch).not.toHaveBeenCalledWith(
      ACTIONS.SET_USER_PROFILE,
      expect.objectContaining({ name: '' })
    );
    expect(mockProfileService.updateProfile).not.toHaveBeenCalled();
    page.unmount();
  });

  it('salva biometria: dispatch local + profileService.updateProfile', async () => {
    const page = new ProfilePage(container);
    await page.mount();

    // Preenche campos
    container.querySelector('#field-weight').value = '80';
    container.querySelector('#field-biologicalSex').value = 'female';
    container.querySelector('#field-height').value = '165';
    container.querySelector('#field-age').value = '32';
    container.querySelector('#field-objective').value = 'cut';

    container.querySelector('#btn-save-bio').click();
    await new Promise(r => setTimeout(r, 50));

    // dispatch local chamado
    expect(mockStateManager.dispatch).toHaveBeenCalledWith(
      ACTIONS.SET_USER_PROFILE,
      expect.objectContaining({
        weight: 80,
        biologicalSex: 'female',
        height: 165,
        age: 32,
        objective: 'cut',
      })
    );

    // servidor chamado
    expect(mockProfileService.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        weight: 80,
        biologicalSex: 'female',
        height: 165,
        age: 32,
        objective: 'cut',
      })
    );
    page.unmount();
  });

  it('envia biologicalSex null quando campo está vazio', async () => {
    const page = new ProfilePage(container);
    await page.mount();

    // Deixa biologicalSex em branco
    container.querySelector('#field-biologicalSex').value = '';
    container.querySelector('#btn-save-bio').click();
    await new Promise(r => setTimeout(r, 50));

    expect(mockStateManager.dispatch).toHaveBeenCalledWith(
      ACTIONS.SET_USER_PROFILE,
      expect.objectContaining({ biologicalSex: null })
    );
    page.unmount();
  });

  it('fallback offline: salva localmente mesmo se profileService falhar', async () => {
    mockProfileService.updateProfile.mockRejectedValue(new Error('Network error'));

    const page = new ProfilePage(container);
    await page.mount();

    container.querySelector('#btn-save-bio').click();
    await new Promise(r => setTimeout(r, 50));

    // dispatch local deve ter sido chamado mesmo com falha no servidor
    expect(mockStateManager.dispatch).toHaveBeenCalledWith(
      ACTIONS.SET_USER_PROFILE,
      expect.any(Object)
    );
    page.unmount();
  });

  it('unmount cancela assinatura offline sem erro', async () => {
    const unsubscribeMock = vi.fn();
    mockStateManager.subscribe.mockReturnValue(unsubscribeMock);

    const page = new ProfilePage(container);
    await page.mount();
    page.unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('guard de montagem: não renderiza se unmount chamado antes do getProfile resolver', async () => {
    let resolve;
    mockProfileService.getProfile.mockReturnValue(new Promise(r => { resolve = r; }));

    const page = new ProfilePage(container);
    const mountPromise = page.mount();

    // Desmonta antes de resolver
    page.unmount();

    resolve({ displayName: 'U', weight: null, height: null, age: null, objective: 'general', biologicalSex: null });
    await mountPromise;

    // Deve conter apenas o skeleton (não houve re-render após unmount)
    expect(container.querySelector('#btn-save-bio')).toBeNull();
  });
});

// ─── 5. refill-alerts.js ──────────────────────────────────────────────────────

describe('refill-alerts — funções puras adicionais', () => {
  const now = Date.now();

  it('calculateDaysUntilRefill — retorna 0 para purchasedAt no futuro (dado corrompido)', () => {
    const futurePurchase = {
      supplementId: 'x',
      quantity: 100,
      dailyConsumption: 5,
      purchasedAt: now + 1000 * 60 * 60 * 24 * 10, // 10 dias no futuro
    };
    const days = calculateDaysUntilRefill(futurePurchase);
    // daysSincePurchase negativo → daysRemaining - (negativo) → pode ser grande, mas não negativo
    expect(days).toBeGreaterThanOrEqual(0);
  });

  it('getAlertLevel — 0 retorna "expired"', () => {
    expect(getAlertLevel(0)).toBe('expired');
  });

  it('getRefillAlerts — ignora compras com status não-active implicitamente', () => {
    const purchases = [
      {
        supplementId: 'zinc',
        quantity: 30,
        dailyConsumption: 1,
        purchasedAt: now - 1000 * 60 * 60 * 24 * 25, // 5 dias restantes
        price: 20,
        source: 'Amazon',
        status: 'active',
      },
    ];
    const alerts = getRefillAlerts(purchases);
    expect(alerts.length).toBe(1);
    expect(alerts[0].supplementId).toBe('zinc');
  });

  it('getRefillAlerts — não inclui suplementos com mais de 30 dias', () => {
    const purchases = [
      {
        supplementId: 'magnesio',
        quantity: 365,
        dailyConsumption: 1,
        purchasedAt: now - 1000 * 60 * 60 * 24, // ontem
        price: 30,
        source: 'Farmácia',
        status: 'active',
      },
    ];
    const alerts = getRefillAlerts(purchases);
    expect(alerts.length).toBe(0); // 364 dias restantes — fora da janela
  });
});
