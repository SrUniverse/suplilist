import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListFilterController } from '../../src/js/components/list-filter-controller.js';
import { supplementRepo } from '../../src/js/features/supplements/supplementRepo.js';

vi.mock('../../src/js/features/supplements/supplementRepo.js', () => ({
    supplementRepo: {
        getAll: vi.fn(),
        filter: vi.fn(),
        sort: vi.fn()
    }
}));

describe('ListFilterController', () => {
    const mockSupplements = [
        { id: '1', name: 'Creatina', category: 'Aminoácido', goals: ['Hipertrofia', 'Desempenho'], costPerDose: 1.5 },
        { id: '2', name: 'Vitamina D', category: 'Saúde Geral', goals: ['Imunidade', 'Saúde Geral'], costPerDose: 0.5 },
        { id: '3', name: 'Whey', category: 'Desempenho', goals: ['Hipertrofia'], costPerDose: 3.0 }
    ];

    beforeEach(() => {
        supplementRepo.getAll.mockReturnValue(mockSupplements);
        supplementRepo.sort.mockImplementation((list) => list);
        supplementRepo.filter.mockImplementation((filters, list) => list.filter(item => item.id === '3')); // mock isolado para teste
    });

    it('deve retornar todos os itens inicialmente se não há filtros ativados', () => {
        const controller = new ListFilterController();
        const results = controller.getFilteredList();
        expect(results).toHaveLength(3);
    });

    it('deve realizar busca textual usando o mecanismo Fuse interno', () => {
        const controller = new ListFilterController();
        controller.initSearchEngine();
        controller.setSearchQuery('Crea');
        const results = controller.getFilteredList();
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Creatina');
    });

    it('deve filtrar corretamente os dados por aba de categoria', () => {
        const controller = new ListFilterController();
        controller.setCategory('Aminoácido');
        const results = controller.getFilteredList();
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('1');
    });

    it('deve repassar delegação de filtros avançados ao repositório nativo', () => {
        const controller = new ListFilterController();
        controller.setPanelFilters({ categories: ['Desempenho'] });
        const results = controller.getFilteredList();
        expect(supplementRepo.filter).toHaveBeenCalled();
        expect(results[0].id).toBe('3');
    });
});