/**
 * 🌍 INTERNACIONALIZAÇÃO v4.0 — SupliList
 * 
 * Expõe a função canônica t(key, params) consumida por toda a UI.
 * Suporta interpolação dinâmica de parâmetros (ex: {param}).
 */

const DICTIONARY = {
  // Português (padrão)
  'pt-BR': {
    'app.title': 'SupliList',
    'app.tagline': 'O sistema operacional da sua suplementação',
    'nav.home': 'Início',
    'nav.list': 'Catálogo',
    'nav.stack': 'Meu Stack',
    'nav.calculator': 'Calculadora',
    'nav.history': 'Histórico',
    
    'home.welcome': 'Bem-vindo ao SupliList',
    'home.streak': 'Streak de {days} dias',
    'home.streak_record': 'Recorde: {record} dias',
    'home.checkin_progress': 'Progresso do dia: {completed} de {total}',
    'home.checkin_complete': 'Todos os suplementos tomados! 🎉',
    'home.confirm_all': 'Confirmar Todos',
    'home.adherence': 'Adesão',
    'home.monthly_investment': 'Investimento Mensal',
    'home.empty_stack': 'Seu armário está vazio.',
    'home.explore': 'Explorar Catálogo',
    
    'list.search_placeholder': 'Buscar suplementos (ex: Creatina)...',
    'list.filter_objective': 'Objetivo',
    'list.filter_evidence': 'Evidência',
    'list.filter_category': 'Categoria',
    'list.clear_filters': 'Limpar Filtros',
    'list.no_results': 'Nenhum suplemento encontrado.',
    'list.stats_showing': 'Mostrando {count} de {total} suplementos',
    
    'detail.evidence_grade': 'Grau de Evidência: {grade}',
    'detail.cost_per_dose': 'Custo por Dose: {cost}',
    'detail.daily_dosage': 'Dosagem Diária Recomendada: {dose} {unit}',
    'detail.add_stack': 'Adicionar ao Stack',
    'detail.remove_stack': 'Remover do Stack',
    'detail.benefits': 'Benefícios',
    'detail.warnings': 'Avisos',
    'detail.scientific_evidence': 'Evidência Científica',
    
    'common.success': 'Sucesso',
    'common.error': 'Erro',
    'common.loading': 'Carregando...',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar'
  },
  
  // English fallback
  'en': {
    'app.title': 'SupliList',
    'app.tagline': 'The operating system of your supplementation',
    'nav.home': 'Home',
    'nav.list': 'Catalog',
    'nav.stack': 'My Stack',
    'nav.calculator': 'Calculator',
    'nav.history': 'History',
    
    'home.welcome': 'Welcome to SupliList',
    'home.streak': '{days}-day streak',
    'home.streak_record': 'Record: {record} days',
    'home.checkin_progress': 'Today\'s progress: {completed} of {total}',
    'home.checkin_complete': 'All supplements taken! 🎉',
    'home.confirm_all': 'Confirm All',
    'home.adherence': 'Adherence',
    'home.monthly_investment': 'Monthly Investment',
    'home.empty_stack': 'Your cabinet is empty.',
    'home.explore': 'Explore Catalog',
    
    'list.search_placeholder': 'Search supplements (e.g. Creatine)...',
    'list.filter_objective': 'Goal',
    'list.filter_evidence': 'Evidence',
    'list.filter_category': 'Category',
    'list.clear_filters': 'Clear Filters',
    'list.no_results': 'No supplements found.',
    'list.stats_showing': 'Showing {count} of {total} supplements',
    
    'detail.evidence_grade': 'Evidence Grade: {grade}',
    'detail.cost_per_dose': 'Cost per Dose: {cost}',
    'detail.daily_dosage': 'Recommended Daily Dose: {dose} {unit}',
    'detail.add_stack': 'Add to Stack',
    'detail.remove_stack': 'Remove from Stack',
    'detail.benefits': 'Benefits',
    'detail.warnings': 'Warnings',
    'detail.scientific_evidence': 'Scientific Evidence',
    
    'common.success': 'Success',
    'common.error': 'Error',
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel'
  }
};

/**
 * Traduz uma chave com parâmetros de interpolação.
 * @param {string} key - Chave de tradução (ex: 'home.streak')
 * @param {Record<string, any>} params - Parâmetros para substituição
 * @returns {string} Texto traduzido
 */
export function t(key, params = {}) {
  // Detecta o idioma preferido do usuário a partir do localStorage ou navegador
  let lang = 'pt-BR';
  try {
    const stateStr = localStorage.getItem('suplilist-state-v4');
    if (stateStr) {
      const state = JSON.parse(stateStr);
      lang = state.preferences?.language || lang;
    } else {
      lang = navigator.language || lang;
    }
  } catch (e) {
    // Ignore error, fallback to default
  }

  // Normaliza o idioma para os dicionários suportados
  let dict = DICTIONARY[lang];
  if (!dict) {
    const baseLang = lang.split('-')[0];
    dict = DICTIONARY[baseLang] || DICTIONARY['pt-BR'];
  }

  // Busca a tradução correspondente
  let translation = dict[key] || DICTIONARY['pt-BR'][key] || DICTIONARY['en'][key] || key;

  // Interpolação de parâmetros (substitui {param} pelo valor real)
  Object.keys(params).forEach(param => {
    translation = translation.replace(new RegExp(`{${param}}`, 'g'), params[param]);
  });

  return translation;
}
