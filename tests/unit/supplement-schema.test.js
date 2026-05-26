import { describe, it, expect } from 'vitest';
import { SupplementSchema } from '../../src/js/types/supplement.schema.js';

describe('SupplementSchema', () => {
  const getValidSupplement = () => ({
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
    interactions: [],
    contraindications: []
  });

  it('Deve validar com sucesso um suplemento perfeitamente estruturado', () => {
    const valid = getValidSupplement();
    const result = SupplementSchema.validate(valid);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.data).toBeDefined();
  });

  it('Deve rejeitar identificadores (slugs) com espaços', () => {
    const invalid = getValidSupplement();
    invalid.id = 'slug invalido com espaço';
    
    const result = SupplementSchema.validate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(err => err.includes('id'))).toBe(true);
  });

  it('Deve rejeitar categorias que não fazem parte do enum homologado', () => {
    const invalid = getValidSupplement();
    invalid.category = 'Categoria Invalida';
    
    const result = SupplementSchema.validate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(err => err.includes('category'))).toBe(true);
  });

  it('Deve normalizar os dados aplicando trim() em strings textuais', () => {
    const item = getValidSupplement();
    item.name = '  Creatina Monohidratada  ';
    item.mechanism = '   Mecanismo de ação celular focado em fornecer ATP.   ';
    
    const result = SupplementSchema.validate(item);
    expect(result.isValid).toBe(true);
    expect(result.data.name).toBe('Creatina Monohidratada');
    expect(result.data.mechanism).toBe('Mecanismo de ação celular focado em fornecer ATP.');
  });

  it('Deve exigir que pelo menos 1 marketplace com preço esteja definido em prices', () => {
    const invalid = getValidSupplement();
    invalid.prices = {}; // Objeto vazio de preços
    
    const result = SupplementSchema.validate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(err => err.includes('prices'))).toBe(true);
  });

  it('Deve rejeitar preços de marketplaces com valores negativos ou zerados', () => {
    const invalid = getValidSupplement();
    invalid.prices = { shopee: -10 }; // Preço negativo
    
    const result = SupplementSchema.validate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(err => err.includes('prices.shopee'))).toBe(true);
  });
});
