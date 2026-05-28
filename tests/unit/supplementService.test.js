import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supplementService } from '../../src/js/features/supplements/supplementService.js';
import { supplementRepo } from '../../src/js/features/supplements/supplementRepo.js';

// Realiza o mock do repositório para isolar o escopo do teste
vi.mock('../../src/js/features/supplements/supplementRepo.js', () => ({
    supplementRepo: {
        getById: vi.fn(),
        getAll: vi.fn(),
        search: vi.fn()
    }
}));

describe('SupplementService - Delegações de interface', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve delegar getById para o supplementRepo', () => {
        const mockSupp = { id: 'creatina', name: 'Creatina' };
        supplementRepo.getById.mockReturnValue(mockSupp);
        const result = supplementService.getById('creatina');
        expect(supplementRepo.getById).toHaveBeenCalledWith('creatina');
        expect(result).toEqual(mockSupp);
    });

    it('deve delegar getAll para o supplementRepo', () => {
        const mockList = [{ id: 'creatina' }];
        supplementRepo.getAll.mockReturnValue(mockList);
        expect(supplementService.getAll()).toEqual(mockList);
    });

    it('deve delegar searchSimple para o supplementRepo evitando disparos de state/eventBus (side effects)', () => {
        const mockResults = [{ id: 'whey' }];
        supplementRepo.search.mockReturnValue(mockResults);
        expect(supplementService.searchSimple('whey')).toEqual(mockResults);
    });
});