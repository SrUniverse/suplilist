// ══════════════════════════════════════════════════════════════
// js/events.js — Centralização de Event Listeners e Delegação
// Responsabilidade: Capturar interações do usuário, gerenciar a 
//                   delegação de eventos e disparar as ações lógicas.
// ══════════════════════════════════════════════════════════════

import { S, save } from './state.js';
import { go, invalidateTab } from './router.js';
import { toggleThemePop, runDatabaseAudit } from './ui.js';
import { setTheme } from './theme.js';
import { toggleCfgExtra, onSearchInput } from './actions.js';
import { addStack } from './stack.js';
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

    // Atalhos de navegação por atributos data-go
    if (target.hasAttribute('data-go')) {
      const page = target.getAttribute('data-go');
      go(page);
      return;
    }

    // Controle de Fechamento de Modais e Popups ao clicar fora
    const themePop = document.getElementById('theme-pop');
    if (themePop && themePop.classList.contains('on') && !themePop.contains(target) && target.id !== 'theme-toggle-btn') {
      themePop.classList.remove('on');
      document.getElementById('theme-toggle-btn')?.setAttribute('aria-expanded', 'false');
    }

    // Cliques em abas / chips de categoria de filtros rápidos
    if (target.classList.contains('hcat')) {
      const cat = target.getAttribute('data-cat');
      if (cat) {
        S.cat = cat;
        document.querySelectorAll('.hcat').forEach(el => el.classList.remove('on'));
        target.classList.add('on');
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
    const card = e.target.closest('.item');
    if (!card || S.tab !== 'lista') return;

    const id = parseInt(card.id.replace('item-', ''));
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
    const card = e.target.closest('.item');
    if (card) card.classList.remove('pressing');
  });

  document.addEventListener('touchmove', () => {
    clearTimeout(lpTimer);
    document.querySelectorAll('.item.pressing').forEach(el => el.classList.remove('pressing'));
  });

  // Impede o menu de contexto nativo ao segurar nos cards
  document.addEventListener('contextmenu', e => { if (e.target.closest('.item')) e.preventDefault(); });

  // ── 2. NAVEGAÇÃO E TEMAS ─────────────────────────────────────
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleThemePop();
    });
  }

  // Opções do seletor de temas rápido
  document.querySelectorAll('.th-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme');
      if (theme) setTheme(theme, true);
    });
  });

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
        S.cfg.defaultSort = sortType;
        document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('on'));
        chip.classList.add('on');
        invalidateTab('lista');
        go('lista');
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