// ══════════════════════════════════════════════════════════════
// js/events.js — Centralização de Event Listeners e Delegação
// Responsabilidade: Capturar interações do usuário, gerenciar a 
//                   delegação de eventos e disparar as ações lógicas.
// ══════════════════════════════════════════════════════════════

import { S, save } from './state.js';
import { go, invalidateTab } from './router.js';
import { toggleThemePop, handleThemeSelection, runDatabaseAudit } from './ui.js';
import { setTheme } from './theme.js';
import { toggleCfgExtra, onSearchInput, togItem, chk, saveNote } from './actions.js';
import { addStack } from './stack.js';
import { addToStack } from './stack.js';
import { addHist } from './history.js';
import { handleCreateSupplement } from './create.js';
import { handleUpdateRegister } from './update.js';

/**
 * Configura e centraliza todos os event listeners globais do sistema.
 * Utiliza delegação de eventos sempre que possível para otimizar performance.
 */
export function setupEvents() {

  let lpTimer;
  const LP_DURATION = 600; // Tempo em ms para ativar
  let isLongPress = false;
  let versionClicks = 0;
  
  // ── 1. CLICKS GLOBAIS (Delegação de Eventos) ─────────────────
  document.addEventListener('click', (e) => {
    const target = e.target;

    // ── 1.1 Checkbox (Prioridade Máxima) ──
    const checkTrigger = target.closest('.card-checkbox-wrapper');
    if (checkTrigger) {
      const card = checkTrigger.closest('.supplement-card');
      const id = parseInt(card?.dataset.itemId);
      if (id) {
        chk(id);
        // Não usamos preventDefault para permitir que o input checkbox nativo mude de estado
      }
      return;
    }

    // ── 1.2 Card Toggle (Expansão) ──
    const expansionTrigger = target.closest('.card-main-content') || target.closest('.btn-buy-trigger');
    if (expansionTrigger) {
      const card = expansionTrigger.closest('.supplement-card');
      if (card) {
        e.preventDefault();
        const id = parseInt(card.dataset.itemId);
        if (!isNaN(id)) {
          togItem(id, expansionTrigger);
          return; // Interrompe para não disparar outros eventos
        }
      }
    }

    // ── 1.3 Ações dentro do Painel Expandido ──
    const btnStack = target.closest('.btn-add-to-stack');
    if (btnStack) {
      e.stopPropagation();
      addToStack(parseInt(btnStack.dataset.id));
      return;
    }

    const btnRef = target.closest('.btn-open-ref');
    if (btnRef) {
      e.stopPropagation();
      import('./ui.js').then(m => m.openRef(parseInt(btnRef.dataset.id)));
      return;
    }

    const btnSave = target.closest('.btn-save-note');
    if (btnSave) {
      e.stopPropagation();
      saveNote(btnSave.dataset.id);
      return;
    }

    // Atalhos de navegação por atributos data-go
    const navTrigger = target.closest('[data-go]');
    if (navTrigger) {
      const page = navTrigger.getAttribute('data-go');
      go(page);
      return;
    }

    // TEMA: Abrir/Fechar menu (Delegação robusta)
    const themeToggle = target.closest('#theme-toggle-btn');
    if (themeToggle) {
      e.stopPropagation();
      toggleThemePop();
      return;
    }

    // TEMA: Seleção de opção (Popover ou Grade de Configurações)
    // SL-34: Unifica a captura de cliques em seletores de tema via delegação.
    const themeOpt = target.closest('.th-opt, .cfg-th');
    if (themeOpt) {
      const theme = themeOpt.getAttribute('data-theme');
      if (theme) { handleThemeSelection(theme); }
      return;
    }

    // Controle de Fechamento de Modais e Popups ao clicar fora
    const themePop = document.getElementById('theme-pop') || document.getElementById('theme-popover');
    if (themePop && themePop.classList.contains('on') && !themePop.contains(target) && !target.closest('#theme-toggle-btn')) {
      themePop.classList.remove('on');
      document.getElementById('theme-toggle-btn')?.setAttribute('aria-expanded', 'false');
    }

    // Cliques em abas / chips de categoria de filtros rápidos
    const hcat = target.closest('.hcat');
    if (hcat) {
      const cat = hcat.getAttribute('data-cat');
      if (cat) {
        S.cat = cat;
        document.querySelectorAll('.hcat').forEach(el => el.classList.remove('on'));
        hcat.classList.add('on');
        invalidateTab('lista');
        go('lista');
      }
    }

    // ── 1.2 Easter Egg: Ativação do Modo Admin (7 Cliques na Versão) ──
    // SL-28: Captura cliques em qualquer rótulo de versão para ativação do modo Admin.
    // Suporta múltiplos IDs e elementos dinâmicos via delegação.
    const versionIds = ['version-trigger', 'version-footer', 'version-config', 'app-version-display'];
    if (versionIds.includes(target.id) || target.closest('#app-version-display')) {
      versionClicks++;
      // Feedback visual progressivo (opacidade aumenta a cada clique)
      target.style.opacity = 0.4 + (versionClicks * 0.08);
      
      if (versionClicks === 7) {
        window._app.toggleAdminMode?.();
        versionClicks = 0;
      }
    }
  });

  // ── 1.1 GESTOS TOUCH (Long Press para Comparação) ───────────
  document.addEventListener('touchstart', (e) => {
    // SL-40: Atualizado para o novo seletor de card
    const card = e.target.closest('.supplement-card');
    if (!card || S.tab !== 'lista') return;

    // SL-40: Uso de dataset para maior resiliência em vez de parsing de ID de string
    const id = parseInt(card.dataset.itemId);
    isLongPress = false;
    card.classList.add('pressing');

    lpTimer = setTimeout(() => {
      if (window._app?.togQuickCmp) {
        isLongPress = true;
        window._app._blockNextClick = true; // Bloqueia o togItem (expansão)
        window._app.togQuickCmp(id);
        
        // Feedback tátil e visual
        if (navigator.vibrate) navigator.vibrate(40);
        card.classList.remove('pressing');
        card.classList.add('just-selected');
        setTimeout(() => card.classList.remove('just-selected'), 400);
      }
    }, LP_DURATION);
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    clearTimeout(lpTimer);
    const card = e.target.closest('.supplement-card');
    if (card) card.classList.remove('pressing');
  });

  document.addEventListener('touchmove', () => {
    clearTimeout(lpTimer);
    document.querySelectorAll('.supplement-card.pressing').forEach(el => el.classList.remove('pressing'));
  });

  // Impede o menu de contexto nativo ao segurar nos cards
  document.addEventListener('contextmenu', e => { if (e.target.closest('.supplement-card')) e.preventDefault(); });

  // ── 2. NAVEGAÇÃO E TEMAS ─────────────────────────────────────
  // ── 3. FORMULÁRIOS E INPUTS DA LISTA DE SUPLEMENTOS ──────────
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', onSearchInput);
  }

  // Filtro de Objetivos (Goal Filter)
  const goalFilter = document.getElementById('f-goal');
  if (goalFilter) {
    goalFilter.addEventListener('change', (e) => {
      S.goalFilter = e.target.value;
      invalidateTab('lista');
      go('lista');
    });
  }

  // Filtro de Preços / Custo-benefício
  const priceFilter = document.getElementById('f-price');
  if (priceFilter) {
    priceFilter.addEventListener('change', (e) => {
      S.priceFilter = e.target.value;
      invalidateTab('lista');
      go('lista');
    });
  }

  // Ordenação da Lista principal
  document.querySelectorAll('.sort-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const sortType = chip.getAttribute('data-sort');
      if (sortType) {
        window._app.setSortOrder(sortType, chip);
      }
    });
  });

  // ── 4. RECURSOS DA ACADEMIA DA STACK E HISTÓRICO ─────────────
  const btnAddStack = document.getElementById('btn-add-stack');
  if (btnAddStack) {
    btnAddStack.addEventListener('click', addStack);
  }

  const btnAddHist = document.getElementById('btn-add-hist');
  if (btnAddHist) {
    btnAddHist.addEventListener('click', addHist);
  }

  // ── 4.1 FORMULÁRIO DE CRIAÇÃO (SL-18) ────────────────────────
  const formCreate = document.getElementById('form-create-supplement');
  if (formCreate) {
    formCreate.addEventListener('submit', handleCreateSupplement);
  }

  // ── 4.2 FORMULÁRIO DE EDIÇÃO (SL-20) ─────────────────────────
  const formEdit = document.getElementById('form-edit-supplement');
  if (formEdit) {
    formEdit.addEventListener('submit', handleUpdateRegister);
  }

  // ── 5. SEÇÃO DE DESENVOLVEDOR / AUDITORIA ─────────────────────
  const btnDevMode = document.getElementById('dev-mode-toggle');
  if (btnDevMode) {
    btnDevMode.addEventListener('click', toggleCfgExtra);
  }

  const btnAudit = document.getElementById('btn-run-audit');
  if (btnAudit) {
    btnAudit.addEventListener('click', runDatabaseAudit);
  }
}

/**
 * SL-06: Ponte de interação para os visuais do Canvas da Home.
 * Centraliza os listeners que alimentam o objeto window._homeVisuals de forma assíncrona.
 * Esta função deve ser invocada apenas durante o bootstrap da aplicação.
 */
export function initHomeVisuals() {
  // Listener de Mouse para interatividade (Bio-Scan/Parallax)
  document.addEventListener('mousemove', (e) => {
    // Cláusulas de Guarda: Segurança contra race conditions e abas inativas
    if (S.tab !== 'home' || !window._homeVisuals) return;

    const canvas = document.getElementById('v2-canvas');
    if (!canvas || !canvas.isConnected) return;

    // Atualiza coordenadas no motor de renderização se o método existir
    if (typeof window._homeVisuals.updateMouse === 'function') {
      window._homeVisuals.updateMouse(e.clientX, e.clientY);
    }
    
    // Sincroniza a Bio-Orb (efeito visual CSS que acompanha o mouse)
    const orb = document.querySelector('.bio-orb');
    if (orb) {
      orb.style.left = `${e.clientX}px`;
      orb.style.top = `${e.clientY}px`;
    }
  }, { passive: true });

  // Gerenciamento de redimensionamento do Canvas
  window.addEventListener('resize', () => {
    // Só dispara o recalculo se estivermos na home e o motor estiver ativo
    if (S.tab === 'home' && window._homeVisuals?.resize) {
      window._homeVisuals.resize();
    }
  }, { passive: true });

  console.info('[SL-06] HomeVisuals Bridge inicializada com sucesso.');
}