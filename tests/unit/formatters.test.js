import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatDose,
  formatDate,
  truncate,
  capitalize
} from '../../src/js/utils/formatters.js';

describe('Formatters', () => {
  it('formatPrice() deve formatar valores decimais para a moeda brasileira (BRL)', () => {
    // Note: \xa0 é o non-breaking space comumente gerado por Intl no pt-BR
    const formatted = formatPrice(49.90);
    expect(formatted.replace(/\u00a0/g, ' ')).toBe('R$ 49,90');
    
    // Tratamento de falhas
    expect(formatPrice('não é numero')).toBe('R$ 0,00');
  });

  it('formatDose() deve formatar e juntar dose com sua respectiva unidade física', () => {
    expect(formatDose(5, 'g')).toBe('5g');
    expect(formatDose(500, 'mg')).toBe('500mg');
    expect(formatDose(150, ' mcg')).toBe('150mcg');
  });

  it('formatDate() deve converter datas de padrão ISO/data no formato brasileiro (DD/MM/YYYY)', () => {
    expect(formatDate('2026-05-23')).toBe('23/05/2026');
    
    const dateObj = new Date('2026-05-23T00:00:00');
    expect(formatDate(dateObj)).toBe('23/05/2026');
    
    // Falhas
    expect(formatDate('data-invalida')).toBe('');
  });

  it('truncate() deve cortar textos que extrapolam o limite e concatenar reticências (...)', () => {
    expect(truncate('texto longo', 5)).toBe('texto...');
    expect(truncate('curto', 10)).toBe('curto');
  });

  it('capitalize() deve transformar a primeira letra de uma string em maiúscula e o resto em minúscula', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('WORLD')).toBe('World');
    expect(capitalize('tEsTe')).toBe('Teste');
    expect(capitalize('')).toBe('');
  });
});
