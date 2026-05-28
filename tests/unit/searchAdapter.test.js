import { describe, it, expect } from 'vitest';
import { searchSupplements } from '../../src/js/data/searchAdapter.js';

describe('searchAdapter', () => {
    const mockData = [
        { id: 'creatina', name: 'Creatina Monohidratada', category: 'Performance', mechanism: 'Regeneração rápida de ATP' },
        { id: 'ashwagandha', name: 'Ashwagandha KSM-66', category: 'Adaptógeno', mechanism: 'Reduz cortisol e fadiga' },
        { id: 'whey', name: 'Whey Protein Isolado', category: 'Performance', mechanism: 'Síntese proteica muscular' }
    ];

    it('deve retornar todos os itens se a query for vazia', () => {
        const results = searchSupplements('', mockData);
        expect(results).toHaveLength(mockData.length);
    });

    it('deve priorizar o nome exato do suplemento', () => {
        const results = searchSupplements('Creatina', mockData);
        expect(results[0].id).toBe('creatina');
    });

    it('deve tolerar erros de digitação (fuzzy matching)', () => {
        const results = searchSupplements('Criatina', mockData);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].id).toBe('creatina');
    });

    it('deve buscar corretamente pela categoria', () => {
        const results = searchSupplements('Adaptógeno', mockData);
        expect(results[0].id).toBe('ashwagandha');
    });

    it('deve buscar corretamente pelo mecanismo de ação com pesos menores', () => {
        const results = searchSupplements('cortisol', mockData);
        expect(results[0].id).toBe('ashwagandha');
    });
});