// ══════════════════════════════════════════════════════════════
// js/main.js — Ponto de Entrada Principal (Application Bootstrap)
// Responsabilidade: Inicializar o ecossistema, carregar o estado,
//                   inicializar acessibilidade,
//                   registrar renderizadores e expor a interface global.
//
// [SL-08] Este é o único módulo autorizado a importar e mutar S.
//         dose.js e recipe.js recebem S por injeção de dependência.
// ══════════════════════════════════════════════════════════════

import { S, load, save, syncNow, STORAGE_KEY } from './state.js';
import { initAccessibility, announceToScreenReader } from './accessibility.js';
import { translatePage } from './i18n.js';
import { go, registerRenderer, invalidateTab, invalidateTabs } from './router.js';
import { setupEvents, initHomeVisuals } from './events.js';

// Importação dos renderizadores de cada aba/módulo
import {
  renderAll, renderList, renderStats, renderChips, renderToggs,
} from './list.js';

import {
  renderStack, renderCycles,
  addStack, addToStack, removeFromStack,
  addCustomCyc, removeCustomCyc,
  toggleCycDetail, startCyc, pauseCyc, stopCyc, resumeCyc, resetCyc,
  saveCycNote, initStackSel,
} from './stack.js';

import {
  renderRecipeSel, renderRecipeOut, applyPreset, filterRecipeSel, setRecipeView,
  selAllR, clearR, selBought, copyRecipe, exportRecipeTxt
} from './recipe.js';

import {
  renderDose,
  syncWeightSlider, syncWeightInput,
} from './dose.js';

import {
  renderHist, initHist,
  addHist, delHist, editHist, clearHistory, exportHistory,
} from './history.js';

import { toast, dismissToast, confirmModal } from './utils.js';

import {
  syncCfgThemeGrid,
  renderWishlist, togWl, clearWl, buyAllWl,
  renderCmp as renderCmpFn, togCmp, CompareController, openCompareModal, closeCompareModal, clearCompare,
  toggleBnDrawer,
  togFaq,
  renderInteract,
  renderFaq, filterFaq, filterFaqCat,
  applyCfg,
  setLang,
  toggleThemePop,
  toggleCfg,
  nukeAll,
  exportTxt, exportJSON,
  copyList,
  refreshPrices,
  runStressTest,
  clearLogs,
  scrollToSection,
  initTermsNav,
  toggleSidebar, syncBnBadges,
  updateStorageSize, copyToClipboard,
  runDatabaseAudit, testAffiliateLinks,
  switchStudyTab, openRef, closeRef, showSticky, closeSticky,
  initHomeReveal,
  injectEfficacyColors, togQuickCmp, openQuickCmpPanel, clearQuickCmp, renderQuickCmpBar,
  initStructuredData,
  toggleAdminMode,
  bnSelect,
  updateDynamicStrings
} from './ui.js';
import { initTheme, setTheme, toggleTheme } from './theme.js';

import { importJSON, handleImport } from './import.js';

import { IT, getTermsUpdatedDate, getTermsRevisionDate, deepFreeze } from './database.js';
import { applyProductLinks } from './links.js';

import { handleCreateSupplement } from './create.js';
import { handleUpdateRegister } from './update.js';

// ── Importação das ações migradas para ES Modules ────────────────────────────
import {
  togItem, chk, updateNote, saveNote,
  setCat, setGoal, setGoalFromSelect, setPriceFilter, setSortOrder,
  toggleDone, toggleExtra, toggleCfgDone, toggleCfgExtra,
  checkAll, uncheckAll, resetAll,
  onSearchInput, clearSearch,
  openAll
} from './actions.js';

/**
 * Expõe as pontes necessárias para o escopo global (window).
 */
const _g = (name) => (...args) => window[name]?.(...args);

// ── [SL-08] Callback centralizado de mutação de S.rSel ───────────────────────
// Único ponto do sistema onde S.rSel é escrito.
// recipe.js nunca muta S diretamente — chama este callback.
let _activeRecipePreset = null; // Estado de runtime para controle de presets

function updateRSel(nextRSel, nextPreset) {
  S.rSel = nextRSel;
  _activeRecipePreset = nextPreset;
  save();
  renderRecipeSel(S);
}

// ── Estado de Runtime Interno (Não persistido) ───────────────────────────────
let _confDone = false;

/**
 * Constrói o objeto de controle da aplicação.
 * Centraliza todas as funções que precisam ser acessíveis por elementos
 * fora do grafo de dependências do ES Module (como o index.html legado).
 */
function getAppController() {
  const controller = {
    go,
    invalidateTab,
    toast,
    dismissToast,
    confirmModal,
    save,
    syncNow,
    renderList,
    renderAll,
    renderStats,
    renderChips,
    renderToggs,
    setCat,
    setGoal,
    setGoalFromSelect,
    setPriceFilter,
    setSortOrder,
    checkAll,
    uncheckAll,
    resetAll,
    toggleDone,
    toggleExtra,
    chk,
    togItem,
    openRef,
    closeRef,
    showSticky,
    closeSticky,
    updateNote,
    saveNote,
    renderStack,
    renderCycles,
    addStack,
    addToStack,
    removeFromStack,
    addCustomCyc,
    removeCustomCyc,
    toggleCycDetail,
    startCyc,
    pauseCyc,
    stopCyc,
    resumeCyc,
    resetCyc,
    saveCycNote,
    renderHist,
    addHist,
    delHist,
    editHist,
    clearHistory,
    exportHistory,
    renderWishlist,
    togWl,
    clearWl,
    buyAllWl,
    renderCmp: renderCmpFn,
    togCmp,
    openCompareModal,
    closeCompareModal,
    clearCompare,
    renderInteract,
    renderFaq,
    filterFaq,
    filterFaqCat,
    setTheme: setTheme, // setTheme vem de theme.js (única fonte de verdade)
    toggleThemePop,
    syncCfgThemeGrid,
    toggleCfgExtra,
    toggleCfgDone,
    toggleCfg,
    applyCfg,
    nukeAll,
    exportTxt,
    exportJSON,
    importJSON,
    handleImport,
    copyList,
    refreshPrices,
    runStressTest: () => runStressTest(),
    clearLogs: () => clearLogs(),
    scrollToSection,
    toggleSidebar,
    syncBnBadges,
    onSearchInput,
    clearSearch,
    openAll,
    updateStorageSize,
    copyToClipboard,
    runDatabaseAudit,
    testAffiliateLinks,
    switchStudyTab,
    handleCreateSupplement,
    handleUpdateRegister,
    bnSelect,
    updateDynamicStrings,
    addToStack:  (id) => addToStack(id),
    togQuickCmp: (id) => togQuickCmp(id),
    openQuickCmpPanel: () => openQuickCmpPanel(),
    clearQuickCmp: () => clearQuickCmp(),
    setLang:     (l) => setLang(l), // setLang remains in ui.js
    togWl:       (id) => togWl(id),
    // [SL-08] Pontes com S injectado
    // togR: implementado aqui porque recipe.js não o exporta —
    //        atualiza S.rSel e delega a persistência ao orquestrador.
    togR: (id) => {
      let list = S.rSel;
      const idx = list.indexOf(id);
      const adding = idx < 0;
      if (adding) list.push(id); else list.splice(idx, 1);
      S.rSel = list;
      _activeRecipePreset = null;
      document.querySelectorAll('.rpreset').forEach(b => b.classList.remove('on'));
      save();
      // Atualiza apenas o card clicado no DOM — sem re-renderizar o grid inteiro
      const card = document.querySelector(`.rsel[data-id="${id}"]`);
      if (card) {
        card.classList.toggle('pk', adding);
        const chk = card.querySelector('.rcheck');
        if (chk) chk.textContent = adding ? '✓' : '';
        card.setAttribute('aria-checked', adding);
        // Animação de feedback tátil
        card.classList.remove('just-picked');
        void card.offsetWidth;
        card.classList.add('just-picked');
      }
      const cnt = document.getElementById('r-count');
      if (cnt) cnt.textContent = S.rSel.length;
      renderRecipeOut(S);
    },
    // Ações de seleção em massa — recebem o callback updateRSel para persistir
    selAllR:  () => selAllR((ids) => { S.rSel = ids; _activeRecipePreset = null; save(); renderRecipeSel(S); }),
    clearR:   () => clearR((ids) => { S.rSel = ids; _activeRecipePreset = null; save(); renderRecipeSel(S); }),
    selBought:() => selBought(S, (ids) => { S.rSel = ids; _activeRecipePreset = null; save(); renderRecipeSel(S); }),
    filterRecipeSel: () => filterRecipeSel(),
    setRecipeView: (v, btn) => {
      document.querySelectorAll('.rvtab').forEach(b => b.classList.remove('on'));
      if (btn && btn.classList) btn.classList.add('on');
      else { const el = document.querySelector(`.rvtab[data-view="${v}"]`); if(el) el.classList.add('on'); }
      renderRecipeOut(S, v);
    },
    renderRecipeSel:  ()      => renderRecipeSel(S),
    renderRecipeOut:  ()      => renderRecipeOut(S),
    renderDose:       ()      => renderDose(S),
    syncWeightSlider: (v)     => syncWeightSlider(v, S),
    syncWeightInput:  (v)     => syncWeightInput(v, S),
    applyPreset: (g, btn) => {
      // Suporte duplo: btn pode ser elemento DOM (onclick inline) ou undefined
      applyPreset(g, _activeRecipePreset, (nextRSel, nextPreset) => {
        _activeRecipePreset = nextPreset;
        S.rSel = nextRSel;
        save();
        // Marca o botão correto como ativo
        document.querySelectorAll('.rpreset').forEach(b => b.classList.remove('on'));
        if (nextPreset) {
          const activeBtn = (btn && btn.classList) ? btn : document.getElementById('rp-' + nextPreset);
          if (activeBtn) activeBtn.classList.add('on');
        }
        renderRecipeSel(S);
      });
    },
    copyRecipe:       ()      => copyRecipe(S),
    exportRecipeTxt:  ()      => exportRecipeTxt(S),
    clearSearch:      ()      => clearSearch(),
    syncBnBadges:     ()      => syncBnBadges(),
    bnSelect:         (p)     => bnSelect(p),
    editHist:         (uid)   => window.editHist(uid),
    delHist:          (uid)   => window.delHist(uid),
    toggleTheme:      ()      => toggleTheme(), // Expose toggleTheme from theme.js
    get _confDone() { return _confDone; },
    set _confDone(v) { _confDone = v; },
    confettiTrigger: () => {
      import('./utils.js').then(m => m.confetti(toast));
    },
  };

  return Object.freeze(controller);
}

/**
 * Expõe as pontes necessárias para o escopo global (window) de forma segura.
 */
function exposeSecureGlobals() {
  // Expõe o estado S para compatibilidade de leitura (ex: hook do canvas)
  window.S = S;

  const app = getAppController();

  // Define window._app como uma propriedade imutável e não configurável
  Object.defineProperty(window, '_app', {
    value: app,
    writable: false,
    configurable: false,
    enumerable: true
  });

  /**
   * COMPATIBILIDADE (ID 02): Expõe as pontes globais para handlers inline (onclick).
   * O objeto window._app torna-se o namespace oficial para evitar conflitos de escopo.
   */
  Object.keys(app).forEach(key => {
    if (typeof app[key] === 'function' && key !== 'confettiTrigger') {
      window[key] = app[key];
    }
  });
}

/**
 * Mapeia e registra os renderizadores lazy e reativos no Roteador Central.
 * [SL-08] Os renderers de dose e recipe são closures que capturam S
 *         do escopo deste módulo — o router.js permanece inalterado.
 */
function registerApplicationRenderers() {
  registerRenderer('home',     () => { initHomeReveal(); renderStats(); });
  registerRenderer('lista',    () => { renderList(); renderStats(); renderChips(); renderToggs(); });
  registerRenderer('stack',    () => { renderStack(); renderCycles(); });
  registerRenderer('wishlist', () => renderWishlist());
  registerRenderer('compare',  () => renderCmpFn());
  registerRenderer('recipe',   () => renderRecipeSel(S));   // [SL-08] S injectado via closure
  registerRenderer('history',  () => renderHist());
  registerRenderer('config',   () => applyCfg());
  // Abas estáticas/calculadoras puras
  registerRenderer('dose',     () => renderDose(S));         // [SL-08] S injectado via closure
  registerRenderer('interact', () => renderInteract());
  registerRenderer('faq',      () => renderFaq());
  registerRenderer('terms',    () => initTermsNav());
}

/**
 * Remove o skeleton loader de forma segura
 */
function removeAppLoadingScreen() {
  const skeleton = document.getElementById('app-shell-skeleton');
  if (!skeleton) return;
  skeleton.style.opacity = '0';
  setTimeout(() => skeleton.remove(), 300);
}

/**
 * Inicialização Centralizada da Aplicação (SL-02)
 */
async function initApp() {
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => console.error('[SW]', err));
    }

    // 1. Setup de Runtime
    exposeSecureGlobals();
    
    // 2. Hidratação de Dados
    load();

    // SL-31: Detecção automática de idioma no primeiro acesso
    if (!localStorage.getItem(STORAGE_KEY)) {
      const browserLang = navigator.language.split('-')[0];
      S.lang = (browserLang === 'en') ? 'en' : 'pt-BR';
      save();
    }

    injectEfficacyColors();
    initAccessibility(); // Initialize ARIA Live Region for screen reader announcements
    applyProductLinks(IT);
    deepFreeze(IT); // Deep freeze after applying product links
    updateDynamicStrings();

    // SL-COMP: Inicializa o dock flutuante se houver itens salvos
    CompareController.renderDock();

    renderStats();

    // 3. Setup de Componentes
    registerApplicationRenderers();
    initStackSel();
    initHist();
    setupEvents();
    initHomeVisuals();
    
    // 4. Sincronização UI
    initTheme(); // Initialize theme preference (saved or system)
    syncCfgThemeGrid();
    
    translatePage(); // Tradução inicial do Shell
    
    const tUp = document.getElementById('terms-updated-date'); if(tUp) tUp.textContent = getTermsUpdatedDate();
    const tRev = document.getElementById('terms-revision-date'); if(tRev) tRev.textContent = getTermsRevisionDate();

    // 5. Inicialização de Rota
    const initialPage = window.location.hash.replace('#', '') || S.tab || 'home';
    go(initialPage, false);
    removeAppLoadingScreen();

  } catch (error) {
    console.error('[Main] Falha fatal durante o bootstrap da aplicação:', error);
    toast('🚨', 'Erro ao inicializar a aplicação. Detalhes no console.', 'error', { duration: 5000 });
  }
}

// ── STARTUP ──────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
