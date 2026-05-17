// ══════════════════════════════════════════════════════════════
// js/router.js — Navegação e Roteamento entre Abas
//
// [SL-08] Este módulo importa state.js para leitura de S.tab, S.cfg e
//         S.ui (tooltips), e para persistir a aba ativa via save().
//         Os renderizadores registrados via registerRenderer() são
//         closures definidas em main.js, onde S já está disponível.
//         O router chama renderFn() — a injeção de dados de domínio
//         (dose, recipe) ocorre transparentemente no escopo de main.js.
//         STORAGE_KEY é usado apenas no bloco de erro para diagnóstico.
// ══════════════════════════════════════════════════════════════
import { S, save, STORAGE_KEY } from './state.js';
import { translatePage } from './i18n.js';

export const PAGES = ['home','lista','stack','wishlist','recipe','dose','compare','history','interact','faq','terms','config'];

// Controla o temporizador das dicas de interface (tooltips) de forma local
let _tooltipTimer = null;

// SL-05: Coordenador de concorrência para evitar tarefas órfãs e travamentos
let _activeNavId = 0;

// ── Cache de renderização por aba ─────────────────────────────
// Registra quais abas já foram renderizadas ao menos uma vez.
const _renderedTabs = new Set();

export function invalidateTab(tab) { _renderedTabs.delete(tab); }
export function invalidateTabs(...tabs) { tabs.forEach(t => _renderedTabs.delete(t)); }

// ── Referências lazy para renderizadores (evita ciclo de importação) ──────
// Cada módulo de renderização chama registerRenderer() no seu próprio load.
const _renderers = {};
export function registerRenderer(page, fn) { _renderers[page] = fn; }

/**
 * Navegação Global entre abas.
 * - Troca via CSS (.on) — sem destruir/reconstruir DOM
 * - Cache: abas estáticas não são re-renderizadas
 * - Lazy: renderiza sob demanda na primeira visita
 */
export function go(p, pushState = true) {
  const navId = ++_activeNavId;
  const isStale = () => navId !== _activeNavId;

  const prevTab = S.tab;
  const tabChanged = prevTab !== p;
  if (!PAGES.includes(p)) p = 'lista';

  // 0. CICLO DE VIDA: Limpeza da aba anterior
  if (tabChanged && prevTab === 'home' && window._homeVisuals) {
    window._homeVisuals.stop();
  }

  // 1. VISIBILIDADE SÍNCRONA (CSS) — Resposta visual instantânea ao clique
  const allPages = document.querySelectorAll('.page');
  if (allPages.length === 0) return console.warn('Erro de DOM: .page não encontrados.');

  allPages.forEach(el => el.classList.remove('on'));
  const targetPage = document.getElementById('p-' + p);
  if (!targetPage) return console.error(`[Router] Seção id="p-${p}" não encontrada no DOM.`);
  targetPage.classList.add('on');

  // Sincronizar elementos de navegação (Tab bar)
  PAGES.forEach(pg => {
    const tab = document.getElementById('nt-' + pg);
    if (tab) {
      const active = pg === p;
      tab.classList.toggle('on', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    }
  });

  S.tab = p; 
  save();

  // 2. CICLO DE VIDA ASSÍNCRONO — Evita travamento da thread principal (SL-05)
  // Deferimos a renderização pesada para o próximo frame de animação.
  requestAnimationFrame(() => {
    if (isStale()) return; // Aborta se o usuário já navegou para outra aba

    _manageTooltips(p);

    // Abas que requerem atualização constante de dados mutáveis
    const ALWAYS_REFRESH = ['home', 'lista', 'stack', 'wishlist', 'compare', 'history', 'config'];
    const force = ALWAYS_REFRESH.includes(p);

    // Renderiza APENAS a aba de destino, otimizando o bootstrap geral
    _performSafeRender(p, force, isStale);

    if (isStale()) return;

    // 3. HOOKS DE CICLO DE VIDA PÓS-RENDERIZAÇÃO
    if (p === 'home' && window._homeVisuals) {
      window._homeVisuals.init();
    }

    if (typeof window._app?.bnSelect === 'function') window._app.bnSelect(p);
    if (typeof window._app?.syncBnBadges === 'function') window._app.syncBnBadges();

    if (p === 'dose') {
      setTimeout(() => document.getElementById('prof-weight-slider')?.focus({ preventScroll: true }), 350);
    }
  });

  if (tabChanged) window.scrollTo(0, 0);
  if (pushState) window.history.pushState({ tab: p }, '', '#' + p);
}

function _manageTooltips(p) {
  // Limpa tooltips anteriores
  document.querySelector('.tooltip-hint')?.remove();

  // Tooltips inteligentes (primeiro uso)
  const hints = {
    lista:    '💡 Toque em um suplemento para ver detalhes, dosagens e onde comprar.',
    stack:    '💡 Monitore sua stack ativa e acompanhe o progresso dos seus ciclos.',
    wishlist: '💡 Guarde aqui os suplementos que você pretende comprar no futuro.',
    recipe:   '💡 Monte protocolos personalizados e organize seus horários de uso.',
    dose:     '💡 Calcule dosagens precisas baseadas no seu peso e perfil biológico.',
    compare:  '💡 Selecione até 4 itens para comparar benefícios, preços e eficácia.',
    history:  '💡 Registre suas compras para acompanhar seus gastos mensais.',
    interact: '💡 Verifique sinergias e riscos entre suplementos na sua stack.',
    faq:      '💡 Encontre respostas para dúvidas comuns sobre o app e suplementação.',
    terms:    '💡 Leia as diretrizes de uso e avisos de responsabilidade médica.',
    config:   '💡 Personalize o tema e as preferências globais do seu app.',
  };

  // Gerencia a exibição e o auto-dismiss das dicas de seção
  if (S.cfg.showTooltips && hints[p] && !S.ui.seenTooltips[p]) {
    _tooltipTimer = setTimeout(() => {
      const h = document.createElement('div');
      h.className = 'tooltip-hint';
      h.style.cssText = 'position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:var(--bg2); border:1px solid var(--accent); padding:14px 18px; border-radius:16px; z-index:1000; display:flex; align-items:center; gap:14px; box-shadow:var(--shadow-xl); font-size:13px; width:max-content; max-width:92vw; animation:up .4s cubic-bezier(.34,1.56,.64,1) both;';
      h.innerHTML = `<span>${hints[p]}</span><button class="btn bg" style="height:32px; padding:0 14px; font-size:11px; flex-shrink:0">Entendi</button>`;
      const closeHint = () => { if (h.parentElement) { h.remove(); S.ui.seenTooltips[p] = true; save(); } };
      h.querySelector('button').onclick = closeHint;
      setTimeout(closeHint, 8000);
      document.body.appendChild(h);
      const rect = h.getBoundingClientRect();
      const margin = 16;
      if (rect.right > window.innerWidth) { h.style.left = 'auto'; h.style.right = margin + 'px'; h.style.transform = 'none'; }
      else if (rect.left < 0) { h.style.left = margin + 'px'; h.style.transform = 'none'; }
    }, 1000);
  }
}

/**
 * Executa a lógica de renderização com tratamento de erros e verificação de concorrência.
 * @param {string} sectionId - ID da aba
 * @param {boolean} force - Se deve ignorar o cache de renderização
 * @param {Function} isStale - Verifica se esta tarefa de renderização ainda é válida
 */
function _performSafeRender(sectionId, force, isStale) {
  if (_renderedTabs.has(sectionId) && !force) return;
  const renderFn = _renderers[sectionId];

  if (!renderFn) {
    return console.warn(`[Router] Renderizador para "${sectionId}" não registrado.`);
  }

  try {
    renderFn();
    if (!isStale()) _renderedTabs.add(sectionId);

    // SL-31: Traduz dinamicamente o conteúdo da nova aba renderizada
    translatePage();
  } catch (error) {
    console.group(`🚨 [Boundary] Falha na Renderização: ${sectionId}`);
    console.error('Erro:', error);
    console.info('Ação:', S.tab);
    try { console.info('Snapshot do Estado:', JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch (e) {}
    console.groupEnd();

    const container = document.getElementById(`p-${sectionId}`);
    if (container) {
      container.innerHTML = `
        <div class="empty" style="padding:40px; border:1px dashed var(--red); background:var(--redd); border-radius:16px; margin:20px 0;">
          <div class="empty-ico" style="color:var(--red); filter:none;">🚫</div>
          <div class="empty-title" style="color:var(--tx)">Erro de Renderização</div>
          <p class="empty-sub">Não foi possível carregar a seção "${sectionId}".</p>
          <button class="btn bg" onclick="window._app.invalidateTab('${sectionId}');window._app.go('${sectionId}')" style="margin-top:16px">Tentar recarregar</button>
        </div>`;
    }
  }
}
