import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stateManager } from '../../src/js/core/state-manager.js';
import { STORAGE_KEY } from '../../src/js/utils/constants.js';
import { eventBus } from '../../src/js/core/eventbus.js';

describe('StateManager', () => {
  beforeEach(() => {
    localStorage.clear();
    // Força reinicialização do estado limpando e re-instanciando a partir do localStorage limpo
    stateManager.importState({
      supplements: {},
      favorites: [],
      inventory: {},
      settings: {
        theme: 'dark',
        sortBy: 'cost',
        units: 'metric',
        notificationsEnabled: true
      },
      lastQuery: null
    });
  });

  it('getState() deve retornar um deep clone (não uma referência ao objeto original)', () => {
    const favorites = stateManager.getState('favorites');
    expect(favorites).toEqual([]);
    
    // Modifica o clone e garante que o estado do StateManager não mudou
    favorites.push('creatina-mono');
    expect(stateManager.getState('favorites')).toEqual([]);
  });

  it('setState() deve persistir as alterações no localStorage', () => {
    stateManager.setState('favorites', ['creatina-mono']);
    
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.favorites).toEqual(['creatina-mono']);
  });

  it("setState() deve emitir o evento 'state:changed' no eventBus", () => {
    const handler = vi.fn();
    eventBus.on('state:changed', handler);
    
    stateManager.setState('settings.theme', 'light');
    
    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].path).toBe('settings.theme');
    expect(handler.mock.calls[0][0].value).toBe('light');
  });

  it('setState() com path ou valores inválidos deve lançar Error', () => {
    // Caminho vazio ou nulo
    expect(() => {
      stateManager.setState('', 'val');
    }).toThrow();

    // Valor inválido violando o schema (ex: settings.theme deve ser 'light' ou 'dark' no schema)
    expect(() => {
      stateManager.setState('settings.theme', 'invalido-tema');
    }).toThrow();
  });

  it('observe() deve notificar os ouvintes ao alterar caminhos específicos', () => {
    const callback = vi.fn();
    stateManager.observe('settings.theme', callback);
    
    stateManager.setState('settings.theme', 'light');
    
    expect(callback).toHaveBeenCalledWith('light');
  });

  it('importState() deve substituir todo o estado global por outro estado válido', () => {
    const newState = {
      supplements: {},
      favorites: ['creatina-mono', 'whey-protein'],
      inventory: { 'creatina-mono': { qty: 200, purchaseDate: '2026-05-23' } },
      settings: {
        theme: 'light',
        sortBy: 'evidence',
        units: 'metric',
        notificationsEnabled: false
      },
      lastQuery: null
    };
    
    stateManager.importState(newState);
    
    expect(stateManager.getState('settings.theme')).toBe('light');
    expect(stateManager.getState('favorites')).toEqual(['creatina-mono', 'whey-protein']);
  });

  it('Deve inicializar com fallback de segurança se o localStorage estiver corrompido', () => {
    localStorage.setItem(STORAGE_KEY, '{invalid-json: corrupted}');
    
    // Força reinicialização do estado
    const validatedState = stateManager._initializeState();
    
    // Deve retornar o estado default/fallback seguro
    expect(validatedState).toBeDefined();
    expect(validatedState.settings.theme).toBe('dark');
    expect(validatedState.favorites).toEqual([]);
  });
});
