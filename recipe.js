// ══════════════════════════════════════════════════════════════
// js/recipe.js — Gerador de Receitas e Protocolos
// [SL-10] Refatoração: Injeção de Dependência e Pureza Funcional.
//         As funções não mantêm estado interno e dependem apenas dos argumentos.
// ══════════════════════════════════════════════════════════════
import { announceToScreenReader } from './accessibility.js';
import { IT, CAT, GOAL_MAP, RECIPE_SYNERGIES, INTERACT, bestMarketplacePrice } from './database.js';
import { toast, dl, escapeHTML, assertEquals } from './utils.js';

/**
 * Aplica um preset de objetivo à seleção.
 * [PURE] Calcula o novo conjunto de IDs baseado no objetivo e no estado anterior do preset.
 *
 * @param {string}   goal          - Chave do objetivo (ex: 'hipertrofia').
 * @param {string}   currentPreset - O preset atualmente ativo na UI.
 * @param {Function} onUpdate      - Callback: recebe (nextRSel, nextPreset).
 * 
 * Chamada: applyPreset('libido', 'energia', (ids, pre) => { ... })
 */
/** @type {string|null} Estado de runtime para controle de presets (Sincronizado via main.js) */
export function applyPreset(goal, currentPreset, onUpdate) {
  const ids = GOAL_MAP[goal] || [];
  let nextRSel, nextPreset;

  if (currentPreset === goal) {
    nextPreset = null;
    document.querySelectorAll('.rpreset').forEach(b => b.classList.remove('on'));
    nextRSel = [];
  } else {
    nextPreset = goal;
    document.querySelectorAll('.rpreset').forEach(b => b.classList.remove('on'));
    const goalItems = IT.filter(i => ids.includes(i.id));
    const alta = goalItems.filter(i => i.pr === 'alta').map(i => i.id);
    const med  = goalItems.filter(i => i.pr === 'media').map(i => i.id).slice(0, 4);
    nextRSel = [...new Set([...alta, ...med])];
  }

  // Notifica o orquestrador sobre a mudança calculada
  announceToScreenReader(`Preset ${goal} aplicado.`);
  onUpdate(nextRSel, nextPreset);
}

/**
 * Filtra visualmente o grid de seleção no DOM.
 * Nota: Esta função lida com o estado volátil da UI (campos de busca).
 */
export function filterRecipeSel() {
  const q   = (document.getElementById('r-search')?.value || '').toLowerCase().trim();
  const cat = document.getElementById('r-cat-filter')?.value || '';
  let visible = 0;
  document.querySelectorAll('#rsel-grid .rsel').forEach(el => {
    const name  = (el.dataset.name || '').toLowerCase();
    const elCat = el.dataset.cat || '';
    const show  = (!q || name.includes(q)) && (!cat || elCat === cat);
    el.classList.toggle('filtered-out', !show);
    if (show) visible++;
  });
  const fc = document.getElementById('r-filtered-count');
  if (fc) fc.textContent = q || cat ? `${visible} visíveis` : '';
}

/**
 * Altera o modo de visualização da receita.
 * 
 * @param {string}   v        - 'protocol' ou 'timeline'.
 * @param {object}   S        - Estado global.
 * @param {Function} onUpdate - Callback para persistir a escolha da view.
 */
export function setRecipeView(v, S, onUpdate) {
  document.querySelectorAll('.rvtab').forEach(b => b.classList.remove('on'));
  const activeBtn = document.querySelector(`.rvtab[onclick*="${v}"]`);
  if (activeBtn) activeBtn.classList.add('on');
  
  onUpdate(v);
}

/**
 * Renderiza o grid de selecção de suplementos.
 *
 * @param {object} S - Estado actual do utilizador, injectado pelo orquestrador.
 * @param {string} recipeView - O modo de exibição atual ('protocol'|'timeline').
 */
export function renderRecipeSel(S, recipeView = 'protocol') {
  const el = document.getElementById('rsel-grid'); if (!el) return;
  el.innerHTML = IT.map(i => {
    const picked  = S.rSel.includes(i.id);
    const catCls  = CAT[i.cat]?.cls || 'cV';
    const catIco  = CAT[i.cat]?.ico || '';
    return `<div class="rsel${picked?' pk':''}" data-id="${i.id}" onclick="window._app.togR(${i.id})" data-name="${i.name.toLowerCase()}" data-cat="${i.cat}" role="checkbox" aria-checked="${picked}" aria-label="${escapeHTML(i.name)}">
      <div class="rcheck">${picked?'✓':''}</div>
      <div class="rsel-info">
        <div class="rsel-name" title="${escapeHTML(i.name)}">${escapeHTML(i.name)}</div>
        <div class="rsel-meta">
          <span class="rsel-cat ctag ${catCls}">${catIco} ${i.cat}</span>
          ${i.warn?'<span class="rsel-warn-dot" title="Tem aviso de segurança"></span>':''}
        </div>
      </div>
    </div>`;
  }).join('');
  const cnt = document.getElementById('r-count'); if (cnt) cnt.textContent = S.rSel.length;
  filterRecipeSel();
  renderRecipeOut(S, recipeView);
}

/**
 * Seleciona todos os suplementos.
 *
 * @param {Function} onUpdate - Callback que recebe o novo rSel.
 */
export function selAllR(onUpdate) {
  document.querySelectorAll('.rpreset').forEach(b => b.classList.remove('on'));
  onUpdate(IT.map(i => i.id));
}

/**
 * Limpa a seleção.
 * @param {Function} onUpdate - Callback que recebe o novo rSel.
 */
export function clearR(onUpdate) {
  document.querySelectorAll('.rpreset').forEach(b => b.classList.remove('on'));
  onUpdate([]);
}

/**
 * Seleciona apenas os suplementos já comprados.
 * @param {object}   S        - Estado actual (para ler S.checked).
 * @param {Function} onUpdate - Callback que recebe o novo rSel.
 */
export function selBought(S, onUpdate) {
  document.querySelectorAll('.rpreset').forEach(b => b.classList.remove('on'));
  onUpdate(IT.filter(i => S.checked[i.id]).map(i => i.id));
  toast('🛒', 'Usando suplementos comprados', 'info', { duration: 2600 });
  announceToScreenReader('Suplementos comprados selecionados para a receita.');
}

/**
 * Copia a receita para o clipboard.
 * @param {object} S - Estado actual (para ler S.rSel).
 */
export function copyRecipe(S) {
  const sel = IT.filter(i => S.rSel.includes(i.id));
  if (!sel.length) { toast('⚠️','Selecione ao menos um suplemento','warn',{duration:2600}); return; }
  const pre = sel.filter(i=>i.dp&&i.dm), ma = sel.filter(i=>i.dm&&!i.dp), no = sel.filter(i=>i.dn);
  let txt = '⚗️ MINHA RECEITA DE SUPLEMENTOS\n' + '═'.repeat(36) + '\n';
  if (pre.length) { txt += '\n⚡ PRÉ-TREINO (30–45min antes)\n'; pre.forEach(i=>{txt+=`  • ${i.name}: ${i.dm||i.dn}\n`;}); }
  if (ma.length)  { txt += '\n🌅 MANHÃ\n'; ma.filter(i=>!i.dp).forEach(i=>{txt+=`  • ${i.name}: ${i.dm}${i.dc?' (com refeição)':''}\n`;}); }
  if (no.length)  { txt += '\n🌙 NOITE\n'; no.forEach(i=>{txt+=`  • ${i.name}: ${i.dn}${i.dc?' (com refeição)':' (antes de dormir)'}\n`;}); }
  txt += '\n⚠️ Consulte um profissional de saúde antes de iniciar.\n';
  navigator.clipboard?.writeText(txt).then(()=>toast('📋','Receita copiada!','success',{duration:3000})).catch(()=>toast('❌','Erro ao copiar.','error',{duration:3000}));
  announceToScreenReader('Receita copiada para a área de transferência.');
}

/**
 * Exporta a receita como arquivo .txt.
 * @param {object} S - Estado actual (para ler S.rSel).
 */
export function exportRecipeTxt(S) {
  try {
    const sel = IT.filter(i => S.rSel.includes(i.id));
    if (!sel.length) { toast('⚠️','Selecione ao menos um suplemento','warn',{duration:2600}); return; }
    const pre = sel.filter(i=>i.dp&&i.dm), ma = sel.filter(i=>i.dm&&!i.dp), no = sel.filter(i=>i.dn);
    let txt = 'RECEITA DE SUPLEMENTOS — SupliList Pro\nGerado em: '+new Date().toLocaleDateString('pt-BR')+'\n\n';
    if (pre.length) { txt+='PRÉ-TREINO (30–45min antes)\n'; pre.forEach(i=>{txt+=`  ${i.name}: ${i.dm||i.dn}\n`;}); }
    if (ma.length)  { txt+='\nMANHÃ\n'; ma.filter(i=>!i.dp).forEach(i=>{txt+=`  ${i.name}: ${i.dm}${i.dc?' (com refeição)':''}\n`;}); }
    if (no.length)  { txt+='\nNOITE\n'; no.forEach(i=>{txt+=`  ${i.name}: ${i.dn}\n`;}); }
    const warn = sel.filter(i=>i.warn);
    if (warn.length) { txt+='\nAVISOS\n'; warn.forEach(i=>{txt+=`  ${i.name}: ${i.warn}\n`;}); }
    txt += '\n⚠️ Consulte um profissional de saúde antes de iniciar qualquer suplementação.';
    
    dl(txt, 'minha-receita.txt', 'text/plain');
    toast('⬇️', 'Receita baixada!', 'success');
    announceToScreenReader('Receita baixada como arquivo de texto.');
  } catch (err) {
    console.error('[Recipe] Erro na exportação:', err);
    toast('⚠️', 'Erro ao gerar arquivo de receita.', 'error');
  }
}

/**
 * Renderiza o corpo da receita no formato de Tabela de Protocolo.
 * [PURE] Retorna string HTML.
 */
function renderRecipeProtocol(pre, ma, no, warns) {
  let h = '';
  function rowHTML(i, period) {
    const dose   = period==='noite'?(i.dn||'—'):(i.dm||i.dn||'—');
    const timing = period==='pre'?'30–45min antes':period==='noite'?(i.dc?'com refeição':'antes de dormir'):(i.dc?'com refeição':'em jejum');
    return `<div class="rmr">
      <div class="rmr-left">
        <div class="rmr-n">${escapeHTML(i.name)}${i.badge?`<span class="badge badge-${i.badge}">${i.badge==='best'?'⭐ Best':'🔥 '+i.badge}</span>`:''}</div>
        <div class="rmr-tags">${i.warn?'<span class="rmr-warn">⚠️ aviso</span>':''} ${i.cy?`<span class="rmr-cycle">🔄 ${i.cy.max}d ciclo</span>`:''} ${i.dc?'<span class="rmr-food">🍽 com comida</span>':''}</div>
      </div>
      <span class="rmr-d">${escapeHTML(dose)}</span><span class="rmr-t">${escapeHTML(timing)}</span>
    </div>`;
  }
  if (pre.length) h+=`<div class="rsec"><div class="rsec-head">⚡ Pré-Treino <span class="rsec-badge">${pre.length} item${pre.length!==1?'s':''}</span></div>${pre.map(i=>rowHTML(i,'pre')).join('')}</div>`;
  const morn = ma.filter(i=>!i.dp);
  if (morn.length) h+=`<div class="rsec"><div class="rsec-head">🌅 Manhã <span class="rsec-badge">${morn.length} item${morn.length!==1?'s':''}</span></div>${morn.map(i=>rowHTML(i,'manha')).join('')}</div>`;
  if (no.length)  h+=`<div class="rsec"><div class="rsec-head">🌙 Noite <span class="rsec-badge">${no.length} item${no.length!==1?'s':''}</span></div>${no.map(i=>rowHTML(i,'noite')).join('')}</div>`;
  if (warns.length) h+=`<div style="background:var(--ambd);border:1px solid rgba(255,182,39,.25);border-radius:var(--r);padding:14px 16px;margin-top:4px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--amber);margin-bottom:8px">⚠️ Avisos de segurança</div>${warns.map(i=>`<div style="font-size:12px;color:var(--tx2);margin-bottom:6px;line-height:1.6"><b style="color:var(--tx)">${i.name}:</b> ${i.warn}</div>`).join('')}</div>`;
  if (!pre.length&&!ma.length&&!no.length) h+=`<div class="recipe-empty" style="padding:30px"><div class="recipe-empty-ico" style="font-size:36px">🤔</div><div class="recipe-empty-title">Sem dados de horário</div><div class="recipe-empty-sub">Esses suplementos não têm horário definido ainda.</div></div>`;
  return h;
}

/**
 * Renderiza o corpo da receita no formato de Linha do Tempo.
 * [PURE] Retorna string HTML.
 */
function renderRecipeTimeline(pre, ma, no) {
  const blocks = [
    {dot:'⚡',time:'Pré-Treino · 30–45min antes',items:pre,noteKey:'dm'},
    {dot:'🌅',time:'Manhã · ao acordar / café',items:ma.filter(i=>!i.dp),noteKey:'dm'},
    {dot:'🌙',time:'Noite · antes de dormir',items:no,noteKey:'dn'},
  ].filter(b=>b.items.length);
  if (!blocks.length) return `<div class="recipe-empty" style="padding:30px"><div class="recipe-empty-ico" style="font-size:36px">🕐</div><div class="recipe-empty-title">Sem horários definidos</div></div>`;
  let h = '<div class="timeline-wrap">';
  blocks.forEach(b => {
    h += `<div class="tl-block"><div class="tl-dot">${b.dot}</div><div class="tl-time">${b.time}</div><div class="tl-items">
      ${b.items.map(i => {
        const dose = b.noteKey==='dn'?(i.dn||'—'):(i.dm||'—');
        const note = i.dc?'com refeição':i.dp?'pré-treino':b.noteKey==='dn'?'antes de dormir':'em jejum';
        return `<div class="tl-item"><span class="tl-item-name">${i.name}${i.warn?` <span style="font-size:10px;color:var(--amber)">⚠️</span>`:''}</span><span class="tl-item-dose">${dose}</span><span class="tl-item-note">${note}</span></div>`;
      }).join('')}
    </div></div>`;
  });
  return h + '</div>';
}

/**
 * Calcula o custo mensal estimado de uma seleção.
 * [PURE] Função matemática isolada para testabilidade.
 * @param {Array} items - Lista de objetos de suplemento.
 * @returns {number}
 */
export function calculateMonthlyCost(items) {
  if (!Array.isArray(items)) return 0;
  return items
    .filter(i => i.pm && i.doses)
    .reduce((sum, i) => sum + (bestMarketplacePrice(i) / i.doses) * 30, 0);
}

/**
 * Identifica sinergias e perigos baseados nos IDs selecionados.
 * [PURE] Lógica de negócio isolada da manipulação de DOM.
 */
function getDetectedAlerts(selIds) {
  const selItems = IT.filter(i => selIds.includes(i.id));
  const selNames = selItems.map(i => i.name.toLowerCase());
  let alerts = [];

  const INTERACT_DATA = (typeof INTERACT !== 'undefined') ? INTERACT : [];
  
  // Busca Interações (Perigos e Avisos)
  INTERACT_DATA.forEach(int => {
    if (int.type === 'danger' || int.type === 'warn') {
      const titleWords = int.title.toLowerCase().split(/[+·,\s]+/).filter(w => w.length > 3);
      const matches = titleWords.filter(w => selNames.some(n => n.includes(w)));
      if (matches.length >= 1 && selNames.some(n => titleWords.some(w => n.includes(w)))) {
        alerts.push({ type: int.type, ico: int.ico, title: int.title, msg: int.desc });
      }
    }
  });

  // Busca Sinergias (Regras de Combo)
  RECIPE_SYNERGIES.forEach(([ids, title, note]) => {
    if (ids.every(id => selIds.includes(id))) {
      alerts.push({ type: 'synergy', ico: '✨', title: `Sinergia: ${title}`, msg: note });
    }
  });

  return alerts;
}

/**
 * Identifica e renderiza alertas de segurança e sinergias baseados na seleção.
 */
function renderRecipeAlerts(sel) {
  const alertsEl = document.getElementById('r-alerts'); if (!alertsEl) return;
  if (!sel.length) { alertsEl.innerHTML = ''; return; }

  const alerts = getDetectedAlerts(sel.map(i => i.id));

  if (!alerts.length) { alertsEl.innerHTML=''; return; }
  const order = {danger:0,warn:1,synergy:2};
  alertsEl.innerHTML = '<div class="recipe-alerts">' +
    alerts.sort((a,b)=>order[a.type]-order[b.type]).map(a=>`<div class="recipe-alert ${a.type}"><span class="recipe-alert-ico">${a.ico}</span><div class="recipe-alert-body"><strong>${a.title}</strong>${a.msg}</div></div>`).join('') +
    '</div>';
}

/**
 * Renderiza o painel de saída da receita (protocolo ou timeline).
 *
 * @param {object} S - Estado actual do utilizador, injectado pelo orquestrador.
 * @param {string} recipeView - 'protocol' ou 'timeline'.
 */
export function renderRecipeOut(S, recipeView = 'protocol') {
  const el     = document.getElementById('rout'); if (!el) return;
  const tabsEl = document.getElementById('r-view-tabs');
  const sel    = IT.filter(i => S.rSel.includes(i.id));
  renderRecipeAlerts(sel);
  if (!sel.length) {
    if (tabsEl) tabsEl.classList.add('is-hidden');
    el.innerHTML = `<div class="recipe-empty"><div class="recipe-empty-ico">⚗️</div><div class="recipe-empty-title">Nenhum suplemento selecionado</div><div class="recipe-empty-sub">Escolha os suplementos ou use um preset acima.</div></div>`;
    return;
  }
  if (tabsEl) tabsEl.classList.remove('is-hidden');
  const pre = sel.filter(i=>i.dp&&i.dm), ma = sel.filter(i=>i.dm&&!i.dp), no = sel.filter(i=>i.dn), warns = sel.filter(i=>i.warn);
  const hasCycle = sel.filter(i=>i.cy);
  const totalItems = sel.length;
  const monthly = calculateMonthlyCost(sel);
  let h = `<div class="rout">
    <div class="rout-head">
      <div class="rout-head-left"><h3>Sua Receita</h3><p>${totalItems} suplemento${totalItems!==1?'s':''} · ${pre.length} pré-treino · ${ma.length} manhã · ${no.length} noite${hasCycle.length?' · '+hasCycle.length+' ciclados':''}</p></div>
      <div class="rout-head-acts">
        <button class="btn" onclick="window._app.copyRecipe()" style="height:34px;font-size:11px">📋 Copiar</button>
        <button class="btn" onclick="window._app.exportRecipeTxt()" style="height:34px;font-size:11px">⬇ .txt</button>
      </div>
    </div>
    <div class="rout-body">${recipeView === 'timeline' ? renderRecipeTimeline(pre,ma,no) : renderRecipeProtocol(pre,ma,no,warns)}</div>
    ${monthly>0?`<div class="rout-footer"><div class="rout-cost">💰 Custo mensal estimado: <strong>~R$${monthly.toFixed(0)}</strong></div><div style="font-size:11px;color:var(--tx3)">baseado nos ${sel.filter(i=>i.pm&&i.doses).length} itens com preço</div></div>`:''}
  </div>`;
  el.innerHTML = h;
}

// ══════════════════════════════════════════════════════════════
// SUÍTE DE TESTES UNITÁRIOS (Task SL-27)
// ══════════════════════════════════════════════════════════════

/**
 * Executa a suite de testes do motor de receitas.
 */
export function runRecipeTestSuite() {
  console.group("🧪 Iniciando Testes Unitários: recipe.js");
  let passed = 0, total = 0;
  const run = (fn) => { total++; if (fn()) passed++; };

  // TESTE 1: Cálculo de Custo Mensal (Fórmula Financeira)
  run(() => {
    const mockItems = [
      { id: 11, pm: 50, doses: 50 }, // R$ 1,00/dose * 30 dias = R$ 30,00
      { id: 99, pm: 100, doses: 30 } // R$ 3,33/dose * 30 dias = R$ 100,00
    ];
    const cost = calculateMonthlyCost(mockItems);
    return assertEquals(Math.round(cost), 130, "Cálculo de custo mensal deve bater com valor por dose * 30");
  });

  // TESTE 2: Lógica de Preset (Hipertrofia)
  run(() => {
    let resultIds = [];
    applyPreset('hipertrofia', null, (ids) => { resultIds = ids; });
    // Hipertrofia no database.js tem IDs como 11, 12... com prioridade alta
    const hasCreatine = resultIds.includes(11);
    return assertEquals(hasCreatine, true, "Preset de Hipertrofia deve incluir Creatina (ID 11)");
  });

  // TESTE 3: Toggle de Preset (Reset ao clicar no mesmo)
  run(() => {
    let resultIds = [1, 2];
    applyPreset('energia', 'energia', (ids) => { resultIds = ids; });
    return assertEquals(resultIds, [], "Aplicar o mesmo preset ativo deve limpar a seleção (Toggle Off)");
  });

  // TESTE 4: Detecção de Sinergias (Combo Cafeína + Teanina)
  run(() => {
    const synergyAlerts = getDetectedAlerts([13, 22]); // 13=Cafeína, 22=Teanina
    const hasSynergy = synergyAlerts.some(a => a.type === 'synergy' && a.title.includes('Cafeína + L-Teanina'));
    return assertEquals(hasSynergy, true, "Deve detectar sinergia entre Cafeína e Teanina");
  });

  // TESTE 5: Entradas Inválidas (Resiliência)
  run(() => {
    const cost = calculateMonthlyCost(null);
    return assertEquals(cost, 0, "Cálculo de custo deve retornar 0 para entradas nulas");
  });

  console.groupEnd();
  return { passed, total };
}
