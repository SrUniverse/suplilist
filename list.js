// ══════════════════════════════════════════════════════════════
// js/list.js — Renderização da Lista de Suplementos
// ══════════════════════════════════════════════════════════════
import { S } from './state.js';
import {
  IT, CAT, PRIO, PLBL, PCLS, SUPP_IMGS, APP_VERSION, STUDIES,
  mlPrice, azPrice, bestMarketplacePrice,
} from './database.js';
import { escapeHTML, emptyStateHTML } from './utils.js';
import { isCurrentSearch } from './search.js'; // [SL-29] Importa o verificador de concorrência
import { applyFilters, isFilteringActive } from './filter.js';

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
    { cls:'mc-sp', url: spUrl, ico:'🛍️', name:'Shopee',       price: spPrice, cta:'Comprar no Shopee'      },
    { cls:'mc-ml', url: mlUrl, ico:'🛒', name:'Merc. Livre',  price: mlp,    cta:'Comprar no Merc. Livre'  },
    { cls:'mc-az', url: azUrl, ico:'📦', name:'Amazon',       price: azp,    cta:'Comprar no Amazon'       },
  ].filter(m => m.url);

  if (!markets.length) return '';
  const bestPrice = Math.min(...markets.map(m => m.price));

  const cardsHtml = markets.map(m => {
    const isBest = m.price === bestPrice;
    return `<a class="mkt-card ${m.cls}" href="${m.url}" target="_blank" rel="sponsored noopener noreferrer" onclick="event.stopPropagation()">
      ${isBest ? `<span class="mkt-best">✓ Melhor custo</span>` : ''}
      <div class="mkt-ico">${m.ico}</div>
      <div class="mkt-name">${m.name}</div>
      <div class="mkt-price"><sup>R$</sup>${m.price}</div>
      <span class="mkt-cta">${m.cta}</span>
      ${pd ? `<div class="mkt-pdose">~R$${pd}/dose</div>` : ''}
    </a>`;
  }).join('');

  return `<div class="mkt-panel">
    <div class="mkt-title">🏪 ONDE COMPRAR — <span>${it.name.toUpperCase()}</span></div>
    <div class="mkt-cards">${cardsHtml}</div>
  </div>`;
}

// ── Item HTML ─────────────────────────────────────────────────
export function itemHTML(it, idx) {
  const done = S.checked[it.id], open = S.open[it.id], isX = it.pr === 'extra';
  // Fallback seguro caso a categoria não exista no database.js
  const catMeta = CAT[it.cat] || { cls: 'cM', ico: '📦' };
  const cc = catMeta.cls, ico = catMeta.ico;
  const pd = pdose(it);
  const badgeHTML = it.badge === 'hot' ? '<span class="badge badge-hot">🔥 Popular</span>' :
                    it.badge === 'best' ? '<span class="badge badge-best">★ Melhor C/B</span>' :
                    it.badge === 'val'  ? '<span class="badge badge-val">💰 Econômico</span>' : '';
  const activeImg = (typeof SUPP_IMGS !== 'undefined' && SUPP_IMGS[it.id]) || '';
  const imgHTML = activeImg
    ? `<div class="item-img-wrap" aria-label="Imagem de ${it.name}"><img class="item-img lazy-img" data-src="${activeImg}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="${it.name}" loading="lazy" decoding="async" onerror="this.src='./assets/placeholder.png'"></div>`
    : `<div class="item-img-wrap item-img-placeholder" aria-hidden="true"><span style="font-size:28px">${CAT[it.cat]?.ico || '🌿'}</span></div>`;
  const isQcmp = S.quickCmpSel.includes(it.id);
  const efficacyClass = `eff-s${it.sc}`;
  const sd = (typeof STUDIES !== 'undefined' && STUDIES[it.id]) ? STUDIES[it.id] : null;
  const evLevel = sd ? sd.scientific_evidence_level : null;
  const evHTML = evLevel ? `<span class="ev-badge ev-${evLevel.toLowerCase()}" title="Nível de Evidência Científica: ${evLevel}">Ciência: ${evLevel}</span>` : '';

  return `<div class="item ${cc} glass-card prio-${it.pr} ${efficacyClass} ${done?' done':''}${open?' open':''}${isQcmp?' qcmp-selected':''}" id="item-${it.id}" style="--idx: ${idx}" role="listitem">
  <div class="itop" onclick="window._app.togItem(${it.id})" aria-expanded="${open?'true':'false'}" role="button" aria-controls="dp-${it.id}" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window._app.togItem(${it.id})}" aria-label="${escapeHTML(it.name)}, ${it.cat}">
    <div class="cbw" onclick="event.stopPropagation()">
      <input class="cb" type="checkbox" id="cb${it.id}"${done?' checked':''} onclick="window._app.chk(${it.id})" aria-label="Marcar ${it.name} como comprado">
      <label class="cbl" for="cb${it.id}" aria-hidden="true"></label>
    </div>
    ${imgHTML}
    <div class="ibody">
      <div class="i-header" style="position: relative; z-index: 1;">
        <div class="i-name-row" style="margin-bottom: 2px;">
          <span class="iname">${escapeHTML(it.name)}</span>
          ${isX?'<span class="xtag" title="Opcional">✨</span>':''}
        </div>
        <div class="i-badges-row">
           ${badgeHTML}
           ${evHTML}
           <span class="ctag ${cc}">${ico} ${it.cat}</span>
        </div>
      </div>
      <div class="imeta">
        ${starsHTML(it.sc)}
        <div class="price-group">
          <span class="mp" aria-label="Preço estimado: R$ ${it.pm}">R$${it.pm}</span>
          ${pd&&S.cfg.showPdose?`<span class="pdose-tag" aria-label="Preço por dose: R$ ${pd}">R$${pd}/dose</span>`:''}
        </div>
      </div>
      ${(it.dm||it.dn)?`<div class="dose-badge-row" aria-label="Dosagem recomendada">
        ${it.dm?`<span class="dose-badge" title="Dose manhã${it.dp?' / pré-treino':''}"><span class="dose-ico">${it.dp?'⚡':'🌅'}</span>${it.dm}</span>`:''}
        ${it.dn&&it.dn!==it.dm?`<span class="dose-badge" title="Dose noite" style="border-color:var(--violet);color:var(--violet);box-shadow:0 0 10px var(--vd)"><span class="dose-ico">🌙</span>${it.dn}</span>`:''}
        ${it.dn&&it.dn===it.dm?`<span class="dose-badge" title="Dose: manhã e noite" style="border-color:var(--violet);color:var(--violet);box-shadow:0 0 10px var(--vd)"><span class="dose-ico">🌙</span>${it.dn}</span>`:''}
      </div>`:''}
    </div>
    <div class="iright">
      <button class="wl-btn${S.wishlist[it.id]?' on':''}" onclick="event.stopPropagation();window._app.togWl(${it.id})" title="${S.wishlist[it.id]?'Remover dos favoritos':'Adicionar aos favoritos'}" aria-label="${S.wishlist[it.id]?'Remover '+it.name+' dos favoritos':'Adicionar '+it.name+' aos favoritos'}" aria-pressed="${S.wishlist[it.id]?'true':'false'}">${S.wishlist[it.id]?'❤️':'🤍'}</button>
      <span class="eico" aria-hidden="true">▼</span>
    </div>
  </div>
  <div class="dpanel" id="dp-${it.id}" role="region" aria-label="Detalhes de ${it.name}">
    <div class="dbox" style="background: rgba(0, 0, 0, 0.2); border-radius: 0 0 20px 20px;">
      ${renderBuySection(it)}
      <div class="dtitle">${escapeHTML(it.name)}</div>
      <div class="dtext">${escapeHTML(it.desc)}</div>
      <div class="dtags" aria-label="Tags">${(it.tags||[]).map(t=>`<span class="dtag">${t}</span>`).join('')}</div>
      ${it.dose?`<div class="ddose" role="note">💊 ${escapeHTML(it.dose)}</div>`:''}
      ${it.warn?`<div class="dwarn" role="alert">⚠️ ${it.warn}</div>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="btn" style="height:32px;font-size:11px;background:var(--rosedim);color:var(--rose);border-color:rgba(244,114,182,.25)" onclick="event.stopPropagation();window._app.addToStack(${it.id})" aria-label="Adicionar ${it.name} à stack">💪 Adicionar à stack</button>
        <button class="ref-btn" onclick="event.stopPropagation();window._app.openRef(${it.id})" aria-label="Ver referências científicas para ${it.name}">🔬 Estudos Científicos</button>
      </div>
      <div class="note-row">
        <textarea class="note-ta item-note" data-id="${it.id}" placeholder="Nota: marca, preço pago, lote…" rows="2" aria-label="Nota pessoal sobre ${it.name}" oninput="window._app.updateNote('${it.id}', this.value)">${escapeHTML(S.notes[it.id])}</textarea>
        <button class="note-btn" onclick="window._app.saveNote('${it.id}')" aria-label="Salvar nota para ${it.name}" title="Salvar nota">💾</button>
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
  const searchInput = document.getElementById('search');
  const q  = (searchInput?.value || '').toLowerCase();
  const gf = S.goalFilter || '', pf = S.priceFilter || '';
  const base = IT.filter(i => {
    if (i.pr === 'extra' && !S.showExtra) return false;
    if (!S.showDone && S.checked[i.id]) return false;
    if (gf && !(i.goals || []).includes(gf)) return false;
    if (pf) {
      const [lo,hi] = pf.includes('+') ? [parseInt(pf),999] : [...pf.split('-').map(Number)];
      if (i.pm < lo || i.pm > hi) return false;
    }
    if (q && !i.name.toLowerCase().includes(q) && !(i.tags||[]).some(t=>t.toLowerCase().includes(q))) return false;
    return true;
  });
  el.innerHTML = allCats().map(c => {
    const n = c === 'Todos' ? base.length : base.filter(i => i.cat === c).length;
    const ico = c === 'Todos' ? '🌐' : CAT[c]?.ico || '';
    return `<button class="chip${S.cat===c?' on':''}" onclick="window._app.setCat('${c}')">${ico} ${c} <span class="cn">${n}</span></button>`;
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
