import Fuse from 'fuse.js';
import { supplementRepo } from '../features/supplements/supplementRepo.js';

export class ListFilterController {
    constructor() {
        this.searchQuery = '';
        this.selectedCategory = 'Todos';
        this.activeSort = 'cost';
        this.activePanelFilters = {
            categories: [],
            evidenceLevel: [],
            goals: [],
            maxCostPerDose: 0
        };
        this.fuse = null;
    }

    initSearchEngine() {
        const list = supplementRepo.getAll();
        this.fuse = new Fuse(list, {
            keys: [
                { name: 'name', weight: 0.6 },
                { name: 'aliases', weight: 0.4 }
            ],
            threshold: 0.3,
            includeScore: true
        });
    }

    setSearchQuery(query) {
        this.searchQuery = query;
    }

    setCategory(category) {
        this.selectedCategory = category;
    }

    setSort(sort) {
        this.activeSort = sort;
    }

    setPanelFilters(filters) {
        this.activePanelFilters = { ...this.activePanelFilters, ...filters };
    }

    getFilteredList() {
        let list = supplementRepo.getAll();

        if (this.searchQuery && this.searchQuery.trim().length > 0 && this.fuse) {
            list = this.fuse.search(this.searchQuery).map(res => res.item);
        }

        if (this.selectedCategory && this.selectedCategory !== 'Todos') {
            if (this.selectedCategory === 'Saúde Geral') {
                list = list.filter(item => item.goals && item.goals.includes('Saúde Geral'));
            } else {
                list = list.filter(item => item.category === this.selectedCategory);
            }
        }

        const apf = this.activePanelFilters;
        if (
            apf.categories.length > 0 ||
            apf.evidenceLevel.length > 0 ||
            apf.goals.length > 0 ||
            apf.maxCostPerDose > 0
        ) {
            list = supplementRepo.filter({
                categories: apf.categories,
                evidenceLevel: apf.evidenceLevel,
                goals: apf.goals,
                maxCostPerDose: apf.maxCostPerDose
            }, list);
        }

        return supplementRepo.sort(list, this.activeSort);
    }
}