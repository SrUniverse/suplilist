// ══════════════ MAPEAMENTOS E REGRAS DE NEGÓCIO ══════════════
// S, STORAGE_KEY, save, syncNow, load, runMigrations → state.js
// APP_VERSION, IT, CAT, STUDIES, etc.              → database.js

let _tooltipTimer;
let fuse = null;
let _confDone = false;
let _stickyItem = null;

function escapeHTML(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ══════════════ THEME E CONFIGS GERAIS ══════════════
// [MODULARIZADO] Funções de Tema e Config movidas para ui.js e actions.js

function runDatabaseAudit() {
  if (!S.cfg.isAdmin) return;

  const total = IT.length;
  const manualLinks = IT.filter(i => PRODUCT_LINKS[i.id]).length;
  const missingManual = IT.filter(i => !PRODUCT_LINKS[i.id]);
  const withImages = IT.filter(i => SUPP_IMGS[i.id]).length;

  console.group("📊 Relatório de Auditoria - SupliList");
  console.log(`Total de Itens: ${total}`);
  console.log(`Links Manuais: ${manualLinks} (${Math.round(manualLinks / total * 100)}%)`);
  console.log(`Imagens Mapeadas: ${withImages} (${Math.round(withImages / total * 100)}%)`);

  if (missingManual.length > 0) {
    console.warn("⚠️ Itens operando apenas com busca automática (sem link direto no links.js):");
    missingManual.forEach(i => console.log(`- ID ${i.id}: ${i.name}`));
  } else {
    console.log("✅ Todos os itens possuem links manuais!");
  }
  console.groupEnd();

  toast('📊', `Auditoria: ${manualLinks}/${total} links manuais. Veja o console (F12).`, 'info', { duration: 5000 });
}

function copyToClipboard() {
  const checked = IT.filter(i => S.checked[i.id]).map(i => '✅ ' + i.name);
  const pending = IT.filter(i => !S.checked[i.id] && i.pr !== 'extra').map(i => '☐ ' + i.name);
  const txt = [...checked, ...pending].join('\n');
  navigator.clipboard.writeText(txt).then(() => toast("Copiado com sucesso! ✅", "success"));
}

function updateStorageSize() {
  const el = document.getElementById('storage-size');
  if (!el) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '';
    const kb = (new Blob([raw]).size / 1024).toFixed(1);
    el.textContent = kb + ' KB';
  } catch (e) { el.textContent = '—'; }
}


// ══════════════ NAV E ROTEAMENTO ══════════════
const PAGES = ['home', 'lista', 'stack', 'wishlist', 'recipe', 'dose', 'compare', 'history', 'interact', 'faq', 'terms', 'config'];

// ── Cache de renderização por aba ─────────────────────────────────────────
// Registra quais abas já foram renderizadas ao menos uma vez.
// Evita re-renderizar quando o usuário volta a uma aba sem alterar dados.
const _renderedTabs = new Set();

// Invalida o cache de uma aba específica (chamar quando dados relevantes mudam)
function invalidateTab(tab) { _renderedTabs.delete(tab); }

// Invalida múltiplas abas de uma vez
function invalidateTabs(...tabs) { tabs.forEach(t => _renderedTabs.delete(t)); }

/**
 * Navegação Global entre abas
 * Estratégia de performance:
 * - Troca de aba via CSS (visibility/display em classe .on) — O(1), sem re-layout
 * - Cache: abas já renderizadas não são re-renderizadas (a não ser que dados mudem)
 * - Lazy: abas nunca abertas são renderizadas sob demanda na primeira visita
 */
function go(p, pushState = true) {
  const tabChanged = S.tab !== p;
  if (!PAGES.includes(p)) p = 'lista';

  // 1. TROCA DE VISIBILIDADE VIA CSS — sem destruir/reconstruir DOM
  // Apenas alterna a classe .on que controla display:block/none no CSS.
  // Custo: O(n) leituras de classList, sem layout/paint até o próximo frame.
  const allPages = document.querySelectorAll('.page');
  if (allPages.length === 0) return console.warn("Erro de DOM: .page não encontrados.");

  allPages.forEach(el => el.classList.remove('on'));

  const targetPage = document.getElementById('p-' + p);
  if (!targetPage) return console.error(`Falha Crítica: Seção id="p-${p}" ausente.`);
  targetPage.classList.add('on');

  // Sincronizar Tabs e Badges
  PAGES.forEach(pg => {
    const tab = document.getElementById('nt-' + pg);
    if (tab) {
      const active = pg === p;
      tab.classList.toggle('on', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    }
  });

  S.tab = p; save();

  // Limpa tooltips de abas anteriores imediatamente ao navegar para evitar sobreposição
  document.querySelector('.tooltip-hint')?.remove();
  if (_tooltipTimer) clearTimeout(_tooltipTimer);

  // ID 12 - Tooltips inteligentes (Primeiro uso de todas as seções)
  const hints = {
    lista: "💡 Toque em um suplemento para ver detalhes, dosagens e onde comprar.",
    stack: "💡 Monitore sua stack ativa e acompanhe o progresso dos seus ciclos.",
    wishlist: "💡 Guarde aqui os suplementos que você pretende comprar no futuro.",
    recipe: "💡 Monte protocolos personalizados e organize seus horários de uso.",
    dose: "💡 Calcule dosagens precisas baseadas no seu peso e perfil biológico.",
    compare: "💡 Selecione até 4 itens para comparar benefícios, preços e eficácia.",
    history: "💡 Registre suas compras para acompanhar seus gastos mensais.",
    interact: "💡 Verifique sinergias e riscos entre suplementos na sua stack.",
    faq: "💡 Encontre respostas para dúvidas comuns sobre o app e suplementação.",
    terms: "💡 Leia as diretrizes de uso e avisos de responsabilidade médica.",
    config: "💡 Personalize o tema e as preferências globais do seu app."
  };

  if (S.cfg.showTooltips && hints[p] && !S.ui.seenTooltips[p]) {
    _tooltipTimer = setTimeout(() => {
      const h = document.createElement('div');
      h.className = 'tooltip-hint';
      h.style.cssText = "position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:var(--bg2); border:1px solid var(--accent); padding:14px 18px; border-radius:16px; z-index:1000; display:flex; align-items:center; gap:14px; box-shadow:var(--shadow-xl); font-size:13px; width:max-content; max-width:92vw; animation:up .4s cubic-bezier(.34,1.56,.64,1) both;";
      h.innerHTML = `<span>${hints[p]}</span><button class="btn bg" style="height:32px; padding:0 14px; font-size:11px; flex-shrink:0">Entendi</button>`;

      const closeHint = () => { if (h.parentElement) { h.remove(); S.ui.seenTooltips[p] = true; save(); } };
      h.querySelector('button').onclick = closeHint;
      setTimeout(closeHint, 8000); // Auto-dismiss após 8 segundos
      document.body.appendChild(h);

      // Boundary Check: Garante que a tooltip não saia da tela lateralmente
      const rect = h.getBoundingClientRect();
      const margin = 16; // 1rem
      if (rect.right > window.innerWidth) {
        h.style.left = 'auto';
        h.style.right = margin + 'px';
        h.style.transform = 'none';
      } else if (rect.left < 0) {
        h.style.left = margin + 'px';
        h.style.transform = 'none';
      }
    }, 1000);
  }

  // 2. RENDERIZAÇÃO COM CACHE — só renderiza se necessário
  // Uma aba é re-renderizada somente se:
  //   a) Nunca foi renderizada antes (_renderedTabs não a contém), OU
  //   b) Seu cache foi explicitamente invalidado por invalidateTab()
  const safeRender = (sectionId, sectionName, renderFn, forceRender = false) => {
    const alreadyRendered = _renderedTabs.has(sectionId);
    if (alreadyRendered && !forceRender) return; // Cache hit — pula renderização

    try {
      renderFn();
      _renderedTabs.add(sectionId); // Marca como renderizada
    } catch (error) {
      console.group(`🚨 [Boundary] Falha na Seção: ${sectionName}`);
      console.error("Erro:", error);
      console.info("Ação:", S.tab);
      try {
        console.info("Dados Locais:", JSON.parse(localStorage.getItem(STORAGE_KEY)));
      } catch (e) { }
      console.groupEnd();

      const container = document.getElementById(`p-${sectionId}`);
      if (container) {
        container.innerHTML = `
          <div class="empty" style="padding:40px; border:1px dashed var(--red); background:var(--redd); border-radius:16px; margin:20px 0;">
            <div class="empty-ico" style="color:var(--red); filter:none;">🚫</div>
            <div class="empty-title" style="color:var(--tx)">Algo deu errado.</div>
            <p class="empty-sub">Ocorreu um erro inesperado na seção ${sectionName}.</p>
            <button class="btn bg" onclick="invalidateTab('${sectionId}');go('${sectionId}')" style="margin-top:16px">Tentar recarregar seção</button>
          </div>
        `;
      }
    }
  };

  // Abas com estado mutável: sempre re-renderizam ao voltar
  // (dados podem ter mudado em outra aba — ex: marcar comprado afeta lista e stack)
  const ALWAYS_REFRESH = new Set(['lista', 'stack', 'wishlist', 'history', 'compare']);

  if (p === 'home') safeRender('home', 'Início', () => { initHomeReveal(); });

  if (p === 'lista') safeRender('lista', 'Lista de Suplementos', () => { renderAll(); }, true /* sempre */);

  if (p === 'stack') safeRender('stack', 'Minha Stack', () => {
    initStackSel();
    renderStack();
    renderCycles();
  }, true /* sempre */);

  if (p === 'wishlist') safeRender('wishlist', 'Favoritos', () => renderWishlist(), true /* sempre */);

  // Abas "estáticas" — renderizam uma vez e ficam em cache
  if (p === 'recipe') safeRender('recipe', 'Gerador de Receita', () => renderRecipeSel());

  if (p === 'dose') safeRender('dose', 'Calculadora de Dose', () => renderDose());

  if (p === 'compare') safeRender('compare', 'Comparador', () => renderCmp(), true /* sempre */);

  if (p === 'history') safeRender('history', 'Histórico', () => {
    initHist();
    renderHist();
  }, true /* sempre */);

  // Interações, FAQ e Termos são estáticos — renderizam uma única vez
  if (p === 'interact') safeRender('interact', 'Interações', () => renderInteract());

  if (p === 'faq') safeRender('faq', 'FAQ', () => renderFaq());

  if (p === 'terms') safeRender('terms', 'Termos de Uso', () => initTermsNav());

  if (p === 'config') safeRender('config', 'Configurações', () => {
    if(window._app) window._app.syncCfgThemeGrid();
    updateStorageSize();
  }, true /* sempre: pode mudar armazenamento */);

  if (typeof bnSelect === 'function') bnSelect(p);
  if (typeof syncBnBadges === 'function') syncBnBadges();

  // UX: Foco automático no slider de peso
  if (p === 'dose') {
    setTimeout(() => {
      document.getElementById('prof-weight-slider')?.focus({ preventScroll: true });
    }, 350);
  }

  if (tabChanged) {
    window.scrollTo(0, 0);
  }
  if (pushState) {
    window.history.pushState({ tab: p }, '', '#' + p);
  }
}
window.go = go;

window.addEventListener('popstate', e => {
  const tab = e.state?.tab || 'lista';
  go(tab, false);
});


// ══════════════ RENDERIZAÇÃO DA LISTA E UI ══════════════
const MAIN = IT.filter(i => i.pr !== 'extra');
function doneCnt() { return IT.filter(i => S.checked[i.id]).length; }
function allCats() { return ['Todos', ...new Set(MAIN.map(i => i.cat))]; }
function pdose(i) { const p = bestMarketplacePrice(i); return i.doses && p ? Math.round((p / i.doses) * 100) / 100 : null; }

function filtered() {
  const q = (document.getElementById('search')?.value || '').toLowerCase();
  const srt = S.cfg.defaultSort || 'priority';
  const gf = S.goalFilter || '';
  const pf = S.priceFilter || '';

  if (!fuse && typeof Fuse !== 'undefined') {
    fuse = new Fuse(IT, { keys: ['name', 'tags', 'desc'], threshold: 0.3 });
  }

  let baseList;
  if (q && fuse) {
    const results = fuse.search(q);
    baseList = results.map(r => r.item);
  } else {
    baseList = IT;
  }
  let list = baseList.filter(i => {
    if (i.pr === 'extra' && !S.showExtra) return false;
    if (!S.showDone && S.checked[i.id]) return false;
    if (S.cat !== 'Todos' && i.cat !== S.cat) return false;
    if (gf && !(i.goals || []).includes(gf)) return false;
    if (pf) {
      const [lo, hi] = pf.includes('+') ? [parseInt(pf), 9999] : [...pf.split('-').map(Number)];
      if (i.pm < lo || i.pm > hi) return false;
    }
    return true;
  });
  if (srt === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  else if (srt === 'cat') list.sort((a, b) => a.cat.localeCompare(b.cat, 'pt'));
  else if (srt === 'score') list.sort((a, b) => b.sc - a.sc);
  else if (srt === 'cost') list.sort((a, b) => (a.pm || 9999) - (b.pm || 9999));
  else if (srt === 'pdose') list.sort((a, b) => (pdose(a) || 999) - (pdose(b) || 999));
  else list.sort((a, b) => PRIO[a.pr] - PRIO[b.pr]);
  return list;
}

function starsHTML(n) {
  if (!S.cfg.showStars) return '';
  return `<div class="stars">${[...Array(5)].map((_, i) => `<div class="star${i < n ? ' on' : ''}"></div>`).join('')}</div>`;
}

function renderBuySection(it, idx) {
  // links.js já aplicou amazonAff() + mlAff() + utm() — usar direto, sem re-processar
  const azUrl = it.linkAmazon || '';
  const spUrl = it.linkShopee || '';
  const mlUrl = it.linkML || '';
  const spPrice = it.pm || 20;
  const mlp = mlPrice(it);
  const azp = azPrice(it);
  const pd = pdose(it);

  const markets = [
    { cls: 'mc-sp', url: spUrl, ico: '🛍️', name: 'Shopee', price: spPrice, cta: 'Comprar no Shopee' },
    { cls: 'mc-ml', url: mlUrl, ico: '🛒', name: 'Merc. Livre', price: mlp, cta: 'Comprar no Merc. Livre' },
    { cls: 'mc-az', url: azUrl, ico: '📦', name: 'Amazon', price: azp, cta: 'Comprar no Amazon' },
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

function itemHTML(it, idx) {
  const done = S.checked[it.id], open = S.open[it.id], isX = it.pr === 'extra';
  const cc = CAT[it.cat]?.cls || 'cV', ico = CAT[it.cat]?.ico || '🌿';
  const pd = pdose(it);
  const badgeHTML = it.badge === 'hot' ? '<span class="badge badge-hot">🔥 Popular</span>' : it.badge === 'best' ? '<span class="badge badge-best">★ Melhor C/B</span>' : it.badge === 'val' ? '<span class="badge badge-val">💰 Econômico</span>' : '';
  const activeImg = (typeof SUPP_IMGS !== 'undefined' && SUPP_IMGS[it.id]) || '';
  const imgHTML = activeImg
    ? `<div class="item-img-wrap" aria-label="Imagem de ${it.name}"><img class="item-img" src="${activeImg}" alt="${it.name}" loading="lazy" decoding="async" onerror="this.parentElement.style.display='none'"></div>`
    : `<div class="item-img-wrap item-img-placeholder" aria-hidden="true"><span style="font-size:28px">${CAT[it.cat]?.ico || '🌿'}</span></div>`;

  return `<div class="item${done ? ' done' : ''}${open ? ' open' : ''}" id="item-${it.id}" style="animation-delay:${idx * .022}s" role="listitem">
  <div class="itop" onclick="togItem(${it.id})" aria-expanded="${open ? 'true' : 'false'}" role="button" aria-controls="dp-${it.id}" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();togItem(${it.id})}">
    <div class="cbw" onclick="event.stopPropagation()">
      <input class="cb" type="checkbox" id="cb${it.id}"${done ? ' checked' : ''} onclick="chk(${it.id})" aria-label="Marcar ${it.name} como comprado">
      <label class="cbl" for="cb${it.id}" aria-hidden="true"></label>
    </div>
    ${imgHTML}
    <div class="ibody">
      <div class="irow">
        <span class="iname">${it.name}</span>
        <span class="ctag ${cc}" aria-label="Categoria: ${it.cat}">${ico} ${it.cat}</span>
        ${badgeHTML}
        ${isX ? '<span class="xtag" aria-label="Item extra opcional">✨ Extra</span>' : ''}
      </div>
      <div class="imeta">
        ${starsHTML(it.sc)}
        <span class="mp" aria-label="Preço estimado: R$ ${it.pm}">~R$${it.pm}</span>
        ${pd && S.cfg.showPdose ? `<span class="pdose-tag" aria-label="Preço por dose: R$ ${pd}">R$${pd}/dose</span>` : ''}
      </div>
      ${(it.dm || it.dn) ? `<div class="dose-badge-row" aria-label="Dosagem recomendada">
        ${it.dm ? `<span class="dose-badge" title="Dose manhã${it.dp ? ' / pré-treino' : ''}"><span class="dose-ico">${it.dp ? '⚡' : '🌅'}</span>${it.dm}</span>` : ''}
        ${it.dn && it.dn !== it.dm ? `<span class="dose-badge" title="Dose noite" style="border-color:var(--violet);color:var(--violet);box-shadow:0 0 10px var(--vd)"><span class="dose-ico">🌙</span>${it.dn}</span>` : ''}
        ${it.dn && it.dn === it.dm ? `<span class="dose-badge" title="Dose: manhã e noite" style="border-color:var(--violet);color:var(--violet);box-shadow:0 0 10px var(--vd)"><span class="dose-ico">🌙</span>${it.dn}</span>` : ''}
      </div>`: ''}
    </div>
    <div class="iright">
      <button class="wl-btn${S.wishlist[it.id] ? ' on' : ''}" onclick="event.stopPropagation();togWl(${it.id})" title="${S.wishlist[it.id] ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" aria-label="${S.wishlist[it.id] ? 'Remover ' + it.name + ' dos favoritos' : 'Adicionar ' + it.name + ' aos favoritos'}" aria-pressed="${S.wishlist[it.id] ? 'true' : 'false'}">${S.wishlist[it.id] ? '❤️' : '🤍'}</button>
      <span class="eico" aria-hidden="true">▼</span>
    </div>
  </div>
  <div class="dpanel" id="dp-${it.id}" role="region" aria-label="Detalhes de ${it.name}">
    <div class="dbox">
      ${renderBuySection(it, idx)}

      <div class="dtitle">${it.name}</div>
      <div class="dtext">${it.desc}</div>
      <div class="dtags" aria-label="Tags">${(it.tags || []).map(t => `<span class="dtag">${t}</span>`).join('')}</div>
      ${it.dose ? `<div class="ddose" role="note">💊 ${it.dose}</div>` : ''}
      ${it.warn ? `<div class="dwarn" role="alert">⚠️ ${it.warn}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="btn" style="height:32px;font-size:11px;background:var(--rosedim);color:var(--rose);border-color:rgba(244,114,182,.25)" onclick="event.stopPropagation();addToStack(${it.id})" aria-label="Adicionar ${it.name} à stack">💪 Adicionar à stack</button>
        <button class="ref-btn" onclick="event.stopPropagation();openRef(${it.id})" aria-label="Ver referências científicas para ${it.name}">🔬 Estudos Científicos</button>
      </div>
      <div class="note-row">
        <textarea class="note-ta item-note" data-id="${it.id}" placeholder="Nota: marca, preço pago, lote…" rows="2" aria-label="Nota pessoal sobre ${it.name}" oninput="updateNote('${it.id}', this.value)">${escapeHTML(S.notes[it.id])}</textarea>
        <button class="note-btn" onclick="saveNote('${it.id}')" aria-label="Salvar nota para ${it.name}" title="Salvar nota">💾</button>
      </div>
    </div>
  </div>
</div>`;
}

// REF-002: renderList com chunked rendering para listas grandes.
// Estratégia:
//  - Fase 1 (síncrona): filtragem, ordenação e construção de HTML — CPU pura, sem DOM.
//  - Fase 2: renderiza os primeiros CHUNK_SIZE itens imediatamente (above-the-fold).
//  - Fase 3: itens restantes são inseridos em lotes por requestAnimationFrame,
//    deixando o browser respirar entre cada lote para manter 60 fps.
const CHUNK_SIZE = 20; // itens renderizados por frame (acima do fold + margem)
let _renderListRaf = null;
let _renderListChunkRaf = null;

function renderList() {
  const listEl = document.getElementById('list');
  if (!listEl || S.tab !== 'lista') return;

  // Cancela qualquer renderização incremental em andamento
  listEl.classList.remove('is-scanning');
  cancelAnimationFrame(_renderListRaf);
  cancelAnimationFrame(_renderListChunkRaf);

  // ── Fase 1 (síncrona): toda a computação de dados ──────────────────
  const list = filtered();
  const srt = S.cfg.defaultSort || 'priority';
  const q = (document.getElementById('search')?.value || '').trim();

  // Atualiza o contador de filtros de forma síncrona (leitura leve de DOM)
  const fc = document.getElementById('filter-count');
  if (fc) {
    const gf = S.goalFilter || '';
    const pf = S.priceFilter || '';
    const isFiltered = q || gf || pf || S.cat !== 'Todos';
    fc.textContent = list.length + ' resultado' + (list.length !== 1 ? 's' : '');
    fc.classList.toggle('has-filter', !!isFiltered);
    fc.style.display = list.length > 0 || isFiltered ? '' : 'none';
  }

  // Constrói os segmentos HTML em memória (CPU, sem tocar no DOM)
  // segments: array de strings HTML. Cada posição = um item ou separador de seção.
  let segments = [];
  if (!list.length) {
    const title = q ? 'Nenhum resultado' : 'Lista vazia';
    const sub = q
      ? `Nenhum suplemento corresponde a "<strong style="color:var(--tx)">${escapeHTML(q)}</strong>"`
      : 'Parece que nenhum item atende aos filtros atuais.';
    const btnLabel = q ? 'Limpar busca' : 'Ver todos';
    const btnFn = q ? 'clearSearch()' : "setCat('Todos')";
    segments = [emptyStateHTML('🌿', title, sub, btnLabel, btnFn)];
  } else {
    if (srt === 'priority') {
      const g = {};
      list.forEach(i => { if (!g[i.pr]) g[i.pr] = []; g[i.pr].push(i); });
      ['alta', 'media', 'baixa', 'extra'].forEach(p => {
        if (!g[p]?.length) return;
        segments.push(`<div class="sec ${PCLS[p]}"><span class="sdot"></span>${PLBL[p]} (${g[p].length})</div>`);
        g[p].forEach((it, idx) => segments.push(itemHTML(it, idx)));
      });
    } else {
      list.forEach((it, idx) => segments.push(itemHTML(it, idx)));
    }
  }

  // ── Fase 2: renderiza primeiro lote (above-the-fold) no próximo frame ──
  // Mantém o thread principal livre para o browser processar o clique/input
  // que triggou esta renderização antes de commitar no DOM.
  _renderListRaf = requestAnimationFrame(() => {
    const firstChunk = segments.slice(0, CHUNK_SIZE);
    listEl.innerHTML = firstChunk.join('');
    listEl.classList.remove('is-scanning');

    // ── Fase 3: itens restantes em lotes progressivos ──────────────────
    if (segments.length <= CHUNK_SIZE) return; // lista pequena — já terminou

    let offset = CHUNK_SIZE;
    function renderNextChunk() {
      // Verifica se o usuário não mudou de aba ou disparou nova busca enquanto renderizava
      if (S.tab !== 'lista') return;

      const chunk = segments.slice(offset, offset + CHUNK_SIZE);
      if (!chunk.length) return; // todos renderizados

      // Insere o lote no final do container sem recriar o DOM existente
      listEl.insertAdjacentHTML('beforeend', chunk.join(''));
      offset += CHUNK_SIZE;

      if (offset < segments.length) {
        _renderListChunkRaf = requestAnimationFrame(renderNextChunk);
      }
    }
    _renderListChunkRaf = requestAnimationFrame(renderNextChunk);
  });
}

function renderChips() {
  const el = document.getElementById('chips'); if (!el) return;

  // Calcula a lista base respeitando todos os filtros EXCETO a categoria
  const q = (document.getElementById('search')?.value || '').toLowerCase();
  const gf = S.goalFilter || '', pf = S.priceFilter || '';
  const base = IT.filter(i => {
    if (i.pr === 'extra' && !S.showExtra) return false;
    if (!S.showDone && S.checked[i.id]) return false;
    if (gf && !(i.goals || []).includes(gf)) return false;
    if (pf) {
      const [lo, hi] = pf.includes('+') ? [parseInt(pf), 999] : [...pf.split('-').map(Number)];
      if (i.pm < lo || i.pm > hi) return false;
    }
    if (q && !i.name.toLowerCase().includes(q) && !(i.tags || []).some(t => t.toLowerCase().includes(q))) return false;
    return true;
  });

  el.innerHTML = allCats().map(c => {
    const n = c === 'Todos' ? base.length : base.filter(i => i.cat === c).length;
    const ico = c === 'Todos' ? '🌐' : CAT[c]?.ico || '';
    return `<button class="chip${S.cat === c ? ' on' : ''}" onclick="setCat('${c}')">${ico} ${c} <span class="cn">${n}</span></button>`;
  }).join('');
}

/**
 * Atualiza os contadores (badges) na barra lateral para as seções Stack e Wishlist.
 * ID 11 - Contador de itens ativos/badges nas abas da sidebar.
 */
function updateSidebarBadges() {
  const wlCount = Object.values(S.wishlist || {}).filter(Boolean).length;
  const stCount = Object.keys(S.stack || {}).length;

  const update = (pageId, count, badgeId) => {
    const parent = document.getElementById('nt-' + pageId);
    if (!parent) return;

    let badge = document.getElementById(badgeId);
    if (!badge) {
      badge = document.createElement('span');
      badge.id = badgeId;
      badge.className = 'nav-badge nb';
      parent.appendChild(badge);
    }
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
  };

  update('wishlist', wlCount, 'nb-wl');
  update('stack', stCount, 'nb-stack');
}

function renderStats() {
  const total = IT.length, done = doneCnt(), pct = Math.round((done / total) * 100);
  const urg = IT.filter(i => i.pr === 'alta' && !S.checked[i.id]).length;
  ['s-tot', 's-pend', 's-done', 's-urg'].forEach((id, i) => {
    const el = document.getElementById(id); if (el) el.textContent = [total, total - done, done, urg][i];
  });

  // Trata o progresso zerado no widget da Landing Page
  const pctText = document.getElementById('pct');
  if (pctText) {
    pctText.textContent = pct === 0 ? '0% iniciado' : pct + '%';
    pctText.style.color = pct === 0 ? 'var(--tx3)' : 'var(--accent)';
  }

  const hsTotal = document.getElementById('hs-total'); if (hsTotal) hsTotal.textContent = total;
  const hsCats = document.getElementById('hs-cats'); if (hsCats) hsCats.textContent = allCats().length - 1;
  const cfgTotal = document.getElementById('cfg-total-supps'); if (cfgTotal) cfgTotal.textContent = total;
  const pf = document.getElementById('pf'); if (pf) pf.style.width = pct + '%';
  const nbLista = document.getElementById('nb-lista'); if (nbLista) nbLista.textContent = total - done;

  updateSidebarBadges();

  if (pct === 100 && done > 0 && S.cfg.confetti && !_confDone) { _confDone = true; confetti(); }

  if (typeof syncBnBadges === 'function') syncBnBadges();
}

/**
 * Gera o HTML padronizado para estados vazios (Empty States)
 */
function emptyStateHTML(ico, title, sub, btnLabel, btnFn) {
  return `<div class="empty">
    <div class="empty-ico">${ico}</div>
    <div class="empty-title">${title}</div>
    <p class="empty-sub">${sub}</p>
    ${btnLabel ? `<button class="empty-action" onclick="${btnFn}">${btnLabel}</button>` : ''}
  </div>`;
}

function renderToggs() {
  ['tsw', 'tesw'].forEach((id, i) => { const el = document.getElementById(id); if (el) el.className = 'tog' + ([S.showDone, S.showExtra][i] ? ' on' : ''); });
}

function renderAll() { renderStats(); renderChips(); renderList(); renderToggs(); }


// ══════════════ AÇÕES DE ITEMS ══════════════
// togItem: já opera de forma granular (manipula apenas o card afetado).
// chk e togWl: migrados para atualização granular via _applyChkDOM / _applyWlDOM.
// renderAll() é preservado apenas para ações estruturais (filtros, sort, toggles globais).
function togItem(id) {
  // SL-29: Previne expansão se um Long Press (comparação) acabou de ocorrer
  if (window._app && window._app._blockNextClick) {
    window._app._blockNextClick = false;
    return;
  }

  const isOpen = toggleItemOpen(id);
  
  // [BUGFIX] Seleciona todas as instâncias do suplemento para evitar que IDs duplicados 
  // impeçam a interação em abas como Favoritos.
  const cards = document.querySelectorAll(`[id="item-${id}"]`);
  
  cards.forEach(card => {
    const panel = card.querySelector('.dpanel, .marketplaces-container') || document.getElementById('dp-' + id);
    const btn = card.querySelector('.btn-buy-trigger, #btn-label-' + id);
    const trigger = card.querySelector('.card-main-content, .itop');

    card.classList.toggle('is-expanded', isOpen);
    card.classList.toggle('open', isOpen);
    if (panel) {
      panel.classList.toggle('is-visible', isOpen);
      panel.style.display = isOpen ? 'block' : 'none';
    }
    if (btn) btn.textContent = isOpen ? '▲ FECHAR OPÇÕES' : '＋ VER MELHORES PREÇOS';
    if (trigger) trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

function chk(id) {
  if (S.cfg.confirmUncheck && S.checked[id]) {
    confirmModal({
      title: 'Desmarcar item',
      msg: `Remover <strong>${IT.find(i => i.id === id)?.name || 'este item'}</strong> da lista de comprados?`,
      ico: '↩',
      okLabel: 'Desmarcar',
      cancelLabel: 'Manter',
      danger: false,
      okColor: 'var(--amber)',
    }).then(ok => {
      if (!ok) return;
      setItemCheck(id, false); save(); // state.js: setItemCheck não chama save() em lote; aqui é unitário
      // Granular: se showDone=false o item some da lista; caso contrário só atualiza classes
      if (!S.showDone) {
        renderAll(); // item precisa sair do DOM
      } else {
        _applyChkDOM(id);
        renderStats();
      }
      toast('↩', 'Desmarcado', 'warn', { duration: 2800 });
    });
    return;
  }
  const nowChecked = toggleItemCheck(id); // state.js: persiste S.checked[id] e chama save()
  if (nowChecked) {
    _autoRegisterHistory(id);
    invalidateTabs('history', 'recipe'); // histórico e receita mudam com check
  } else {
    // ID 16 - Lógica de Desfazer: remove do histórico se desmarcado em até 5 segundos
    const now = Date.now();
    const histIdx = S.history.findIndex(h => h.id === id && (now - h.uid < 5000));
    if (histIdx !== -1) {
      S.history.splice(histIdx, 1);
      if (S.tab === 'history') renderHist();
    }
    invalidateTabs('history', 'recipe');
  }
  // Granular: se showDone=false e o item foi marcado, ele deve sair da lista
  if (!S.showDone && nowChecked) {
    renderAll(); // item precisa desaparecer do DOM
  } else {
    _applyChkDOM(id);
    renderStats();
  }
  if (nowChecked) {
    toast("Compra registada no Histórico 🛒", "success");
    const el = document.getElementById('item-' + id);
    if (el) { el.classList.add('just-checked'); setTimeout(() => el.classList.remove('just-checked'), 600); }
  }
}

/**
 * Atualiza granularmente o card de um item no DOM após toggle de checkbox,
 * sem recriar a lista inteira.
 * Sincroniza: classe .done no card, estado do input[checkbox] e aria-label.
 * @param {number} id - ID do suplemento
 */
function _applyChkDOM(id) {
  const instances = document.querySelectorAll(`[id="item-${id}"]`);
  instances.forEach(el => {
    const done = !!S.checked[id];
    // Classe visual no card
    el.classList.toggle('done', done);
    // Sincroniza o input checkbox (evita dessincronismo visual)
    const cb = el.querySelector('.cb');
    if (cb) cb.checked = done;
    // Aria-label do checkbox para acessibilidade
    const it = IT.find(i => i.id === id);
    if (cb && it) cb.setAttribute('aria-label', (done ? 'Desmarcar ' : 'Marcar ') + it.name + ' como comprado');
  });
}

/**
 * ID 16 - Registra automaticamente a compra no histórico ao marcar item como comprado.
 * Adiciona uma trava de 10s para evitar duplicatas por cliques repetidos.
 */
function _autoRegisterHistory(id) {
  if (!S.cfg.autoHistory) return;
  const now = Date.now();
  const recent = S.history.find(h => h.id === id && (now - h.uid < 10000));
  if (recent) return;

  const it = IT.find(i => i.id === id);
  if (!it) return;

  S.history.push({
    id: id, name: it.name, price: bestMarketplacePrice(it) || it.pm || 0,
    date: new Date().toISOString(), uid: now
  });
  if (S.tab === 'history') renderHist();
}

function updateNote(id, value) {
  setItemNote(id, value); // state.js: atualiza S.notes[id]; chama save() se autoSync ativo
}

function saveNote(id) {
  const el = document.getElementById('note-' + id);
  if (el) {
    saveItemNote(id, el.value); // state.js: atualiza S.notes[id] e chama save() imediatamente
    toast('💾', 'Nota salva', 'success', { duration: 2200, progress: false });
  }
}

function setCat(c) {
  S.cat = c;
  // Limpa filtros avançados ao trocar de categoria para evitar listas vazias por conflito
  S.goalFilter = '';
  S.priceFilter = '';
  const gfEl = document.getElementById('f-goal'); if (gfEl) gfEl.value = '';
  const pfEl = document.getElementById('f-price'); if (pfEl) pfEl.value = '';

  // Sincroniza visualmente os chips de objetivo do Hero
  document.querySelectorAll('.hcat').forEach(el => el.classList.remove('on'));
  document.getElementById('hcat-all')?.classList.add('on');

  renderAll();
}

function setGoal(g) {
  S.goalFilter = g === 'all' ? '' : g;
  document.querySelectorAll('.hcat').forEach(el => el.classList.remove('on'));
  document.getElementById('hcat-' + (g || 'all'))?.classList.add('on');
  const sel = document.getElementById('f-goal'); if (sel) sel.value = S.goalFilter;
  save();
  renderAll();
}

/** Chamado pelo select#f-goal no HTML — sincroniza estado e visuais do hcat */
function setGoalFromSelect(v) {
  S.goalFilter = v || '';
  document.querySelectorAll('.hcat').forEach(el => el.classList.remove('on'));
  document.getElementById(v ? 'hcat-' + v : 'hcat-all')?.classList.add('on');
  save();
  renderAll();
}

/** Chamado pelo select#f-price no HTML — sincroniza S.priceFilter */
function setPriceFilter(v) {
  S.priceFilter = v || '';
  save();
  renderAll();
}

/** Chamado pelos Sort Chips — persiste a ordenação escolhida */
function setSortOrder(v, chipEl) {
  if(!S.cfg) S.cfg = {};
  const cfg = S.cfg;
  cfg.defaultSort = v || 'priority';
  S.cfg = cfg;
  // Atualiza visual dos chips
  document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('on'));
  if (chipEl) chipEl.classList.add('on');
  else {
    const target = document.querySelector(`.sort-chip[data-sort="${S.cfg.defaultSort}"]`);
    if (target) target.classList.add('on');
  }
  save();
  renderList();
}

function toggleCfgDone(){ S.showDone=!S.showDone; save(); if(window._app) window._app.applyCfg(); renderAll(); }
function toggleCfgExtra(){ S.showExtra=!S.showExtra; save(); if(window._app) window._app.applyCfg(); renderAll(); }

function toggleDone() { S.showDone = !S.showDone; save(); renderAll(); }
function toggleExtra() { S.showExtra = !S.showExtra; save(); renderAll(); }

function checkAll() {
  const prev = checkAllItems(); // state.js: marca todos e chama save(); retorna snapshot
  renderAll();
  toast('✔', 'Todos marcados como comprados!', 'success', {
    duration: 4000,
    undo: () => { setCheckedAll(prev); renderAll(); } // state.js: restaura snapshot e chama save()
  });
}

function uncheckAll() {
  const prev = uncheckAllItems(); // state.js: reseta checked e chama save(); retorna snapshot
  _confDone = false; renderAll();
  toast('↺', 'Lista limpa', 'info', {
    duration: 4000,
    undo: () => { setCheckedAll(prev); renderAll(); }
  });
}

function resetAll() {
  confirmModal({
    title: 'Resetar checklist',
    msg: 'Desmarcar todos os itens comprados e zerar o progresso?',
    ico: '🔄',
    okLabel: 'Resetar',
    cancelLabel: 'Cancelar',
    danger: false,
    okColor: 'var(--amber)',
  }).then(ok => {
    if (!ok) return;
    const prev = uncheckAllItems(); // state.js: reseta checked e chama save()
    _confDone = false; renderAll();
    toast('🔄', 'Checklist resetado', 'warn', {
      duration: 4000,
      undo: () => { setCheckedAll(prev); renderAll(); }
    });
  });
}

function openAll() {
  const pend = IT.filter(i => !S.checked[i.id] && i.pr !== 'extra');
  if (!pend.length) { toast('✔', 'Todos os itens já foram comprados!', 'success', { duration: 2800 }); return; }
  pend.forEach((it, i) => setTimeout(() => window.open(utm(it.linkShopee || it.shopee, 'shopee', 'affiliate', 'suplilist', i + 1), '_blank'), i * S.cfg.delay));
  toast('↗', `Abrindo ${pend.length} links…`, 'info', { duration: 3000 });
}

/**
 * Faz um fetch acompanhando o progresso do download.
 */
async function fetchWithProgress(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

  const contentLength = response.headers.get('content-length');
  if (!contentLength || !response.body) return response.json();

  const total = parseInt(contentLength, 10);
  let loaded = 0;
  const reader = response.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (onProgress) onProgress(Math.round((loaded / total) * 100));
  }

  const allChunks = new Uint8Array(loaded);
  let position = 0;
  for (const chunk of chunks) {
    allChunks.set(chunk, position);
    position += chunk.length;
  }
  return JSON.parse(new TextDecoder("utf-8").decode(allChunks));
}

/**
 * Executa uma tarefa assíncrona com estados explícitos de Loading e Error.
 * @param {string} containerId - ID do elemento onde o erro/loading será exibido.
 * @param {string} taskName - Nome amigável da operação.
 * @param {Function} taskFn - Função que retorna uma Promise (o fetch).
 * @param {Function} renderFn - Função de renderização para o estado de sucesso (Data).
 */
async function runAsync(containerId, taskName, taskFn, renderFn) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 1. Estado: LOADING
  const originalHTML = container.innerHTML;
  container.innerHTML = `
    <div class="empty" style="padding:60px; opacity:0.8;">
      <div class="sync-dot syncing" style="width:32px; height:32px; margin-bottom:20px;"></div>
      <div class="empty-title">Carregando ${taskName}…</div>
      <p class="empty-sub" id="${containerId}-prog-lbl">Iniciando download...</p>
      <div class="prog-track" style="width:240px; margin: 16px auto; height: 6px; display:none;" id="${containerId}-prog-track">
         <div class="prog-fill" id="${containerId}-prog-bar" style="width:0%"></div>
      </div>
    </div>
  `;

  const onProgress = (pct) => {
    const bar = document.getElementById(`${containerId}-prog-bar`);
    const track = document.getElementById(`${containerId}-prog-track`);
    const lbl = document.getElementById(`${containerId}-prog-lbl`);
    if (track) track.style.display = 'block';
    if (bar) bar.style.width = pct + '%';
    if (lbl) lbl.textContent = `Baixando ${taskName}: ${pct}%`;
  };

  try {
    // 2. Estado: DATA (Sucesso)
    const result = await taskFn(onProgress);
    if (renderFn) {
      renderFn(result);
    } else {
      container.innerHTML = originalHTML; // Fallback para o estado anterior
    }
    return result;
  } catch (error) {
    // 3. Estado: ERROR
    console.error(`🚨 [API Error] ${taskName}:`, error);

    container.innerHTML = `
      <div class="empty" style="padding:40px; border:1px dashed var(--red); background:var(--redd); border-radius:16px;">
        <div class="empty-ico" style="color:var(--red); filter:none;">⚠️</div>
        <div class="empty-title">Falha ao carregar ${taskName}</div>
        <p class="empty-sub" style="margin-bottom:12px">${error.message || 'Verifique sua conexão e tente novamente.'}</p>
        <button class="btn bg" onclick="runAsync('${containerId}', '${taskName}', ${taskFn.name}, ${renderFn ? renderFn.name : 'null'})" style="margin-top:16px">
          Tentar novamente
        </button>
      </div>
    `;

    toast('❌', `Erro ao atualizar ${taskName}`, 'error');
    throw error;
  }
}

/**
 * Exemplo prático: Atualização de preços com o novo padrão.
 */
async function _priceUpdateTask(onProgress) {
  // Simulando o fetch de um JSON grande de preços (substituir pela URL real no futuro)
  return await fetchWithProgress('https://api.github.com/repos/SrUniverse/suplilist/contents/assets/prices.json', onProgress);
}

function _priceFinalizeUI() {
  const ageEl = document.getElementById('cache-age');
  if (ageEl) ageEl.textContent = '0 min';
  const fresh = document.querySelector('.price-fresh');
  if (fresh) {
    fresh.className = 'price-fresh live';
    fresh.innerHTML = '<span class="dot"></span> Cache ativo';
  }
  renderList();
  toast('✅', 'Preços atualizados com sucesso!', 'success');
}

async function refreshPrices() {
  // As funções auxiliares foram movidas para fora para garantir escopo global no retry do runAsync
  await runAsync('list', 'Preços', _priceUpdateTask, _priceFinalizeUI);
}


// ══════════════ MODAL DE REFERÊNCIAS (STUDIES) ══════════════
let _currentRefTab = 'resumo';

function switchStudyTab(tab) {
  _currentRefTab = tab;
  document.querySelectorAll('.stab').forEach(el => {
    el.classList.toggle('on', el.textContent.toLowerCase().includes(tab === 'resumo' ? 'resu' : tab === 'estudos' ? 'studo' : tab === 'mecanismo' ? 'meca' : 'segur'));
  });
  document.querySelectorAll('.stab-panel').forEach(el => el.classList.remove('on'));
  const p = document.getElementById('stab-' + tab); if (p) p.classList.add('on');
}

function openRef(id) {
  const it = IT.find(i => i.id === id); if (!it) return;
  document.getElementById('ref-modal-name').textContent = it.name;
  document.getElementById('ref-modal-cat').textContent = it.cat + ' · ' + it.tags.slice(0, 3).join(' · ');
  const sd = (typeof STUDIES !== 'undefined' && STUDIES[id]) ? STUDIES[id] : null;
  const pubmedQ = encodeURIComponent(it.name + ' supplement');
  let html = '';

  if (sd) {
    const evDots = [...Array(5)].map((_, i) => `<div class="ev-dot${i < sd.ev ? ' on' : ''}"></div>`).join('');
    // RESUMO
    html += `<div class="stab-panel on" id="stab-resumo">
      <div class="ev-bar"><span class="ev-label">Nível de Evidência</span><div class="ev-dots">${evDots}</div><span class="ev-score">${sd.ev}/5</span></div>
      <div class="ref-entry"><div class="ref-detail" style="font-size:14px;color:var(--tx)">${sd.resumo}</div></div>
      <div class="ref-entry"><div class="ref-source"><span class="ref-source-badge">💊 Dosagem Oficial</span></div>
        <div class="ref-title" style="margin-top:8px">${it.dose}</div>
        ${it.warn ? `<div style="margin-top:8px;font-size:13px;color:var(--amber);background:var(--ambd);border:1px solid rgba(245,166,35,.2);border-radius:8px;padding:10px 12px;line-height:1.6">⚠️ ${it.warn}</div>` : ''}
      </div>
    </div>`;
    // ESTUDOS
    html += `<div class="stab-panel" id="stab-estudos">`;
    sd.estudos.forEach(e => {
      html += `<div class="ref-entry">
        <div class="ref-entry-header">
          <span class="ref-source"><span class="ref-source-badge">${e.tipo}</span></span>
          <span class="ref-year-badge">${e.ano}</span>
          <span class="ref-journal">${e.journal}</span>
        </div>
        <div class="ref-title">${e.titulo}</div>
        <div class="ref-finding">📊 ${e.achado}</div>
        <div class="ref-detail">${e.detalhe}</div>
        ${e.pmid ? `<a class="ref-link" href="https://pubmed.ncbi.nlm.nih.gov/${e.pmid}" target="_blank" rel="noopener noreferrer">🔬 PubMed ${e.pmid} ↗</a>` : `<a class="ref-link" href="https://pubmed.ncbi.nlm.nih.gov/?term=${pubmedQ}" target="_blank" rel="noopener noreferrer">🔬 Ver no PubMed ↗</a>`}
      </div>`;
    });
    html += `<a class="ref-link" style="margin-top:10px;display:inline-flex" href="https://pubmed.ncbi.nlm.nih.gov/?term=${pubmedQ}" target="_blank" rel="noopener noreferrer">🔍 Ver todos os estudos no PubMed ↗</a>`;
    html += `</div>`;
    // MECANISMO
    html += `<div class="stab-panel" id="stab-mecanismo"><div class="mech-grid">`;
    sd.mecanismo.forEach(m => {
      html += `<div class="mech-card"><div class="mech-icon">${m.ico}</div><div class="mech-label">${m.label}</div><div class="mech-val">${m.val}</div></div>`;
    });
    html += `</div></div>`;
    // SEGURANÇA
    html += `<div class="stab-panel" id="stab-seguranca"><div class="safety-grid">`;
    sd.seguranca.forEach(s => {
      html += `<div class="safety-item ${s.tipo}"><div class="safety-ico">${s.tipo === 'ok' ? '✅' : s.tipo === 'warn' ? '⚠️' : '🚫'}</div><div><div class="safety-label">${s.label}</div><div class="safety-text">${s.texto}</div></div></div>`;
    });
    html += `</div></div>`;
  } else {
    html = `<div class="stab-panel on" id="stab-resumo"><div class="ref-entry"><div class="ref-detail">${it.desc || 'Dados científicos detalhados em breve.'}</div></div><a class="ref-link" href="https://pubmed.ncbi.nlm.nih.gov/?term=${pubmedQ}" target="_blank" rel="noopener noreferrer">🔬 Ver estudos no PubMed ↗</a></div>
    <div class="stab-panel" id="stab-estudos"><div class="ref-entry"><div class="ref-detail">Banco de estudos em expansão. Clique no link abaixo para ver pesquisas publicadas.</div><a class="ref-link" style="margin-top:10px;display:inline-flex" href="https://pubmed.ncbi.nlm.nih.gov/?term=${pubmedQ}" target="_blank" rel="noopener noreferrer">🔬 PubMed ↗</a></div></div>
    <div class="stab-panel" id="stab-mecanismo"><div class="ref-entry"><div class="ref-detail">Informações de mecanismo em breve.</div></div></div>
    <div class="stab-panel" id="stab-seguranca"><div class="safety-item ok"><div class="safety-ico">✅</div><div><div class="safety-label">Uso responsável</div><div class="safety-text">${it.warn || 'Consulte um profissional de saúde antes de iniciar qualquer suplementação.'}</div></div></div></div>`;
  }

  document.getElementById('ref-modal-body').innerHTML = html;
  _currentRefTab = 'resumo';
  document.querySelectorAll('.stab').forEach((el, i) => el.classList.toggle('on', i === 0));
  document.getElementById('ref-overlay').classList.add('on');
  document.getElementById('ref-overlay').setAttribute('aria-hidden', 'false');
}

function closeRef() {
  document.getElementById('ref-overlay').classList.remove('on');
  document.getElementById('ref-overlay').setAttribute('aria-hidden', 'true');
}


// ══════════════ STICKY BAR ══════════════
function showSticky(id) {
  const it = IT.find(i => i.id === id); if (!it) return;
  _stickyItem = it;
  const best = {
    price: bestMarketplacePrice(it),
    name: it.pm <= mlPrice(it) && it.pm <= azPrice(it) ? 'Shopee' : (mlPrice(it) < azPrice(it) ? 'Mercado Livre' : 'Amazon'),
    url: it.linkShopee || it.shopee,
    src: 'shopee'
  };
  document.getElementById('sb-name').textContent = it.name;
  document.getElementById('sb-price').textContent = `~R$${best.price} · Melhor: ${best.name}`;
  document.getElementById('sb-btn').onclick = () => window.open(utm(best.url, best.src, 'sticky', 'suplilist', 0), '_blank');
  document.getElementById('sticky-bar').classList.add('show');
}

function closeSticky() { document.getElementById('sticky-bar').classList.remove('show'); _stickyItem = null; }


// ══════════════ WISHLIST ══════════════
function togWl(id) {
  const isOn = toggleItemWishlist(id); // state.js: persiste S.wishlist[id] e chama save()
  // Granular: atualiza apenas o(s) botão(ões) de wishlist deste item no DOM,
  // sem recriar a lista inteira
  _applyWlDOM(id);
  renderStats(); // atualiza badges/contadores da sidebar
  const name = IT.find(i => i.id === id)?.name || 'Item';
  if (isOn) toast("Adicionado aos Favoritos ⭐️", "success");
  else toast(`${name} removido dos favoritos`, "info");
}

/**
 * Atualiza granularmente todos os botões de wishlist de um item no DOM,
 * sem recriar a lista. Pode haver múltiplas instâncias do mesmo item
 * (ex: página lista + página wishlist abertas simultaneamente).
 * @param {number} id - ID do suplemento
 */
function _applyWlDOM(id) {
  const on = !!S.wishlist[id];
  const it = IT.find(i => i.id === id);
  // Atualiza o card principal na lista
  const card = document.getElementById('item-' + id);
  if (card) {
    const btn = card.querySelector('.wl-btn');
    if (btn) {
      btn.classList.toggle('on', on);
      btn.textContent = on ? '❤️' : '🤍';
      btn.title = on ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
      btn.setAttribute('aria-label', on
        ? 'Remover ' + (it?.name || 'item') + ' dos favoritos'
        : 'Adicionar ' + (it?.name || 'item') + ' aos favoritos');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  // Se a wishlist estiver aberta e o item foi desmarcado, remove o card dela
  if (!on && S.tab === 'wishlist') {
    renderWishlist();
  }
}

function renderWishlist() {
  const el = document.getElementById('wl-list'); if (!el) return;
  const items = IT.filter(i => S.wishlist[i.id]);
  if (!items.length) {
    el.innerHTML = emptyStateHTML('🤍', 'Favoritos vazios', 'Sua lista de desejos está limpa. Adicione itens clicando no coração dos suplementos.', 'Explorar lista', "go('lista')");
    return;
  }
  let html = ''; items.forEach((it, i) => { html += itemHTML(it, i); });
  el.innerHTML = html;
}

function clearWl() {
  confirmModal({
    title: 'Limpar favoritos',
    msg: 'Remover todos os itens dos favoritos?',
    ico: '🤍',
    okLabel: 'Limpar',
    cancelLabel: 'Cancelar',
    danger: false,
    okColor: 'var(--amber)',
  }).then(ok => {
    if (!ok) return;
    const prev = { ...S.wishlist };
    setWishlistAll({}); // state.js: substitui S.wishlist e chama save()
    renderWishlist(); renderStats();
    toast('🤍', 'Favoritos limpos', 'warn', { duration: 3600, undo: () => { setWishlistAll(prev); renderWishlist(); renderStats(); } });
  });
}

function buyAllWl() {
  const items = IT.filter(i => S.wishlist[i.id]);
  if (!items.length) { toast('🤍', 'Nenhum favorito para marcar', 'info', { duration: 2200 }); return; }
  items.forEach(i => setItemCheck(i.id, true)); // state.js: setItemCheck (sem save individual)
  save(); // save único após o lote
  renderAll(); renderWishlist();
  toast('✔', `${items.length} favorito${items.length !== 1 ? 's' : ''} marcado${items.length !== 1 ? 's' : ''} como comprado${items.length !== 1 ? 's' : ''}!`, 'success', { duration: 3000 });
}


// ══════════════ MY STACK E CICLOS ══════════════
function initStackSel() {
  const el = document.getElementById('stack-sel'); if (!el) return;
  el.innerHTML = IT.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
}

function addStack() {
  const sel = document.getElementById('stack-sel'), qty = document.getElementById('stack-qty');
  if (!sel || !qty) return;
  const id = parseInt(sel.value), q = parseFloat(qty.value) || 100;
  const it = IT.find(i => i.id === id); if (!it) return;
  S.stack[id] = { id, name: it.name, qty: q, started: new Date().toISOString() };
  save(); renderStack(); renderStats();
  toast('💪', `${it.name} adicionado à stack`, 'success', { duration: 2800 });
  qty.value = '';
}

function addToStack(id) {
  const it = IT.find(i => i.id === id); if (!it) return;
  S.stack[id] = { id, name: it.name, qty: 100, started: new Date().toISOString() };
  save(); renderStats();
  toast('💪', `${it.name} adicionado à stack`, 'success', { duration: 2800 });
}

function removeFromStack(id) { delete S.stack[id]; save(); invalidateTab('stack'); renderStack(); renderStats(); }

function renderStack() {
  const el = document.getElementById('stack-list'); if (!el) return;
  const items = Object.values(S.stack);
  if (!items.length) {
    el.innerHTML = emptyStateHTML('💪', 'Stack vazia', 'Você não está monitorando nenhum suplemento no momento.', 'Adicionar primeiro item', "document.getElementById('stack-sel').focus()");
    return;
  }

  const monthlyCost = items.reduce((sum, it) => {
    const src = IT.find(i => i.id === it.id);
    if (src?.pm && src?.doses) return sum + (bestMarketplacePrice(src) / src.doses) * 30;
    if (src?.pm) return sum + bestMarketplacePrice(src);
    return sum;
  }, 0);

  const stackNames = items.map(it => it.name.toLowerCase());
  const INTERACT_DATA = (typeof INTERACT !== 'undefined') ? INTERACT : [];
  const dangerAlerts = INTERACT_DATA.filter(i => i.type === 'danger' && stackNames.some(n => i.title.toLowerCase().includes(n)));

  let alertsHTML = '';
  if (dangerAlerts.length && S.cfg.alertInteractions) {
    alertsHTML = `<div style="background:var(--redd);border:1px solid rgba(255,68,85,.3);border-radius:10px;padding:12px 15px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:6px">🚫 Alerta de Interação no Seu Stack</div>
      ${dangerAlerts.map(a => `<div style="font-size:11px;color:var(--tx2);margin-bottom:4px">• ${a.title}</div>`).join('')}
    </div>`;
  }

  const costHTML = `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;margin-bottom:12px;font-size:12px">
    <span style="color:var(--tx3)">💰 Custo mensal estimado do stack</span>
    <strong style="font-family:var(--fm);color:var(--accent)">~R$${monthlyCost.toFixed(0)}</strong>
  </div>`;

  el.innerHTML = alertsHTML + costHTML + `<div class="stack-grid">${items.map(it => {
    const src = IT.find(i => i.id === it.id);
    const started = new Date(it.started), now = new Date(), days = Math.floor((now - started) / 86400000);
    const dpd = src?.dm ? parseFloat(src.dm) || 2 : 2;
    const total = it.qty, rem = Math.max(0, total - days * dpd), pct = Math.round((rem / total) * 100);
    const daysLeft = Math.round(rem / dpd);
    return `<div class="stack-item">
      <button class="stack-del" onclick="removeFromStack(${it.id})">✕</button>
      <div class="stack-name">${escapeHTML(it.name)}</div>
      <div class="stack-meta">~${daysLeft} dias restantes · ${rem.toFixed(0)}g</div>
      <div class="stack-bar"><div class="stack-fill" style="width:${pct}%;background:${pct < 20 ? 'var(--red)' : pct < 40 ? 'var(--amber)' : 'var(--accent)'}"></div></div>
      ${daysLeft <= 7 ? '<div style="font-size:9px;color:var(--red);margin-top:4px">⚠️ Recompra necessária!</div>' : ''}
    </div>`;
  }).join('')}</div>`;
}

function renderCycles() {
  const el = document.getElementById('cyc-grid');
  const sumEl = document.getElementById('cyc-summary');
  if (!el) return;

  const customCycles = S._customCycles || [];
  const CYCLES_DATA = (typeof CYCLES !== 'undefined') ? CYCLES : [];
  const allCycles = [...CYCLES_DATA, ...customCycles];

  let nActive = 0, nWarn = 0, nPause = 0, nIdle = 0;
  allCycles.forEach(c => {
    const st = cycStatus(c);
    if (st.state === 'active') nActive++;
    else if (st.state === 'warn') { nActive++; nWarn++; }
    else if (st.state === 'over') nWarn++;
    else if (st.state === 'pause') nPause++;
    else nIdle++;
  });

  if (sumEl) {
    sumEl.innerHTML = `
      <div class="cyc-sum-card active"><div class="cyc-sum-n">${nActive}</div><div class="cyc-sum-l">Em uso</div></div>
      <div class="cyc-sum-card warn"><div class="cyc-sum-n">${nWarn}</div><div class="cyc-sum-l">Pausar em breve</div></div>
      <div class="cyc-sum-card pause"><div class="cyc-sum-n">${nPause}</div><div class="cyc-sum-l">Em pausa</div></div>
      <div class="cyc-sum-card"><div class="cyc-sum-n">${nIdle}</div><div class="cyc-sum-l">Não iniciados</div></div>
    `;
  }

  if (!allCycles.length) {
    el.innerHTML = `<div class="cyc-empty"><div class="cyc-empty-ico">⏱</div><div class="cyc-empty-title">Nenhum ciclo cadastrado</div><div class="cyc-empty-sub">Adicione um ciclo personalizado abaixo para começar.</div></div>`;
    return;
  }
  el.innerHTML = allCycles.map((c, idx) => cycCardHTML(c, idx)).join('');
  allCycles.forEach((c, idx) => {
    const ta = document.getElementById(`cyc-note-${idx}`);
    if (ta) ta.value = S.cycleNote[c.name] || '';
  });
}

function cycStatus(c) {
  const start = S.cycleStart[c.name];
  const pauseStart = S.cyclePause[c.name];
  if (pauseStart) {
    const pD = new Date(pauseStart), now = new Date();
    const pauseDay = Math.floor((now - pD) / 86400000);
    const remPause = Math.max(0, (c.pausa || 30) - pauseDay);
    return { state: 'pause', pauseDay, remPause, diff: 0, pct: 0, rem: 0 };
  }
  if (!start) return { state: 'idle', diff: 0, pct: 0, rem: 0 };
  const startD = new Date(start), now = new Date();
  const diff = Math.max(0, Math.floor((now - startD) / 86400000));
  const pct = Math.min(100, Math.round((diff / c.max) * 100));
  const rem = Math.max(0, c.max - diff);
  if (diff >= c.max) return { state: 'over', diff, pct, rem: 0, startD };
  if (rem <= 14) return { state: 'warn', diff, pct, rem, startD };
  return { state: 'active', diff, pct, rem, startD };
}

function cycCardHTML(c, idx) {
  const st = cycStatus(c);
  const cor = c.cor || 'var(--accent)';
  const note = S.cycleNote[c.name] || '';
  const CYCLES_DATA = (typeof CYCLES !== 'undefined') ? CYCLES : [];
  const isCustom = !CYCLES_DATA.find(x => x.name === c.name);

  let barBg, badgeClass, badgeLabel, badgeDot = true;
  if (st.state === 'active') { barBg = cor; badgeClass = 'st-active'; badgeLabel = '● Em uso'; }
  else if (st.state === 'warn') { barBg = 'var(--amber)'; badgeClass = 'st-warn'; badgeLabel = '⚠ Pausar em breve'; }
  else if (st.state === 'over') { barBg = 'var(--red)'; badgeClass = 'st-over'; badgeLabel = '⏸ Pausa necessária'; }
  else if (st.state === 'pause') { barBg = 'var(--blue)'; badgeClass = 'st-pause'; badgeLabel = '☁ Em pausa'; }
  else { barBg = 'var(--bg5)'; badgeClass = 'st-idle'; badgeLabel = '○ Não iniciado'; badgeDot = false; }

  const cardClass = `cyc-card${st.state === 'active' ? ' cyc-active' : st.state === 'warn' ? ' cyc-warning' : st.state === 'over' ? ' cyc-overdue' : st.state === 'pause' ? ' cyc-paused' : ' cyc-idle'}`;

  let fillBg;
  if (st.state === 'over') fillBg = 'var(--red)';
  else if (st.state === 'warn') fillBg = `linear-gradient(90deg,${cor},var(--amber))`;
  else if (st.state === 'active') fillBg = `linear-gradient(90deg,${cor},${cor}cc)`;
  else if (st.state === 'pause') fillBg = 'var(--blue)';
  else fillBg = 'var(--bg5)';

  let fillPct = st.pct;
  if (st.state === 'pause') {
    fillPct = Math.min(100, Math.round((st.pauseDay / (c.pausa || 30)) * 100));
  }

  const startStr = st.startD ? st.startD.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const endDate = st.startD ? new Date(st.startD.getTime() + c.max * 86400000) : null;
  const endStr = endDate ? endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const progLabel = st.state === 'idle' ? 'Não iniciado' :
    st.state === 'pause' ? `Pausa: dia ${st.pauseDay}/${c.pausa || 30}` :
      `Dia ${st.diff} de ${c.max}`;

  const pctColor = st.state === 'over' ? 'var(--red)' : st.state === 'warn' ? 'var(--amber)' : 'var(--accent)';

  let actionsBtns = '';
  if (st.state === 'idle') {
    actionsBtns = `<button class="cyc-btn cyc-btn-start" onclick="startCyc('${c.name}')">▶ Iniciar ciclo</button>`;
  } else if (st.state === 'pause') {
    const remStr = st.remPause > 0 ? `${st.remPause}d restantes` : 'Pausa concluída!';
    actionsBtns = `
      <button class="cyc-btn cyc-btn-start" onclick="resumeCyc('${c.name}')">▶ Retomar</button>
      <button class="cyc-btn cyc-btn-stop" onclick="stopCyc('${c.name}')">✕ Encerrar</button>
    `;
  } else {
    actionsBtns = `
      <button class="cyc-btn cyc-btn-reset" onclick="resetCyc('${c.name}')">↺ Reiniciar</button>
      <button class="cyc-btn cyc-btn-pause" onclick="pauseCyc('${c.name}')">⏸ Pausar agora</button>
      <button class="cyc-btn cyc-btn-stop" onclick="stopCyc('${c.name}')">✕ Encerrar</button>
    `;
  }
  if (isCustom) actionsBtns += `<button class="cyc-btn" onclick="removeCustomCyc('${c.name}')" title="Remover ciclo">🗑</button>`;

  const hasMeta = !!(c.motivo || c.dica || c.refs);
  const metaHTML = hasMeta ? `
    <button class="cyc-expand-btn" id="cyc-exp-${idx}" onclick="toggleCycDetail('${idx}')">
      <span>Ver detalhes científicos</span>
      <span class="cyc-expand-ico">▼</span>
    </button>
    ${c.motivo ? `<div class="cyc-motivo" id="cyc-motivo-${idx}"><strong>Por que ciclar?</strong>${c.motivo}</div>` : ''}
    ${c.dica ? `<div class="cyc-dica" id="cyc-dica-${idx}"><span class="cyc-dica-ico">💡</span><span>${c.dica}</span></div>` : ''}
    ${c.refs ? `<div class="cyc-ref" id="cyc-ref-${idx}">📚 ${c.refs}</div>` : ''}
  `: '';

  const pauseBar = st.state === 'over' ? `
    <div class="cyc-pause-bar">
      <span class="cyc-pause-bar-ico">⏸</span>
      <div><strong style="display:block;font-size:12px;font-weight:700;color:var(--red)">Pausa necessária!</strong><span style="font-size:10px">Pausar por ${c.pausa || 30} dias antes de reiniciar.</span></div>
      <div class="cyc-pause-bar-days">${c.pausa || 30}d</div>
    </div>
  `: st.state === 'pause' ? `
    <div class="cyc-pause-bar">
      <span class="cyc-pause-bar-ico">🔄</span>
      <div><strong style="display:block;font-size:12px;font-weight:700;color:var(--blue)">Em pausa — ${st.remPause > 0 ? `${st.remPause} dias restantes` : '✅ Pode retomar!'}</strong><span style="font-size:10px">Pausa de ${c.pausa || 30} dias · Dia ${st.pauseDay}/${c.pausa || 30}</span></div>
    </div>
  `: '';

  return `<div class="${cardClass}" id="cyc-card-${idx}" style="animation:pageIn .3s ease ${idx * .06}s both">
  <div class="cyc-status-bar" style="background:${barBg}"></div>
  <div class="cyc-card-head">
    <div class="cyc-ico">${c.ico || '⏱'}</div>
    <div class="cyc-meta">
      <div class="cyc-name" title="${escapeHTML(c.name)}">${escapeHTML(c.name)}</div>
      <div class="cyc-cat">
        <div class="cyc-cat-dot" style="background:${cor}"></div>
        ${c.cat || 'Suplemento'}
      </div>
    </div>
    <div class="cyc-badge ${badgeClass}">${badgeDot ? '<div class="cyc-badge-dot"></div>' : ''}${badgeLabel.replace(/[●⚠⏸☁○]/, '').trim()}</div>
  </div>
  <div class="cyc-card-body">
    ${pauseBar}
    <div class="cyc-prog-wrap">
      <div class="cyc-prog-labels">
        <span>${progLabel}</span>
        <span class="cyc-prog-pct" style="color:${pctColor}">${st.state === 'idle' ? '—' : fillPct + '%'}</span>
      </div>
      <div class="cyc-track">
        <div class="cyc-fill${st.state === 'idle' ? ' cyc-shimmer-off' : ''}" style="width:${fillPct}%;background:${fillBg}"></div>
      </div>
    </div>
    ${st.state !== 'idle' && st.state !== 'pause' ? `
    <div class="cyc-info-rows">
      <div class="cyc-info-row"><span class="cyc-info-ico">📅</span><span>Início</span><span class="cyc-info-val">${startStr}</span></div>
      <div class="cyc-info-row"><span class="cyc-info-ico">🏁</span><span>Término previsto</span><span class="cyc-info-val">${endStr}</span></div>
      <div class="cyc-info-row"><span class="cyc-info-ico">⏸</span><span>Pausa programada</span><span class="cyc-info-val">${c.pausa || 30} dias</span></div>
      ${st.rem > 0 ? `<div class="cyc-info-row"><span class="cyc-info-ico">⏳</span><span>Dias restantes</span><span class="cyc-info-val" style="color:${st.rem <= 14 ? 'var(--amber)' : 'var(--tx)'}">${st.rem}d</span></div>` : ''}
    </div>`: ''}
    ${metaHTML}
  </div>
  <div class="cyc-note-row">
    <textarea class="cyc-note" id="cyc-note-${idx}" rows="2" placeholder="Nota: marca, efeitos, observações…" onblur="saveCycNote('${c.name}',this.value)" aria-label="Nota do ciclo ${escapeHTML(c.name)}"></textarea>
  </div>
  <div class="cyc-actions">${actionsBtns}</div>
</div>`;
}

function toggleCycDetail(idx) {
  const btn = document.getElementById(`cyc-exp-${idx}`);
  const els = ['cyc-motivo', 'cyc-dica', 'cyc-ref'].map(id => document.getElementById(`${id}-${idx}`)).filter(Boolean);
  const isOpen = btn?.classList.contains('open');
  if (btn) btn.classList.toggle('open', !isOpen);
  els.forEach(el => el.classList.toggle('expanded', !isOpen));
}

function startCyc(n) {
  S.cycleStart[n] = new Date().toISOString();
  delete S.cyclePause[n];
  save(); renderCycles();
  toast('▶', `Ciclo de ${n} iniciado`, 'success', { duration: 3000 });
}

function pauseCyc(n) {
  const CYCLES_DATA = (typeof CYCLES !== 'undefined') ? CYCLES : [];
  const c = CYCLES_DATA.find(c => c.name === n) || { pausa: 30 };
  S.cyclePause[n] = new Date().toISOString();
  delete S.cycleStart[n];
  save(); renderCycles();
  toast('⏸', `Ciclo pausado — ${c.pausa}d de descanso`, 'info', { duration: 3200 });
}

function resumeCyc(n) {
  S.cycleStart[n] = new Date().toISOString();
  delete S.cyclePause[n];
  save(); renderCycles();
  toast('▶', `Ciclo de ${n} retomado`, 'success', { duration: 2800 });
}

function resetCyc(n) {
  confirmModal({
    title: 'Reiniciar ciclo',
    msg: `Reiniciar o ciclo de <strong>${n}</strong> a partir de hoje? O histórico de início será perdido.`,
    ico: '↺',
    okLabel: 'Reiniciar',
    cancelLabel: 'Cancelar',
    danger: false,
    okColor: 'var(--amber)',
  }).then(ok => {
    if (!ok) return;
    S.cycleStart[n] = new Date().toISOString();
    delete S.cyclePause[n];
    save(); renderCycles();
    toast('↺', `Ciclo de ${n} reiniciado`, 'warn', { duration: 2800 });
  });
}

function stopCyc(n) {
  confirmModal({
    title: 'Encerrar ciclo',
    msg: `Encerrar o ciclo de <strong>${n}</strong>? Isso remove o rastreamento de progresso.`,
    ico: '✕',
    okLabel: 'Encerrar',
    cancelLabel: 'Cancelar',
    danger: true,
  }).then(ok => {
    if (!ok) return;
    delete S.cycleStart[n];
    delete S.cyclePause[n];
    save(); renderCycles();
    toast('✕', `Ciclo de ${n} encerrado`, 'error', { duration: 2600 });
  });
}

function saveCycNote(n, v) {
  if (!S.cycleNote) S.cycleNote = {};
  S.cycleNote[n] = v.trim();
  save();
}

function addCustomCyc() {
  const nameEl = document.getElementById('cyc-custom-name');
  const maxEl = document.getElementById('cyc-custom-max');
  const pausaEl = document.getElementById('cyc-custom-pausa');
  const name = (nameEl?.value || '').trim();
  if (!name) {
    toast('⚠️', 'Digite o nome do suplemento', 'warn', { duration: 2400 });
    nameEl?.focus(); return;
  }
  if (!S._customCycles) S._customCycles = [];
  const CYCLES_DATA = (typeof CYCLES !== 'undefined') ? CYCLES : [];
  if ([...CYCLES_DATA, ...S._customCycles].find(c => c.name === name)) {
    toast('⚠️', 'Já existe um ciclo com esse nome', 'warn', { duration: 2600 }); return;
  }
  S._customCycles.push({ name, ico: '🧪', max: parseInt(maxEl?.value || 90), pausa: parseInt(pausaEl?.value || 30), cat: 'Personalizado', cor: 'var(--violet)' });
  if (nameEl) nameEl.value = '';
  save(); renderCycles();
  toast('✅', `Ciclo de ${name} criado — ${maxEl?.value || 90}d uso / ${pausaEl?.value || 30}d pausa`, 'success', { duration: 3200 });
}

function removeCustomCyc(n) {
  confirmModal({
    title: 'Remover ciclo',
    msg: `Remover o ciclo personalizado de <strong>${n}</strong>? O progresso será perdido.`,
    ico: '🗑',
    okLabel: 'Remover',
    cancelLabel: 'Cancelar',
    danger: true,
  }).then(ok => {
    if (!ok) return;
    if (S._customCycles) S._customCycles = S._customCycles.filter(c => c.name !== n);
    delete S.cycleStart[n];
    delete S.cyclePause[n];
    if (S.cycleNote) delete S.cycleNote[n];
    save(); renderCycles();
    toast('🗑', `Ciclo de ${n} removido`, 'error', { duration: 2400 });
  });
}


// ══════════════ RECEITAS E PROTOCOLOS ══════════════
let _recipeView = 'protocol';
let _activePreset = null;

function applyPreset(goal, btn) {
  const ids = GOAL_MAP[goal] || [];
  if (_activePreset === goal) {
    _activePreset = null;
    document.querySelectorAll('.rpreset').forEach(b => b.classList.remove('on'));
    S.rSel = [];
  } else {
    _activePreset = goal;
    document.querySelectorAll('.rpreset').forEach(b => b.classList.remove('on'));
    // Suporte a btn como elemento DOM ou como id string (fallback)
    const btnEl = (btn && typeof btn === 'object' && btn.classList) ? btn : document.getElementById('rp-' + goal);
    if (btnEl) btnEl.classList.add('on');
    const goalItems = IT.filter(i => ids.includes(i.id));
    const alta = goalItems.filter(i => i.pr === 'alta').map(i => i.id);
    const med = goalItems.filter(i => i.pr === 'media').map(i => i.id).slice(0, 4);
    S.rSel = [...new Set([...alta, ...med])];
  }
  save();
  renderRecipeSel();
}

function filterRecipeSel() {
  const q = (document.getElementById('r-search')?.value || '').toLowerCase().trim();
  const cat = document.getElementById('r-cat-filter')?.value || '';
  let visible = 0;
  document.querySelectorAll('#rsel-grid .rsel').forEach(el => {
    const name = (el.dataset.name || '').toLowerCase();
    const elCat = el.dataset.cat || '';
    const show = (!q || name.includes(q)) && (!cat || elCat === cat);
    el.classList.toggle('filtered-out', !show);
    if (show) visible++;
  });
  const fc = document.getElementById('r-filtered-count');
  if (fc) fc.textContent = q || cat ? `${visible} visíveis` : '';
  // Mostrar/esconder botão de limpar busca
  const clrBtn = document.getElementById('r-search-clear');
  if (clrBtn) clrBtn.style.display = q ? 'flex' : 'none';
}

function setRecipeView(v, btn) {
  _recipeView = v;
  document.querySelectorAll('.rvtab').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderRecipeOut();
}

function renderRecipeSel() {
  const el = document.getElementById('rsel-grid'); if (!el) return;
  el.innerHTML = IT.map(i => {
    const picked = S.rSel.includes(i.id);
    const catCls = CAT[i.cat]?.cls || 'cV';
    const catIco = CAT[i.cat]?.ico || '';
    return `<div class="rsel${picked ? ' pk' : ''}" data-id="${i.id}" onclick="togR(${i.id})" data-name="${i.name.toLowerCase()}" data-cat="${i.cat}" role="checkbox" aria-checked="${picked}" aria-label="${i.name}"><div class="rcheck">${picked ? '&#10003;' : ''}</div><div class="rsel-info"><div class="rsel-name" title="${i.name}">${i.name}</div><div class="rsel-meta"><span class="rsel-cat ctag ${catCls}">${catIco} ${i.cat}</span>${i.warn ? '<span class="rsel-warn-dot" title="Tem aviso de seguranca"></span>' : ''}</div></div></div>`;
  }).join('');

  const cnt = document.getElementById('r-count');
  if (cnt) cnt.textContent = S.rSel.length;
  filterRecipeSel();
  renderRecipeOut();
}

function togR(id) {
  const idx = S.rSel.indexOf(id);
  const adding = idx < 0;
  if (adding) S.rSel.push(id); else S.rSel.splice(idx, 1);
  _activePreset = null;
  document.querySelectorAll('.rpreset').forEach(b => b.classList.remove('on'));
  save();

  // Atualiza só o card clicado no DOM (sem re-renderizar o grid inteiro)
  const card = document.querySelector(`.rsel[data-id="${id}"]`);
  if (card) {
    card.classList.toggle('pk', adding);
    const chk = card.querySelector('.rcheck');
    if (chk) chk.textContent = adding ? '\u2713' : '';
    // Animação de feedback tátil
    card.classList.remove('just-picked');
    void card.offsetWidth; // reflow para reiniciar animação
    card.classList.add('just-picked');
    card.setAttribute('aria-checked', adding);
  }

  // Atualiza contador
  const cnt = document.getElementById('r-count');
  if (cnt) cnt.textContent = S.rSel.length;

  renderRecipeOut();
}

function selAllR() { _activePreset = null; document.querySelectorAll('.rpreset').forEach(b => b.classList.remove('on')); S.rSel = IT.map(i => i.id); save(); renderRecipeSel(); }
function clearR() { _activePreset = null; document.querySelectorAll('.rpreset').forEach(b => b.classList.remove('on')); S.rSel = []; save(); renderRecipeSel(); }
function selBought() { _activePreset = null; document.querySelectorAll('.rpreset').forEach(b => b.classList.remove('on')); S.rSel = IT.filter(i => S.checked[i.id]).map(i => i.id); save(); renderRecipeSel(); toast('🛒', 'Usando suplementos comprados', 'info', { duration: 2600 }); }

function copyRecipe() {
  const sel = IT.filter(i => S.rSel.includes(i.id));
  if (!sel.length) { toast('⚠️', 'Selecione ao menos um suplemento', 'warn', { duration: 2600 }); return; }
  const pre = sel.filter(i => i.dp && i.dm);
  const ma = sel.filter(i => i.dm && !i.dp);
  const no = sel.filter(i => i.dn);
  let txt = '⚗️ MINHA RECEITA DE SUPLEMENTOS\n';
  txt += '═'.repeat(36) + '\n';
  if (pre.length) { txt += '\n⚡ PRÉ-TREINO (30–45min antes)\n'; pre.forEach(i => { txt += `  • ${i.name}: ${i.dm || i.dn}\n`; }); }
  if (ma.length) { txt += '\n🌅 MANHÃ\n'; ma.filter(i => !i.dp).forEach(i => { txt += `  • ${i.name}: ${i.dm}${i.dc ? ' (com refeição)' : ''}\n`; }); }
  if (no.length) { txt += '\n🌙 NOITE\n'; no.forEach(i => { txt += `  • ${i.name}: ${i.dn}${i.dc ? ' (com refeição)' : ' (antes de dormir)'}\n`; }); }
  txt += '\n⚠️ Consulte um profissional de saúde antes de iniciar.\n';
  navigator.clipboard?.writeText(txt).then(() => toast('📋', 'Receita copiada para a área de transferência!', 'success', { duration: 3000 })).catch(() => toast('❌', 'Erro ao copiar. Tente novamente.', 'error', { duration: 3000 }));
}

function exportRecipeTxt() {
  const sel = IT.filter(i => S.rSel.includes(i.id));
  if (!sel.length) { toast('⚠️', 'Selecione ao menos um suplemento', 'warn', { duration: 2600 }); return; }
  const pre = sel.filter(i => i.dp && i.dm);
  const ma = sel.filter(i => i.dm && !i.dp);
  const no = sel.filter(i => i.dn);
  let txt = 'RECEITA DE SUPLEMENTOS — SupliList Pro\n';
  txt += 'Gerado em: ' + new Date().toLocaleDateString('pt-BR') + '\n\n';
  if (pre.length) { txt += 'PRÉ-TREINO (30–45min antes)\n'; pre.forEach(i => { txt += `  ${i.name}: ${i.dm || i.dn}\n`; }); }
  if (ma.length) { txt += '\nMANHÃ\n'; ma.filter(i => !i.dp).forEach(i => { txt += `  ${i.name}: ${i.dm}${i.dc ? ' (com refeição)' : ''}\n`; }); }
  if (no.length) { txt += '\nNOITE\n'; no.forEach(i => { txt += `  ${i.name}: ${i.dn}\n`; }); }
  const warn = sel.filter(i => i.warn);
  if (warn.length) { txt += '\nAVISOS\n'; warn.forEach(i => { txt += `  ${i.name}: ${i.warn}\n`; }); }
  txt += '\n⚠️ Consulte um profissional de saúde antes de iniciar qualquer suplementação.';
  const blob = new Blob([txt], { type: 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'minha-receita.txt'; a.click();
  toast('⬇️', 'Receita baixada como .txt', 'success', { duration: 2600 });
}

function renderRecipeOut() {
  const el = document.getElementById('rout'); if (!el) return;
  const tabsEl = document.getElementById('r-view-tabs');
  const sel = IT.filter(i => S.rSel.includes(i.id));

  renderRecipeAlerts(sel);

  if (!sel.length) {
    if (tabsEl) tabsEl.style.display = 'none';
    el.innerHTML = `<div class="recipe-empty">
      <div class="recipe-empty-ico">⚗️</div>
      <div class="recipe-empty-title">Nenhum suplemento selecionado</div>
      <div class="recipe-empty-sub">Escolha os suplementos que você tem ou use um preset acima para começar.</div>
    </div>`;
    return;
  }
  if (tabsEl) tabsEl.style.display = 'flex';

  const pre = sel.filter(i => i.dp && i.dm);
  const ma = sel.filter(i => i.dm && !i.dp);
  const no = sel.filter(i => i.dn);
  const warns = sel.filter(i => i.warn);
  const hasCycle = sel.filter(i => i.cy);

  const totalItems = sel.length;
  const monthly = sel.filter(i => i.pm && i.doses).reduce((s, i) => s + (bestMarketplacePrice(i) / i.doses) * 30, 0);

  let h = `<div class="rout">`;

  h += `<div class="rout-head">
    <div class="rout-head-left">
      <h3>Sua Receita</h3>
      <p>${totalItems} suplemento${totalItems !== 1 ? 's' : ''} · ${pre.length} pré-treino · ${ma.length} manhã · ${no.length} noite${hasCycle.length ? ' · ' + hasCycle.length + ' ciclados' : ''}</p>
    </div>
    <div class="rout-head-acts">
      <button class="btn" onclick="copyRecipe()" style="height:34px;font-size:11px">📋 Copiar</button>
      <button class="btn" onclick="exportRecipeTxt()" style="height:34px;font-size:11px">⬇ .txt</button>
    </div>
  </div>`;

  h += `<div class="rout-body">`;

  if (_recipeView === 'timeline') {
    h += renderRecipeTimeline(pre, ma, no);
  } else {
    h += renderRecipeProtocol(pre, ma, no, warns);
  }

  h += `</div>`;

  if (monthly > 0) {
    h += `<div class="rout-footer">
      <div class="rout-cost">💰 Custo mensal estimado: <strong>~R$${monthly.toFixed(0)}</strong></div>
      <div style="font-size:11px;color:var(--tx3)">baseado nos ${sel.filter(i => i.pm && i.doses).length} itens com preço</div>
    </div>`;
  }

  h += `</div>`;
  el.innerHTML = h;
}

function renderRecipeProtocol(pre, ma, no, warns) {
  let h = '';
  function rowHTML(i, period) {
    const dose = period === 'noite' ? (i.dn || '—') : (i.dm || i.dn || '—');
    const timing = period === 'pre' ? '30–45min antes' : period === 'noite' ? (i.dc ? 'com refeição' : 'antes de dormir') : (i.dc ? 'com refeição' : 'em jejum');
    return `<div class="rmr">
      <div class="rmr-left">
        <div class="rmr-n">
          ${i.name}
          ${i.badge ? `<span class="badge badge-${i.badge}">${i.badge === 'best' ? '⭐ Best' : '🔥 ' + i.badge}</span>` : ''}
        </div>
        <div class="rmr-tags">
          ${i.warn ? '<span class="rmr-warn">⚠️ aviso</span>' : ''}
          ${i.cy ? `<span class="rmr-cycle">🔄 ${i.cy.max}d ciclo</span>` : ''}
          ${i.dc ? '<span class="rmr-food">🍽 com comida</span>' : ''}
        </div>
      </div>
      <span class="rmr-d">${dose}</span>
      <span class="rmr-t">${timing}</span>
    </div>`;
  }
  if (pre.length) {
    h += `<div class="rsec">
      <div class="rsec-head">⚡ Pré-Treino <span class="rsec-badge">${pre.length} item${pre.length !== 1 ? 's' : ''}</span></div>
      ${pre.map(i => rowHTML(i, 'pre')).join('')}
    </div>`;
  }
  if (ma.filter(i => !i.dp).length) {
    const morn = ma.filter(i => !i.dp);
    h += `<div class="rsec">
      <div class="rsec-head">🌅 Manhã <span class="rsec-badge">${morn.length} item${morn.length !== 1 ? 's' : ''}</span></div>
      ${morn.map(i => rowHTML(i, 'manha')).join('')}
    </div>`;
  }
  if (no.length) {
    h += `<div class="rsec">
      <div class="rsec-head">🌙 Noite <span class="rsec-badge">${no.length} item${no.length !== 1 ? 's' : ''}</span></div>
      ${no.map(i => rowHTML(i, 'noite')).join('')}
    </div>`;
  }
  if (warns.length) {
    h += `<div style="background:var(--ambd);border:1px solid rgba(255,182,39,.25);border-radius:var(--r);padding:14px 16px;margin-top:4px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--amber);margin-bottom:8px">⚠️ Avisos de segurança</div>
      ${warns.map(i => `<div style="font-size:12px;color:var(--tx2);margin-bottom:6px;line-height:1.6"><b style="color:var(--tx)">${i.name}:</b> ${i.warn}</div>`).join('')}
    </div>`;
  }
  if (!pre.length && !ma.length && !no.length) {
    h += `<div class="recipe-empty" style="padding:30px">
      <div class="recipe-empty-ico" style="font-size:36px">🤔</div>
      <div class="recipe-empty-title">Sem dados de horário</div>
      <div class="recipe-empty-sub">Esses suplementos não têm horário definido ainda.</div>
    </div>`;
  }
  return h;
}

function renderRecipeTimeline(pre, ma, no) {
  const blocks = [
    { dot: '⚡', time: 'Pré-Treino · 30–45min antes', items: pre, noteKey: 'dm', noteExtra: 'pré-atividade' },
    { dot: '🌅', time: 'Manhã · ao acordar / café', items: ma.filter(i => !i.dp), noteKey: 'dm', noteExtra: null },
    { dot: '🌙', time: 'Noite · antes de dormir', items: no, noteKey: 'dn', noteExtra: null },
  ].filter(b => b.items.length);

  if (!blocks.length) return `<div class="recipe-empty" style="padding:30px"><div class="recipe-empty-ico" style="font-size:36px">🕐</div><div class="recipe-empty-title">Sem horários definidos</div></div>`;

  let h = '<div class="timeline-wrap">';
  blocks.forEach(b => {
    h += `<div class="tl-block">
      <div class="tl-dot">${b.dot}</div>
      <div class="tl-time">${b.time}</div>
      <div class="tl-items">
        ${b.items.map(i => {
      const dose = b.noteKey === 'dn' ? (i.dn || '—') : (i.dm || '—');
      const note = b.noteExtra || (i.dc ? 'com refeição' : i.dp ? 'pré-treino' : i.dn && b.noteKey === 'dn' ? 'antes de dormir' : 'em jejum');
      return `<div class="tl-item">
            <span class="tl-item-name">${i.name}${i.warn ? ` <span style="font-size:10px;color:var(--amber)">⚠️</span>` : ''}</span>
            <span class="tl-item-dose">${dose}</span>
            <span class="tl-item-note">${note}</span>
          </div>`;
    }).join('')}
      </div>
    </div>`;
  });
  h += '</div>';
  return h;
}

function renderRecipeAlerts(sel) {
  const alertsEl = document.getElementById('r-alerts'); if (!alertsEl) return;
  if (!sel.length) { alertsEl.innerHTML = ''; return; }

  const selIds = sel.map(i => i.id);
  const selNames = sel.map(i => i.name.toLowerCase());
  let alerts = [];

  const INTERACT_DATA = (typeof INTERACT !== 'undefined') ? INTERACT : [];
  INTERACT_DATA.forEach(int => {
    if (int.type === 'danger' || int.type === 'warn') {
      const titleWords = int.title.toLowerCase().split(/[+·,\s]+/).filter(w => w.length > 3);
      const matches = titleWords.filter(w => selNames.some(n => n.includes(w)));
      if (matches.length >= 1 && selNames.some(n => titleWords.some(w => n.includes(w)))) {
        alerts.push({ type: int.type === 'danger' ? 'danger' : 'warn', ico: int.ico, title: int.title, msg: int.desc });
      }
    }
  });

  RECIPE_SYNERGIES.forEach(([ids, title, note]) => {
    const hitIds = ids.filter(id => selIds.includes(id));
    if (hitIds.length === ids.length) {
      alerts.push({ type: 'synergy', ico: '✨', title: `Sinergia: ${title}`, msg: note });
    }
  });

  if (!alerts.length) { alertsEl.innerHTML = ''; return; }

  let h = '<div class="recipe-alerts">';
  const order = { danger: 0, warn: 1, synergy: 2 };
  alerts.sort((a, b) => order[a.type] - order[b.type]).forEach(a => {
    h += `<div class="recipe-alert ${a.type}">
      <span class="recipe-alert-ico">${a.ico}</span>
      <div class="recipe-alert-body"><strong>${a.title}</strong>${a.msg}</div>
    </div>`;
  });
  h += '</div>';
  alertsEl.innerHTML = h;
}


// ══════════════ CALCULADORA DE DOSAGEM ══════════════
// ID-23: Limites seguros por id
const SAFE_DOSE_LIMITS = {
  1: { max: 30, unit: 'g', category: 'Forca' },
  2: { max: 600, unit: 'mg', category: 'Estimulantes' },
  3: { max: 100, unit: 'g', category: 'Proteina' },
  4: { max: 30, unit: 'g', category: 'Recuperacao' },
  5: { max: 2000, unit: 'mg', category: 'Vitaminas' },
  6: { max: 10000, unit: 'UI', category: 'Vitaminas' },
  7: { max: 400, unit: 'mg', category: 'Minerais' },
  8: { max: 5000, unit: 'mg', category: 'Gorduras Boas' },
  9: { max: 6400, unit: 'mg', category: 'Estimulantes' },
  10: { max: 20, unit: 'g', category: 'Recuperacao' },
};

const TIMING_MAP = {
  'Estimulantes': { ideal: '\u26a1 30\u201345 min antes do treino', warn: '\ud83c\udf19 Evitar ap�s as 18h' },
  'For�a': { ideal: '\ud83d\udcaa A qualquer hora \u2014 consist�ncia � chave', warn: '' },
  'Prote�na': { ideal: '\ud83e\udd5b Logo ap�s o treino ou ao acordar', warn: '' },
  'Recupera��o': { ideal: '\ud83d\udd01 P�s-treino ou antes de dormir', warn: '' },
  'Vitaminas': { ideal: '\u2600\ufe0f Junto com a refei��o principal', warn: '' },
  'Minerais': { ideal: '\ud83c\udf3f Com refei��o para melhor absor��o', warn: '' },
  'Gorduras Boas': { ideal: '\ud83d\udc1f Com refei��es que contenham gordura', warn: '' },
  'Adapt�geno': { ideal: '\ud83c\udf3f Pela manh� ou ao acordar', warn: '' },
  'Sono': { ideal: '\ud83c\udf19 30\u201360 min antes de dormir', warn: '\u26a0\ufe0f N�o combinar com �lcool' },
  'Metabolismo': { ideal: '\ud83d\udd25 Com a primeira refei��o do dia', warn: '' },
  'Longevidade': { ideal: '\u23f3 Junto ao caf� da manh�', warn: '' },
};

function getTimingSuggestionForItem(item) {
  if (!item) return null;
  const cat = item.cat || '';
  if (TIMING_MAP[cat]) return TIMING_MAP[cat];
  for (const key of Object.keys(TIMING_MAP)) {
    if (cat.includes(key) || key.includes(cat)) return TIMING_MAP[key];
  }
  if (item.tags) {
    if (item.tags.some(t => ['estimulante', 'cafe�na'].includes(t))) return TIMING_MAP['Estimulantes'];
    if (item.tags.some(t => ['sono', 'melatonina'].includes(t))) return TIMING_MAP['Sono'];
    if (item.tags.some(t => ['adapt�geno'].includes(t))) return TIMING_MAP['Adapt�geno'];
  }
  return null;
}

function injectDoseEnhancements() {
  const out = document.getElementById('dose-out');
  if (!out) return;
  out.querySelectorAll('.dose-row').forEach(row => {
    if (row.dataset.enhanced) return;
    row.dataset.enhanced = '1';
    const nameEl = row.querySelector('.dose-name');
    const amtEl = row.querySelector('.dose-amt');
    if (!nameEl || !amtEl) return;
    const itemName = nameEl.textContent.replace(/\u2696\ufe0f\/kg/g, '').trim();
    const item = IT.find(i => i.name === itemName);
    if (!item) return;
    const limit = SAFE_DOSE_LIMITS[item.id];
    if (limit) {
      const m = amtEl.textContent.replace(/,/g, '.').match(/([\d.]+)/);
      if (m && parseFloat(m[1]) > limit.max) {
        row.classList.add('dose-row--unsafe');
        if (!row.querySelector('.dose-safety-badge')) {
          const badge = document.createElement('span');
          badge.className = 'dose-safety-badge';
          badge.textContent = `\u26a0\ufe0f M�x. seguro: ${limit.max}\u00a0${limit.unit}`;
          amtEl.insertAdjacentElement('afterend', badge);
        }
      }
    }
    const timing = getTimingSuggestionForItem(item);
    if (timing && !row.querySelector('.dose-timing-hint')) {
      const hint = document.createElement('div');
      hint.className = 'dose-timing-hint';
      hint.innerHTML = `<span class="dth-ideal">${timing.ideal}</span>${timing.warn ? `<span class="dth-warn">${timing.warn}</span>` : ''}`;
      nameEl.closest('.dose-row-main').appendChild(hint);
    }
  });
}

let _lastDoses = {};

function syncWeightSlider(v) {
  const num = document.getElementById('prof-weight');
  const disp = document.getElementById('weight-display');
  if (num) num.value = v;
  if (disp) disp.textContent = v;
  renderDose();
}

function syncWeightInput(v) {
  const slider = document.getElementById('prof-weight-slider');
  const disp = document.getElementById('weight-display');
  if (slider) slider.value = v;
  if (disp) disp.textContent = v;
  renderDose();
}

function fmtDoseVal(v, unit) {
  const rounded = unit === 'mg' || unit === 'mcg' || unit === 'UI' ? Math.round(v) : (Math.round(v * 10) / 10);
  return String(rounded).replace('.', ',') + '\u202f' + unit;
}

function doseRange(min, max, unit) {
  const a = fmtDoseVal(min, unit), b = fmtDoseVal(max, unit);
  return a === b ? a : `${a}–${b}`;
}

function parseDoseRange(doseStr) {
  if (!doseStr) return null;
  const clean = String(doseStr).replace(/,/g, '.').replace(/\s+/g, '').replace(/\u202f/g, '');
  const m = clean.match(/^([\d.]+)(?:[–-]([\d.]+))?(mg|mcg|g|UI|cáps?|IU)$/i);
  if (!m) return null;
  return { min: parseFloat(m[1]), max: parseFloat(m[2] || m[1]), unit: m[3] };
}

function bodyProfile(w, h, sex, activity) {
  const bmi = w / Math.pow((h || 175) / 100, 2);
  const heightIn = (h || 175) / 2.54;
  const ibw = (sex === 'feminino' ? 45.5 : 50) + 2.3 * Math.max(0, heightIn - 60);
  const doseWeight = bmi >= 30 ? ibw + 0.4 * (w - ibw) : w;
  const act = { sedentario: .9, moderado: 1, ativo: 1.1, atleta: 1.2 }[activity] || 1;
  const stim = sex === 'feminino' ? .82 : 1;
  return { bmi, ibw, doseWeight, act, stim };
}

function calcDose(i, field, p) {
  const raw = field === 'dm' ? i.dm : i.dn;
  const rule = DOSE_RULES[i.id];

  if (rule?.text) return rule.text;
  if (rule) {
    let min = rule.min, max = rule.max;
    if (rule.byKg) {
      const kf = rule.kgFactor || 1;
      min = rule.min * kf * p.body.doseWeight;
      max = rule.max * kf * p.body.doseWeight;
    }
    if (rule.stim) { min *= p.body.stim; max *= p.body.stim; }
    if (rule.actScale) { min *= p.body.act; max *= p.body.act; }
    if (rule.cap) { min = Math.min(min, rule.cap); max = Math.min(max, rule.cap); }
    return doseRange(min, max, rule.unit);
  }

  const parsed = parseDoseRange(raw);
  if (parsed) {
    let { min, max, unit } = parsed;
    const actCats = ['Aminoácido', 'Proteína'];
    const fixedCats = ['Vitamina', 'Mineral', 'Hormônio', 'Antioxidante', 'Digestão', 'Sono', 'Adaptógeno', 'Longevidade', 'Vegetal', 'Articulações'];
    const cat = i.cat || '';

    if (actCats.some(c => cat.includes(c))) {
      min *= p.body.act;
      max *= p.body.act;
    } else if (!fixedCats.some(c => cat.includes(c))) {
      const wFactor = Math.pow(p.body.doseWeight / 75, 0.5);
      min *= wFactor;
      max *= wFactor;
      if (i.tags && i.tags.some(t => ['estimulante', 'cafeína', 'dopamina'].includes(t))) {
        min *= p.body.stim; max *= p.body.stim;
      }
    }
    const origParsed = parseDoseRange(raw);
    if (origParsed) { min = Math.min(min, origParsed.max * 2); max = Math.min(max, origParsed.max * 2); }
    return doseRange(Math.max(min, 0), Math.max(max, 0), unit);
  }
  return raw || '—';
}

function isDoseByKg(i) {
  if (DOSE_RULES[i.id]?.byKg) return true;
  const fixedCats = ['Vitamina', 'Mineral', 'Hormônio', 'Antioxidante', 'Digestão', 'Sono', 'Adaptógeno', 'Longevidade', 'Vegetal', 'Articulações'];
  return !fixedCats.some(c => (i.cat || '').includes(c));
}

function imcClass(bmi) {
  if (bmi < 18.5) return { cls: 'imc-under', lbl: 'Abaixo do peso' };
  if (bmi < 25) return { cls: 'imc-normal', lbl: 'Normal' };
  if (bmi < 30) return { cls: 'imc-over', lbl: 'Sobrepeso' };
  return { cls: 'imc-obese', lbl: 'Obesidade' };
}

function renderDose() {
  const profW = document.getElementById('prof-weight');
  const wtEl = document.getElementById('wt');
  const w = parseFloat(profW?.value) || parseFloat(wtEl?.value) || 80;
  if (wtEl) wtEl.value = w;
  const hgt = parseFloat(document.getElementById('prof-height')?.value) || 175;
  const sex = document.getElementById('prof-sex')?.value || 'masculino';
  const condition = document.getElementById('prof-condition')?.value || '';
  const goal = document.getElementById('prof-goal')?.value || 'saude';
  const activity = document.getElementById('prof-activity')?.value || 'moderado';
  const el = document.getElementById('dose-out'); if (!el) return;
  const body = bodyProfile(w, hgt, sex, activity);
  const profile = { w, hgt, sex, activity, body };

  const condWarns = {
    hipertensao: { ico: '❤️', title: 'Hipertensão', msg: 'Evite Cafeína em doses altas. Prefira L-Teanina isolada. Ômega-3 e Magnésio são benéficos.' },
    diabetes: { ico: '🩸', title: 'Diabetes', msg: 'Berberina pode potencializar hipoglicemiantes — monitore glicemia. Cromo e Canela também.' },
    hipotireoidismo: { ico: '🦋', title: 'Hipotireoidismo', msg: 'Maca e Ashwagandha podem interagir com a tireoide. Consulte endocrinologista antes de usar.' },
    anticoagulante: { ico: '💊', title: 'Anticoagulantes', msg: 'Ômega-3, Feno-grego e Tongkat Ali aumentam risco de sangramento. Supervisão médica.' },
    imao: { ico: '🧠', title: 'IMAO/Antidepressivos', msg: 'Mucuna Pruriens é CONTRAINDICADA. Evite também Ashwagandha sem supervisão médica.' },
  };
  const actLabel = { sedentario: 'Sedentário', moderado: 'Moderado', ativo: 'Ativo', atleta: 'Atleta' };
  const goalLabels = { saude: '❤️ Saúde', hipertrofia: '💪 Hipertrofia', gordura: '🔥 Gordura', energia: '⚡ Energia', libido: '🌿 Libido', sono: '🌙 Sono', mulher: '♀️ Mulher', digestao: '🦠 Digestão', articulacoes: '🦴 Articulações', metabolismo: '🔥 Metabolismo', longevidade: '⏳ Longevidade' };

  const goalIds = GOAL_MAP[goal] || [];
  const allGoalItems = goalIds.length ? IT.filter(i => goalIds.includes(i.id)) : IT.filter(i => i.pr !== 'extra');
  const pool = allGoalItems.length ? allGoalItems : IT.filter(i => i.pr !== 'extra');

  const preItems = pool.filter(i => i.dp && i.dm);
  const morItems = pool.filter(i => i.dm && !i.dp);
  const nigItems = pool.filter(i => i.dn);
  const totalItems = new Set([...preItems, ...morItems, ...nigItems].map(i => i.id)).size;

  let h = '';

  if (condition && condWarns[condition]) {
    const cw = condWarns[condition];
    h += `<div class="dose-alert"><span class="dose-alert-ico">${cw.ico}</span><div class="dose-alert-body"><strong>${cw.title}</strong><span>${cw.msg}</span></div></div>`;
  }

  const imc = imcClass(body.bmi);
  h += `<div class="dose-summary">
    <div class="dose-sum-item"><span class="dose-sum-n" id="ds-w">${w}<small>kg</small></span><span class="dose-sum-l">Peso</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n" id="ds-h">${hgt}<small>cm</small></span><span class="dose-sum-l">Altura</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n" style="font-size:13px">${SEX_LABEL[sex] || sex}</span><span class="dose-sum-l">Sexo</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item">
      <span class="dose-sum-n" id="ds-bmi">${body.bmi.toFixed(1).replace('.', ',')}</span>
      <span class="dose-sum-l">IMC <span class="imc-badge ${imc.cls}">${imc.lbl}</span></span>
    </div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n" id="ds-dw">${body.doseWeight.toFixed(0)}<small>kg</small></span><span class="dose-sum-l">Peso de cálculo</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n">${totalItems}</span><span class="dose-sum-l">Suplementos</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n" style="font-size:12px">${actLabel[activity]}</span><span class="dose-sum-l">Atividade</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n" style="font-size:12px">${goalLabels[goal] || goal}</span><span class="dose-sum-l">Objetivo</span></div>
  </div>`;

  const scaledCount = pool.filter(i => isDoseByKg(i) && (i.dm || i.dn)).length;
  if (scaledCount > 0) {
    h += `<div style="display:flex;align-items:center;gap:8px;background:var(--blued);border:1px solid rgba(77,166,255,.2);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:var(--blue)">
      <span style="font-size:15px">⚖️</span>
      <span><strong>${scaledCount} suplementos</strong> têm doses ajustadas pelo seu peso (${body.doseWeight.toFixed(0)} kg de cálculo), sexo e nível de atividade. Altere o slider para ver as doses mudarem.</span>
    </div>`;
  }

  function rowsHTML(items, field) {
    if (!items.length) return `<div class="dose-empty">Nenhum suplemento neste período para o objetivo selecionado.</div>`;
    return items.map(i => {
      const dose = calcDose(i, field, profile);
      const cacheKey = `${i.id}_${field}`;
      const prev = _lastDoses[cacheKey];
      let deltaHTML = '';
      if (prev && prev !== dose) {
        const getNum = s => { const m = String(s).replace(/,/g, '.').match(/([\d.]+)/); return m ? parseFloat(m[1]) : 0; };
        const n = getNum(dose), p2 = getNum(prev);
        if (n > p2) deltaHTML = `<span class="dose-delta up">▲</span>`;
        else if (n < p2) deltaHTML = `<span class="dose-delta dn">▼</span>`;
      }
      _lastDoses[cacheKey] = dose;
      const warn = i.warn ? `<span class="dose-warn-tag">⚠️</span>` : '';
      const cycle = i.cy ? `<span class="dose-cycle-tag">${i.cy.max}d ciclo</span>` : '';
      const withFood = i.dc ? `<span class="dose-food-tag">com comida</span>` : '';
      const kgBadge = isDoseByKg(i) ? `<span class="dose-kg-badge">⚖️/kg</span>` : '';
      return `<div class="dose-row">
        <div class="dose-row-main">
          <span class="dose-name">${i.name}${kgBadge}</span>
          <div class="dose-tags-row">${warn}${cycle}${withFood}</div>
        </div>
        <span class="dose-amt">${dose || '—'}${deltaHTML}</span>
      </div>`;
    }).join('');
  }

  if (preItems.length) {
    h += `<div class="dose-period-card pre">
      <div class="proto-head">⚡ Pré-Treino <span class="dose-head-sub">30–45min antes</span></div>
      <div class="proto-body">${rowsHTML(preItems, 'dm')}</div>
    </div>`;
  }
  h += `<div class="proto-grid">
    <div class="dose-period-card">
      <div class="proto-head">🌅 Manhã <span class="dose-head-sub">${morItems.length} itens</span></div>
      <div class="proto-body">${rowsHTML(morItems, 'dm')}</div>
    </div>
    <div class="dose-period-card">
      <div class="proto-head">🌙 Noite <span class="dose-head-sub">${nigItems.length} itens</span></div>
      <div class="proto-body">${rowsHTML(nigItems, 'dn')}</div>
    </div>
  </div>`;

  const costItems = pool.filter(i => i.pm && i.doses);
  if (costItems.length) {
    const monthly = costItems.reduce((s, i) => s + (bestMarketplacePrice(i) / i.doses) * 30, 0);
    h += `<div class="dose-cost-bar">
      <span>💰 Custo mensal estimado do protocolo</span>
      <strong>~R$${monthly.toFixed(0)}</strong>
    </div>`;
  }

  h += `<p class="dose-disclaimer">⚠️ Protocolo educacional baseado em evidências científicas. Os valores com ⚖️/kg variam conforme seu perfil. Consulte um profissional de saúde antes de iniciar qualquer suplementação.</p>`;
  el.innerHTML = h;
  requestAnimationFrame(injectDoseEnhancements);
}


// ══════════════ COMPARE ══════════════
function renderCmp() {
  const el = document.getElementById('cmp-grid'); if (!el) return;
  el.innerHTML = IT.filter(i => i.pr !== 'extra').map(i => `<div class="cmp-card${S.cmpSel.includes(i.id) ? ' sel' : ''}" onclick="togCmp(${i.id})">
    <div class="cmp-check">${S.cmpSel.includes(i.id) ? '✓' : ''}</div>
    <div style="font-size:12px;font-weight:500;color:var(--tx);margin-bottom:4px">${i.name}</div>
    <span class="ctag ${CAT[i.cat]?.cls || 'cV'}">${CAT[i.cat]?.ico || ''} ${i.cat}</span>
    <div style="margin-top:6px">${starsHTML(i.sc)}</div>
  </div>`).join('');
  renderCmpOut();
}

function togCmp(id) {
  const idx = S.cmpSel.indexOf(id);
  if (idx >= 0) S.cmpSel.splice(idx, 1); else if (S.cmpSel.length < 4) S.cmpSel.push(id);
  else { toast('⚠️', 'Máximo 4 itens para comparar', 'warn', { duration: 2800 }); return; }
  renderCmp();
}

function renderCmpOut() {
  const el = document.getElementById('cmp-out'); if (!el) return;
  const sel = IT.filter(i => S.cmpSel.includes(i.id));
  if (!sel.length) { el.innerHTML = ''; return; }
  const fields = [
    ['Categoria', i => i.cat], ['Prioridade', i => ({ alta: '🔴 Alta', media: '🟡 Média', baixa: '🟢 Baixa' }[i.pr] || i.pr)],
    ['Preço', i => `~R$${i.pm}`], ['Preço/Dose', i => pdose(i) ? `R$${pdose(i)}` : '—'],
    ['Dose Manhã', i => i.dm || '—'], ['Dose Noite', i => i.dn || '—'],
    ['Ciclo', i => i.cy ? `${i.cy.max}d / ${i.cy.pausa}d pausa` : 'Contínuo'],
    ['Eficácia', i => starsHTML(i.sc)], ['Aviso', i => i.warn ? '⚠️ Sim' : '✅ Ok'],
  ];
  let h = `<div class="table-wrap"><table class="cmp-table"><thead><tr><th>Atributo</th>`;
  sel.forEach(i => { h += `<th class="cmp-name">${i.name}</th>`; });
  h += `</tr></thead><tbody>`;
  fields.forEach(([lbl, fn]) => { h += `<tr><td style="color:var(--tx3);font-size:9px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap">${lbl}</td>${sel.map(i => `<td>${fn(i)}</td>`).join('')}</tr>`; });
  h += '</tbody></table></div>';
  el.innerHTML = h;
}


// ══════════════ HISTORY ══════════════
function initHist() {
  const sel = document.getElementById('hsel'); if (!sel) return;
  sel.innerHTML = IT.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
  const d = document.getElementById('hdate'); if (d) d.value = new Date().toISOString().split('T')[0];
}

function addHist() {
  const idEl = document.getElementById('hsel'), pEl = document.getElementById('hprice'), dEl = document.getElementById('hdate');
  if (!idEl || !pEl || !dEl) return;
  const price = parseFloat(pEl.value), dateInput = dEl.value;
  if (!price || !dateInput) { toast('⚠️', 'Preencha preço e data', 'warn', { duration: 2800 }); return; }
  const it = IT.find(i => i.id === parseInt(idEl.value));
  // Combina data do input com horário atual para precisão cronológica
  const [y, mo, d] = dateInput.split('-').map(Number);
  const now = new Date();
  const fullDate = new Date(y, mo - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
  S.history.push({ id: parseInt(idEl.value), name: it?.name || '?', price, date: fullDate, uid: Date.now() });
  save(); renderHist(); pEl.value = ''; toast('✅', 'Compra registrada!', 'success', { duration: 2600 });
}

function delHist(uid) { S.history = S.history.filter(h => h.uid !== uid); save(); renderHist(); }

function clearHistory() {
  confirmModal({ title: 'Limpar Histórico', msg: 'Apagar todos os registros de compras?', danger: true }).then(ok => {
    if (!ok) return; S.history = []; save(); renderHist(); toast('🗑', 'Histórico limpo', 'info');
  });
}

function exportHistory() { dl(JSON.stringify(S.history, null, 2), 'historico-compras.json', 'application/json'); }

/** Permite a alteração de dados lançados no histórico sem remoção */
function editHist(uid) {
  const h = S.history.find(x => x.uid === uid);
  if (!h) return;
  const newPrice = prompt(`Novo preço para ${h.name}:`, h.price);
  if (newPrice !== null && !isNaN(parseFloat(newPrice))) {
    h.price = parseFloat(newPrice);
    save(); renderHist();
    toast('✏️', 'Registro atualizado', 'success', { duration: 2000, progress: false });
  }
}
function fmtR(v) { return 'R$ ' + v.toFixed(2).replace('.', ','); }

function renderHist() {
  const total = S.history.reduce((s, h) => s + h.price, 0);
  const tt = document.getElementById('ht-top'); if (tt) tt.textContent = fmtR(total);
  const by = {}; S.history.forEach(h => { const d = new Date(h.date); const m = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); by[m] = (by[m] || 0) + h.price; });
  const months = Object.keys(by).sort().slice(-8), mx = Math.max(...months.map(m => by[m]), 1);
  const bEl = document.getElementById('bars');
  if (bEl) bEl.innerHTML = months.length ? months.map(m => { const pct = Math.round((by[m] / mx) * 100); return `<div class="bar" style="height:${pct}%"><div class="bar-tip">${m.slice(5) + '/' + m.slice(2, 4)}: ${fmtR(by[m])}</div></div>` }).join('') : '<div style="color:var(--tx3);font-size:11px;width:100%;text-align:center;align-self:center">Sem registros</div>';
  const sorted = [...S.history].sort((a, b) => b.date.localeCompare(a.date));
  const lEl = document.getElementById('hlist');
  if (lEl) lEl.innerHTML = sorted.map(h => {
    const dStr = new Date(h.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `<div class="hitem">
      <span class="hitem-n">${h.name}</span>
      <span class="hitem-p">${fmtR(h.price)}</span>
      <span class="hitem-d">${dStr}</span>
      <div style="display:flex;gap:4px">
        <button class="hitem-del" style="background:var(--ad);color:var(--accent)" onclick="editHist(${h.uid})" title="Editar">✏️</button>
        <button class="hitem-del" onclick="delHist(${h.uid})" title="Excluir">✕</button>
      </div>
    </div>`;
  }).join('') || '<div style="color:var(--tx3);font-size:12px;text-align:center;padding:20px">Nenhuma compra registrada</div>';
  const htEl = document.getElementById('htotal'); if (htEl) htEl.style.display = S.history.length ? 'flex' : 'none';
  const hvEl = document.getElementById('htval'); if (hvEl) hvEl.textContent = fmtR(total);

  const bySupp = {}; S.history.forEach(h => { bySupp[h.name] = (bySupp[h.name] || 0) + h.price; });
  const topSupps = Object.entries(bySupp).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const tsEl = document.getElementById('htop-supps');
  if (tsEl) tsEl.innerHTML = topSupps.length
    ? topSupps.map(([name, val]) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px"><span style="color:var(--tx)">${name}</span><span style="font-family:var(--fm);color:var(--accent)">${fmtR(val)}</span></div>`).join('')
    : '<div style="color:var(--tx3);font-size:11px">Sem dados ainda</div>';
}


// ══════════════ INTERACT ══════════════
function renderInteract() {
  const el = document.getElementById('ilist'); if (!el) return;
  const stackNames = Object.keys(S.stack).map(id => { const it = IT.find(i => i.id === parseInt(id)); return it?.name?.toLowerCase() || ''; });

  const INTERACT_DATA = (typeof INTERACT !== 'undefined') ? INTERACT : [];

  const sorted = [...INTERACT_DATA].sort((a, b) => {
    const aRel = stackNames.some(n => a.title.toLowerCase().includes(n) || a.desc.toLowerCase().includes(n));
    const bRel = stackNames.some(n => b.title.toLowerCase().includes(n) || b.desc.toLowerCase().includes(n));
    if (aRel && !bRel) return -1;
    if (!aRel && bRel) return 1;
    return 0;
  });
  el.innerHTML = sorted.map(i => {
    const relevant = stackNames.some(n => i.title.toLowerCase().includes(n) || i.desc.toLowerCase().includes(n));
    return `<div class="iitem ${i.type}${relevant ? ' iitem-stack-match' : ''}"><span class="iico">${i.ico}</span><div><div class="ititle">${i.title}${relevant ? '<span class="iitem-stack-badge">🎯 Na sua stack</span>' : ''}</div><div class="idesc">${i.desc}</div></div></div>`;
  }).join('');
}


// ══════════════ CONFIG E EXPORTAÇÃO ══════════════
function toggleCfg(k) {
  const cfg = S.cfg;
  cfg[k] = !cfg[k];
  S.cfg = cfg;
  save(); applyCfg(); renderList(); }

function nukeAll() {
  confirmModal({
    title: 'Apagar todos os dados?',
    msg: 'Esta ação removerá permanentemente suas notas, histórico e stack. Irreversível.',
    ico: '🗑',
    okLabel: 'Apagar tudo',
    cancelLabel: 'Cancelar',
    danger: true,
  }).then(ok => {
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('sb_collapsed');
    toast('🗑', 'Dados apagados. Recarregando…', 'error');
    setTimeout(() => location.reload(), 1800);
  });
}

function applyCfg() {
  const ALL_KEYS = ['showStars', 'showPdose', 'showTooltips', 'confetti', 'alertInteractions', 'alertCycles', 'toasts', 'expandOnClick', 'confirmUncheck', 'autoSync', 'autoHistory'];
  ALL_KEYS.forEach(k => {
    const el = document.getElementById('cfg-' + k);
    if (el) el.className = 'tog' + (S.cfg[k] ? ' on' : '');
  });
  const exEl = document.getElementById('cfg-showExtra'); if (exEl) exEl.className = 'tog' + (S.showExtra ? ' on' : '');
  const dnEl = document.getElementById('cfg-showDone'); if (dnEl) dnEl.className = 'tog' + (S.showDone ? ' on' : '');
  const dsEl = document.getElementById('cfg-defaultSort'); if (dsEl) dsEl.value = S.cfg.defaultSort || 'priority';
}

function exportTxt() {
  let t = 'SUPLILIST v' + APP_VERSION + '\n' + '═'.repeat(50) + '\n';
  ['alta', 'media', 'baixa', 'extra'].forEach(p => {
    const g = IT.filter(i => i.pr === p); if (!g.length) return;
    t += `\n[${PLBL[p].toUpperCase()}]\n`;
    g.forEach(i => {
      const mlLink = i.linkML || (i.ml ? mlAff(i.ml) : '');
      const azLink = i.linkAmazon || (i.az ? amazonAff(i.az) : '');
      t += `  ${S.checked[i.id] ? '[✔]' : '[ ]'} ${i.name}  ~R$${bestMarketplacePrice(i)}\n  Mercado Livre: ${mlLink}\n  Amazon: ${azLink}\n\n`;
    });
  });
  dl(t, 'suplilist.txt', 'text/plain'); toast("Copiado com sucesso! ✅", "success");
}

function exportJSON() {
  const data = { date: new Date().toISOString(), items: IT.map(i => ({ ...i, comprado: !!S.checked[i.id], nota: S.notes[i.id] || '' })), history: S.history };
  dl(JSON.stringify(data, null, 2), 'suplilist.json', 'application/json'); toast("Copiado com sucesso! ✅", "success");
}

function importJSON() { document.getElementById('import-file')?.click(); }

function handleImport(input) {
  const file = input.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data.items)) {
        data.items.forEach(item => {
          if (item.comprado) setItemCheck(item.id, true);   // state.js (sem save individual)
          if (item.nota) setItemNote(item.id, item.nota); // state.js (sem save individual)
        });
      }
      if (Array.isArray(data.history)) S.history = [...S.history, ...data.history].filter((h, i, arr) => arr.findIndex(x => x.uid === h.uid) === i);
      save(); renderAll();
      toast('✅', 'Dados importados com sucesso!', 'success', { duration: 3200 });
    } catch (err) { toast('⚠️', 'Arquivo inválido — verifique o .json exportado', 'error', { duration: 3600 }); }
    input.value = '';
  };
  reader.readAsText(file);
}

function testAffiliateLinks() {
  if (!S.cfg.isAdmin) {
    console.warn("[DevMode] Modo Desenvolvedor necessário para testar links de afiliado.");
    return;
  }

  // Usando Creatina Monohidratada (ID 11) como produto de amostra para teste
  const testProduct = IT.find(i => i.id === 11);

  if (!testProduct) {
    toast('⚠️', 'Produto de teste (Creatina) não encontrado. Verifique o data.js.', 'error', { duration: 5000 });
    return;
  }

  // Os links já foram processados por applyProductLinks em links.js
  // Usamos as propriedades linkAmazon, linkShopee, linkML que já contêm as tags de afiliado e UTMs.

  const amazonTestUrl = testProduct.linkAmazon;
  if (amazonTestUrl) {
    window.open(amazonTestUrl, '_blank');
    console.log('Amazon Test URL:', amazonTestUrl);
  } else {
    toast('⚠️', 'Link da Amazon para Creatina não disponível.', 'warn', { duration: 3000 });
  }

  const mlTestUrl = testProduct.linkML;
  if (mlTestUrl) {
    window.open(mlTestUrl, '_blank');
    console.log('Mercado Livre Test URL:', mlTestUrl);
  } else {
    toast('⚠️', 'Link do Mercado Livre para Creatina não disponível.', 'warn', { duration: 3000 });
  }

  const shopeeTestUrl = testProduct.linkShopee;
  if (shopeeTestUrl) {
    window.open(shopeeTestUrl, '_blank');
    console.log('Shopee Test URL:', shopeeTestUrl);
  } else {
    toast('⚠️', 'Link da Shopee para Creatina não disponível.', 'warn', { duration: 3000 });
  }

  toast('🔗', 'Abrindo links de teste em novas abas. Verifique os parâmetros de afiliado.', 'info', { duration: 6000 });
}

function copyList() {
  const lines = IT.map(i => {
    const p = bestMarketplacePrice(i);
    let text = `${S.checked[i.id] ? '✔' : '○'} ${i.name} (~R$${p})`;
    if (S.wishlist[i.id]) text += ' ❤️';

    const ml = i.linkML || "";
    const az = i.linkAmazon || "";
    const sh = i.linkShopee || "";

    return `${text}\n   🛒 ML: ${ml}\n   🛒 Amazon: ${az}\n   🛒 Shopee: ${sh}`;
  });
  navigator.clipboard?.writeText(lines.join('\n')).then(() => toast("Copiado com sucesso! ✅", "success"));
}

function dl(c, fn, t) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c], { type: t })); a.download = fn; a.click(); }

function confetti() {
  const cols = ['#4edd9a', '#4da6ff', '#a78bfa', '#f472b6', '#f5a623', '#fff'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div'); el.className = 'cf';
    el.style.cssText = `left:${Math.random() * 100}vw;background:${cols[~~(Math.random() * cols.length)]};animation-duration:${2 + Math.random() * 2}s;animation-delay:${Math.random() * .6}s;width:${6 + Math.random() * 7}px;height:${6 + Math.random() * 7}px`;
    document.body.appendChild(el); setTimeout(() => el.remove(), 4200);
  }
  toast('🎉', 'Lista 100% completa!', 'success', {
    title: 'Parabéns! 🏆',
    sub: 'Todos os suplementos foram comprados.',
    duration: 5000,
  });
}


// ══════════════ TOAST & MODAL ══════════════
/**
 * Exibe uma notificação toast.
 * Assinatura: toast(ico, msg, type?, opts?)
 *   ico   — emoji ou ícone curto (ex: '✅', '⚠️')
 *   msg   — texto principal da notificação
 *   type  — 'success' | 'error' | 'warn' | 'info'  (default: 'info')
 *   opts  — { duration: ms, title: str, sub: str, undo: fn, progress: bool }
 *
 * Retrocompat: toast(msg, type) — caso ainda seja chamado com 2 args sem ícone.
 */
function toast(ico, msg, type, opts) {
  // Retrocompatibilidade: se chamado como toast(msg, type) sem ícone
  if (typeof msg !== 'string' || (typeof msg === 'string' && typeof type !== 'string' && typeof type !== 'undefined' && typeof type !== 'object')) {
    // fallback: toast(msgOnly, typeOnly)
    opts = undefined;
    type = typeof msg === 'string' ? msg : 'info';
    msg = typeof ico === 'string' ? ico : '';
    ico = '';
  }
  type = type || 'info';
  opts = opts || {};
  const duration = opts.duration || 3200;

  const container = document.getElementById('toast-container');
  if (!container) return;

  const t = document.createElement('div');
  t.className = 'toast ' + type + ' in';

  let inner = '';
  if (opts.title) {
    inner += `<div class="toast-title">${opts.title}</div>`;
  }
  inner += `<div class="toast-body">`;
  if (ico) inner += `<span class="toast-ico">${ico}</span>`;
  inner += `<span class="toast-msg">${msg}</span>`;
  if (opts.sub) inner += `<span class="toast-sub">${opts.sub}</span>`;
  inner += `</div>`;
  if (opts.undo) {
    inner += `<button class="toast-undo" onclick="(${opts.undo.toString()})();this.closest('.toast').remove()">Desfazer</button>`;
  }
  inner += `<button class="toast-close" onclick="dismissToast(this.parentElement)" aria-label="Fechar">✕</button>`;
  if (opts.progress !== false) {
    inner += `<div class="toast-progress" style="animation-duration:${duration}ms"></div>`;
  }

  t.innerHTML = inner;
  container.appendChild(t);

  t._timer = setTimeout(() => dismissToast(t), duration);
  return t;
}

function dismissToast(t) {
  if (!t || !t.isConnected) return;
  clearTimeout(t._timer);
  t.classList.remove('in');
  t.classList.add('out');
  setTimeout(() => t.remove(), 250);
}

function confirmModal(opts) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-title" style="color:${opts.danger ? 'var(--red)' : 'var(--accent)'}">${opts.title}</div>
        <div class="confirm-msg">${opts.msg}</div>
        <div class="confirm-actions">
          <button class="btn" id="m-cancel">${opts.cancelLabel || 'Cancelar'}</button>
          <button class="btn bg" style="background:${opts.okColor || (opts.danger ? 'var(--red)' : 'var(--accent)')}; color:#000" id="m-ok">${opts.okLabel || 'Confirmar'}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('m-ok').onclick = () => { overlay.remove(); resolve(true); };
    document.getElementById('m-cancel').onclick = () => { overlay.remove(); resolve(false); };
  });
}


// ══════════════ SIDEBAR ══════════════
let sidebarCollapsed = false;
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  const sb = document.getElementById('sidebar');
  const shell = document.getElementById('main-shell');
  const btn = document.getElementById('sb-toggle');
  if (sb) sb.classList.toggle('collapsed', sidebarCollapsed);
  if (shell) shell.classList.toggle('sidebar-collapsed', sidebarCollapsed);
  const pop = document.getElementById('theme-pop');
  if (pop) pop.style.left = sidebarCollapsed ? '70px' : '14px';
  try { localStorage.setItem('sb_collapsed', sidebarCollapsed ? '1' : '0'); } catch (e) { }
}

(function () {
  try {
    const saved = localStorage.getItem('sb_collapsed');
    if (saved === '1') {
      sidebarCollapsed = true;
      const sb = document.getElementById('sidebar');
      const shell = document.getElementById('main-shell');
      const btn = document.getElementById('sb-toggle');
      if (sb) sb.classList.add('collapsed');
      if (shell) shell.classList.add('sidebar-collapsed');
      const pop = document.getElementById('theme-pop');
      if (pop) pop.style.left = '70px';
    }
  } catch (e) { }
})();


// ══════════════ FAQ ══════════════
let _faqCat = 'all';
function renderFaq() {
  const q = (document.getElementById('faq-search-inp')?.value || '').toLowerCase().trim();

  const FAQ_DATA_LOCAL = (typeof FAQ_DATA !== 'undefined') ? FAQ_DATA : [];

  let items = FAQ_DATA_LOCAL.filter(f => {
    if (_faqCat !== 'all' && f.cat !== _faqCat) return false;
    if (q && !f.q.toLowerCase().includes(q) && !f.a.toLowerCase().includes(q)) return false;
    return true;
  });
  const el = document.getElementById('faq-list'); if (!el) return;
  if (!items.length) { el.innerHTML = '<div class="faq-empty">🔍 Nenhuma pergunta encontrada.</div>'; return; }
  const groups = { plataforma: { ico: '💻', lbl: 'Plataforma' }, suplementos: { ico: '💊', lbl: 'Suplementos' }, compras: { ico: '🛒', lbl: 'Compras' }, seguranca: { ico: '🛡', lbl: 'Segurança' }, dados: { ico: '💾', lbl: 'Dados' } };
  let html = '';
  if (_faqCat === 'all') {
    Object.entries(groups).forEach(([key, { ico, lbl }]) => {
      const g = items.filter(f => f.cat === key);
      if (!g.length) return;
      html += `<div class="faq-group"><div class="faq-group-title">${ico} ${lbl} (${g.length})</div>${g.map((f, i) => faqItemHTML(f, key + i)).join('')}</div>`;
    });
  } else {
    html = items.map((f, i) => faqItemHTML(f, _faqCat + i)).join('');
  }
  el.innerHTML = html;
}

function faqItemHTML(f, uid) {
  return `<div class="faq-item" id="fi-${uid}">
    <div class="faq-q" onclick="togFaq('${uid}')" tabindex="0" role="button" aria-expanded="false" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();togFaq('${uid}')}">
      <div class="faq-q-txt">${f.q}</div>
      <div class="faq-ico">▼</div>
    </div>
    <div class="faq-a">${f.a}</div>
  </div>`;
}

function togFaq(uid) {
  const el = document.getElementById('fi-' + uid);
  if (!el) return;
  const wasOpen = el.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
  if (!wasOpen) el.classList.add('open');
}

function filterFaq() { renderFaq(); }
function filterFaqCat(cat, btn) {
  _faqCat = cat;
  document.querySelectorAll('.faq-cat').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderFaq();
}


// ══════════════ TERMS NAV ══════════════
function scrollToSection(id) {
  const el = document.getElementById(id); if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelectorAll('.terms-nav-item').forEach(i => i.classList.remove('active'));
  const items = document.querySelectorAll('.terms-nav-item');
  const sections = ['t-intro', 't-uso', 't-medico', 't-afiliados', 't-dados', 't-ip', 't-responsabilidade', 't-alteracoes', 't-contato'];
  const idx = sections.indexOf(id);
  if (items[idx]) items[idx].classList.add('active');
}

let _termsObserver = null;
function initTermsNav() {
  if (_termsObserver) { _termsObserver.disconnect(); _termsObserver = null; }
  const sections = document.querySelectorAll('.terms-section');
  const navItems = document.querySelectorAll('.terms-nav-item');
  if (!sections.length) return;
  _termsObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navItems.forEach(n => n.classList.remove('active'));
        const idx = [...sections].indexOf(e.target);
        if (navItems[idx]) navItems[idx].classList.add('active');
      }
    });
  }, { threshold: 0.35, rootMargin: '0px 0px -40% 0px' });
  sections.forEach(s => _termsObserver.observe(s));
}


// ══════════════ BOTTOM NAV ══════════════
const BN_PRIMARY = ['home', 'wishlist', 'history', 'config'];

function bnSelect(p) {
  const tabs = document.querySelectorAll('.bn-tab');
  const indicator = document.getElementById('bn-indicator');

  tabs.forEach(btn => {
    const active = btn.id === 'bn-' + p;
    btn.classList.toggle('on', active);

    if (active && indicator) {
      indicator.style.width = (btn.offsetWidth - 16) + 'px';
      indicator.style.left = (btn.offsetLeft + 8) + 'px';
    }
  });
}

function toggleBnDrawer() {
  const drawer = document.getElementById('bn-drawer');
  const btn = document.getElementById('bn-more-btn');
  const isOpen = drawer.classList.toggle('on');
  if (btn) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function syncBnBadges() {
  const pend = IT.filter(i => !S.checked[i.id] && i.pr !== 'extra').length;
  const wl = Object.values(S.wishlist || {}).filter(Boolean).length;
  const st = Object.keys(S.stack || {}).length;
  const setBadge = (id, n) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = n;
    el.classList.toggle('vis', n > 0);
  };
  setBadge('bn-badge-lista', pend);
  setBadge('bn-badge-wl', wl);
  setBadge('bn-badge-stack', st);
}

function updateDynamicStrings() {
  const totalCountEl = document.getElementById('total-supplements-count');
  if (totalCountEl) totalCountEl.textContent = IT.length;

  const versionDisplayEl = document.getElementById('app-version-display');
  if (versionDisplayEl) versionDisplayEl.textContent = APP_VERSION;

  const verFooter = document.getElementById('version-footer');
  if (verFooter) verFooter.textContent = APP_VERSION;

  const verConfig = document.getElementById('version-config');
  if (verConfig) verConfig.textContent = APP_VERSION;
}


// ══════════════ HOME REVEAL ══════════════
function initHomeReveal() {
  setTimeout(() => {
    const els = document.querySelectorAll('#p-home .v2-reveal');
    if (!els.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('v2-vis'); });
    }, { threshold: 0.08 });
    els.forEach(el => obs.observe(el));
  }, 80);
}


// ══════════════ EVENTOS GERAIS DE DOM ══════════════
document.addEventListener('click', e => {
  const drawer = document.getElementById('bn-drawer');
  const btn = document.getElementById('bn-more-btn');
  const bnav = document.getElementById('bottom-nav');
  if (drawer && drawer.classList.contains('on') && bnav && !bnav.contains(e.target)) {
    drawer.classList.remove('on');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('ref-overlay');
    if (overlay && overlay.classList.contains('on')) closeRef();
    const tp = document.getElementById('theme-pop');
    if (tp && tp.classList.contains('on')) { tp.classList.remove('on'); const btn = document.getElementById('theme-toggle-btn'); if (btn) btn.setAttribute('aria-expanded', 'false'); }
  }

  const tag = document.activeElement?.tagName?.toLowerCase();
  const inInput = tag === 'input' || tag === 'textarea' || tag === 'select';

  if (e.key === '/' && !inInput) {
    e.preventDefault();
    const s = document.getElementById('search');
    if (s) {
      if (S.tab !== 'lista') go('lista');
      setTimeout(() => { s.focus(); s.select(); }, 50);
    }
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    go('lista');
    setTimeout(() => { const s = document.getElementById('search'); if (s) { s.focus(); s.select(); } }, 80);
  }
  if (e.key === 'Escape' && document.activeElement?.id === 'search') {
    clearSearch();
    document.activeElement.blur();
  }
});

document.addEventListener('click', e => {
  if (e.target.classList.contains('cb') && navigator.vibrate) {
    navigator.vibrate(e.target.checked ? [8, 4, 16] : [12]);
  }
});


// ══════════════ UX IMPROVEMENTS (IIFEs) ══════════════

// Search Clear
let _searchTimer;
function onSearchInput() {
  const listEl = document.getElementById('list');
  const query = document.getElementById('search')?.value.trim();
  if (listEl && query) listEl.classList.add('is-scanning');

  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => renderList(), 150);
  const v = document.getElementById('search')?.value || '';
  const cl = document.getElementById('search-clear');
  if (cl) cl.classList.toggle('vis', v.length > 0);
}

function clearSearch() {
  const s = document.getElementById('search');
  if (s) { s.value = ''; s.focus(); }
  const cl = document.getElementById('search-clear');
  if (cl) cl.classList.remove('vis');
  renderList();
}

// Scroll Top
(function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('vis', window.scrollY > 320);
  }, { passive: true });
})();

// Sticky Bar
(function initStickyBar() {
  const bar = document.querySelector('.top-bar');
  const facets = document.querySelector('.facets');
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (bar) bar.classList.toggle('scrolled', window.scrollY > 60);
        if (facets && window.innerWidth <= 700) {
          facets.classList.toggle('is-sticky', window.scrollY > 280);
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

// Sidebar Tooltips
(function initSidebarTooltips() {
  document.querySelectorAll('.nt').forEach(btn => {
    const lbl = btn.querySelector('.nt-lbl');
    if (!lbl) return;
    const tt = document.createElement('span');
    tt.className = 'nt-tooltip';
    tt.textContent = lbl.textContent.trim();
    btn.appendChild(tt);
    btn.addEventListener('mouseenter', () => {
      const rect = btn.getBoundingClientRect();
      tt.style.top = (rect.top + rect.height / 2 - 10) + 'px';

      // Boundary check para tooltips da sidebar colapsada
      requestAnimationFrame(() => {
        const ttRect = tt.getBoundingClientRect();
        if (ttRect.right > window.innerWidth) {
          tt.style.left = 'auto';
          tt.style.right = '10px';
        }
      });
    });
  });
})();

// Touch Swipe Drawer
(function initSwipeDrawer() {
  const bnav = document.getElementById('bottom-nav');
  if (!bnav) return;
  let startY = 0;
  bnav.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  bnav.addEventListener('touchend', e => {
    const dy = startY - e.changedTouches[0].clientY;
    if (dy > 40) {
      const drawer = document.getElementById('bn-drawer');
      if (drawer && !drawer.classList.contains('on')) toggleBnDrawer();
    }
    if (dy < -40) {
      const drawer = document.getElementById('bn-drawer');
      if (drawer && drawer.classList.contains('on')) toggleBnDrawer();
    }
  }, { passive: true });
})();

// Ripple Effect
(function initRipple() {
  const s = document.createElement('style');
  s.textContent = '@keyframes ripple27{from{transform:scale(0);opacity:.6}to{transform:scale(2.8);opacity:0}}';
  document.head.appendChild(s);
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn,.hp-btn-p,.hp-btn-s,.oab,.chip,.rpreset,.mkt-cta');
    if (!btn || btn.dataset.ripple) return;
    const r = btn.getBoundingClientRect();
    const rip = document.createElement('span');
    const size = Math.max(r.width, r.height);
    rip.style.cssText = `position:absolute;border-radius:50%;width:${size}px;height:${size}px;` +
      `left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px;` +
      `background:rgba(255,255,255,.18);pointer-events:none;z-index:20;` +
      `animation:ripple27 .55s ease-out both;`;
    const pos = getComputedStyle(btn).position;
    if (pos === 'static') btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(rip);
    setTimeout(() => rip.remove(), 700);
  });
})();

// Card Tilt
(function initCardTilt() {
  document.querySelectorAll('.hs,.sc').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(600px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-2px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
})();

// Lazy Img
(function initLazyImg() {
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const img = e.target;
          if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
          obs.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
    document.querySelectorAll('img[data-src]').forEach(img => obs.observe(img));
  }
})();

// Search Active Indicator
(() => {
  const search = document.getElementById('search');
  const list = document.getElementById('list');
  if (!search || !list) return;
  search.addEventListener('input', () => {
    list.style.transition = 'opacity .12s';
    list.style.opacity = '.55';
    clearTimeout(search._fadeTimer);
    search._fadeTimer = setTimeout(() => { list.style.opacity = '1'; }, 180);
  });
})();

// Counters Home
(function initHpCounters() {
  const els = document.querySelectorAll('.v2-trust-n');
  if (!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting || e.target._done) return;
      e.target._done = true;
      const el = e.target;
      const raw = el.textContent;
      const num = parseInt(raw.replace(/\D/g, ''));
      const suffix = raw.replace(/[\d]/g, '');
      if (!num) return;
      let cur = 0;
      const steps = 24;
      const inc = num / steps;
      let step = 0;
      const timer = setInterval(() => {
        step++; cur = Math.min(Math.round(inc * step), num);
        el.textContent = cur + suffix;
        if (step >= steps) clearInterval(timer);
      }, 30);
      obs.unobserve(el);
    });
  }, { threshold: .5 });
  els.forEach(el => obs.observe(el));
})();

// Smooth scroll nav
document.querySelectorAll('.sb-nav .nt').forEach(btn => {
  btn.style.transition = 'all .18s cubic-bezier(.4,0,.2,1)';
});

/**
 * ID 20 - Implementação de Dados Estruturados (JSON-LD).
 * Consolida WebSite, FAQPage e SoftwareApplication para SEO avançado.
 */
function initStructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "name": "SupliList",
        "url": "https://suplilist.com",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://suplilist.com/?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "SoftwareApplication",
        "name": "SupliList",
        "operatingSystem": "Web",
        "applicationCategory": "HealthApplication",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "ratingCount": "128"
        },
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "BRL"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "O que é o SupliList?",
            "acceptedAnswer": { "@type": "Answer", "text": "Um marketplace inteligente para comparar suplementos, doses e eficácia científica baseada em evidências." }
          },
          {
            "@type": "Question",
            "name": "Como o SupliList avalia a eficácia?",
            "acceptedAnswer": { "@type": "Answer", "text": "Através de uma escala de estrelas baseada em estudos clínicos revisados por pares e metanálises do PubMed." }
          },
          {
            "@type": "Question",
            "name": "Os dados são salvos?",
            "acceptedAnswer": { "@type": "Answer", "text": "Sim, o SupliList utiliza armazenamento local no seu navegador, garantindo total privacidade e funcionamento sem conta." }
          }
        ]
      }
    ]
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(schema);
  document.head.appendChild(script);
}

// ══════════════ INITIALIZATION ══════════════
window.addEventListener('DOMContentLoaded', () => {
  // ── Remove skeleton loader assim que o JS está pronto para renderizar ──
  // O skeleton estava visível desde o HTML puro (antes de qualquer JS),
  // garantindo First Contentful Paint sem flash de tela branca.
  const skeleton = document.getElementById('app-shell-skeleton');
  if (skeleton) {
    skeleton.style.opacity = '0';
    // Remove do DOM após a transição CSS de 300ms para não bloquear eventos
    setTimeout(() => skeleton.remove(), 320);
  }

  try {
    updateDynamicStrings();
    initStructuredData();
    load();
    document.body?.setAttribute('data-theme', S.cfg.theme || 'dark');
    applyCfg();
    syncCfgThemeGrid();

    try {
      const hashTab = window.location.hash.replace('#', '');
      const isFirstVisit = !localStorage.getItem(STORAGE_KEY);
      const isNewSession = !sessionStorage.getItem('visited_home');

      if (isFirstVisit) {
        S.demoMode = true;
        // Injeção de dados demo (Creatina, Whey e Ômega-3 na Stack; Ashwagandha e Lion's Mane nos Favoritos)
        [11, 15, 23].forEach(id => {
          const it = IT.find(i => i.id === id);
          if (it) S.stack[id] = { id, name: it.name, qty: 300, started: new Date().toISOString() };
        });
        // state.js: inicializa wishlist demo via API de mutação (S.wishlist é escrito aqui
        // antes do _doSave() imediato abaixo; não passa por save() com debounce)
        const demoWishlist = {};
        [4, 18].forEach(id => { demoWishlist[id] = true; });
        Object.assign(S.wishlist, demoWishlist);
        _doSave(); // Persistência imediata do estado inicial populado
      }

      // Lógica de Redirecionamento: Forçar 'home' se for uma nova sessão (carregamento fresco)
      let initialTab;
      if (isNewSession) {
        initialTab = 'home';
        sessionStorage.setItem('visited_home', 'true');
      } else {
        initialTab = PAGES.includes(hashTab) ? hashTab : (S.tab || 'lista');
      }

      go(initialTab);
    } catch (e) {
      console.warn("Erro no roteamento, forçando fallback para lista:", e);
      go('lista');
    }

    // Atualizar labels de tempo
    const lsSaveEl = document.getElementById('last-save');
    if (lsSaveEl && S.lastSave) lsSaveEl.textContent = 'Salvo às ' + new Date(S.lastSave).toLocaleTimeString('pt-BR');
    updateSidebarBadges();

    // Restaurar chip de ordenação ativo
    if (S.cfg.defaultSort) {
      document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('on'));
      const activeChip = document.querySelector(`.sort-chip[data-sort="${S.cfg.defaultSort}"]`);
      if (activeChip) activeChip.classList.add('on');
    }
    const gfEl = document.getElementById('f-goal');
    if (gfEl && S.goalFilter) gfEl.value = S.goalFilter;
    const pfEl = document.getElementById('f-price');
    if (pfEl && S.priceFilter) pfEl.value = S.priceFilter;
    if (S.goalFilter) {
      document.querySelectorAll('.hcat').forEach(el => el.classList.remove('on'));
      document.getElementById('hcat-' + S.goalFilter)?.classList.add('on');
    }
  } catch (e) {
    console.error("Erro crítico na inicialização:", e);
    // Reversão de emergência se o estado estiver muito corrompido
    if (confirm("Erro ao carregar dados. Deseja resetar a aplicação para corrigir?")) {
      localStorage.clear();
      location.reload();
    }
  }
});

// ═════════════ TERMS DYNAMIC DATES ════════
const termsUpdatedEl = document.getElementById('terms-updated-date');
if (termsUpdatedEl) {
  if (typeof getTermsUpdatedDate === 'function') termsUpdatedEl.textContent = getTermsUpdatedDate();
  else {
    console.warn('[Terms] getTermsUpdatedDate() não está disponível.');
    termsUpdatedEl.textContent = '—';
  }
}

const termsRevisionEl = document.getElementById('terms-revision-date');
if (termsRevisionEl) {
  if (typeof getTermsRevisionDate === 'function') termsRevisionEl.textContent = getTermsRevisionDate();
  else {
    console.warn('[Terms] getTermsRevisionDate() não está disponível.');
    termsRevisionEl.textContent = '—';
  }
}
// ═════════════════════════════════════════
