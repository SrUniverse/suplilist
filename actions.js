// ══════════════════════════════════════════════════════════════
// js/actions.js — Ações sobre Itens e Filtros
// ══════════════════════════════════════════════════════════════
import { S, save, toggleItemCheck, toggleItemOpen, toggleItemWishlist,
         setItemCheck, setCheckedAll, checkAllItems, uncheckAllItems,
         setItemNote, saveItemNote } from './state.js';
import { IT, bestMarketplacePrice, utm } from './database.js';
import { announceToScreenReader } from './accessibility.js';
import { toast, confirmModal } from './utils.js';
import { renderAll, renderList, renderStats } from './list.js';
import { invalidateTabs } from './router.js';
import { resetFilters } from './filter.js';
import { generateCacheKey, hasCachedResult, invalidateSearchCache, getNewSearchId } from './search.js';

const SKELETON_TPL = `
  <div class="skeleton-card" role="status" aria-label="Carregando item..."><div class="sk-itop"><div class="sk-block sk-cb"></div><div class="sk-block sk-img"></div><div class="sk-ibody"><div class="sk-block sk-name"></div><div class="sk-block sk-stars"></div></div></div></div>
`.repeat(3);

/** Injeta esqueletos e reduz a opacidade para indicar processamento */
function showPending() {
  const listEl = document.getElementById('list');
  if (listEl) {
    listEl.classList.add('is-busy');
    listEl.setAttribute('aria-busy', 'true');
    listEl.setAttribute('aria-live', 'polite');
    listEl.innerHTML = SKELETON_TPL;
  }
}

// ── Expand/Collapse card ──────────────────────────────────────
export function togItem(id) {
  // Se o long-press foi ativado, ignoramos o clique de expansão
  if (window._app?._blockNextClick) {
    window._app._blockNextClick = false;
    return;
  }

  // [SL-05] Guard: se o item saiu do DOM (troca rápida de aba), aborta silenciosamente
  const itemEl = document.getElementById('item-' + id);
  if (!itemEl || !itemEl.isConnected) { renderList(); return; }
  const isOpen = toggleItemOpen(id);
  const eico  = itemEl.querySelector('.eico');
  const itop  = itemEl.querySelector('.itop');
  
  itemEl.classList.toggle('open', isOpen);
  if (itop) itop.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

// ── Auto-register history ─────────────────────────────────────
export function _autoRegisterHistory(id) {
  if (!S.cfg.autoHistory) return;
  const now    = Date.now();
  const recent = S.history.find(h => h.id === id && (now - h.uid < 10000));
  if (recent) return;
  const it = IT.find(i => i.id === id); if (!it) return;
  S.history.push({
    id, name: it.name, price: bestMarketplacePrice(it) || it.pm || 0,
    date: new Date().toISOString(), uid: now,
  });
  // Re-renderiza histórico se visível (lazy import para evitar ciclo)
  import('./history.js').then(m => { if (S.tab === 'history') m.renderHist(); });
}

// ── Granular DOM for checkbox ─────────────────────────────────
function _applyChkDOM(id) {
  const el = document.getElementById('item-' + id); if (!el) return;
  const done = !!S.checked[id];
  el.classList.toggle('done', done);
  const cb = el.querySelector('.cb');
  if (cb) cb.checked = done;
  const it = IT.find(i => i.id === id);
  if (cb && it) cb.setAttribute('aria-label', (done ? 'Desmarcar ' : 'Marcar ') + it.name + ' como comprado');
}

// ── chk ───────────────────────────────────────────────────────
export function chk(id) {
  if (S.cfg.confirmUncheck && S.checked[id]) {
    confirmModal({
      title: 'Desmarcar item',
      msg: `Remover <strong>${IT.find(i=>i.id===id)?.name||'este item'}</strong> da lista de comprados?`,
      ico: '↩', okLabel: 'Desmarcar', cancelLabel: 'Manter', danger: false, okColor: 'var(--amber)',
    }).then(ok => {
      if (!ok) return;
      setItemCheck(id, false); save();
      invalidateSearchCache();
      if (!S.showDone) { renderAll(); } else { _applyChkDOM(id); renderStats(); }
      announceToScreenReader(`Suplemento ${IT.find(i=>i.id===id)?.name || 'item'} desmarcado.`);
      toast('↩', 'Desmarcado', 'warn', { duration: 2800 });
    });
    return;
  }
  const nowChecked = toggleItemCheck(id);
  invalidateSearchCache();
  if (nowChecked) {
    _autoRegisterHistory(id);
    invalidateTabs('history', 'recipe');
  } else {
    const now = Date.now();
    const histIdx = S.history.findIndex(h => h.id === id && (now - h.uid < 5000));
    if (histIdx !== -1) {
      S.history.splice(histIdx, 1);
      import('./history.js').then(m => { if (S.tab === 'history') m.renderHist(); });
    }
    invalidateTabs('history', 'recipe');
  }
  if (!S.showDone && nowChecked) { renderAll(); }
  else { _applyChkDOM(id); renderStats(); }
  if (nowChecked) {
    toast('Compra registada no Histórico 🛒', 'success');
    announceToScreenReader(`Suplemento ${IT.find(i=>i.id===id)?.name || 'item'} marcado como comprado.`);
    const el = document.getElementById('item-' + id);
    if (el) { el.classList.add('just-checked'); setTimeout(() => el.classList.remove('just-checked'), 600); }
  }
}


// ── Notes ─────────────────────────────────────────────────────
export function updateNote(id, value) { setItemNote(id, value); }
export function saveNote(id) {
  const el = document.getElementById('note-' + id);
  if (el) { saveItemNote(id, el.value); toast('💾', 'Nota salva', 'success', { duration: 2200, progress: false }); }
  announceToScreenReader(`Nota salva para ${IT.find(i=>i.id===id)?.name || 'o item'}.`);
}

// ── Category / filter setters ─────────────────────────────────
export function setCat(c) {
  S.cat = c; S.goalFilter = ''; S.priceFilter = '';
  showPending();
  invalidateSearchCache();
  const gfEl = document.getElementById('f-goal'); if (gfEl) gfEl.value = '';
  const pfEl = document.getElementById('f-price'); if (pfEl) pfEl.value = '';
  document.querySelectorAll('.hcat').forEach(el => el.classList.remove('on'));
  document.getElementById('hcat-all')?.classList.add('on');
  renderAll();
}

export function setGoal(g) {
  S.goalFilter = g === 'all' ? '' : g;
  document.querySelectorAll('.hcat').forEach(el => el.classList.remove('on'));
  invalidateSearchCache();
  document.getElementById('hcat-' + (g || 'all'))?.classList.add('on');
  const sel = document.getElementById('f-goal'); if (sel) sel.value = S.goalFilter;
  save(); renderAll();
}

export function setGoalFromSelect(v) {
  S.goalFilter = v || '';
  document.querySelectorAll('.hcat').forEach(el => el.classList.remove('on'));
  document.getElementById(v ? 'hcat-' + v : 'hcat-all')?.classList.add('on');
  invalidateSearchCache();
  save(); renderAll();
}

export function setPriceFilter(v) { S.priceFilter = v || ''; invalidateSearchCache(); save(); renderAll(); }

export function setSortOrder(v, chipEl) {
  S.cfg.defaultSort = v || 'priority';
  document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('on'));
  if (chipEl) chipEl.classList.add('on');
  else {
    const target = document.querySelector(`.sort-chip[data-sort="${S.cfg.defaultSort}"]`);
    if (target) target.classList.add('on');
  }
  invalidateSearchCache();
  save(); renderList();
}

export function toggleDone()  { S.showDone  = !S.showDone;  invalidateSearchCache(); save(); renderAll(); }
export function toggleExtra() { S.showExtra = !S.showExtra; invalidateSearchCache(); save(); renderAll(); }

export function toggleCfgDone()  { S.showDone  = !S.showDone;  import('./ui.js').then(m => m.applyCfg()); renderList(); save(); }
export function toggleCfgExtra() { S.showExtra = !S.showExtra; import('./ui.js').then(m => m.applyCfg()); renderList(); save(); }

export function checkAll() {
  const prev = checkAllItems();
  invalidateSearchCache();
  renderAll();
  toast('✔', 'Todos marcados como comprados!', 'success', {
    duration: 4000, undo: () => { setCheckedAll(prev); renderAll(); },
    onClose: () => announceToScreenReader('Todos os suplementos marcados como comprados.')
  });
}

export function uncheckAll() {
  const prev = uncheckAllItems();
  invalidateSearchCache();
  window._app._confDone = false; renderAll();
  announceToScreenReader('Todos os suplementos desmarcados.');
  toast('↺', 'Lista limpa', 'info', {
    duration: 4000, undo: () => { setCheckedAll(prev); renderAll(); },
  });
}

export function resetAll() {
  confirmModal({ title: 'Resetar checklist', msg: 'Desmarcar todos os itens comprados e zerar o progresso?', ico: '🔄', okLabel: 'Resetar', cancelLabel: 'Cancelar', danger: false, okColor: 'var(--amber)' })
    .then(ok => {
      if (!ok) return;
      const prev = uncheckAllItems();
      invalidateSearchCache();
      announceToScreenReader('Checklist resetado.');
      window._app._confDone = false; renderAll();
      toast('🔄', 'Checklist resetado', 'warn', { duration: 4000, undo: () => { setCheckedAll(prev); renderAll(); } });
    });
}
export function openAll() {
  const pend = IT.filter(i => !S.checked[i.id] && i.pr !== 'extra');
  if (!pend.length) { toast('✔', 'Todos os itens já foram comprados!', 'success', { duration: 2800 }); return; }
  pend.forEach((it, i) => setTimeout(() => window.open(utm(it.linkShopee || it.shopee, 'shopee', 'affiliate', 'suplilist', i + 1), '_blank'), i * S.cfg.delay));
  toast('↗', `Abrindo ${pend.length} links…`, 'info', { duration: 3000 });
}

// ── Search ────────────────────────────────────────────────────
let _searchTimer = null;
export function onSearchInput() {
  // [SL-05] Guard: input pode não existir se a aba foi trocada durante o evento
  const s = document.getElementById('search');
  if (!s || !s.isConnected) return;
  
  const currentSearchId = getNewSearchId(); // [SL-29] Obtém um novo ID para esta busca
  const v = s.value || '';
  const query = v.trim();
  const cl = document.getElementById('search-clear');

  // Sincroniza visibilidade do botão de limpar instantaneamente
  if (cl) cl.classList.toggle('vis', v.length > 0);

  // [SL-23] Reset Completo: Detecta campo vazio ou apenas espaços
  if (query.length === 0) {
    // 1. Cancela qualquer busca pendente para evitar race conditions
    clearTimeout(_searchTimer);
    _searchTimer = null;

    // 2. Remove estados de processamento e skeleton da UI imediatamente
    const listEl = document.getElementById('list');
    if (listEl) {
      listEl.classList.remove('is-busy');
      listEl.removeAttribute('aria-busy');
    }

    // 3. Restaura a visualização padrão ignorando o delay do debounce
    renderList(currentSearchId); // [SL-29] Passa o ID da busca
    return;
  }

  // [SL-28] Otimização: Se já estiver no cache, renderiza instantaneamente
  const cacheKey = generateCacheKey(query);
  if (hasCachedResult(cacheKey)) {
    clearTimeout(_searchTimer);
    renderList(currentSearchId); // [SL-29] Passa o ID da busca
    return;
  }

  // Se houver texto, aplica o estado pendente e o debounce para performance
  showPending();
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => {
    // [SL-05] Garantia de execução: limpa estados mesmo em cancelamento
    const listEl = document.getElementById('list');
    if (S.tab !== 'lista' || !s.isConnected) {
      if (listEl) listEl.classList.remove('is-busy');
      return;
    }
    renderList(currentSearchId); // [SL-29] Passa o ID da busca
  }, 150);
}

export function clearSearch() {
  resetFilters(S);
  const searchInput = document.getElementById('search');
  if (searchInput) searchInput.focus();
  
  const cl = document.getElementById('search-clear');
  if (cl) cl.classList.remove('vis');
  
  renderAll();
}
