// ══════════════════════════════════════════════════════════════
// js/list.js — Renderização da Lista de Suplementos
// ══════════════════════════════════════════════════════════════
import { S } from './state.js';
import {
  IT, CAT, PRIO, PLBL, PCLS, SUPP_IMGS, APP_VERSION, STUDIES, INTERACT,
  mlPrice, azPrice, bestMarketplacePrice,
} from './database.js';
import { escapeHTML, emptyStateHTML } from './utils.js';
import { isCurrentSearch } from './search.js'; // [SL-29] Importa o verificador de concorrência
import { applyFilters, isFilteringActive, calculateCategoryCounts } from './filter.js';
import { t } from './i18n.js';

// ── Lazy Loading Observer ─────────────────────────────────────
const imgObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.classList.add('loaded');
      }
      observer.unobserve(img);
    }
  });
}, { rootMargin: '100px' });

/**
 * [SL-40] Registra imagens para Lazy Loading.
 * Essencial para abas que renderizam fora da lista principal (Favoritos/Busca).
 */
export function observeLazyImages(container = document) {
  container.querySelectorAll('.lazy-img').forEach(img => imgObserver.observe(img));
}

// ── Fuse.js (fuzzy search) — inicializado sob demanda ────────
let _fuse = null;
export function getFuse() { return _fuse; }
export function setFuse(instance) { _fuse = instance; }

// ── Stars ─────────────────────────────────────────────────────
export function starsHTML(n) {
  if (!S.cfg.showStars) return '';
  return `<div class="stars">${[...Array(5)].map((_,i) => `<div class="star${i < n ? ' on' : ''}"></div>`).join('')}</div>`;
}

// ── Price/dose ────────────────────────────────────────────────
export function pdose(i) {
  const p = bestMarketplacePrice(i);
  return i.doses && p ? Math.round((p / i.doses) * 100) / 100 : null;
}

// ── Derived list ──────────────────────────────────────────────
export const MAIN = IT.filter(i => i.pr !== 'extra');
export function doneCnt() { return IT.filter(i => S.checked[i.id]).length; }
export function allCats() { return ['Todos', ...new Set(MAIN.map(i => i.cat))]; }

// ── Filtered & sorted list ────────────────────────────────────
export function filtered() {
  return applyFilters(S, IT);
}

// ── Buy section HTML ──────────────────────────────────────────
export function renderBuySection(it) {
  const azUrl   = it.linkAmazon || '';
  const spUrl   = it.linkShopee || '';
  const mlUrl   = it.linkML     || '';
  const spPrice = it.pm || 20;
  const mlp     = mlPrice(it);
  const azp     = azPrice(it);
  const pd      = pdose(it);

  const markets = [
    { cls:'mc-sp', url: spUrl, ico:'🛍️', name:'Shopee',       price: spPrice, cta: t('buttons.buy_at', { shop: 'Shopee' }) },
    { cls:'mc-ml', url: mlUrl, ico:'🛒', name:'Mercado Livre', price: mlp,     cta: t('buttons.buy_at', { shop: 'Mercado Livre' }) },
    { cls:'mc-az', url: azUrl, ico:'📦', name:'Amazon',       price: azp,     cta: t('buttons.buy_at', { shop: 'Amazon' }) },
  ].filter(m => m.url);

  if (!markets.length) return '';
  const bestPrice = Math.min(...markets.map(m => m.price));

  const cardsHtml = markets.map(m => {
    const isBest = m.price === bestPrice;
    return `<a class="mkt-card ${m.cls}" href="${m.url}" target="_blank" rel="sponsored" onclick="event.stopPropagation()">
      ${isBest ? `<span class="mkt-best">✓ ${t('compare.best_value')}</span>` : ''}
      <div class="mkt-ico" aria-hidden="true">${m.ico}</div>
      <div class="mkt-name">${m.name}</div>
      <div class="mkt-price"><sup>R$</sup>${m.price}</div>
      <span class="mkt-cta">${m.cta}</span>
      ${pd ? `<div class="mkt-pdose">~R$${pd}/dose</div>` : ''}
    </a>`;
  }).join('');

  return `
    <div class="mkt-panel">
      <div class="mkt-title">🏪 ${t('compare.buy_on')} — <span>${escapeHTML(it.name.toUpperCase())}</span></div>
      <div class="mkt-cards">${cardsHtml}</div>
    </div>`;
}

// ── Componente de Alertas de Segurança (Refatoração UX) ───────
export function renderCardAlerts(it) {
  const alerts = [];
  const itemName = it.name.toLowerCase();

  // 1. Prioridade 1: Aviso específico do registro no banco
  if (it.warn) {
    alerts.push({ type: 'warning', ico: '⚠️', text: it.warn });
  }

  // 2. Prioridade 2: Busca proativa no banco de interações (INTERACT)
  INTERACT.forEach(int => {
    // Regex simples para capturar o nome do suplemento como palavra inteira
    const nameRegex = new RegExp(`\\b${itemName}\\b`, 'i');
    if (nameRegex.test(int.title) || nameRegex.test(int.desc)) {
      const severity = int.type === 'danger' ? 'critical' : (int.type === 'warn' ? 'warning' : 'info');
      const icon = int.type === 'danger' ? '🚫' : (int.type === 'warn' ? '⚠️' : '💡');
      
      // Evita duplicar alertas que dizem a mesma coisa
      if (!alerts.some(a => a.text === int.desc)) {
        alerts.push({ type: severity, ico: icon, text: int.desc });
      }
    }
  });

  // 3. Ordenação por Severidade Crítica
  const severityWeight = { critical: 1, warning: 2, info: 3 };
  alerts.sort((a, b) => severityWeight[a.type] - severityWeight[b.type]);

  if (alerts.length === 0) return '';

  // 4. Mecânica de "Show More" (UX-03)
  const maxVisible = 2; 
  const hasMore = alerts.length > maxVisible;
  const visibleAlerts = alerts.slice(0, maxVisible);
  const hiddenAlerts = alerts.slice(maxVisible);

  /**
   * Renderiza o template de cada alerta com proteção XSS e acessibilidade
   */
  const renderAlertItem = (a) => `
    <div class="alert-item alert-${a.type}">
      <div class="alert-icon" role="img" aria-hidden="true">${a.ico}</div>
      <div class="alert-content">${escapeHTML(a.text)}</div>
    </div>
  `;

  return `
    <div class="card-alerts-wrapper" onclick="event.stopPropagation()">
      <div class="alert-list">
        ${visibleAlerts.map(renderAlertItem).join('')}
        ${hasMore ? `
          <div class="alerts-collapsible" id="more-alerts-${it.id}">
            ${hiddenAlerts.map(renderAlertItem).join('')}
          </div>
          <button class="alert-expand-trigger" 
                  aria-expanded="false"
                  onclick="
                    const target = this.previousElementSibling;
                    const isOpen = target.classList.toggle('is-open');
                    this.setAttribute('aria-expanded', isOpen);
                    this.innerHTML = isOpen 
                      ? '− ' + (t('buttons.show_less') || 'Ver menos') 
                      : '+ ' + (t('buttons.show_more_alerts', { n: alerts.length - maxVisible }) || 'Mostrar mais ' + (alerts.length - maxVisible) + ' alertas');
                  ">
            + ${t('buttons.show_more_alerts', { n: alerts.length - maxVisible }) || 'Mostrar mais ' + (alerts.length - maxVisible) + ' alertas'}
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// ── Item HTML ─────────────────────────────────────────────────
export function itemHTML(it, idx) {
  const done = S.checked[it.id], open = S.open[it.id], isX = it.pr === 'extra';
  // Fallback seguro caso a categoria não exista no database.js
  const catMeta = CAT[it.cat] || { cls: 'cM', ico: '📦' };
  const cc = catMeta.cls;
  const pd = pdose(it);
  const badgeHTML = it.badge === 'hot' ? `<span class="badge badge-hot">🔥 ${t('badges.popular')}</span>` :
                    it.badge === 'best' ? `<span class="badge badge-best">★ ${t('badges.best_cb')}</span>` :
                    it.badge === 'val'  ? `<span class="badge badge-val">💰 ${t('badges.economic')}</span>` : '';
  const activeImg = (typeof SUPP_IMGS !== 'undefined' && SUPP_IMGS[it.id]) || '';
  
  // Padronização do container de imagem para Bounding Box
  const imgHTML = `<div class="item-img-wrap">
    ${activeImg
      ? `<img class="item-img lazy-img" data-src="${activeImg}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="${it.name}" onerror="this.src='./assets/placeholder.png'">`
      : `<span class="item-img-placeholder">${catMeta.ico || '💊'}</span>`
    }
  </div>`;

  const isQcmp = S.quickCmpSel.includes(it.id);
  const efficacyClass = `eff-s${it?.sc || 0}`;
  const sd = (typeof STUDIES !== 'undefined' && STUDIES[it.id]) ? STUDIES[it.id] : null;
  const evLevel = sd ? sd.scientific_evidence_level : null;
  const evHTML = evLevel ? `<span class="ev-badge ev-${evLevel.toLowerCase()}" title="${t('compare.science_level')} ${evLevel}">${t('compare.science_label')} ${evLevel}</span>` : '';
  const btnLabel = open ? `▲ ${t('buttons.close_options')}` : `＋ ${t('buttons.see_prices')}`;

  // SL-40: O container principal recebe 'is-expanded' para controle do CSS Grid
  return `<div class="supplement-card ${cc} glass-card prio-${it?.pr || 'baixa'} ${efficacyClass} ${done?' done':''}${open?' is-expanded open':''}${isQcmp?' qcmp-selected':''}" id="item-${it.id}" data-item-id="${it.id}" style="--idx: ${idx}" role="listitem">
    <div class="card-main-content" aria-expanded="${open?'true':'false'}" role="button" aria-controls="dp-${it.id}" tabindex="0">
      
      <!-- Top/Header: Zona Protegida de Imagem e Tags -->
      <header class="card-header">
        <div class="card-checkbox-wrapper">
          <input class="cb" type="checkbox" id="cb${it.id}"${done?' checked':''}>
          <label class="cbl" for="cb${it.id}"></label>
        </div>
        ${imgHTML}
      </header>

      <!-- Center/Body: Título e Classificação -->
      <div class="card-body">
        <div class="card-tags">
           ${badgeHTML}
           ${evHTML}
           <span class="ctag ${cc}">${catMeta.ico} ${it.cat}</span>
        </div>
        <h3 class="card-title">${escapeHTML(it.name)} ${isX?'<span class="xtag">✨</span>':''}</h3>
        <div class="card-science">
          ${starsHTML(it.sc)}
          <div class="card-desc-short">${escapeHTML(it.desc || '')}</div>
        </div>
      </div>

      <!-- Bottom/Footer: Preço e CTA -->
      <footer class="card-footer">
        <div class="card-price-row">
          <span class="card-price-main">R$ ${it.pm}</span>
          ${pd&&S.cfg.showPdose?`<span class="pdose-tag">R$${pd}/dose</span>`:''}
        </div>
        <button class="btn-buy-trigger" id="btn-label-${it.id}">${btnLabel}</button>
      </footer>
    </div>

  <!-- SL-40: Painel de marketplaces aninhado corretamente no root do card -->
  <div class="marketplaces-container ${open ? 'is-visible' : ''}" id="dp-${it.id}" role="region" aria-label="Opções de compra para ${it.name}">
    <div class="expansion-content">
      ${renderBuySection(it)}
      <div class="dtags" aria-label="Tags">${(it.tags||[]).map(t=>`<span class="dtag">${t}</span>`).join('')}</div>
      ${it.dose?`<div class="ddose" role="note">💊 ${escapeHTML(it.dose)}</div>`:''}
      ${renderCardAlerts(it)}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="btn btn-add-to-stack" data-id="${it.id}" style="height:32px;font-size:11px;background:var(--rosedim);color:var(--rose);border-color:rgba(244,114,182,.25)" aria-label="Adicionar ${it.name} à stack">💪 Adicionar à stack</button>
        <button class="ref-btn btn-open-ref" data-id="${it.id}" aria-label="Ver referências científicas para ${it.name}">🔬 Estudos Científicos</button>
      </div>
      <div class="note-row">
        <textarea class="note-ta item-note" data-id="${it.id}" placeholder="Nota: marca, preço pago, lote…" rows="2" aria-label="Nota pessoal sobre ${it.name}" oninput="window._app.updateNote('${it.id}', this.value)">${escapeHTML(S.notes[it.id])}</textarea>
        <button class="note-btn btn-save-note" data-id="${it.id}" aria-label="Salvar nota para ${it.name}" title="Salvar nota">💾</button>
      </div>
    </div>
  </div>
</div>`;
}

// ── Chunked renderList ────────────────────────────────────────
const CHUNK_SIZE = 20;
let _renderListRaf = null;
let _renderListChunkRaf = null;

export function renderList(currentSearchId) { // [SL-29] Recebe o ID da busca atual
  const listEl = document.getElementById('list');
  // SL-08: Guard clause estrita para o container principal
  // [SL-29] Verifica se esta renderização ainda é a mais recente
  if (currentSearchId !== undefined && !isCurrentSearch(currentSearchId)) return;
  if (!listEl || !listEl.isConnected || S.tab !== 'lista') return;

  cancelAnimationFrame(_renderListRaf);
  cancelAnimationFrame(_renderListChunkRaf);

  // [SL-14] Garante que list seja sempre um array iterável
  const list = filtered() || [];
  const srt  = S.cfg.defaultSort || 'priority';
  const searchInput = document.getElementById('search');
  const q = (searchInput?.value || '').trim();

  const fc = document.getElementById('filter-count');
  if (fc) {
    const isFiltered = isFilteringActive(S);
    fc.textContent = list.length + ' resultado' + (list.length !== 1 ? 's' : '');
    fc.classList.toggle('has-filter', !!isFiltered);
    fc.classList.toggle('is-hidden', !(list.length > 0 || isFiltered));
  }

  let segments = [];
  if (!list.length) {
    const title    = q ? 'Nenhum resultado' : 'Lista vazia';
    const sub      = q
      ? `Nenhum suplemento corresponde a "<strong style="color:var(--tx)">${escapeHTML(q)}</strong>"`
      : 'Parece que nenhum item atende aos filtros atuais.';
    const btnLabel = q ? 'Limpar busca' : 'Ver todos';
    const btnFn    = q ? 'window._app.clearSearch()' : "window._app.setCat('Todos')";
    segments = [emptyStateHTML('🌿', title, sub, btnLabel, btnFn)];
  } else {
    if (srt === 'priority') {
      const g = {};
      list.forEach(i => { if (!g[i.pr]) g[i.pr] = []; g[i.pr].push(i); });
      ['alta','media','baixa','extra'].forEach(p => {
        if (!g[p]?.length) return;
        segments.push(`<div class="sec ${PCLS[p]}"><span class="sdot"></span>${PLBL[p]} (${g[p].length})</div>`);
        g[p].forEach((it, idx) => segments.push(itemHTML(it, idx)));
      });
    } else {
      list.forEach((it, idx) => segments.push(itemHTML(it, idx)));
    }
  }

  _renderListRaf = requestAnimationFrame(() => {
    // [SL-29] Verifica novamente antes de mutar o DOM no próximo frame
    if (currentSearchId !== undefined && !isCurrentSearch(currentSearchId)) return;
    // SL-08: Verificação de sanidade
    if (S.tab !== 'lista' || !listEl || !listEl.isConnected) return;

    listEl.innerHTML = segments.slice(0, CHUNK_SIZE).join('');
    listEl.classList.remove('is-busy'); // Remove o estado de busy aqui, após a primeira renderização
    listEl.removeAttribute('aria-busy');
    listEl.removeAttribute('aria-live');
    observeLazyImages(listEl);

    if (segments.length <= CHUNK_SIZE) return;
    let offset = CHUNK_SIZE;
    function renderNextChunk() {
      if ((currentSearchId !== undefined && !isCurrentSearch(currentSearchId)) || S.tab !== 'lista') return; // [SL-29] Verifica novamente
      const chunk = segments.slice(offset, offset + CHUNK_SIZE);
      if (!chunk.length) return;
      listEl.insertAdjacentHTML('beforeend', chunk.join(''));
      observeLazyImages(listEl);
      offset += CHUNK_SIZE;
      if (offset < segments.length) _renderListChunkRaf = requestAnimationFrame(renderNextChunk);
    }
    _renderListChunkRaf = requestAnimationFrame(renderNextChunk);
  });
}

// ── Chips ─────────────────────────────────────────────────────
export function renderChips() {
  const el = document.getElementById('chips'); if (!el) return;
  
  const counts = calculateCategoryCounts(S, IT);

  el.innerHTML = allCats().map(c => {
    const n = counts[c] || 0;
    const ico = c === 'Todos' ? '🌐' : CAT[c]?.ico || '';
    const isDisabled = n === 0 && c !== 'Todos';
    return `<button class="chip${S.cat===c?' on':''}" 
             style="${isDisabled ? 'opacity: 0.4; pointer-events: none;' : ''}" 
             onclick="window._app.setCat('${c}')">
               ${ico} ${c} <span class="cn">${n}</span>
            </button>`;
  }).join('');
}

// ── Sidebar Badges ────────────────────────────────────────────
export function updateSidebarBadges() {
  const wlCount = Object.values(S.wishlist || {}).filter(Boolean).length;
  const stCount = Object.keys(S.stack || {}).length;
  const update = (pageId, count, badgeId) => {
    const parent = document.getElementById('nt-' + pageId); if (!parent) return;
    let badge = document.getElementById(badgeId);
    if (!badge) { badge = document.createElement('span'); badge.id = badgeId; badge.className = 'nav-badge nb'; parent.appendChild(badge); }
    badge.textContent = count;
    badge.classList.toggle('is-hidden', count <= 0);
  };
  update('wishlist', wlCount, 'nb-wl');
  update('stack',    stCount, 'nb-stack');
}

// ── Stats ─────────────────────────────────────────────────────
export function renderStats() {
  if (!IT || !S || (S.tab !== 'lista' && S.tab !== 'home' && S.tab !== 'config')) return;

  const total = IT.length || 0;
  const done = doneCnt() || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const urg = IT.filter(i => i.pr === 'alta' && !S.checked?.[i.id]).length;
  ['s-tot','s-pend','s-done','s-urg'].forEach((id,i) => {
    const el = document.getElementById(id); if (el) el.textContent = [total,total-done,done,urg][i];
  });

  // IDs redundantes para garantir atualização na Home e Config
  ['hs-total', 'cfg-total-supps', 'total-supplements-count'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = total;
  });

  const pctText = document.getElementById('pct');
  if (pctText) {
    pctText.textContent = pct === 0 ? '0% iniciado' : pct + '%';
    pctText.style.color = pct === 0 ? 'var(--tx3)' : 'var(--accent)';
  }
  const hsCats  = document.getElementById('hs-cats');  if (hsCats)  hsCats.textContent  = Math.max(0, allCats().length - 1);
  const pf = document.getElementById('pf'); if (pf) pf.style.width = pct + '%';
  const nbLista = document.getElementById('nb-lista'); if (nbLista) nbLista.textContent = total - done;
  updateSidebarBadges();
  // confetti delegado para actions.js via _app
  if (pct === 100 && done > 0 && S.cfg.confetti && !window._app?._confDone) {
    window._app._confDone = true;
    if (window._app?.confettiTrigger) window._app.confettiTrigger();
  }
  if (typeof window._app?.syncBnBadges === 'function') window._app.syncBnBadges();
}

// ── Toggs ─────────────────────────────────────────────────────
export function renderToggs() {
  ['tsw','tesw'].forEach((id,i) => {
    const el = document.getElementById(id);
    if (el) el.className = 'tog' + ([S.showDone, S.showExtra][i] ? ' on' : '');
  });
}

// ── renderAll ─────────────────────────────────────────────────
export function renderAll() { renderStats(); renderChips(); renderList(); renderToggs(); }
