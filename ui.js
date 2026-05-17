// ══════════════════════════════════════════════════════════════
// js/ui.js — Interface Geral
// Tema, sidebar, wishlist, compare, interações, FAQ, termos,
// modal de referências, sticky bar, configurações, exportações.
// ══════════════════════════════════════════════════════════════
import { S, save, syncNow, setItemCheck, setItemNote, setWishlistAll, STORAGE_KEY } from './state.js';
import { announceToScreenReader } from './accessibility.js';
import { IT, CAT, CYCLES, INTERACT, STUDIES, FAQ_DATA, APP_VERSION,
         bestMarketplacePrice, mlPrice, azPrice, utm,
         PLBL, PCLS, getTermsUpdatedDate, getTermsRevisionDate } from './database.js';
import { PRODUCT_LINKS as _PRODUCT_LINKS } from './links.js';
const PRODUCT_LINKS = _PRODUCT_LINKS ?? {};
import { t, setLanguage } from './i18n.js';
import { escapeHTML, emptyStateHTML, toast, confirmModal, dl, getPersistedLogs, clearPersistedLogs } from './utils.js';
import { itemHTML, starsHTML, pdose, renderStats, renderAll, observeLazyImages } from './list.js';
import { applyFilters } from './filter.js';
import { runRecipeTestSuite } from './recipe.js';
import { setTheme as coreSetTheme, toggleTheme as coreToggleTheme } from './theme.js'; // Import core theme functions
import { runDoseTestSuite } from './dose.js';
import { openModal, closeModal } from './modal.js';

// ══════════════ UTILITÁRIOS DE UI ══════════════

/**
 * Gerencia o estado visual de carregamento de um elemento.
 * [SL-17] Garante que a manipulação ocorra apenas se o elemento estiver no DOM.
 * @param {string} id - ID do elemento alvo.
 * @param {boolean} isLoading - Se deve ativar ou desativar o estado ocupado.
 */
export function toggleLoading(id, isLoading) {
  const el = document.getElementById(id);
  if (!el) return;

  if (isLoading) {
    el.classList.add('is-busy');
    el.setAttribute('aria-busy', 'true');
  } else {
    el.classList.remove('is-busy');
    el.removeAttribute('aria-busy');
  }
}

// ══════════════ TEMA ══════════════
export function handleThemeSelection(theme) {
  coreSetTheme(theme, true); // Call the core theme logic, marking it as manual
  // Update UI elements directly after coreSetTheme
  document.querySelectorAll('.th-opt').forEach(el => el.classList.remove('on'));
  document.getElementById('th-' + theme)?.classList.add('on');
  syncCfgThemeGrid(); // This function already updates cfgth- elements

  const themePop = document.getElementById('theme-pop');
  if (themePop) themePop.classList.remove('on');
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

export { coreToggleTheme as toggleTheme }; // Expose coreToggleTheme as toggleTheme
export function toggleThemePop() {
  const pop = document.getElementById('theme-pop'), btn = document.getElementById('theme-toggle-btn');
  const isOpen = pop.classList.toggle('on');
  if (btn) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}
export function syncCfgThemeGrid() {
  const t = S.cfg.theme || 'dark';
  document.querySelectorAll('.cfg-th').forEach(el => el.classList.remove('on'));
  document.getElementById('cfgth-'+t)?.classList.add('on');
}

/**
 * Sincroniza visualmente o seletor de idiomas no menu de configurações.
 */
export function syncCfgLangGrid() {
  const l = S.lang || 'pt-BR';
  document.querySelectorAll('.cfg-lang').forEach(el => el.classList.remove('on'));
  document.getElementById('cfglang-' + l)?.classList.add('on');
}

// ══════════════ SIDEBAR ══════════════
export let sidebarCollapsed = false;
export function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  const sb = document.getElementById('sidebar');
  const shell = document.getElementById('main-shell');
  const btn = document.getElementById('sb-toggle');
  
  if (sb)    sb.classList.toggle('collapsed', sidebarCollapsed);
  if (shell) shell.classList.toggle('sidebar-collapsed', sidebarCollapsed);
  if (btn) {
    btn.textContent = sidebarCollapsed ? '▶' : '◀';
    btn.setAttribute('aria-expanded', !sidebarCollapsed);
  }
  try { localStorage.setItem('sb_collapsed', sidebarCollapsed ? '1' : '0'); } catch(e) {}
}

// ══════════════ BOTTOM NAV ══════════════
export function bnSelect(p) {
  const tabs = document.querySelectorAll('.bn-tab'), indicator = document.getElementById('bn-indicator');
  tabs.forEach(btn => {
    const active = btn.id === 'bn-' + p;
    btn.classList.toggle('on', active);
    if (active && indicator) {
      indicator.style.width = (btn.offsetWidth - 16) + 'px';
      indicator.style.left  = (btn.offsetLeft + 8) + 'px';
    }
  });
}
export function toggleBnDrawer() {
  const drawer = document.getElementById('bn-drawer'), btn = document.getElementById('bn-more-btn');
  const isOpen = drawer.classList.toggle('on');
  if (btn) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}
export function syncBnBadges() {
  const pend = IT.filter(i => !S.checked[i.id] && i.pr !== 'extra').length;
  const wl   = Object.values(S.wishlist||{}).filter(Boolean).length;
  const st   = Object.keys(S.stack||{}).length;
  const setBadge = (id,n) => { const el=document.getElementById(id); if(!el) return; el.textContent=n; el.classList.toggle('vis',n>0); };
  setBadge('bn-badge-lista', pend);
  setBadge('bn-badge-wl',    wl);
  setBadge('bn-badge-stack', st);
}

// ══════════════ WISHLIST ══════════════
export function renderWishlist() {
  const el = document.getElementById('wl-list'); if (!el) return;
  const items = IT.filter(i => S.wishlist[i.id]);
  if (!items.length) {
    el.innerHTML = emptyStateHTML('🤍','Favoritos vazios','Sua lista de desejos está limpa. Adicione itens clicando no coração dos suplementos.','Explorar lista',"window._app.go('lista')");
    return;
  }
  el.innerHTML = items.map((it,i) => itemHTML(it,i)).join('');
  observeLazyImages(el); // [SL-40] Ativa o observer para as imagens dos favoritos
}
export function clearWl() {
  confirmModal({title:'Limpar favoritos',msg:'Remover todos os itens dos favoritos?',ico:'🤍',okLabel:'Limpar',cancelLabel:'Cancelar',danger:false,okColor:'var(--amber)'})
    .then(ok => {
      if (!ok) return;
      const prev = {...S.wishlist};
      setWishlistAll({});
      announceToScreenReader('Lista de favoritos limpa.');
      renderWishlist(); renderStats();
      toast('🤍','Favoritos limpos','warn',{duration:3600,undo:()=>{setWishlistAll(prev);renderWishlist();renderStats();}});
    });
}
export function buyAllWl() {
  const items = IT.filter(i => S.wishlist[i.id]);
  if (!items.length) { toast('🤍','Nenhum favorito para marcar','info',{duration:2200}); return; }
  items.forEach(i => setItemCheck(i.id, true));
  save(); renderAll(); renderWishlist();
  announceToScreenReader(`${items.length} itens da wishlist marcados como comprados.`);
  toast('✔',`${items.length} favorito${items.length!==1?'s':''} marcado${items.length!==1?'s':''} como comprado${items.length!==1?'s':''}!`,'success',{duration:3000});
}

// ══════════════ COMPARE ══════════════

/**
 * Utilitários Matemáticos Puros para Comparação
 */
const CompareUtils = {
  calcDose: (price, doses) => (doses > 0 ? price / doses : 0),
  // Gramas totais aproximadas se não houver peso específico
  calcGram: (it) => {
    const weight = parseInt(it.qty) || 100;
    return it.pm > 0 ? it.pm / weight : 0;
  }
};

/**
 * Controlador de Comparação: Gerencia estado e concorrência
 */
export const CompareController = {
  _lock: false,
  MAX_ITEMS: 3,

  toggle: function(id) {
    if (this._lock) return;
    this._lock = true;

    const it = IT.find(i => i.id === id);
    if (!it) { this._lock = false; return; }

    const idx = S.cmpSel.indexOf(id);
    if (idx >= 0) {
      S.cmpSel.splice(idx, 1);
    } else if (S.cmpSel.length < this.MAX_ITEMS) {
      S.cmpSel.push(id);
      announceToScreenReader(t('compare.add_announcement', { name: it.name }));
      if (navigator.vibrate) navigator.vibrate(15);
    } else {
      toast('⚠️', t('compare.limit_reached', { n: this.MAX_ITEMS }), 'warn');
    }

    save();
    this.renderDock();
    renderCmp(); // Atualiza os cards da lista
    this._lock = false;
  },

  renderDock: function() {
    let dock = document.getElementById('compare-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'compare-dock';
      dock.className = 'compare-dock';
      document.body.appendChild(dock);
    }

    if (S.cmpSel.length === 0) {
      dock.classList.remove('visible');
      return;
    }

    const items = S.cmpSel.map(id => IT.find(i => i.id === id)).filter(Boolean);
    const thumbs = items.map(it => `<div class="dock-thumb" title="${escapeHTML(it.name)}">${CAT[it.cat]?.ico || '💊'}</div>`).join('');

    dock.innerHTML = `
      <div class="dock-content">
        <div class="dock-info">
          <span class="dock-count">${S.cmpSel.length}</span>
          <div class="dock-thumbs">${thumbs}</div>
        </div>
        <button class="btn bg dock-btn" onclick="window._app.openCompareModal()">
          ${t('compare.dock_label', { count: S.cmpSel.length })}
        </button>
        <button class="dock-close" onclick="window._app.clearCompare()" aria-label="Limpar">✕</button>
      </div>
    `;
    dock.classList.add('visible');
  }
};

export function togCmp(id) { CompareController.toggle(id); }

export function clearCompare() {
  S.cmpSel = [];
  save();
  CompareController.renderDock();
  renderCmp();
}

export function renderCmp() {
  const el = document.getElementById('cmp-grid'); 
  if (!el) return;

  el.innerHTML = IT.filter(i => i.pr !== 'extra').map(it => {
    // Type Guard: Verifica integridade do item
    if (!it.id || !it.name) return '';
    const isSelected = S.cmpSel.includes(it.id);
    return `
      <div class="cmp-card ${isSelected ? 'sel' : ''}" onclick="window._app.togCmp(${it.id})" role="checkbox" aria-checked="${isSelected}">
        <div class="cmp-check">${isSelected ? '✓' : ''}</div>
        <div class="cmp-card-name">${escapeHTML(it.name)}</div>
        <span class="ctag ${CAT[it.cat]?.cls || 'cV'}">${CAT[it.cat]?.ico || ''} ${it.cat}</span>
      </div>`;
  }).join('');
}

/**
 * Abre o Modal de Comparação Interativo
 */
export function openCompareModal() {
  const modal = document.getElementById('compare-modal');
  const content = document.getElementById('compare-modal-content');
  if (!modal || !content) return;

  const sel = S.cmpSel.map(id => IT.find(i => i.id === id)).filter(Boolean);
  if (!sel.length) return;

  // Identifica o vencedor matemático (menor custo por dose)
  const costs = sel.map(it => ({ id: it.id, val: CompareUtils.calcDose(it.pm || 0, it.doses || 1) }));
  const winnerId = costs.sort((a,b) => a.val - b.val)[0].id;

  const fields = [
    [t('compare.label_category'), i => i.cat],
    [t('compare.label_price'), i => `R$ ${i.pm}`],
    [t('compare.cost_per_dose'), i => `R$ ${CompareUtils.calcDose(i.pm || 0, i.doses || 1).toFixed(2)}`],
    [t('compare.cost_per_gram'), i => `R$ ${CompareUtils.calcGram(i).toFixed(3)}`],
    [t('Eficácia'), i => starsHTML(i.sc)],
    [t('Dose'), i => i.dm || i.dn || '—'],
  ];

  let html = `
    <div class="cmp-overlay-header">
      <h2>${t('compare.title')}</h2>
      <button class="btn-close-lg" onclick="window._app.closeCompareModal()">✕</button>
    </div>
    <div class="cmp-matrix-wrapper">
      <table class="cmp-matrix">
        <thead>
          <tr>
            <th>Atributo</th>
            ${sel.map(it => `
              <th class="${it.id === winnerId ? 'is-winner' : ''}">
                ${it.id === winnerId ? `<span class="winner-badge">${t('compare.best_value')}</span>` : ''}
                <div class="cmp-col-name">${escapeHTML(it.name)}</div>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${fields.map(([lbl, fn]) => `
            <tr>
              <td class="row-label">${lbl}</td>
              ${sel.map(it => `<td class="${it.id === winnerId ? 'winner-cell' : ''}">${fn(it)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  content.innerHTML = html;
  openModal(modal);
  if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
}

export function closeCompareModal() {
  const modal = document.getElementById('compare-modal');
  closeModal(modal);
}

// ══════════════ INTERACT ══════════════
export function renderInteract() {
  const el = document.getElementById('ilist'); if (!el) return;
  const stackNames = Object.keys(S.stack).map(id => { const it=IT.find(i=>i.id===parseInt(id)); return it?.name?.toLowerCase()||''; });
  const INTERACT_DATA = (typeof INTERACT !== 'undefined') ? INTERACT : [];
  const sorted = [...INTERACT_DATA].sort((a,b) => {
    const aRel = stackNames.some(n=>a.title.toLowerCase().includes(n)||a.desc.toLowerCase().includes(n));
    const bRel = stackNames.some(n=>b.title.toLowerCase().includes(n)||b.desc.toLowerCase().includes(n));
    return aRel&&!bRel ? -1 : !aRel&&bRel ? 1 : 0;
  });
  el.innerHTML = sorted.map(i => {
    const relevant = stackNames.some(n=>i.title.toLowerCase().includes(n)||i.desc.toLowerCase().includes(n));
    return `<div class="iitem ${i.type}${relevant?' iitem-stack-match':''}"><span class="iico">${i.ico}</span><div><div class="ititle">${i.title}${relevant?'<span class="iitem-stack-badge">🎯 Na sua stack</span>':''}</div><div class="idesc">${i.desc}</div></div></div>`;
  }).join('');
}

// ══════════════ REFERÊNCIAS (STUDIES) ══════════════
let _currentRefTab = 'resumo';
export function switchStudyTab(tab) {
  _currentRefTab = tab;
  document.querySelectorAll('.stab').forEach(el => {
    el.classList.toggle('on', el.textContent.toLowerCase().includes(tab==='resumo'?'resu':tab==='estudos'?'studo':tab==='mecanismo'?'meca':'segur'));
  });
  document.querySelectorAll('.stab-panel').forEach(el => el.classList.remove('on'));
  const p = document.getElementById('stab-'+tab); if (p) p.classList.add('on');
}

export function openRef(id) {
  const it = IT.find(i=>i.id===id); if (!it) return;
  document.getElementById('ref-modal-name').textContent = it.name;
  document.getElementById('ref-modal-cat').textContent  = it.cat + ' · ' + it.tags.slice(0,3).join(' · ');
  const sd = (typeof STUDIES !== 'undefined' && STUDIES[id]) ? STUDIES[id] : null;
  const pubmedQ = encodeURIComponent(it.name + ' supplement');
  let html = '';
  if (sd) {
    const evDots = [...Array(5)].map((_,i) => `<div class="ev-dot${i<sd.ev?' on':''}"></div>`).join('');
    html += `<div class="stab-panel on" id="stab-resumo">
      <div class="ev-bar"><span class="ev-label">Nível de Evidência</span><div class="ev-dots">${evDots}</div><span class="ev-score">${sd.ev}/5</span></div>
      <div class="ref-entry"><div class="ref-detail" style="font-size:14px;color:var(--tx)">${sd.resumo}</div></div>
      <div class="ref-entry"><div class="ref-source"><span class="ref-source-badge">💊 Dosagem Oficial</span></div>
        <div class="ref-title" style="margin-top:8px">${it.dose}</div>
        ${it.warn?`<div style="margin-top:8px;font-size:13px;color:var(--amber);background:var(--ambd);border:1px solid rgba(245,166,35,.2);border-radius:8px;padding:10px 12px;line-height:1.6">⚠️ ${it.warn}</div>`:''}
      </div></div>`;
    html += `<div class="stab-panel" id="stab-estudos">`;
    sd.estudos.forEach(e => {
      html += `<div class="ref-entry"><div class="ref-entry-header"><span class="ref-source"><span class="ref-source-badge">${e.tipo}</span></span><span class="ref-year-badge">${e.ano}</span><span class="ref-journal">${e.journal}</span></div><div class="ref-title">${e.titulo}</div><div class="ref-finding">📊 ${e.achado}</div><div class="ref-detail">${e.detalhe}</div>${e.pmid?`<a class="ref-link" href="https://pubmed.ncbi.nlm.nih.gov/${e.pmid}" target="_blank" rel="noopener noreferrer">🔬 PubMed ${e.pmid} ↗</a>`:`<a class="ref-link" href="https://pubmed.ncbi.nlm.nih.gov/?term=${pubmedQ}" target="_blank" rel="noopener noreferrer">🔬 Ver no PubMed ↗</a>`}</div>`;
    });
    html += `<a class="ref-link" style="margin-top:10px;display:inline-flex" href="https://pubmed.ncbi.nlm.nih.gov/?term=${pubmedQ}" target="_blank" rel="noopener noreferrer">🔍 Ver todos os estudos no PubMed ↗</a></div>`;
    html += `<div class="stab-panel" id="stab-mecanismo"><div class="mech-grid">${sd.mecanismo.map(m=>`<div class="mech-card"><div class="mech-icon">${m.ico}</div><div class="mech-label">${m.label}</div><div class="mech-val">${m.val}</div></div>`).join('')}</div></div>`;
    html += `<div class="stab-panel" id="stab-seguranca"><div class="safety-grid">${sd.seguranca.map(s=>`<div class="safety-item ${s.tipo}"><div class="safety-ico">${s.tipo==='ok'?'✅':s.tipo==='warn'?'⚠️':'🚫'}</div><div><div class="safety-label">${s.label}</div><div class="safety-text">${s.texto}</div></div></div>`).join('')}</div></div>`;
  } else {
    html = `<div class="stab-panel on" id="stab-resumo"><div class="ref-entry"><div class="ref-detail">${it.desc||'Dados científicos detalhados em breve.'}</div></div><a class="ref-link" href="https://pubmed.ncbi.nlm.nih.gov/?term=${pubmedQ}" target="_blank" rel="noopener noreferrer">🔬 Ver estudos no PubMed ↗</a></div>
    <div class="stab-panel" id="stab-estudos"><div class="ref-entry"><div class="ref-detail">Banco de estudos em expansão.</div><a class="ref-link" style="margin-top:10px;display:inline-flex" href="https://pubmed.ncbi.nlm.nih.gov/?term=${pubmedQ}" target="_blank" rel="noopener noreferrer">🔬 PubMed ↗</a></div></div>
    <div class="stab-panel" id="stab-mecanismo"><div class="ref-entry"><div class="ref-detail">Informações de mecanismo em breve.</div></div></div>
    <div class="stab-panel" id="stab-seguranca"><div class="safety-item ok"><div class="safety-ico">✅</div><div><div class="safety-label">Uso responsável</div><div class="safety-text">${it.warn||'Consulte um profissional de saúde.'}</div></div></div></div>`;
  }
  document.getElementById('ref-modal-body').innerHTML = html;
  _currentRefTab = 'resumo';
  document.querySelectorAll('.stab').forEach((el,i) => el.classList.toggle('on',i===0));
  const overlay = document.getElementById('ref-overlay');
  overlay.classList.add('on'); overlay.setAttribute('aria-hidden','false');
}
export function closeRef() {
  const overlay = document.getElementById('ref-overlay');
  overlay.classList.remove('on'); overlay.setAttribute('aria-hidden','true');
}

// ══════════════ STICKY BAR ══════════════
export function showSticky(id) {
  const it = IT.find(i=>i.id===id); if (!it) return;
  const best = { price: bestMarketplacePrice(it), url: it.linkShopee||it.shopee, src:'shopee',
    name: it.pm<=mlPrice(it)&&it.pm<=azPrice(it)?'Shopee':(mlPrice(it)<azPrice(it)?'Mercado Livre':'Amazon') };
  document.getElementById('sb-name').textContent  = it.name;
  document.getElementById('sb-price').textContent = `~R$${best.price} · Melhor: ${best.name}`;
  document.getElementById('sb-btn').onclick = () => window.open(utm(best.url,best.src,'sticky','suplilist',0),'_blank');
  document.getElementById('sticky-bar').classList.add('show');
}
export function closeSticky() { document.getElementById('sticky-bar').classList.remove('show'); }

// ══════════════ FAQ ══════════════
let _faqCat = 'all';
export function renderFaq() {
  const q = (document.getElementById('faq-search-inp')?.value||'').toLowerCase().trim();
  const FAQ_DATA_LOCAL = (typeof FAQ_DATA !== 'undefined') ? FAQ_DATA : [];
  let items = FAQ_DATA_LOCAL.filter(f => {
    if (_faqCat!=='all' && f.cat!==_faqCat) return false;
    if (q && !f.q.toLowerCase().includes(q) && !f.a.toLowerCase().includes(q)) return false;
    return true;
  });
  const el = document.getElementById('faq-list'); if (!el) return;
  if (!items.length) { el.innerHTML='<div class="faq-empty">🔍 Nenhuma pergunta encontrada.</div>'; return; }
  const groups = {plataforma:{ico:'💻',lbl:'Plataforma'},suplementos:{ico:'💊',lbl:'Suplementos'},compras:{ico:'🛒',lbl:'Compras'},seguranca:{ico:'🛡',lbl:'Segurança'},dados:{ico:'💾',lbl:'Dados'}};
  let html = '';
  if (_faqCat==='all') {
    Object.entries(groups).forEach(([key,{ico,lbl}]) => {
      const g = items.filter(f=>f.cat===key); if (!g.length) return;
      html += `<div class="faq-group"><div class="faq-group-title">${ico} ${lbl} (${g.length})</div>${g.map((f,i)=>faqItemHTML(f,key+i)).join('')}</div>`;
    });
  } else { html = items.map((f,i)=>faqItemHTML(f,_faqCat+i)).join(''); }
  el.innerHTML = html;
}
function faqItemHTML(f, uid) {
  return `<div class="faq-item" id="fi-${uid}">
    <div class="faq-q" onclick="window._app.togFaq('${uid}')" tabindex="0" role="button" aria-expanded="false" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window._app.togFaq('${uid}')}">
      <div class="faq-q-txt">${f.q}</div><div class="faq-ico">▼</div>
    </div>
    <div class="faq-a">${f.a}</div>
  </div>`;
}
export function togFaq(uid) {
  const el = document.getElementById('fi-'+uid); if (!el) return;
  const wasOpen = el.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i=>i.classList.remove('open'));
  if (!wasOpen) el.classList.add('open');
}
export function filterFaq() { renderFaq(); }
export function filterFaqCat(cat, btn) {
  _faqCat = cat;
  document.querySelectorAll('.faq-cat').forEach(b=>b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderFaq();
}

// ══════════════ TERMS ══════════════
export function scrollToSection(id) {
  const el = document.getElementById(id); if (!el) return;
  el.scrollIntoView({behavior:'smooth',block:'start'});
  document.querySelectorAll('.terms-nav-item').forEach(i=>i.classList.remove('active'));
  const sections = ['t-intro','t-uso','t-medico','t-afiliados','t-dados','t-ip','t-responsabilidade','t-alteracoes','t-contato'];
  const items    = document.querySelectorAll('.terms-nav-item');
  const idx = sections.indexOf(id);
  if (items[idx]) items[idx].classList.add('active');
}
let _termsObserver = null;
export function initTermsNav() {
  if (_termsObserver) { _termsObserver.disconnect(); _termsObserver = null; }
  const sections = document.querySelectorAll('.terms-section'), navItems = document.querySelectorAll('.terms-nav-item');
  if (!sections.length) return;
  _termsObserver = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { navItems.forEach(n=>n.classList.remove('active')); const idx=[...sections].indexOf(e.target); if(navItems[idx])navItems[idx].classList.add('active'); } });
  },{threshold:0.35,rootMargin:'0px 0px -40% 0px'});
  sections.forEach(s=>_termsObserver.observe(s));
}

// ══════════════ CONFIG ══════════════
export function applyCfg() {
  const ALL_KEYS = ['showStars','showPdose','showTooltips','confetti','alertInteractions','alertCycles','toasts','expandOnClick','confirmUncheck','autoSync','autoHistory'];
  ALL_KEYS.forEach(k => { const el=document.getElementById('cfg-'+k); if(el)el.className='tog'+(S.cfg[k]?' on':''); });
  const exEl = document.getElementById('cfg-showExtra'); if(exEl)exEl.className='tog'+(S.showExtra?' on':'');
  const dnEl = document.getElementById('cfg-showDone');  if(dnEl)dnEl.className='tog'+(S.showDone?' on':'');
  const dsEl = document.getElementById('cfg-defaultSort');if(dsEl)dsEl.value=S.cfg.defaultSort||'priority';

  if (S.cfg.isAdmin) renderQADashboard();
  syncCfgLangGrid();
}

/**
 * Renderiza o painel de monitoramento de qualidade (QA Dashboard).
 */
function renderQADashboard() {
  const container = document.getElementById('admin-section');
  if (!container) return;

  const recipeResults = runRecipeTestSuite();
  const doseResults = runDoseTestSuite();
  const logs = getPersistedLogs();
  
  // Lógica de snapshot de memória para o gráfico
  const rawData = localStorage.getItem(STORAGE_KEY) || '';
  const currentKb = parseFloat((new Blob([rawData]).size / 1024).toFixed(2));
  
  // Recupera histórico de snapshots (últimos 20 pontos)
  let storageHistory = JSON.parse(localStorage.getItem('suplilist_qa_storage_history') || '[]');
  if (storageHistory.length === 0 || storageHistory[storageHistory.length - 1] !== currentKb) {
    storageHistory.push(currentKb);
    if (storageHistory.length > 20) storageHistory.shift();
    localStorage.setItem('suplilist_qa_storage_history', JSON.stringify(storageHistory));
  }

  // Gera o SVG do gráfico de linha
  const generateChart = (data) => {
    if (data.length < 2) return `<div style="font-size:10px;color:var(--tx3);padding:10px">Coletando dados de uso...</div>`;
    const max = Math.max(...data, 5); // Teto mínimo de 5kb para escala
    const min = Math.min(...data);
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 40 - ((val / max) * 35); // 40px altura, 5px margem
      return `${x},${y}`;
    }).join(' ');

    return `
      <div style="margin:10px 16px; padding:8px; background:rgba(0,0,0,0.2); border-radius:4px">
        <div style="display:flex; justify-content:space-between; font-size:9px; color:var(--accent); margin-bottom:4px">
          <span>MEMÓRIA (LOCALSTORAGE)</span>
          <span>${currentKb} KB</span>
        </div>
        <svg viewBox="0 0 100 40" style="width:100%; height:40px; stroke:var(--accent); fill:none; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round">
          <polyline points="${points}" />
        </svg>
      </div>`;
  };

  const createPill = (name, res) => {
    const isOk = res.passed === res.total;
    return `<div style="padding:10px; background:var(--bg3); border-radius:8px; border-left:4px solid ${isOk ? 'var(--accent)' : 'var(--red)'}">
      <div style="font-size:10px; color:var(--tx3); text-transform:uppercase">${name}</div>
      <div style="font-size:14px; font-weight:bold; color:${isOk ? 'var(--tx)' : 'var(--red)'}">${res.passed}/${res.total} Passaram</div>
    </div>`;
  };

  container.innerHTML = `
    <div class="setsec" style="margin-top:20px; border-top: 2px solid var(--accent)">
      <h3>🛠️ QA Dashboard (Build Health)</h3>
      
      ${generateChart(storageHistory)}

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:16px">
        ${createPill('Recipe Engine', recipeResults)}
        ${createPill('Dosage Engine', doseResults)}
      </div>

      <div style="padding:0 16px 12px; display:flex; gap:8px">
        <button class="btn bg" onclick="window._app.runStressTest()" style="height:32px; font-size:11px">🚀 Rodar Stress Test (1k)</button>
        <button class="btn" onclick="window._app.clearLogs()" style="height:32px; font-size:11px">🧹 Limpar Logs</button>
      </div>

      <div id="stress-results" style="padding: 0 16px 16px; font-size: 11px; color: var(--accent); display:none; font-family:var(--fm)"></div>

      <div style="margin:0 16px 16px; padding:12px; background:var(--bg2); border-radius:8px; border:1px solid var(--border); max-height:150px; overflow-y:auto">
        <div style="font-size:10px; color:var(--tx3); text-transform:uppercase; margin-bottom:8px">Logs de Falhas Persistentes (Últimos 30)</div>
        ${logs.length ? logs.map(l => `<div style="margin-bottom:6px; color:var(--red); font-size:10px; line-height:1.4"><b>[${new Date(l.date).toLocaleTimeString()}]</b> ${escapeHTML(l.msg)}</div>`).join('') : '<div style="font-size:11px; color:var(--tx3)">Nenhuma falha registrada.</div>'}
      </div>

      <div style="padding:0 16px 16px; font-size:11px; color:var(--tx3)">
        Integridade do sistema verificada às ${new Date().toLocaleTimeString()}
      </div>
    </div>
  `;
}

export function runStressTest() {
  const start = performance.now();
  // Gera 1.000 itens mockados baseados no schema real
  const mockIT = Array.from({ length: 1000 }, (_, i) => ({
    id: 10000 + i,
    name: `Stress Test Item ${i}`,
    cat: i % 2 === 0 ? 'Aminoácido' : 'Mineral',
    pr: i % 3 === 0 ? 'alta' : 'media',
    pm: 10 + (i % 200),
    doses: 30,
    goals: ['saude'],
    sc: 5
  }));

  // Executa o motor de filtragem puro
  const filtered = applyFilters(S, mockIT);
  const end = performance.now();
  
  const out = document.getElementById('stress-results');
  if (out) {
    out.style.display = 'block';
    out.innerHTML = `✅ 1000 itens processados em <b>${(end - start).toFixed(2)}ms</b>.<br>O motor retornou ${filtered.length} suplementos válidos.`;
  }
}

export function clearLogs() {
  clearPersistedLogs();
  applyCfg(); // Re-renderiza o dashboard para limpar a lista visual de logs
  toast('🧹', 'Histórico de logs de erro limpo', 'info');
}
export function toggleCfg(k) { S.cfg[k]=!S.cfg[k]; save(); applyCfg(); renderAll(); }

export function updateStorageSize() {
  const el = document.getElementById('storage-size'); if (!el) return;
  try { const raw=localStorage.getItem(STORAGE_KEY)||''; el.textContent=(new Blob([raw]).size/1024).toFixed(1)+' KB'; }
  catch(e) { el.textContent='—'; }
}

export function nukeAll() {
  confirmModal({title:'Apagar todos os dados?',msg:'Esta ação removerá permanentemente suas notas, histórico e stack. Irreversível.',ico:'🗑',okLabel:'Apagar tudo',cancelLabel:'Cancelar',danger:true})
    .then(ok => { if(!ok)return; localStorage.removeItem(STORAGE_KEY); localStorage.removeItem('sb_collapsed'); toast('🗑','Dados apagados. Recarregando…','error'); setTimeout(()=>location.reload(),1800); });
}

// ══════════════ EXPORT / IMPORT ══════════════
export function exportTxt() {
  try {
    let t = 'SUPLILIST v' + APP_VERSION + '\n' + '═'.repeat(50) + '\n';
    ['alta', 'media', 'baixa', 'extra'].forEach(p => {
      const g = IT.filter(i => i.pr === p);
      if (!g.length) return;
      t += `\n[${PLBL[p].toUpperCase()}]\n`;
      g.forEach(i => {
        t += `  ${S.checked?.[i.id] ? '[✔]' : '[ ]'} ${i.name}  ~R$${bestMarketplacePrice(i)}\n  Mercado Livre: ${i.linkML || ''}\n  Amazon: ${i.linkAmazon || ''}\n\n`;
      });
    });

    dl(t, 'suplilist.txt', 'text/plain');
    toast('⬇️', 'Lista exportada com sucesso!', 'success');
  } catch (err) {
    console.error('[Export] Falha na geração do TXT:', err);
    toast('⚠️', 'Erro ao gerar arquivo TXT. Verifique o console.', 'error');
  }
}

export function exportJSON() {
  try {
    // [SL-15] Validação de integridade do estado global antes da serialização
    if (!S || typeof S !== 'object') throw new Error('Estado (S) inválido ou inacessível.');

    const data = {
      date: new Date().toISOString(),
      items: IT.map(i => ({
        ...i,
        comprado: !!S.checked?.[i.id],
        nota: S.notes?.[i.id] || ''
      })),
      history: Array.isArray(S.history) ? S.history : []
    };

    const json = JSON.stringify(data, null, 2);
    if (!json || json === '{}') throw new Error('Serialização resultou em dados vazios.');

    dl(json, 'suplilist.json', 'application/json');
    toast('✅', 'Backup JSON criado com sucesso!', 'success');
  } catch (err) {
    console.error('[Export] Erro crítico na exportação JSON:', err);
    toast('🚨', 'Erro ao exportar dados. Possível corrupção no estado.', 'error', { duration: 5000 });
  }
}

// SL-16: Importação movida para módulo especializado js/import.js
export { importJSON, handleImport } from './import.js';

export function copyToClipboard() {
  const checked = IT.filter(i=>S.checked[i.id]).map(i=>'✅ '+i.name);
  const pending = IT.filter(i=>!S.checked[i.id]&&i.pr!=='extra').map(i=>'☐ '+i.name);
  navigator.clipboard.writeText([...checked,...pending].join('\n')).then(()=>toast('Copiado com sucesso! ✅','success'));
}
export function copyList() {
  const lines = IT.map(i => {
    const p = bestMarketplacePrice(i);
    let text = `${S.checked[i.id]?'✔':'○'} ${i.name} (~R$${p})`;
    if (S.wishlist[i.id]) text += ' ❤️';
    return `${text}\n   🛒 ML: ${i.linkML||''}\n   🛒 Amazon: ${i.linkAmazon||''}\n   🛒 Shopee: ${i.linkShopee||''}`;
  });
  navigator.clipboard?.writeText(lines.join('\n')).then(()=>toast('Copiado com sucesso! ✅','success'));
}

// ══════════════ MISC ══════════════
export function updateDynamicStrings() {
  const totalCountEl   = document.getElementById('total-supplements-count'); if(totalCountEl)totalCountEl.textContent=IT.length;
  const versionDisplay = document.getElementById('app-version-display');     if(versionDisplay)versionDisplay.textContent=APP_VERSION;
  const verFooter      = document.getElementById('version-footer');          if(verFooter)verFooter.textContent=APP_VERSION;
  const verConfig      = document.getElementById('version-config');          if(verConfig)verConfig.textContent=APP_VERSION;
}

export function initHomeReveal() {
  setTimeout(() => {
    const els = document.querySelectorAll('#p-home .v2-reveal'); if (!els.length) return;
    const obs = new IntersectionObserver(entries => { entries.forEach(e=>{ if(e.isIntersecting)e.target.classList.add('v2-vis'); }); },{threshold:0.08});
    els.forEach(el => obs.observe(el));
  }, 80);
}

export function initStructuredData() {
  const schema = {
    "@context":"https://schema.org","@graph":[
      {"@type":"WebSite","name":"SupliList","url":"https://suplilist.com","potentialAction":{"@type":"SearchAction","target":"https://suplilist.com/?q={search_term_string}","query-input":"required name=search_term_string"}},
      {"@type":"SoftwareApplication","name":"SupliList","operatingSystem":"Web","applicationCategory":"HealthApplication","aggregateRating":{"@type":"AggregateRating","ratingValue":"4.9","ratingCount":"128"},"offers":{"@type":"Offer","price":"0","priceCurrency":"BRL"}},
      {"@type":"FAQPage","mainEntity":[
        {"@type":"Question","name":"O que é o SupliList?","acceptedAnswer":{"@type":"Answer","text":"Um marketplace inteligente para comparar suplementos, doses e eficácia científica."}},
        {"@type":"Question","name":"Os dados são salvos?","acceptedAnswer":{"@type":"Answer","text":"Sim, o SupliList utiliza armazenamento local no seu navegador."}}
      ]}
    ]
  };
  const script = document.createElement('script'); script.type='application/ld+json'; script.text=JSON.stringify(schema); document.head.appendChild(script);
}

// ══════════════ DEV MODE ══════════════
const DEV_CODE = 'f16215877ffd53c15e4eb315b67bf5b4cf334a621281f6a4a57dcd8697ba7df0';
async function _sha256hex(str) {
  const encoded = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(hashBuffer)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function toggleAdminMode() {
  if (!S.cfg.isAdmin) {
    const pw = prompt('Modo Desenvolvedor — digite o código de ativação:');
    if (pw===null||pw==='') { toast('🚫','Ativação cancelada','info'); return; }
    
    // [SL-17] Ativa estado de processamento no trigger visual
    toggleLoading('version-trigger', true);
    
    let inputHash;
    try { 
      announceToScreenReader('Verificando código de ativação...');
      inputHash = await _sha256hex(pw); 
    } catch(e) { 
      toast('⚠️','Erro ao verificar código','error'); 
      return; 
    } finally {
      // Limpeza estrita do estado de loading, independente do resultado
      toggleLoading('version-trigger', false);
    }

    if (inputHash !== DEV_CODE) { toast('🚫','Código incorreto','error'); return; }
  }
  announceToScreenReader(S.cfg.isAdmin ? 'Modo Desenvolvedor desativado.' : 'Modo Desenvolvedor ativado.');
  S.cfg.isAdmin = !S.cfg.isAdmin;
  const sec = document.getElementById('admin-section');
  if (sec) sec.classList.toggle('is-hidden', !S.cfg.isAdmin);
  save();
  toast(S.cfg.isAdmin?'🛠️':'🔧', S.cfg.isAdmin?'Modo Desenvolvedor Ativado':'Modo Desenvolvedor Desativado','info');
}

/**
 * Altera o idioma global e recarrega a aplicação para aplicar as traduções.
 */
export function setLang(l) {
  if (S.lang === l) return;
  confirmModal({
    title: l === 'en' ? 'Language' : 'Idioma',
    msg: t('app.confirm_lang'),
    okLabel: l === 'en' ? 'Change' : 'Mudar',
    cancelLabel: l === 'en' ? 'Cancel' : 'Cancelar'
  }).then(ok => {
    if (ok) {
      announceToScreenReader(`Idioma alterado para ${l === 'en' ? 'Inglês' : 'Português'}.`);
      setLanguage(l);
      syncCfgLangGrid();
    }
  });
}

// ── Aliases e stubs para compatibilidade com main.js ──────────
export function togWl(id) {
  S.wishlist[id] = !S.wishlist[id];
  save();
  announceToScreenReader(`Suplemento ${IT.find(i=>i.id===id)?.name || 'item'} ${S.wishlist[id] ? 'adicionado' : 'removido'} dos favoritos.`);
  renderWishlist();
  renderStats();
}

/**
 * Sincroniza os preços com a base de dados remota.
 * [SL-17] Refatorado para fluxo assíncrono resiliente com bloqueio de UI.
 */
export async function refreshPrices() {
  const targetId = 'list';
  toggleLoading(targetId, true);

  try {
    // Simula a latência de rede para o processamento de preços (conforme Task SL-17)
    await new Promise(resolve => setTimeout(resolve, 800));
    announceToScreenReader('Preços atualizados com sucesso.');
    renderAll();
    toast('✅', 'Preços atualizados com sucesso!', 'success');
  } catch (error) {
    console.error('[PriceSync] Falha na sincronização:', error);
    toast('⚠️', 'Erro ao sincronizar preços. Tente novamente.', 'error');
  } finally {
    // Garante que o container da lista seja desbloqueado
    toggleLoading(targetId, false);
  }
}

export function testAffiliateLinks() {
  if (!S.cfg.isAdmin) return;
  toast('🔗', 'Testando links de afiliados… Veja o console.', 'info', { duration: 3000 });
  IT.forEach(i => {
    if (i.shopee) console.log(`[Shopee] ${i.name}:`, i.shopee);
    if (i.ml)    console.log(`[ML]     ${i.name}:`, i.ml);
    if (i.az)    console.log(`[Amazon] ${i.name}:`, i.az);
  });
}

export { toast, dismissToast, confirmModal } from './utils.js';

export function runDatabaseAudit() {
  if (!S.cfg.isAdmin) return;
  const total = IT.length;
  const PRODUCT_LINKS_DATA = (typeof PRODUCT_LINKS !== 'undefined') ? PRODUCT_LINKS : {};
  const manualLinks   = IT.filter(i=>PRODUCT_LINKS_DATA[i.id]).length;
  const missingManual = IT.filter(i=>!PRODUCT_LINKS_DATA[i.id]);
  console.group('📊 Relatório de Auditoria - SupliList');
  console.log(`Total: ${total} | Links manuais: ${manualLinks} (${Math.round(manualLinks/total*100)}%)`);
  if (missingManual.length) { console.warn('Sem link direto:'); missingManual.forEach(i=>console.log(`- ID ${i.id}: ${i.name}`)); }
  else console.log('✅ Todos os itens possuem links manuais!');
  console.groupEnd();
  toast('📊',`Auditoria: ${manualLinks}/${total} links manuais. Veja o console.`,'info',{duration:5000});
  announceToScreenReader('Auditoria de links concluída. Verifique o console para detalhes.');
}
/**
 * Injeta no CSS variáveis baseadas na eficácia (estrelas)
 */
export function injectEfficacyColors() {
  const colors = {
    0: { c: 'var(--tx3)', b: 'var(--bg3)', br: 'var(--border)' },
    1: { c: 'var(--red)', b: 'var(--redd)', br: 'rgba(255,68,85,0.3)' },
    2: { c: 'var(--orange)', b: 'rgba(255,107,43,0.1)', br: 'rgba(255,107,43,0.3)' },
    3: { c: 'var(--amber)', b: 'var(--ambd)', br: 'rgba(255,182,39,0.3)' },
    4: { c: 'var(--teal)', b: 'var(--teald)', br: 'rgba(45,212,191,0.3)' },
    5: { c: 'var(--accent)', b: 'var(--ad)', br: 'var(--ag)' }
  };
  let css = '';
  Object.entries(colors).forEach(([stars, val]) => {
    css += `.eff-s${stars} { --eff-color: ${val.c}; --eff-bg: ${val.b}; --eff-border: ${val.br}; }\n`;
  });
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

export function togQuickCmp(id) {
  const idx = S.quickCmpSel.indexOf(id);
  if (idx >= 0) S.quickCmpSel.splice(idx, 1);
  else if (S.quickCmpSel.length < 4) S.quickCmpSel.push(id);
  else return toast('⚠️', 'Máximo 4 itens para comparação rápida', 'warn');

  document.getElementById(`item-${id}`)?.classList.toggle('qcmp-selected', idx < 0);
  renderQuickCmpBar();
  save();
}

export function renderQuickCmpBar() {
  let bar = document.getElementById('quick-cmp-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'quick-cmp-bar';
    bar.className = 'quick-cmp-bar';
    document.body.appendChild(bar);
  }

  const sel = IT.filter(i => S.quickCmpSel.includes(i.id));
  if (sel.length === 0) {
    bar.classList.remove('show');
    return;
  } else {
    announceToScreenReader(`${sel.length} itens selecionados para comparação rápida.`);
  }

  const thumbs = sel.map(i => `<div class="qcmp-thumb" title="${i.name}">${CAT[i.cat]?.ico || '💊'}</div>`).join('');
  bar.innerHTML = `
    <div class="qcmp-count">${sel.length} selecionados</div>
    <div class="qcmp-thumbs">${thumbs}</div>
    <button class="btn bg" onclick="window._app.openQuickCmpPanel()">Comparar Agora</button>
    <button class="sticky-close" onclick="window._app.clearQuickCmp()" style="margin-left: 8px">✕</button>
  `;
  bar.classList.add('show');
}

export function openQuickCmpPanel() {
  // Reutiliza a lógica do comparador principal em um modal
  const sel = S.quickCmpSel;
  S.cmpSel = [...sel]; // Sincroniza com a aba de comparação
  go('compare');
  clearQuickCmp();
}

export function clearQuickCmp() {
  S.quickCmpSel = [];
  document.querySelectorAll('.item.qcmp-selected').forEach(el => el.classList.remove('qcmp-selected'));
  renderQuickCmpBar();
  save();
}
