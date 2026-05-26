/**
 * @fileoverview Utilitários SVG para geração de gráficos puros (zero dependências) — SupliList v3.0.
 * Fase 5: Linha/área SVG para adesão ao longo do tempo, reutilizável em qualquer página.
 *
 * @author SupliList Team
 * @version 3.0.0
 */

/* ══════════════════════════════════════════════════════════════
   HELPERS INTERNOS
   ══════════════════════════════════════════════════════════════ */

/**
 * Mapeia um valor de um intervalo para outro.
 * @param {number} val
 * @param {number} inMin
 * @param {number} inMax
 * @param {number} outMin
 * @param {number} outMax
 */
function _map(val, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  return outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/**
 * Gera uma polyline SVG suavizada com curva Catmull-Rom → Bezier.
 * @param {{x:number, y:number}[]} pts
 * @returns {string} path d=
 */
function _smoothPath(pts) {
  if (pts.length < 2) return '';

  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

/* ══════════════════════════════════════════════════════════════
   GRÁFICO LINHA/ÁREA
   ══════════════════════════════════════════════════════════════ */

/**
 * Gera um gráfico de linha/área SVG puro.
 *
 * @param {Object}   opts
 * @param {number[]} opts.values       - Valores Y (0-100 ou qualquer range)
 * @param {string[]} opts.labels       - Labels do eixo X (um por ponto)
 * @param {number}   [opts.width=600] - Largura do SVG
 * @param {number}   [opts.height=180] - Altura do SVG
 * @param {string}   [opts.color='#7c3aed'] - Cor da linha/área
 * @param {string}   [opts.label='']  - Label do eixo Y
 * @param {boolean}  [opts.showArea=true]  - Preencher área sob a linha
 * @param {boolean}  [opts.showDots=true]  - Mostrar pontos na linha
 * @param {string}   [opts.unit='%']       - Unidade do tooltip
 * @returns {string} HTML do SVG completo
 */
export function renderLineChart({
  values,
  labels,
  width    = 600,
  height   = 180,
  color    = '#7c3aed',
  label    = '',
  showArea = true,
  showDots = true,
  unit     = '%',
} = {}) {
  if (!values || values.length === 0) return '<p style="color:#71717a;font-size:12px;text-align:center;padding:40px;">Sem dados suficientes.</p>';

  const PAD = { top: 20, right: 16, bottom: 36, left: 40 };
  const W   = width  - PAD.left - PAD.right;
  const H   = height - PAD.top  - PAD.bottom;

  const minVal = 0;
  const maxVal = Math.max(100, ...values);

  // Monta os pontos (x,y)
  const pts = values.map((v, i) => ({
    x: PAD.left + _map(i, 0, values.length - 1, 0, W),
    y: PAD.top  + _map(v, maxVal, minVal, 0, H),
    v,
  }));

  const linePath  = _smoothPath(pts);
  const areaPath  = showArea
    ? `${linePath} L ${pts[pts.length - 1].x},${PAD.top + H} L ${pts[0].x},${PAD.top + H} Z`
    : '';

  // Grade horizontal (4 linhas)
  const gridLines = [0, 25, 50, 75, 100].map(pct => {
    const y = PAD.top + _map(pct, maxVal, minVal, 0, H);
    return `
      <line x1="${PAD.left}" y1="${y}" x2="${PAD.left + W}" y2="${y}"
            stroke="var(--border-color)" stroke-width="1" opacity="0.3"/>
      <text x="${PAD.left - 6}" y="${y + 4}"
            text-anchor="end" fill="var(--t3)" font-size="9" font-family="Inter,sans-serif">${pct}${unit}</text>
    `;
  }).join('');

  // Labels X (máx 12 visíveis por espaço)
  const step = Math.max(1, Math.ceil(labels.length / 10));
  const xLabels = labels.map((l, i) => {
    if (i % step !== 0) return '';
    const x = PAD.left + _map(i, 0, values.length - 1, 0, W);
    return `<text x="${x}" y="${PAD.top + H + 20}"
                  text-anchor="middle" fill="var(--t3)" font-size="9" font-family="Inter,sans-serif">${l}</text>`;
  }).join('');

  // Pontos
  const dots = showDots ? pts.map((p, i) => `
    <circle cx="${p.x}" cy="${p.y}" r="3.5"
            fill="${color}" stroke="var(--bg-darkest)" stroke-width="2">
      <title>${labels[i] || i}: ${p.v}${unit}</title>
    </circle>
  `).join('') : '';

  // Gradiente de área
  const gradId = `chart-grad-${Math.random().toString(36).slice(2, 7)}`;

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" style="display:block;overflow:visible;">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${color}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
        </linearGradient>
        <clipPath id="clip-${gradId}">
          <rect x="${PAD.left}" y="${PAD.top}" width="${W}" height="${H}"/>
        </clipPath>
      </defs>

      <!-- Grade -->
      ${gridLines}

      <!-- Área -->
      ${showArea ? `<path d="${areaPath}" fill="url(#${gradId})" clip-path="url(#clip-${gradId})"/>` : ''}

      <!-- Linha -->
      <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round"
            clip-path="url(#clip-${gradId})"/>

      <!-- Pontos -->
      <g clip-path="url(#clip-${gradId})">${dots}</g>

      <!-- Labels X -->
      ${xLabels}

      ${label ? `<text x="${PAD.left}" y="14" fill="var(--t3)" font-size="9" font-family="Inter,sans-serif" font-weight="600" text-transform="uppercase">${label}</text>` : ''}
    </svg>
  `;
}

/* ══════════════════════════════════════════════════════════════
   HEATMAP DE CHECK-INS (bônus: grid de quadradinhos)
   ══════════════════════════════════════════════════════════════ */

/**
 * Gera um heatmap de 90 dias de check-ins no estilo GitHub contribution graph.
 * @param {Record<string,boolean>} checkIns - Mapa de datas ISO → true/false
 * @param {number} [days=90]
 * @returns {string} HTML do SVG
 */
export function renderCheckInHeatmap(checkIns = {}, days = 90) {
  const COLS   = Math.ceil(days / 7);
  const SIZE   = 13;
  const GAP    = 3;
  const WIDTH  = COLS * (SIZE + GAP);
  const HEIGHT = 7 * (SIZE + GAP);

  // Preenche array de dias
  const today  = new Date();
  const cells  = [];

  for (let i = days - 1; i >= 0; i--) {
    const d    = new Date(today);
    d.setDate(d.getDate() - i);
    const iso  = d.toISOString().split('T')[0];
    cells.push({ iso, done: !!checkIns[iso] });
  }

  // Organiza em colunas de 7
  const cols = [];
  for (let i = 0; i < cells.length; i += 7) {
    cols.push(cells.slice(i, i + 7));
  }

  const rects = cols.map((col, ci) =>
    col.map((cell, ri) => {
      const x     = ci * (SIZE + GAP);
      const y     = ri * (SIZE + GAP);
      const color = cell.done ? 'var(--brand-green, #10B981)' : 'var(--border-color)';
      const alpha = cell.done ? 0.85 : 1;
      return `<rect x="${x}" y="${y}" width="${SIZE}" height="${SIZE}"
                    rx="3" fill="${color}" opacity="${alpha}">
                <title>${cell.iso}${cell.done ? ' ✓' : ''}</title>
              </rect>`;
    }).join('')
  ).join('');

  return `
    <div style="overflow-x:auto;">
      <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${Math.min(WIDTH, 680)}"
           style="display:block;">
        ${rects}
      </svg>
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════════
   GRÁFICO DE BARRAS (helper adicional)
   ══════════════════════════════════════════════════════════════ */

/**
 * Gera barras verticais SVG simples.
 * @param {{ label: string, value: number, color?: string }[]} data
 * @param {number} [width=500]
 * @param {number} [height=140]
 * @returns {string}
 */
export function renderBarChart(data, width = 500, height = 140) {
  if (!data || data.length === 0) return '';

  const PAD    = { top: 10, right: 10, bottom: 30, left: 30 };
  const W      = width  - PAD.left - PAD.right;
  const H      = height - PAD.top  - PAD.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW   = Math.max(8, (W / data.length) - 6);

  const bars = data.map((d, i) => {
    const x     = PAD.left + (i / data.length) * W + (W / data.length - barW) / 2;
    const barH  = _map(d.value, 0, maxVal, 0, H);
    const y     = PAD.top + H - barH;
    const color = d.color || 'var(--brand-primary, #7c3aed)';
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${barH}"
            rx="4" fill="${color}" opacity="0.85">
        <title>${d.label}: ${d.value}</title>
      </rect>
      <text x="${x + barW / 2}" y="${PAD.top + H + 16}"
            text-anchor="middle" fill="var(--t3)" font-size="9" font-family="Inter,sans-serif">
        ${d.label.slice(0, 5)}
      </text>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" style="display:block;">
      <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + H}"
            stroke="var(--border-color)" stroke-width="1" opacity="0.3"/>
      <line x1="${PAD.left}" y1="${PAD.top + H}" x2="${PAD.left + W}" y2="${PAD.top + H}"
            stroke="var(--border-color)" stroke-width="1" opacity="0.3"/>
      ${bars}
    </svg>
  `;
}
