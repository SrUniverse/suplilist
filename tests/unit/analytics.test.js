/**
 * @fileoverview Testes unitários para o wrapper de Google Analytics 4 (Analytics).
 * Valida a resiliência do singleton na ausência do script gtag, a formatação
 * correta dos parâmetros enviados, a resolução do nome dos suplementos e a
 * interação com a função global de rastreamento.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Analytics } from '../../src/js/utils/analytics.js';
import { supplementRepo } from '../../src/js/features/supplements/supplementRepo.js';

describe('Analytics Utility', () => {
  let originalGtag;

  beforeEach(() => {
    // Preserva e limpa o ambiente global
    originalGtag = global.window ? global.window.gtag : undefined;
    if (global.window) {
      delete global.window.gtag;
    }
    
    // Reseta o estado interno do Singleton de Analytics para permitir reinicializações nos testes
    Analytics._initialized = false;
    Analytics._hasGtag = false;
  });

  afterEach(() => {
    // Restaura o ambiente global
    if (global.window && originalGtag !== undefined) {
      global.window.gtag = originalGtag;
    }
    vi.restoreAllMocks();
  });

  it('deve inicializar com sucesso na ausência de window.gtag (resiliência ativa)', () => {
    const isAvailable = Analytics.init();
    expect(isAvailable).toBe(false);
    expect(Analytics._initialized).toBe(true);
    expect(Analytics._hasGtag).toBe(false);
  });

  it('deve detectar e inicializar com sucesso quando window.gtag está presente', () => {
    global.window.gtag = vi.fn();
    
    const isAvailable = Analytics.init();
    expect(isAvailable).toBe(true);
    expect(Analytics._initialized).toBe(true);
    expect(Analytics._hasGtag).toBe(true);
  });

  it('deve registrar eventos no console local sem estourar erros na ausência de gtag', () => {
    Analytics.init();
    
    // Executa rastreamento sem lançar exceções
    expect(() => Analytics.trackPageView('/list')).not.toThrow();
    expect(() => Analytics.trackEvent('test_event', { key: 'value' })).not.toThrow();
    expect(() => Analytics.trackAffiliateClick('creatina', 'shopee')).not.toThrow();
    expect(() => Analytics.trackCycleCompletion('creatina', 95)).not.toThrow();
    expect(() => Analytics.trackStackCreated(4)).not.toThrow();
    expect(() => Analytics.trackLandingCTA('hero_btn')).not.toThrow();
  });

  it('deve repassar chamadas de trackPageView corretamente para o window.gtag', () => {
    const gtagMock = vi.fn();
    global.window.gtag = gtagMock;
    Analytics.init();

    Analytics.trackPageView('/favorites');

    expect(gtagMock).toHaveBeenCalledWith('event', 'page_view', {
      page_title: '/favorites',
      page_path: '/favorites'
    });
  });

  it('deve repassar eventos genéricos via trackEvent com seus respectivos parâmetros', () => {
    const gtagMock = vi.fn();
    global.window.gtag = gtagMock;
    Analytics.init();

    const mockParams = { score: 100, level: 'high' };
    Analytics.trackEvent('game_finished', mockParams);

    expect(gtagMock).toHaveBeenCalledWith('event', 'game_finished', mockParams);
  });

  it('deve rastrear cliques de afiliados e preencher supplement_name como "Desconhecido" caso não cadastrado no repositório', () => {
    const gtagMock = vi.fn();
    global.window.gtag = gtagMock;
    
    // Simula o repositório retornando nulo
    vi.spyOn(supplementRepo, 'getById').mockReturnValue(null);

    Analytics.init();
    Analytics.trackAffiliateClick('creatina-monohidratada-inexistente', 'amazon');

    expect(gtagMock).toHaveBeenCalledWith('event', 'affiliate_click', expect.objectContaining({
      supplement_id: 'creatina-monohidratada-inexistente',
      supplement_name: 'Desconhecido',
      marketplace: 'amazon',
      timestamp: expect.any(Number)
    }));
  });

  it('deve rastrear cliques de afiliados e resolver o nome do suplemento caso cadastrado no repositório', () => {
    const gtagMock = vi.fn();
    global.window.gtag = gtagMock;
    
    const mockSupplement = {
      id: 'creatina-mono',
      name: 'Creatina Monohidratada Pura',
      category: 'Aminoácidos'
    };
    // Simula o repositório retornando o suplemento estruturado
    vi.spyOn(supplementRepo, 'getById').mockReturnValue(mockSupplement);

    Analytics.init();
    Analytics.trackAffiliateClick('creatina-mono', 'shopee');

    expect(gtagMock).toHaveBeenCalledWith('event', 'affiliate_click', expect.objectContaining({
      supplement_id: 'creatina-mono',
      supplement_name: 'Creatina Monohidratada Pura',
      marketplace: 'shopee',
      timestamp: expect.any(Number)
    }));
  });

  it('deve rastrear conclusão de ciclos resolvendo o nome do suplemento e a porcentagem de adesão', () => {
    const gtagMock = vi.fn();
    global.window.gtag = gtagMock;
    
    const mockSupplement = {
      id: 'omega3',
      name: 'Ômega 3 TG Concentrado',
      category: 'Ácido Graxo'
    };
    vi.spyOn(supplementRepo, 'getById').mockReturnValue(mockSupplement);

    Analytics.init();
    Analytics.trackCycleCompletion('omega3', 88.5);

    expect(gtagMock).toHaveBeenCalledWith('event', 'cycle_completion', expect.objectContaining({
      supplement_id: 'omega3',
      supplement_name: 'Ômega 3 TG Concentrado',
      adherence_percent: 88.5,
      timestamp: expect.any(Number)
    }));
  });

  it('deve rastrear a criação de stacks no protocolo informando a quantidade de itens', () => {
    const gtagMock = vi.fn();
    global.window.gtag = gtagMock;
    Analytics.init();

    Analytics.trackStackCreated(5);

    expect(gtagMock).toHaveBeenCalledWith('event', 'stack_created', expect.objectContaining({
      item_count: 5,
      timestamp: expect.any(Number)
    }));
  });

  it('deve rastrear cliques de CTAs de marketing da Landing Page', () => {
    const gtagMock = vi.fn();
    global.window.gtag = gtagMock;
    Analytics.init();

    Analytics.trackLandingCTA('hero_calculate_dosage');

    expect(gtagMock).toHaveBeenCalledWith('event', 'landing_cta_click', expect.objectContaining({
      cta_type: 'hero_calculate_dosage',
      timestamp: expect.any(Number)
    }));
  });
});
