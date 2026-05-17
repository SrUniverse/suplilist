// ══════════════════════════════════════════════════════════════
// js/history.js — Histórico de Compras
// ══════════════════════════════════════════════════════════════
import { S, save } from './state.js';
import { IT } from './database.js';
import { announceToScreenReader } from './accessibility.js';
import { toast, fmtR, confirmModal, dl, escapeHTML } from './utils.js';

/** 
 * SL-12: Otimização de Performance
 * O uso de instâncias persistentes de Intl evita o overhead de recriação em cada loop.
 */
const RENDER_LIMIT = 50;
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { 
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
});
const monthKeyCache = new Map();

export function initHist() {
  const sel = document.getElementById('hsel'); if (!sel) return;
  sel.innerHTML = IT.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
  const d = document.getElementById('hdate'); if (d) d.value = new Date().toISOString().split('T')[0];
}

export function addHist() {
  const idEl  = document.getElementById('hsel');
  const pEl   = document.getElementById('hprice');
  const dEl   = document.getElementById('hdate');
  if (!idEl||!pEl||!dEl) return;
  const price = parseFloat(pEl.value), dateInput = dEl.value;
  if (!price||!dateInput) { toast('⚠️','Preencha preço e data','warn',{duration:2800}); return; }
  const it = IT.find(i => i.id === parseInt(idEl.value));
  const [y,mo,d] = dateInput.split('-').map(Number);
  const now = new Date();
  const fullDate = new Date(y,mo-1,d,now.getHours(),now.getMinutes(),now.getSeconds()).toISOString();
  S.history.push({ id:parseInt(idEl.value), name:it?.name||'?', price, date:fullDate, uid:Date.now() });
  save(); renderHist(); pEl.value = '';
  announceToScreenReader(`Compra de ${it?.name || 'item'} registrada no histórico.`);
  toast('✅','Compra registrada!','success',{duration:2600});
}

export function delHist(uid) { S.history = S.history.filter(h => h.uid !== uid); save(); renderHist(); }

export function editHist(uid) {
  announceToScreenReader('Abrindo diálogo para editar registro.');
  const h = S.history.find(x => x.uid === uid); if (!h) return;

  // Cria um input temporário para capturar o novo valor de forma não-bloqueante
  const inputId = 'edit-hist-input-' + uid;
  confirmModal({
    title: `Editar — ${escapeHTML(h.name)}`,
    msg: `<label style="display:block;margin-bottom:6px;font-size:13px;color:var(--tx2)">Novo preço (R$)</label>
          <input id="${inputId}" type="number" min="0" step="0.01" value="${h.price}"
            style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg2);color:var(--tx);font-size:15px;box-sizing:border-box">`,
    okLabel: 'Salvar',
    cancelLabel: 'Cancelar',
  }).then(ok => {
    if (!ok) return;
    const inputEl = document.getElementById(inputId);
    const newPrice = parseFloat(inputEl?.value ?? '');
    if (!isNaN(newPrice) && newPrice >= 0) {
      h.price = newPrice;
      save();
      renderHist();
      announceToScreenReader(`Preço de ${h.name} atualizado.`);
      toast('✏️', 'Registro atualizado', 'success', { duration: 2000, progress: false });
    }
  });
}

export function clearHistory() {
  confirmModal({title:'Limpar Histórico',msg:'Apagar todos os registros de compras?',danger:true})
    .then(ok => { if (!ok) return; S.history=[]; save(); renderHist(); announceToScreenReader('Histórico de compras limpo.'); toast('🗑','Histórico limpo','info'); });
}

export function exportHistory() {
  try {
    const json = JSON.stringify(S.history || [], null, 2);
    announceToScreenReader('Histórico de compras exportado.');
    if (!json || json === '[]') throw new Error('Histórico vazio.');
    dl(json, 'historico-compras.json', 'application/json');
    toast('📊', 'Histórico exportado!', 'success');
  } catch (err) {
    console.error('[History] Falha na exportação:', err);
    toast('⚠️', 'Erro ao exportar histórico.', 'error');
  }
}

export function renderHist() {
  const history = S.history || [];
  const tt = document.getElementById('ht-top');
  const bEl = document.getElementById('bars');
  const lEl = document.getElementById('hlist');
  const htEl = document.getElementById('htotal');
  const hvEl = document.getElementById('htval');
  const tsEl = document.getElementById('htop-supps');

  if (!lEl) return;

  // Processamento de métricas em passada única para evitar loops redundantes
  let total = 0;
  const monthlyAgg = {};
  const suppAgg = {};

  history.forEach(h => {
    // SL-22: Cláusula de guarda para ignorar registros que não sejam objetos válidos
    if (!h || typeof h !== 'object') return;

    // Sanitização defensiva de valores numéricos e strings
    const price = typeof h.price === 'number' && Number.isFinite(h.price) ? h.price : 0;
    const name  = (h.name ?? 'Suplemento não identificado').trim() || 'Sem nome';
    
    total += price;

    const d = h.date ? new Date(h.date) : null;
    if (d && !isNaN(d.getTime())) {
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyAgg[mKey] = (monthlyAgg[mKey] || 0) + price;
    }

    suppAgg[name] = (suppAgg[name] || 0) + price;
  });

  if (tt) tt.textContent = fmtR(total);
  if (hvEl) hvEl.textContent = fmtR(total);
  if (htEl) htEl.classList.toggle('is-hidden', !history.length);

  // Renderização do Gráfico (Últimos 8 meses)
  const months = Object.keys(monthlyAgg).sort().slice(-8);
  const mx = Math.max(...Object.values(monthlyAgg), 1);
  if (bEl) bEl.innerHTML = months.length
    ? months.map(m => { 
        const pct = Math.round((monthlyAgg[m] / mx) * 100);
        return `<div class="bar" style="height:${pct}%"><div class="bar-tip">${m.split('-').reverse().join('/')}: ${fmtR(monthlyAgg[m])}</div></div>`; 
      }).join('')
    : '<div style="color:var(--tx3);font-size:11px;width:100%;text-align:center;align-self:center">Sem registros</div>';

  // Renderização da Lista com Limite de DOM (Paginado/Truncado)
  const sorted = [...history]
    .filter(h => h && typeof h === 'object') // Remove entradas nulas antes do sort
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, RENDER_LIMIT);
  
  lEl.innerHTML = sorted.map(h => {
    // Sanitização e definição de fallbacks para a UI (Programação Defensiva)
    const name  = h.name ?? 'Item s/ nome';
    const price = typeof h.price === 'number' ? h.price : 0;
    const dateObj = h.date ? new Date(h.date) : null;
    const dStr = (dateObj && !isNaN(dateObj.getTime())) ? dateFormatter.format(dateObj) : 'Data indisponível';
    const uid  = h.uid ?? 0;

    return `<div class="hitem">
      <span class="hitem-n">${escapeHTML(name)}</span>
      <span class="hitem-p" style="font-family:var(--fm);font-variant-numeric:tabular-nums">${fmtR(price)}</span>
      <span class="hitem-d" style="font-family:var(--fm);font-variant-numeric:tabular-nums">${dStr}</span>
      <div style="display:flex;gap:4px">
        <button class="hitem-del" style="background:var(--ad);color:var(--accent)" onclick="window._app.editHist(${uid})" title="Editar">✏️</button><button class="hitem-del" onclick="window._app.delHist(${uid})" title="Excluir">✕</button>
      </div>
    </div>`;
  }).join('') || '<div style="color:var(--tx3);font-size:12px;text-align:center;padding:20px">Nenhuma compra registrada</div>';
  
  // Renderização do Ranking (Top 5)
  const topSupps = Object.entries(suppAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (tsEl) tsEl.innerHTML = topSupps.length
    ? topSupps.map(([name,val]) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px"><span style="color:var(--tx)">${name}</span><span style="font-family:var(--fm);color:var(--accent)">${fmtR(val)}</span></div>`).join('')
    : '<div style="color:var(--tx3);font-size:11px">Sem dados ainda</div>';
}
