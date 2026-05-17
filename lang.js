/**
 * js/lang.js — Centralização de Strings e Internacionalização (i18n)
 * Facilita a manutenção e tradução futura da interface.
 */

export const I18N = {
  pt: {
    // Navegação
    "NAV_HOME": "Início",
    "NAV_LIST": "Lista",
    
    // Mensagens de Status
    "STATUS_SAVING": "Salvando no dispositivo...",
    "STATUS_SAVED": "Salvo no Dispositivo às",
    
    // Feedbacks
    "SUCCESS_COPIED": "Copiado com sucesso! ✅",
    "ERROR_SAVE_FULL": "Erro ao salvar — armazenamento cheio",
    "CONFIRM_RESET": "Resetar checklist?",
    "EMPTY_WISH": "Favoritos vazios",
    "CONFIRM_LANG": "Mudar idioma para Inglês? A página será recarregada.",
    
    // Categorias (Display)
    "CAT_ADAPTOGENO": "Adaptógeno",
    "CAT_AMINOACIDO": "Aminoácido",
    "CAT_HORMONIO": "Hormônio",
    
    // Metas (Display)
    "GOAL_HIPERTROFIA": "💪 Hipertrofia",
    "GOAL_SAUDE": "❤️ Saúde Geral",
    "GOAL_ENERGIA": "⚡ Energia & Foco"
  },
  en: {
    // Navigation
    "NAV_HOME": "Home",
    "NAV_LIST": "List",
    
    // Status Messages
    "STATUS_SAVING": "Saving to device...",
    "STATUS_SAVED": "Saved to Device at",
    
    // Feedbacks
    "SUCCESS_COPIED": "Copied successfully! ✅",
    "ERROR_SAVE_FULL": "Error saving — storage full",
    "CONFIRM_RESET": "Reset checklist?",
    "EMPTY_WISH": "Wishlist empty",
    "CONFIRM_LANG": "Change language to Portuguese? The page will reload.",

    // Categories (Display)
    "CAT_ADAPTOGENO": "Adaptogen",
    "CAT_AMINOACIDO": "Amino Acid",
    "CAT_HORMONIO": "Hormone",

    // Goals (Display)
    "GOAL_HIPERTROFIA": "💪 Hypertrophy",
    "GOAL_SAUDE": "❤️ General Health",
    "GOAL_ENERGIA": "⚡ Energy & Focus"
  }
};

export const t = (key) => {
  const lang = (window.S && window.S.lang) || 'pt';
  return I18N[lang]?.[key] || I18N['pt']?.[key] || key;
};