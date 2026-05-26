import { describe, it, expect, beforeEach } from 'vitest';
import { favoritesRepo } from '../../src/js/features/favorites/favoritesRepo.js';
import { stateManager } from '../../src/js/core/state-manager.js';

describe('FavoritesRepository', () => {
  beforeEach(() => {
    localStorage.clear();
    
    // Injeta estado inicial completo e válido, incluindo o mapa de suplementos cadastrados
    stateManager.importState({
      supplements: {
        'creatina-mono': {
          id: 'creatina-mono',
          name: 'Creatina Monohidratada',
          category: 'Aminoácido',
          evidenceLevel: 'A',
          mechanism: 'Mecanismo de ação celular focado em fornecer ATP.',
          defaultDose: 5,
          unit: 'g',
          goals: ['Hipertrofia'],
          prices: { shopee: 50, mercadolivre: 54, amazon: 59 },
          costPerDose: 0.83,
          image: 'assets/creatina.png',
          interactions: []
        },
        'whey-protein': {
          id: 'whey-protein',
          name: 'Whey Protein Isolado',
          category: 'Aminoácido',
          evidenceLevel: 'A',
          mechanism: 'Síntese proteica muscular e recuperação rápida.',
          defaultDose: 30,
          unit: 'g',
          goals: ['Hipertrofia'],
          prices: { shopee: 90, mercadolivre: 97, amazon: 106 },
          costPerDose: 2.73,
          image: 'assets/whey.png',
          interactions: []
        }
      },
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

  it('add() deve aumentar a lista de favoritos no estado global', () => {
    expect(stateManager.getState('favorites').length).toBe(0);
    
    favoritesRepo.add('creatina-mono');
    
    expect(stateManager.getState('favorites')).toEqual(['creatina-mono']);
  });

  it('add() deve ser idempotente (não deve duplicar se o item já estiver favoritado)', () => {
    favoritesRepo.add('creatina-mono');
    favoritesRepo.add('creatina-mono');
    
    expect(stateManager.getState('favorites')).toEqual(['creatina-mono']);
  });

  it('remove() deve diminuir a lista de favoritos', () => {
    favoritesRepo.add('creatina-mono');
    favoritesRepo.add('whey-protein');
    expect(stateManager.getState('favorites').length).toBe(2);

    favoritesRepo.remove('creatina-mono');
    
    expect(stateManager.getState('favorites')).toEqual(['whey-protein']);
  });

  it('toggle() deve alternar o status e retornar o novo status booleano correto', () => {
    // 1. Estado inicial é não-favoritado. toggling deve favoritar e retornar true.
    const status1 = favoritesRepo.toggle('creatina-mono');
    expect(status1).toBe(true);
    expect(favoritesRepo.isFavorite('creatina-mono')).toBe(true);

    // 2. Estado ativo é favoritado. toggling deve desfavoritar e retornar false.
    const status2 = favoritesRepo.toggle('creatina-mono');
    expect(status2).toBe(false);
    expect(favoritesRepo.isFavorite('creatina-mono')).toBe(false);
  });

  it('isFavorite() deve retornar a resposta booleana correta', () => {
    expect(favoritesRepo.isFavorite('creatina-mono')).toBe(false);
    
    favoritesRepo.add('creatina-mono');
    
    expect(favoritesRepo.isFavorite('creatina-mono')).toBe(true);
  });

  it('export() deve retornar uma string JSON válida com os favoritos serializados', () => {
    favoritesRepo.add('creatina-mono');
    
    const exportStr = favoritesRepo.export();
    expect(typeof exportStr).toBe('string');
    
    const parsed = JSON.parse(exportStr);
    expect(parsed.version).toBe('2.0');
    expect(parsed.favorites).toEqual(['creatina-mono']);
  });

  it('import() deve processar e adicionar favoritos corretamente, pulando IDs inválidos', () => {
    const importPayload = JSON.stringify({
      version: '2.0',
      favorites: ['creatina-mono', 'slug-inexistente', 12345]
    });
    
    const result = favoritesRepo.import(importPayload);
    
    // Deve ter importado creatina-mono e ignorado os outros dois
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(2);
    expect(stateManager.getState('favorites')).toEqual(['creatina-mono']);
  });
});
