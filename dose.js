// ══════════════════════════════════════════════════════════════
// js/dose.js — Calculadora de Dosagem
// [SL-08] Módulo puro: sem import de state.js.
//         Recebe o estado S por injeção de dependência via parâmetro.
// ══════════════════════════════════════════════════════════════
import { IT, GOAL_MAP, DOSE_RULES, SEX_LABEL, bestMarketplacePrice } from './database.js';
import { assertEquals } from './utils.js';

// ── ID-23: Limites seguros por id ─────────────────────────────
const SAFE_DOSE_LIMITS = {
  1:{max:30,unit:'g'},2:{max:600,unit:'mg'},3:{max:100,unit:'g'},4:{max:30,unit:'g'},
  5:{max:2000,unit:'mg'},6:{max:10000,unit:'UI'},7:{max:400,unit:'mg'},8:{max:5000,unit:'mg'},
  9:{max:6400,unit:'mg'},10:{max:20,unit:'g'},
};

const TIMING_MAP = {
  'Estimulantes':  { ideal:'⚡ 30–45 min antes do treino', warn:'🌙 Evitar após as 18h' },
  'Força':         { ideal:'💪 A qualquer hora — consistência é chave', warn:'' },
  'Proteína':      { ideal:'🥛 Logo após o treino ou ao acordar', warn:'' },
  'Recuperação':   { ideal:'🔁 Pós-treino ou antes de dormir', warn:'' },
  'Vitaminas':     { ideal:'☀️ Junto com a refeição principal', warn:'' },
  'Minerais':      { ideal:'🌿 Com refeição para melhor absorção', warn:'' },
  'Gorduras Boas': { ideal:'🐟 Com refeições que contenham gordura', warn:'' },
  'Adaptógeno':    { ideal:'🌿 Pela manhã ou ao acordar', warn:'' },
  'Sono':          { ideal:'🌙 30–60 min antes de dormir', warn:'⚠️ Não combinar com álcool' },
  'Metabolismo':   { ideal:'🔥 Com a primeira refeição do dia', warn:'' },
  'Longevidade':   { ideal:'⏳ Junto ao café da manhã', warn:'' },
};

function getTimingSuggestionForItem(item) {
  if (!item) return null;
  const cat = item.cat || '';
  if (TIMING_MAP[cat]) return TIMING_MAP[cat];
  for (const key of Object.keys(TIMING_MAP)) {
    if (cat.includes(key) || key.includes(cat)) return TIMING_MAP[key];
  }
  if (item.tags) {
    if (item.tags.some(t => ['estimulante','cafeína'].includes(t))) return TIMING_MAP['Estimulantes'];
    if (item.tags.some(t => ['sono','melatonina'].includes(t)))     return TIMING_MAP['Sono'];
    if (item.tags.some(t => ['adaptógeno'].includes(t)))            return TIMING_MAP['Adaptógeno'];
  }
  return null;
}

function injectDoseEnhancements() {
  const out = document.getElementById('dose-out'); if (!out) return;
  out.querySelectorAll('.dose-row').forEach(row => {
    if (row.dataset.enhanced) return;
    row.dataset.enhanced = '1';
    const nameEl = row.querySelector('.dose-name'), amtEl = row.querySelector('.dose-amt');
    if (!nameEl || !amtEl) return;
    const item = IT.find(i => i.name === nameEl.textContent.replace(/⚖️\/kg/g,'').trim());
    if (!item) return;
    const limit = SAFE_DOSE_LIMITS[item.id];
    if (limit) {
      const m = amtEl.textContent.replace(/,/g,'.').match(/([\d.]+)/);
      if (m && parseFloat(m[1]) > limit.max) {
        row.classList.add('dose-row--unsafe');
        if (!row.querySelector('.dose-safety-badge')) {
          const badge = document.createElement('span');
          badge.className = 'dose-safety-badge';
          badge.textContent = `⚠️ Máx. seguro: ${limit.max} ${limit.unit}`;
          amtEl.insertAdjacentElement('afterend', badge);
        }
      }
    }
    const timing = getTimingSuggestionForItem(item);
    if (timing && !row.querySelector('.dose-timing-hint')) {
      const hint = document.createElement('div');
      hint.className = 'dose-timing-hint';
      hint.innerHTML = `<span class="dth-ideal">${timing.ideal}</span>${timing.warn?`<span class="dth-warn">${timing.warn}</span>`:''}`;
      nameEl.closest('.dose-row-main')?.appendChild(hint);
    }
  });
}

let _lastDoses = {};

/**
 * Valida e converte entradas de texto para números seguros.
 * [SL-11] Previne propagação de NaN e define fallbacks.
 */
function parseNumericInput(val, fallback) {
  if (val === undefined || val === null) return fallback;
  
  const str = String(val).trim();
  // SL-21: Verificação estrita para string vazia para evitar cálculos inconsistentes
  if (str === '') return fallback;

  // Normalização de separador decimal e conversão
  const n = Number(str.replace(',', '.'));
  
  // Guard Clauses: Rejeita NaN, valores não-finitos ou menores/iguais a zero
  if (Number.isNaN(n) || !Number.isFinite(n) || n <= 0) return fallback;
  
  return n;
}

/**
 * Sincroniza o slider de peso com o input numérico e re-renderiza a dose.
 * @param {number} v - Novo valor de peso.
 * @param {object} S - Estado actual do utilizador, injectado pelo orquestrador.
 */
export function syncWeightSlider(v, S) {
  const num = document.getElementById('prof-weight'), disp = document.getElementById('weight-display');
  if (num) num.value = v; if (disp) disp.textContent = v;
  renderDose(S);
}

/**
 * Sincroniza o input numérico de peso com o slider e re-renderiza a dose.
 * @param {number} v - Novo valor de peso.
 * @param {object} S - Estado actual do utilizador, injectado pelo orquestrador.
 */
export function syncWeightInput(v, S) {
  const slider = document.getElementById('prof-weight-slider'), disp = document.getElementById('weight-display');
  if (slider) slider.value = v; if (disp) disp.textContent = v;
  renderDose(S);
}

function fmtDoseVal(v, unit) {
  const rounded = unit==='mg'||unit==='mcg'||unit==='UI' ? Math.round(v) : (Math.round(v*10)/10);
  return String(rounded).replace('.',',') + '\u202f' + unit;
}
function doseRange(min, max, unit) {
  const a = fmtDoseVal(min, unit), b = fmtDoseVal(max, unit);
  return a === b ? a : `${a}–${b}`;
}
function parseDoseRange(doseStr) {
  if (!doseStr) return null;
  const clean = String(doseStr).replace(/,/g,'.').replace(/\s+/g,'').replace(/\u202f/g,'');
  const m = clean.match(/^([\d.]+)(?:[–-]([\d.]+))?(mg|mcg|g|UI|cáps?|IU)$/i);
  if (!m) return null;
  return { min: parseFloat(m[1]), max: parseFloat(m[2]||m[1]), unit: m[3] };
}
function bodyProfile(w, h, sex, activity) {
  const bmi = w / Math.pow((h||175)/100, 2);
  const heightIn = (h||175)/2.54;
  const ibw = (sex==='feminino'?45.5:50) + 2.3*Math.max(0,heightIn-60);
  const doseWeight = bmi>=30 ? ibw+0.4*(w-ibw) : w;
  const act  = {sedentario:.9,moderado:1,ativo:1.1,atleta:1.2}[activity]||1;
  const stim = sex==='feminino' ? .82 : 1;
  return { bmi, ibw, doseWeight, act, stim };
}
function calcDose(i, field, p) {
  const raw = field==='dm' ? i.dm : i.dn;
  const rule = DOSE_RULES[i.id];
  if (rule?.text) return rule.text;
  if (rule) {
    let min=rule.min, max=rule.max;
    if (rule.byKg) { const kf=rule.kgFactor||1; min=rule.min*kf*p.body.doseWeight; max=rule.max*kf*p.body.doseWeight; }
    if (rule.stim) { min*=p.body.stim; max*=p.body.stim; }
    if (rule.actScale) { min*=p.body.act; max*=p.body.act; }
    if (rule.cap) { min=Math.min(min,rule.cap); max=Math.min(max,rule.cap); }
    return doseRange(min, max, rule.unit);
  }
  const parsed = parseDoseRange(raw);
  if (parsed) {
    let {min,max,unit} = parsed;
    const actCats = ['Aminoácido','Proteína'];
    const fixedCats = ['Vitamina','Mineral','Hormônio','Antioxidante','Digestão','Sono','Adaptógeno','Longevidade','Vegetal','Articulações'];
    const cat = i.cat || '';
    if (actCats.some(c=>cat.includes(c))) { min*=p.body.act; max*=p.body.act; }
    else if (!fixedCats.some(c=>cat.includes(c))) {
      const wFactor = Math.pow(p.body.doseWeight/75, 0.5);
      min*=wFactor; max*=wFactor;
      if (i.tags?.some(t=>['estimulante','cafeína','dopamina'].includes(t))) { min*=p.body.stim; max*=p.body.stim; }
    }
    const orig = parseDoseRange(raw);
    if (orig) { min=Math.min(min,orig.max*2); max=Math.min(max,orig.max*2); }
    return doseRange(Math.max(min,0), Math.max(max,0), unit);
  }
  return raw || '—';
}
function isDoseByKg(i) {
  if (DOSE_RULES[i.id]?.byKg) return true;
  const fixedCats = ['Vitamina','Mineral','Hormônio','Antioxidante','Digestão','Sono','Adaptógeno','Longevidade','Vegetal','Articulações'];
  return !fixedCats.some(c=>(i.cat||'').includes(c));
}
function imcClass(bmi) {
  if (bmi<18.5) return {cls:'imc-under',lbl:'Abaixo do peso'};
  if (bmi<25)   return {cls:'imc-normal',lbl:'Normal'};
  if (bmi<30)   return {cls:'imc-over',lbl:'Sobrepeso'};
  return {cls:'imc-obese',lbl:'Obesidade'};
}

/**
 * Renderiza o painel completo de dosagem.
 * [SL-08] Estado injectado por parâmetro — sem leitura directa de state.js.
 *
 * @param {object} S - Estado actual do utilizador, fornecido pelo orquestrador (main.js).
 */
export function renderDose(S) {
  if (!S) return;

  const profW = document.getElementById('prof-weight');
  const profH = document.getElementById('prof-height');

  // [SL-11] Validação e Tipagem Estrita
  const w   = parseNumericInput(profW?.value, 80);
  const hgt = parseNumericInput(profH?.value, 175);

  const sex      = document.getElementById('prof-sex')?.value || 'masculino';
  const condition= document.getElementById('prof-condition')?.value || '';
  const goal     = document.getElementById('prof-goal')?.value || 'saude';
  const activity = document.getElementById('prof-activity')?.value || 'moderado';
  const el = document.getElementById('dose-out'); if (!el) return;
  const body    = bodyProfile(w, hgt, sex, activity);
  const profile = { w, hgt, sex, activity, body };

  const condWarns = {
    hipertensao:   {ico:'❤️',title:'Hipertensão',msg:'Evite Cafeína em doses altas. Prefira L-Teanina isolada. Ômega-3 e Magnésio são benéficos.'},
    diabetes:      {ico:'🩸',title:'Diabetes',msg:'Berberina pode potencializar hipoglicemiantes — monitore glicemia.'},
    hipotireoidismo:{ico:'🦋',title:'Hipotireoidismo',msg:'Maca e Ashwagandha podem interagir com a tireoide.'},
    anticoagulante:{ico:'💊',title:'Anticoagulantes',msg:'Ômega-3, Feno-grego e Tongkat Ali aumentam risco de sangramento.'},
    imao:          {ico:'🧠',title:'IMAO/Antidepressivos',msg:'Mucuna Pruriens é CONTRAINDICADA.'},
  };
  const actLabel    = {sedentario:'Sedentário',moderado:'Moderado',ativo:'Ativo',atleta:'Atleta'};
  const goalLabels  = {saude:'❤️ Saúde',hipertrofia:'💪 Hipertrofia',gordura:'🔥 Gordura',energia:'⚡ Energia',libido:'🌿 Libido',sono:'🌙 Sono',mulher:'♀️ Mulher',digestao:'🦠 Digestão',articulacoes:'🦴 Articulações',metabolismo:'🧪 Metabolismo',longevidade:'⏳ Longevidade'};
  const goalIds     = GOAL_MAP[goal] || [];
  const allGoalItems= goalIds.length ? IT.filter(i=>goalIds.includes(i.id)) : IT.filter(i=>i.pr!=='extra');
  const pool        = allGoalItems.length ? allGoalItems : IT.filter(i=>i.pr!=='extra');
  const preItems    = pool.filter(i=>i.dp&&i.dm), morItems = pool.filter(i=>i.dm&&!i.dp), nigItems = pool.filter(i=>i.dn);
  const totalItems  = new Set([...preItems,...morItems,...nigItems].map(i=>i.id)).size;
  const imc         = imcClass(body.bmi);

  let h = '';
  if (condition && condWarns[condition]) {
    const cw = condWarns[condition];
    h += `<div class="dose-alert"><span class="dose-alert-ico">${cw.ico}</span><div class="dose-alert-body"><strong>${cw.title}</strong><span>${cw.msg}</span></div></div>`;
  }
  h += `<div class="dose-summary">
    <div class="dose-sum-item"><span class="dose-sum-n">${w}<small>kg</small></span><span class="dose-sum-l">Peso</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n">${hgt}<small>cm</small></span><span class="dose-sum-l">Altura</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n" style="font-size:13px">${SEX_LABEL[sex]||sex}</span><span class="dose-sum-l">Sexo</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n">${body.bmi.toFixed(1).replace('.',',')}</span><span class="dose-sum-l">IMC <span class="imc-badge ${imc.cls}">${imc.lbl}</span></span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n">${body.doseWeight.toFixed(0)}<small>kg</small></span><span class="dose-sum-l">Peso de cálculo</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n">${totalItems}</span><span class="dose-sum-l">Suplementos</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n" style="font-size:12px">${actLabel[activity]}</span><span class="dose-sum-l">Atividade</span></div>
    <div class="dose-sum-sep"></div>
    <div class="dose-sum-item"><span class="dose-sum-n" style="font-size:12px">${goalLabels[goal]||goal}</span><span class="dose-sum-l">Objetivo</span></div>
  </div>`;

  const scaledCount = pool.filter(i=>isDoseByKg(i)&&(i.dm||i.dn)).length;
  if (scaledCount>0) h += `<div style="display:flex;align-items:center;gap:8px;background:var(--blued);border:1px solid rgba(77,166,255,.2);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:var(--blue)"><span style="font-size:15px">⚖️</span><span><strong>${scaledCount} suplementos</strong> têm doses ajustadas pelo seu peso (${body.doseWeight.toFixed(0)} kg), sexo e nível de atividade.</span></div>`;

  function rowsHTML(items, field) {
    if (!items.length) return `<div class="dose-empty">Nenhum suplemento neste período para o objetivo selecionado.</div>`;
    return items.map(i => {
      const dose = calcDose(i, field, profile);
      const cacheKey = `${i.id}_${field}`, prev = _lastDoses[cacheKey];
      let deltaHTML = '';
      if (prev && prev !== dose) {
        const getNum = s => { const m=String(s).replace(/,/g,'.').match(/([\d.]+)/); return m?parseFloat(m[1]):0; };
        const n=getNum(dose), p2=getNum(prev);
        if (n>p2) deltaHTML=`<span class="dose-delta up">▲</span>`;
        else if (n<p2) deltaHTML=`<span class="dose-delta dn">▼</span>`;
      }
      _lastDoses[cacheKey] = dose;
      return `<div class="dose-row">
        <div class="dose-row-main">
          <span class="dose-name">${i.name}${isDoseByKg(i)?'<span class="dose-kg-badge">⚖️/kg</span>':''}</span>
          <div class="dose-tags-row">${i.warn?'<span class="dose-warn-tag">⚠️</span>':''}${i.cy?`<span class="dose-cycle-tag">${i.cy.max}d ciclo</span>`:''}${i.dc?'<span class="dose-food-tag">com comida</span>':''}</div>
        </div>
        <span class="dose-amt" style="font-family:var(--fm);font-variant-numeric:tabular-nums">${dose||'—'}${deltaHTML}</span>
      </div>`;
    }).join('');
  }

  if (preItems.length) h += `<div class="dose-period-card pre"><div class="proto-head">⚡ Pré-Treino <span class="dose-head-sub">30–45min antes</span></div><div class="proto-body">${rowsHTML(preItems,'dm')}</div></div>`;
  h += `<div class="proto-grid">
    <div class="dose-period-card"><div class="proto-head">🌅 Manhã <span class="dose-head-sub">${morItems.length} itens</span></div><div class="proto-body">${rowsHTML(morItems,'dm')}</div></div>
    <div class="dose-period-card"><div class="proto-head">🌙 Noite <span class="dose-head-sub">${nigItems.length} itens</span></div><div class="proto-body">${rowsHTML(nigItems,'dn')}</div></div>
  </div>`;

  const costItems = pool.filter(i=>i.pm&&i.doses);
  if (costItems.length) {
    const monthly = costItems.reduce((s,i)=>s+(bestMarketplacePrice(i)/i.doses)*30,0);
    h += `<div class="dose-cost-bar"><span>💰 Custo mensal estimado do protocolo</span><strong style="font-family:var(--fm);font-variant-numeric:tabular-nums">~R$${monthly.toFixed(0)}</strong></div>`;
  }
  h += `<p class="dose-disclaimer">⚠️ Protocolo educacional baseado em evidências científicas. Os valores com ⚖️/kg variam conforme seu perfil. Consulte um profissional de saúde antes de iniciar qualquer suplementação.</p>`;
  el.innerHTML = h;
  requestAnimationFrame(injectDoseEnhancements);
}

// ══════════════════════════════════════════════════════════════
// SUÍTE DE TESTES UNITÁRIOS (Calculadora de Dose)
// ══════════════════════════════════════════════════════════════

/**
 * Executa a suite de testes da calculadora de dosagem.
 */
export function runDoseTestSuite() {
  console.group("🧪 Testes Unitários: dose.js");
  let passed = 0, total = 0;
  const run = (fn) => { total++; if (fn()) passed++; };

  // TESTE 1: Sanitização de Input Numérico
  run(() => {
    const cases = [
      assertEquals(parseNumericInput("85,5", 80), 85.5, "Deve aceitar vírgula como separador"),
      assertEquals(parseNumericInput("invalid", 70), 70, "Deve retornar fallback para strings inválidas"),
      assertEquals(parseNumericInput("", 65), 65, "Deve retornar fallback para string vazia")
    ];
    return cases.every(c => c);
  });

  // TESTE 2: Perfil Biológico (Cálculo de IMC e Peso de Dosagem)
  run(() => {
    const profile = bodyProfile(100, 180, 'masculino', 'moderado');
    const imcOk = Math.round(profile.bmi) === 31; // Obesidade
    const weightAdjusted = profile.doseWeight < 100; // Peso corrigido para dosagem em obesos
    return assertEquals(imcOk && weightAdjusted, true, "Deve calcular IMC e ajustar peso de cálculo para obesidade");
  });

  // TESTE 3: Regra de Escalonamento (Creatina)
  run(() => {
    const itemCreatina = IT.find(i => i.id === 11);
    const mockProfile = { body: { doseWeight: 100, act: 1, stim: 1 } };
    const dose = calcDose(itemCreatina, 'dm', mockProfile);
    // Regra creatina: 0.3g a 0.5g por kg. Para 100kg = 30g a 50g.
    return assertEquals(dose, "30\u202fg–50\u202fg", "Cálculo de Creatina deve escalar 0.3-0.5g por kg");
  });

  // TESTE 4: Detecção de Categorias Baseadas em Peso
  run(() => {
    const protein = { id: 15, cat: 'Proteína' };
    const vitamin = { id: 10, cat: 'Vitamina' };
    return assertEquals(
      [isDoseByKg(protein), isDoseByKg(vitamin)],
      [true, false],
      "Proteínas devem escalar por kg, Vitaminas não"
    );
  });

  console.groupEnd();
  return { passed, total };
}
