// ══════════════════════════════════════════════════════════════
// js/theme.js — Gerenciamento de Temas e Modo Escuro (SL-34)
// Responsabilidade: Detecção de preferência do sistema, persistência
//                   da escolha do usuário e aplicação do tema ao DOM.
// ══════════════════════════════════════════════════════════════

import { S, save } from './state.js';
import { announceToScreenReader } from './accessibility.js';

const THEME_KEY = 'suplilist_theme_preference';
let _systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');
let _manualThemeSet = false; // Flag para indicar se o usuário definiu um tema manualmente

/**
 * Aplica o tema especificado ao elemento raiz do documento (body).
 * Persiste a escolha do usuário se for uma ação manual.
 * @param {'light'|'dark'} theme - O tema a ser aplicado.
 * @param {boolean} isManual - Indica se a mudança foi feita pelo usuário (true) ou automática (false).
 */
const VALID_THEMES = new Set(['light','dark','midnight','ocean']);

export function setTheme(theme, isManual = false) {
  if (!VALID_THEMES.has(theme)) {
    console.warn(`[Theme] Tema inválido: ${theme}. Usando 'dark' como fallback.`);
    theme = 'dark';
  }

  document.body.setAttribute('data-theme', theme);
  S.cfg.theme = theme; // Atualiza o estado global

  if (isManual) {
    localStorage.setItem(THEME_KEY, theme);
    _manualThemeSet = true;
    announceToScreenReader(`Tema ${theme} aplicado.`);
  } else if (!_manualThemeSet) {
    // Se não é manual e não há preferência manual, remove do localStorage
    // para que a detecção automática possa funcionar novamente se o sistema mudar.
    localStorage.removeItem(THEME_KEY);
    announceToScreenReader(`Tema ${theme} do sistema aplicado.`);
  }
  save(); // Sempre salva a mudança em S.cfg.theme
}

/**
 * Alterna entre o tema 'light' e 'dark'.
 * Sempre considera esta uma ação manual do usuário.
 */
export function toggleTheme() {
  const currentTheme = S.cfg.theme || 'dark';
  // Se estiver em tema claro, vai para escuro; qualquer escuro/personalizado vai para claro
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme, true);
}

/**
 * Inicializa o sistema de temas:
 * 1. Verifica preferência salva no localStorage.
 * 2. Se não houver, detecta a preferência do sistema operacional.
 * 3. Aplica o tema e configura o listener para mudanças na preferência do sistema.
 */
export function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme) {
    setTheme(savedTheme, true); // Aplica o tema salvo como manual
  } else {
    // Nenhuma preferência salva, usa a do sistema
    const systemTheme = _systemPrefersDark.matches ? 'dark' : 'light';
    setTheme(systemTheme, false); // Aplica o tema do sistema como não manual
  }

  // Monitora mudanças na preferência do sistema operacional
  _systemPrefersDark.addEventListener('change', (e) => {
    // Só atualiza automaticamente se o usuário não tiver definido um tema manualmente
    if (!_manualThemeSet) {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setTheme(newSystemTheme, false);
    }
  });

  // Define a flag _manualThemeSet com base no tema salvo no localStorage
  _manualThemeSet = !!localStorage.getItem(THEME_KEY);
}