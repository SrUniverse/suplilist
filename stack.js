// ══════════════════════════════════════════════════════════════
// js/stack.js — Minha Stack & Ciclos
// ══════════════════════════════════════════════════════════════
import { S, save } from './state.js';
import { IT, CYCLES, INTERACT, bestMarketplacePrice } from './database.js';
import { announceToScreenReader } from './accessibility.js';
import { escapeHTML, emptyStateHTML, toast, confirmModal } from './utils.js';
import { renderStats } from './list.js';
import { invalidateTab } from './router.js';

export function initStackSel() {
  const el = document.getElementById('stack-sel'); if (!el) return;
  el.innerHTML = IT.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
}

export function addStack() {
  const sel = document.getElementById('stack-sel'), qty = document.getElementById('stack-qty');
  if (!sel || !qty) return;
  const id = parseInt(sel.value), q = parseFloat(qty.value) || 100;
  const it = IT.find(i => i.id === id); if (!it) return;
  S.stack[id] = { id, name: it.name, qty: q, started: new Date().toISOString() };
  save(); renderStack(); renderStats();
  announceToScreenReader(`${it.name} adicionado à stack.`);
  toast('💪', `${it.name} adicionado à stack`, 'success', { duration: 2800 });
  qty.value = '';
}

export function addToStack(id) {
  const it = IT.find(i => i.id === id); if (!it) return;
  announceToScreenReader(`${it.name} adicionado à stack.`);
  S.stack[id] = { id, name: it.name, qty: 100, started: new Date().toISOString() };
  save(); renderStack(); renderStats();
  toast('💪', `${it.name} adicionado à stack`, 'success', { duration: 2800 });
}

export function removeFromStack(id) {
  delete S.stack[id]; save(); invalidateTab('stack'); renderStack(); renderStats();
  announceToScreenReader(`${IT.find(i=>i.id===id)?.name || 'Item'} removido da stack.`);
}

export function renderStack() {
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
    const src     = IT.find(i => i.id === it.id);
    const started = new Date(it.started), now = new Date();
    const days    = Math.floor((now - started) / 86400000);
    const dpd     = src?.dm ? parseFloat(src.dm) || 2 : 2;
    const total   = it.qty, rem = Math.max(0, total - days * dpd), pct = Math.round((rem / total) * 100);
    const daysLeft = Math.round(rem / dpd);
    return `<div class="stack-item">
      <button class="stack-del" onclick="window._app.removeFromStack(${it.id})">✕</button>
      <div class="stack-name">${escapeHTML(it.name)}</div>
      <div class="stack-meta">~${daysLeft} dias restantes · ${rem.toFixed(0)}g</div>
      <div class="stack-bar"><div class="stack-fill" style="width:${pct}%;background:${pct<20?'var(--red)':pct<40?'var(--amber)':'var(--accent)'}"></div></div>
      ${daysLeft <= 7 ? '<div style="font-size:9px;color:var(--red);margin-top:4px">⚠️ Recompra necessária!</div>' : ''}
    </div>`;
  }).join('')}</div>`;
}

// ── Cycles ────────────────────────────────────────────────────
export function cycStatus(c) {
  const start      = S.cycleStart[c.name];
  const pauseStart = S.cyclePause[c.name];
  if (pauseStart) {
    const pD = new Date(pauseStart), now = new Date();
    const pauseDay  = Math.floor((now - pD) / 86400000);
    const remPause  = Math.max(0, (c.pausa || 30) - pauseDay);
    return { state: 'pause', pauseDay, remPause, diff: 0, pct: 0, rem: 0 };
  }
  if (!start) return { state: 'idle', diff: 0, pct: 0, rem: 0 };
  const startD = new Date(start), now = new Date();
  const diff   = Math.max(0, Math.floor((now - startD) / 86400000));
  const pct    = Math.min(100, Math.round((diff / c.max) * 100));
  const rem    = Math.max(0, c.max - diff);
  if (diff >= c.max) return { state: 'over',   diff, pct, rem: 0, startD };
  if (rem  <= 14)    return { state: 'warn',   diff, pct, rem, startD };
  return               { state: 'active', diff, pct, rem, startD };
}

export function cycCardHTML(c, idx) {
  const st = cycStatus(c);
  const cor = c.cor || 'var(--accent)';
  const CYCLES_DATA = (typeof CYCLES !== 'undefined') ? CYCLES : [];
  const isCustom = !CYCLES_DATA.find(x => x.name === c.name);

  let barBg, badgeClass, badgeLabel, badgeDot = true;
  if (st.state==='active') { barBg=cor; badgeClass='st-active'; badgeLabel='● Em uso'; }
  else if (st.state==='warn') { barBg='var(--amber)'; badgeClass='st-warn'; badgeLabel='⚠ Pausar em breve'; }
  else if (st.state==='over') { barBg='var(--red)'; badgeClass='st-over'; badgeLabel='⏸ Pausa necessária'; }
  else if (st.state==='pause') { barBg='var(--blue)'; badgeClass='st-pause'; badgeLabel='☁ Em pausa'; }
  else { barBg='var(--bg5)'; badgeClass='st-idle'; badgeLabel='○ Não iniciado'; badgeDot=false; }

  const cardClass = `cyc-card${st.state==='active'?' cyc-active':st.state==='warn'?' cyc-warning':st.state==='over'?' cyc-overdue':st.state==='pause'?' cyc-paused':' cyc-idle'}`;

  let fillBg;
  if (st.state==='over') fillBg='var(--red)';
  else if (st.state==='warn') fillBg=`linear-gradient(90deg,${cor},var(--amber))`;
  else if (st.state==='active') fillBg=`linear-gradient(90deg,${cor},${cor}cc)`;
  else if (st.state==='pause') fillBg='var(--blue)';
  else fillBg='var(--bg5)';

  let fillPct = st.pct;
  if (st.state==='pause') fillPct = Math.min(100, Math.round((st.pauseDay / (c.pausa || 30)) * 100));

  const startStr = st.startD ? st.startD.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  const endDate  = st.startD ? new Date(st.startD.getTime() + c.max * 86400000) : null;
  const endStr   = endDate   ? endDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}) : '—';

  const progLabel = st.state==='idle' ? 'Não iniciado' :
    st.state==='pause' ? `Pausa: dia ${st.pauseDay}/${c.pausa||30}` :
    `Dia ${st.diff} de ${c.max}`;
  const pctColor = st.state==='over' ? 'var(--red)' : st.state==='warn' ? 'var(--amber)' : 'var(--accent)';

  let actionsBtns = '';
  if (st.state==='idle') {
    actionsBtns = `<button class="cyc-btn cyc-btn-start" onclick="window._app.startCyc('${c.name}')">▶ Iniciar ciclo</button>`;
  } else if (st.state==='pause') {
    actionsBtns = `
      <button class="cyc-btn cyc-btn-start" onclick="window._app.resumeCyc('${c.name}')">▶ Retomar</button>
      <button class="cyc-btn cyc-btn-stop" onclick="window._app.stopCyc('${c.name}')">✕ Encerrar</button>`;
  } else {
    actionsBtns = `
      <button class="cyc-btn cyc-btn-reset" onclick="window._app.resetCyc('${c.name}')">↺ Reiniciar</button>
      <button class="cyc-btn cyc-btn-pause" onclick="window._app.pauseCyc('${c.name}')">⏸ Pausar agora</button>
      <button class="cyc-btn cyc-btn-stop" onclick="window._app.stopCyc('${c.name}')">✕ Encerrar</button>`;
  }
  if (isCustom) actionsBtns += `<button class="cyc-btn" onclick="window._app.removeCustomCyc('${c.name}')" title="Remover ciclo">🗑</button>`;

  const hasMeta = !!(c.motivo || c.dica || c.refs);
  const metaHTML = hasMeta ? `
    <button class="cyc-expand-btn" id="cyc-exp-${idx}" onclick="window._app.toggleCycDetail('${idx}')">
      <span>Ver detalhes científicos</span><span class="cyc-expand-ico">▼</span>
    </button>
    ${c.motivo?`<div class="cyc-motivo" id="cyc-motivo-${idx}"><strong>Por que ciclar?</strong>${c.motivo}</div>`:''}
    ${c.dica?`<div class="cyc-dica" id="cyc-dica-${idx}"><span class="cyc-dica-ico">💡</span><span>${c.dica}</span></div>`:''}
    ${c.refs?`<div class="cyc-ref" id="cyc-ref-${idx}">📚 ${c.refs}</div>`:''}` : '';

  const pauseBar = st.state==='over' ? `
    <div class="cyc-pause-bar">
      <span class="cyc-pause-bar-ico">⏸</span>
      <div><strong style="display:block;font-size:12px;font-weight:700;color:var(--red)">Pausa necessária!</strong><span style="font-size:10px">Pausar por ${c.pausa||30} dias antes de reiniciar.</span></div>
      <div class="cyc-pause-bar-days">${c.pausa||30}d</div>
    </div>` : st.state==='pause' ? `
    <div class="cyc-pause-bar">
      <span class="cyc-pause-bar-ico">🔄</span>
      <div><strong style="display:block;font-size:12px;font-weight:700;color:var(--blue)">Em pausa — ${st.remPause>0?`${st.remPause} dias restantes`:'✅ Pode retomar!'}</strong><span style="font-size:10px">Pausa de ${c.pausa||30} dias · Dia ${st.pauseDay}/${c.pausa||30}</span></div>
    </div>` : '';

  return `<div class="${cardClass}" id="cyc-card-${idx}" style="animation:pageIn .3s ease ${idx*.06}s both">
  <div class="cyc-status-bar" style="background:${barBg}"></div>
  <div class="cyc-card-head">
    <div class="cyc-ico">${c.ico||'⏱'}</div>
    <div class="cyc-meta">
      <div class="cyc-name" title="${escapeHTML(c.name)}">${escapeHTML(c.name)}</div>
      <div class="cyc-cat"><div class="cyc-cat-dot" style="background:${cor}"></div>${c.cat||'Suplemento'}</div>
    </div>
    <div class="cyc-badge ${badgeClass}">${badgeDot?'<div class="cyc-badge-dot"></div>':''}${badgeLabel.replace(/[●⚠⏸☁○]/,'').trim()}</div>
  </div>
  <div class="cyc-card-body">
    ${pauseBar}
    <div class="cyc-prog-wrap">
      <div class="cyc-prog-labels"><span>${progLabel}</span><span class="cyc-prog-pct" style="color:${pctColor}">${st.state==='idle'?'—':fillPct+'%'}</span></div>
      <div class="cyc-track"><div class="cyc-fill${st.state==='idle'?' cyc-shimmer-off':''}" style="width:${fillPct}%;background:${fillBg}"></div></div>
    </div>
    ${st.state!=='idle'&&st.state!=='pause'?`
    <div class="cyc-info-rows">
      <div class="cyc-info-row"><span class="cyc-info-ico">📅</span><span>Início</span><span class="cyc-info-val">${startStr}</span></div>
      <div class="cyc-info-row"><span class="cyc-info-ico">🏁</span><span>Término previsto</span><span class="cyc-info-val">${endStr}</span></div>
      <div class="cyc-info-row"><span class="cyc-info-ico">⏸</span><span>Pausa programada</span><span class="cyc-info-val">${c.pausa||30} dias</span></div>
      ${st.rem>0?`<div class="cyc-info-row"><span class="cyc-info-ico">⏳</span><span>Dias restantes</span><span class="cyc-info-val" style="color:${st.rem<=14?'var(--amber)':'var(--tx)'}"> ${st.rem}d</span></div>`:''}
    </div>`:''}
    ${metaHTML}
  </div>
  <div class="cyc-note-row">
    <textarea class="cyc-note" id="cyc-note-${idx}" rows="2" placeholder="Nota: marca, efeitos, observações…" onblur="window._app.saveCycNote('${escapeHTML(c.name)}',this.value)" aria-label="Nota do ciclo ${escapeHTML(c.name)}">${escapeHTML(S.cycleNote[c.name] || '')}</textarea>
  </div>
  <div class="cyc-actions">${actionsBtns}</div>
</div>`;
}

export function renderCycles() {
  const el    = document.getElementById('cyc-grid');
  const sumEl = document.getElementById('cyc-summary');
  if (!el) return;

  const customCycles = S._customCycles || [];
  const CYCLES_DATA  = (typeof CYCLES !== 'undefined') ? CYCLES : [];
  const allCycles    = [...CYCLES_DATA, ...customCycles];

  let nActive = 0, nWarn = 0, nPause = 0, nIdle = 0;
  allCycles.forEach(c => {
    const st = cycStatus(c);
    if (st.state==='active') nActive++;
    else if (st.state==='warn') { nActive++; nWarn++; }
    else if (st.state==='over') nWarn++;
    else if (st.state==='pause') nPause++;
    else nIdle++;
  });

  if (sumEl) {
    sumEl.innerHTML = `
      <div class="cyc-sum-card active"><div class="cyc-sum-n">${nActive}</div><div class="cyc-sum-l">Em uso</div></div>
      <div class="cyc-sum-card warn"><div class="cyc-sum-n">${nWarn}</div><div class="cyc-sum-l">Pausar em breve</div></div>
      <div class="cyc-sum-card pause"><div class="cyc-sum-n">${nPause}</div><div class="cyc-sum-l">Em pausa</div></div>
      <div class="cyc-sum-card"><div class="cyc-sum-n">${nIdle}</div><div class="cyc-sum-l">Não iniciados</div></div>`;
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

export function toggleCycDetail(idx) {
  const btn = document.getElementById(`cyc-exp-${idx}`);
  const els = ['cyc-motivo','cyc-dica','cyc-ref'].map(id => document.getElementById(`${id}-${idx}`)).filter(Boolean);
  const isOpen = btn?.classList.contains('open');
  if (btn) btn.classList.toggle('open', !isOpen);
  els.forEach(el => el.classList.toggle('expanded', !isOpen));
}

export function startCyc(n) {
  S.cycleStart[n] = new Date().toISOString(); delete S.cyclePause[n];
  save(); renderCycles();
  announceToScreenReader(`Ciclo ${n} iniciado.`);
  toast('▶', `Ciclo de ${n} iniciado`, 'success', { duration: 3000 });
}
export function pauseCyc(n) {
  const CYCLES_DATA = (typeof CYCLES !== 'undefined') ? CYCLES : [];
  const c = CYCLES_DATA.find(c => c.name === n) || { pausa: 30 };
  S.cyclePause[n] = new Date().toISOString(); delete S.cycleStart[n];
  save(); renderCycles(); announceToScreenReader(`Ciclo ${n} pausado.`); toast('⏸', `Ciclo pausado — ${c.pausa}d de descanso`, 'info', { duration: 3200 });
}
export function resumeCyc(n) {
  S.cycleStart[n] = new Date().toISOString(); delete S.cyclePause[n];
  save(); renderCycles(); announceToScreenReader(`Ciclo ${n} retomado.`); toast('▶', `Ciclo de ${n} retomado`, 'success', { duration: 2800 });
}
export function resetCyc(n) {
  confirmModal({ title:'Reiniciar ciclo', msg:`Reiniciar o ciclo de <strong>${n}</strong> a partir de hoje?`, ico:'↺', okLabel:'Reiniciar', cancelLabel:'Cancelar', danger:false, okColor:'var(--amber)' })
    .then(ok => { if (!ok) return; S.cycleStart[n] = new Date().toISOString(); delete S.cyclePause[n]; save(); renderCycles(); announceToScreenReader(`Ciclo ${n} reiniciado.`); toast('↺', `Ciclo de ${n} reiniciado`, 'warn', { duration: 2800 }); });
}
export function stopCyc(n) {
  confirmModal({ title:'Encerrar ciclo', msg:`Encerrar o ciclo de <strong>${n}</strong>?`, ico:'✕', okLabel:'Encerrar', cancelLabel:'Cancelar', danger:true })
    .then(ok => { if (!ok) return; delete S.cycleStart[n]; delete S.cyclePause[n]; save(); renderCycles(); announceToScreenReader(`Ciclo ${n} encerrado.`); toast('✕', `Ciclo de ${n} encerrado`, 'error', { duration: 2600 }); });
}
export function saveCycNote(n, v) {
  if (!S.cycleNote) S.cycleNote = {};
  S.cycleNote[n] = v.trim(); save();
}
export function addCustomCyc() {
  const nameEl  = document.getElementById('cyc-custom-name');
  const maxEl   = document.getElementById('cyc-custom-max');
  const pausaEl = document.getElementById('cyc-custom-pausa');
  const name = (nameEl?.value || '').trim();
  if (!name) { toast('⚠️', 'Digite o nome do suplemento', 'warn', { duration: 2400 }); nameEl?.focus(); return; }
  if (!S._customCycles) S._customCycles = [];
  const CYCLES_DATA = (typeof CYCLES !== 'undefined') ? CYCLES : [];
  if ([...CYCLES_DATA, ...S._customCycles].find(c => c.name === name)) {
    toast('⚠️', 'Já existe um ciclo com esse nome', 'warn', { duration: 2600 }); return;
  }
  S._customCycles.push({ name, ico:'🧪', max:parseInt(maxEl?.value||90), pausa:parseInt(pausaEl?.value||30), cat:'Personalizado', cor:'var(--violet)' });
  if (nameEl) nameEl.value = '';
  announceToScreenReader(`Ciclo personalizado ${name} criado.`);
  save(); renderCycles();
  toast('✅', `Ciclo de ${name} criado — ${maxEl?.value||90}d uso / ${pausaEl?.value||30}d pausa`, 'success', { duration: 3200 });
}
export function removeCustomCyc(n) {
  confirmModal({ title:'Remover ciclo', msg:`Remover o ciclo personalizado de <strong>${n}</strong>?`, ico:'🗑', okLabel:'Remover', cancelLabel:'Cancelar', danger:true })
    .then(ok => {
      if (!ok) return;
      if (S._customCycles) S._customCycles = S._customCycles.filter(c => c.name !== n);
      delete S.cycleStart[n]; delete S.cyclePause[n];
      if (S.cycleNote) delete S.cycleNote[n];
      save(); renderCycles(); toast('🗑', `Ciclo de ${n} removido`, 'error', { duration: 2400 });
      announceToScreenReader(`Ciclo personalizado ${n} removido.`);
    });
}
