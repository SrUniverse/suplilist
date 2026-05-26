/**
 * @fileoverview Wrapper de Google Analytics 4 (GA4) para o SupliList v3.0.
 * Centraliza e simplifica o envio de eventos de telemetria, pageviews, cliques em
 * links de afiliados, conclusões de ciclo de suplementação e funil de conversão.
 * Altamente resiliente a falhas de rede ou ausência de scripts de rastreamento (bloqueadores).
 * 
 * @author SupliList Team
 * @version 3.0.0
 */

import { logger } from './logger.js';
import { supplementRepo } from '../features/supplements/supplementRepo.js';

export class Analytics {
  /**
   * Flag que indica se a inicialização foi executada.
   * @private
   * @type {boolean}
   */
  static _initialized = false;

  /**
   * Flag que indica se a função global gtag do Google Analytics está acessível.
   * @private
   * @type {boolean}
   */
  static _hasGtag = false;

  /**
   * Inicializa o wrapper de Analytics validando se a função global gtag está presente no escopo.
   * Tolerante a falhas (ex: ad-blockers ou ambiente de testes automatizados).
   * @returns {boolean} True se o gtag está disponível.
   */
  static init() {
    this._hasGtag = typeof window !== 'undefined' && typeof window.gtag === 'function';
    this._initialized = true;

    if (this._hasGtag) {
      logger.info('📊 Analytics: Google Analytics 4 (gtag) carregado e integrado com sucesso.');
    } else {
      logger.warn('📊 Analytics: gtag não detectado. Os eventos de telemetria serão registrados apenas no console local em modo de desenvolvimento.');
    }

    return this._hasGtag;
  }

  /**
   * Rastreia uma visualização de página (pageview) de forma customizada no SPA.
   * @param {string} pageName - Caminho ou nome lógico da rota (ex: '/list' ou '/favorites').
   * @returns {void}
   */
  static trackPageView(pageName) {
    if (!this._initialized) this.init();

    logger.info(`📊 [PageView] Navegou para: ${pageName}`);

    if (this._hasGtag) {
      window.gtag('event', 'page_view', {
        page_title: pageName,
        page_path: pageName
      });
    }
  }

  /**
   * Wrapper genérico e flexível para envio de eventos personalizados para o GA4.
   * @param {string} eventName - Nome canônico do evento no GA4.
   * @param {Record<string, any>} params - Dicionário de parâmetros de metadados do evento.
   * @returns {void}
   */
  static trackEvent(eventName, params = {}) {
    if (!this._initialized) this.init();

    logger.info(`📊 [Event] ${eventName} ->`, params);

    if (this._hasGtag) {
      window.gtag('event', eventName, params);
    }
  }

  /**
   * Rastreia a conversão de cliques em links afiliados de marketplaces (funil principal).
   * Resolve síncronamente o nome do suplemento via repositório para enriquecer a telemetria.
   * @param {string} supplementId - O slug/id canônico do suplemento (ex: 'creatina-mono').
   * @param {string} marketplace - Nome do marketplace de redirecionamento (ex: 'shopee', 'amazon', 'mercadolivre').
   * @returns {void}
   */
  static trackAffiliateClick(supplementId, marketplace) {
    if (!this._initialized) this.init();

    let supplementName = 'Desconhecido';
    try {
      const supp = supplementRepo.getById(supplementId);
      if (supp) {
        supplementName = supp.name;
      }
    } catch (err) {
      logger.warn(`Analytics: Falha ao recuperar metadados de suplemento "${supplementId}":`, err.message);
    }

    const params = {
      supplement_id: supplementId,
      supplement_name: supplementName,
      marketplace: marketplace,
      timestamp: Date.now()
    };

    this.trackEvent('affiliate_click', params);
  }

  /**
   * Rastreia a conclusão bem-sucedida de um ciclo de suplementação com a métrica de adesão do usuário.
   * @param {string} supplementId - O slug/id canônico do suplemento.
   * @param {number} adherencePercent - A porcentagem de adesão calculada (0 a 100).
   * @returns {void}
   */
  static trackCycleCompletion(supplementId, adherencePercent) {
    if (!this._initialized) this.init();

    let supplementName = 'Desconhecido';
    try {
      const supp = supplementRepo.getById(supplementId);
      if (supp) {
        supplementName = supp.name;
      }
    } catch (err) {
      logger.warn(`Analytics: Falha ao recuperar metadados de suplemento "${supplementId}":`, err.message);
    }

    const params = {
      supplement_id: supplementId,
      supplement_name: supplementName,
      adherence_percent: adherencePercent,
      timestamp: Date.now()
    };

    this.trackEvent('cycle_completion', params);
  }

  /**
   * Rastreia o momento em que o usuário configura ou cria uma nova stack no Meu Protocolo.
   * @param {number} itemCount - Número de suplementos ativos adicionados na stack.
   * @returns {void}
   */
  static trackStackCreated(itemCount) {
    if (!this._initialized) this.init();

    const params = {
      item_count: itemCount,
      timestamp: Date.now()
    };

    this.trackEvent('stack_created', params);
  }

  /**
   * Rastreia a conversão e cliques nos botões de CTA da Landing Page.
   * @param {string} ctaType - O identificador ou texto do botão clicado (ex: 'hero_build_stack', 'bottom_dosage').
   * @returns {void}
   */
  static trackLandingCTA(ctaType) {
    if (!this._initialized) this.init();

    const params = {
      cta_type: ctaType,
      timestamp: Date.now()
    };

    this.trackEvent('landing_cta_click', params);
  }
}
