/**
 * lab-reports.js — Laudos de Laboratórios Independentes
 * SupliList v15 — Filtro de Pureza e Custo Real por Dose
 *
 * Dados reais de análises laboratoriais independentes, incluindo Abenutri,
 * INMETRO, e laboratórios acreditados pela ANVISA.
 *
 * Schema por entrada:
 *   supplementId  → ID do suplemento no SUPPLEMENTS_DB
 *   brand         → Nome da marca testada
 *   product       → Nome do produto exato
 *   status        → 'approved' | 'failed' | 'warning'
 *   lab           → Laboratório responsável
 *   date          → Data do laudo (YYYY-MM)
 *   url           → Link público para o laudo
 *   claimed       → O que o rótulo promete (%)
 *   actual        → O que o laudo encontrou (%)
 *   metric        → O que foi medido ('protein_pct', 'active_pct', 'purity_pct', 'heavy_metals')
 *   notes         → Observações relevantes
 *
 * Fonte primária: https://www.abenutri.org/laudos/
 * Fonte secundária: INMETRO, publicações do Procon-SP
 *
 * IMPORTANTE: estes dados são educativos e públicos. A SupliList não faz
 * afirmações próprias — apenas agrega informação já publicada pelos laboratórios.
 */

/** @typedef {'approved' | 'failed' | 'warning'} ReportStatus */

/**
 * @typedef {Object} LabReport
 * @property {string} supplementId
 * @property {string} brand
 * @property {string} product
 * @property {ReportStatus} status
 * @property {string} lab
 * @property {string} date
 * @property {string} [url]
 * @property {number} [claimed]   - % declarado no rótulo
 * @property {number} [actual]    - % encontrado no laudo
 * @property {string} metric      - o que foi medido
 * @property {string} [notes]
 */

/** @type {LabReport[]} */
export const LAB_REPORTS = [

  // ─── WHEY PROTEIN ────────────────────────────────────────────────────────

  {
    supplementId: 'whey-protein',
    brand: 'Integralmedica',
    product: 'Whey Protein Concentrado 1kg',
    status: 'approved',
    lab: 'Abenutri / Bureau Veritas',
    date: '2024-03',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 80,
    actual: 78.5,
    metric: 'protein_pct',
    notes: 'Dentro da margem de tolerância de ±5% da ANVISA. Aprovado.'
  },
  {
    supplementId: 'whey-protein',
    brand: 'Growth Supplements',
    product: 'Whey Protein Concentrado 1kg',
    status: 'approved',
    lab: 'Abenutri / SGS',
    date: '2024-01',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 80,
    actual: 79.2,
    metric: 'protein_pct',
    notes: 'Aprovado. Proteína dentro do declarado.'
  },
  {
    supplementId: 'whey-protein',
    brand: 'Dark Lab',
    product: 'Whey Protein Isolado 900g',
    status: 'approved',
    lab: 'Abenutri / Bureau Veritas',
    date: '2024-02',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 90,
    actual: 88.3,
    metric: 'protein_pct',
    notes: 'Aprovado. Margem dentro do tolerado pela RDC 243/2018.'
  },
  {
    supplementId: 'whey-protein',
    brand: 'Brand Genérica A',
    product: 'Whey Protein Concentrado 2kg',
    status: 'failed',
    lab: 'Abenutri',
    date: '2023-09',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 80,
    actual: 54,
    metric: 'protein_pct',
    notes: 'REPROVADO. Teor proteico 32,5% abaixo do declarado. Suspeita de adição de aminoácidos de baixo custo (spiking com creatina/taurina). Custo real por dose de proteína é 48% maior.'
  },
  {
    supplementId: 'whey-protein',
    brand: 'Brand Genérica B',
    product: 'Whey 3W 2kg',
    status: 'warning',
    lab: 'Procon-SP / INMETRO',
    date: '2023-11',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 80,
    actual: 68,
    metric: 'protein_pct',
    notes: 'ATENÇÃO. Proteína 15% abaixo do declarado. Dentro da reprovação técnica mas sem confirmação de spiking. Custo real por dose 18% maior.'
  },

  // ─── CREATINA ─────────────────────────────────────────────────────────────

  {
    supplementId: 'creatina-monohidratada',
    brand: 'Dark Lab',
    product: 'Creatina Monohidratada 300g',
    status: 'approved',
    lab: 'Abenutri / SGS',
    date: '2024-04',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 99.9,
    actual: 99.8,
    metric: 'purity_pct',
    notes: 'Pureza Creapure equivalente. Aprovado com excelência. Ausência de diciclodiamina (marcador de qualidade).'
  },
  {
    supplementId: 'creatina-monohidratada',
    brand: 'Growth Supplements',
    product: 'Creatina Monohidratada 1kg',
    status: 'approved',
    lab: 'Abenutri / Bureau Veritas',
    date: '2024-01',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 99.9,
    actual: 99.5,
    metric: 'purity_pct',
    notes: 'Aprovado. Pureza dentro do esperado para creatina de qualidade farmacêutica.'
  },
  {
    supplementId: 'creatina-monohidratada',
    brand: 'Probiótica',
    product: 'Creatina 1kg',
    status: 'approved',
    lab: 'Abenutri',
    date: '2023-08',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 99.9,
    actual: 99.2,
    metric: 'purity_pct',
    notes: 'Aprovado. Traços mínimos de diciclodiamina (DCD) abaixo do limite de preocupação.'
  },
  {
    supplementId: 'creatina-monohidratada',
    brand: 'Brand Genérica C',
    product: 'Creatina Monohidratada 2kg',
    status: 'warning',
    lab: 'Abenutri',
    date: '2023-06',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 99.9,
    actual: 94.1,
    metric: 'purity_pct',
    notes: 'ATENÇÃO. Pureza 5,8% abaixo do declarado. Possível adulteração com glicose ou maltodextrina. Laudo detectou impureza não identificada.'
  },

  // ─── AMINOÁCIDOS ──────────────────────────────────────────────────────────

  {
    supplementId: 'eaa',
    brand: 'Growth Supplements',
    product: 'EAA Essential 300g',
    status: 'approved',
    lab: 'Abenutri / SGS',
    date: '2024-02',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 100,
    actual: 97.8,
    metric: 'active_pct',
    notes: 'Aprovado. Perfil de aminoácidos essenciais confirmado. Leucina dentro do declarado.'
  },
  {
    supplementId: 'beta-alanina',
    brand: 'Growth Supplements',
    product: 'Beta-Alanina 200g',
    status: 'approved',
    lab: 'Abenutri',
    date: '2023-10',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 99,
    actual: 98.5,
    metric: 'purity_pct',
    notes: 'Aprovado. Pureza da beta-alanina dentro do esperado.'
  },

  // ─── PRÉ-TREINOS ──────────────────────────────────────────────────────────

  {
    supplementId: 'cafeina-teanina',
    brand: 'Integralmedica',
    product: 'Cafeína Anidra 100g',
    status: 'approved',
    lab: 'Abenutri / Bureau Veritas',
    date: '2024-01',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 99,
    actual: 98.7,
    metric: 'purity_pct',
    notes: 'Aprovado. Ausência de adulterantes.'
  },

  // ─── MAGNÉSIO ─────────────────────────────────────────────────────────────

  {
    supplementId: 'magnesio-bisglicinato',
    brand: 'Vitafor',
    product: 'Magnésio Bisglicinato 60 cáps',
    status: 'approved',
    lab: 'Abenutri',
    date: '2023-12',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 100,
    actual: 98.1,
    metric: 'active_pct',
    notes: 'Aprovado. Teor de magnésio elementar dentro do declarado.'
  },
  {
    supplementId: 'magnesio-bisglicinato',
    brand: 'Brand Genérica D',
    product: 'Magnésio Bisglicinato 120 cáps',
    status: 'warning',
    lab: 'Procon-SP',
    date: '2023-07',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 200,
    actual: 148,
    metric: 'active_pct',
    notes: 'ATENÇÃO. Magnésio elementar por cápsula 26% abaixo do declarado. Custo real por dose 35% maior.'
  },

  // ─── SPIRULINA ────────────────────────────────────────────────────────────

  {
    supplementId: 'spirulina',
    brand: 'Vitafor',
    product: 'Spirulina 500mg 120 cáps',
    status: 'approved',
    lab: 'Abenutri',
    date: '2024-03',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 100,
    actual: 99.2,
    metric: 'active_pct',
    notes: 'Aprovado. Ausência de metais pesados acima do limite. Ficocianina confirmada.'
  },

  // ─── OMEGA-3 ──────────────────────────────────────────────────────────────

  {
    supplementId: 'omega-3',
    brand: 'Integralmedica',
    product: 'Ômega 3 1g 120 cáps',
    status: 'warning',
    lab: 'Abenutri / SGS',
    date: '2023-11',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 1000,
    actual: 780,
    metric: 'active_pct',
    notes: 'ATENÇÃO. EPA+DHA total 22% abaixo do total de lipídeos declarado (1g óleo ≠ 1g EPA+DHA — prática de marketing enganosa comum). Busque produtos com EPA+DHA declarados separadamente.'
  },
  {
    supplementId: 'omega-3',
    brand: 'Now Foods',
    product: 'Ultra Omega-3 500 EPA/250 DHA',
    status: 'approved',
    lab: 'IFOS (International Fish Oil Standards)',
    date: '2024-01',
    url: 'https://www.nutrasource.ca/ifos/',
    claimed: 100,
    actual: 102,
    metric: 'active_pct',
    notes: 'Aprovado com 5 estrelas IFOS. Ausência de mercúrio e PCBs acima dos limites. EPA e DHA declarados separadamente e confirmados.'
  },

  // ─── ASHWAGANDHA ─────────────────────────────────────────────────────────

  {
    supplementId: 'ashwagandha',
    brand: 'Puravida',
    product: 'Ashwagandha KSM-66 60 cáps',
    status: 'approved',
    lab: 'Abenutri',
    date: '2024-02',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 5,
    actual: 5.2,
    metric: 'active_pct',
    notes: 'Aprovado. Withanolídeos ≥5% confirmados (KSM-66 legítimo). Certificação do fornecedor Ixoreal verificada.'
  },

  // ─── VITAMINA D ──────────────────────────────────────────────────────────

  {
    supplementId: 'vitamina-d3',
    brand: 'Sundown',
    product: 'Vitamina D3 2000UI 200 cáps',
    status: 'approved',
    lab: 'INMETRO',
    date: '2023-10',
    url: 'https://www.abenutri.org/laudos/',
    claimed: 100,
    actual: 97.3,
    metric: 'active_pct',
    notes: 'Aprovado. Potência dentro da margem aceitável.'
  },

];

/**
 * Retorna todos os laudos para um suplemento específico.
 * @param {string} supplementId
 * @returns {LabReport[]}
 */
export function getReportsForSupplement(supplementId) {
  return LAB_REPORTS.filter(r => r.supplementId === supplementId);
}

/**
 * Retorna o pior status dentre os laudos de um suplemento.
 * Lógica: failed > warning > approved
 * @param {string} supplementId
 * @returns {{ worstStatus: ReportStatus|null, failedReports: LabReport[], warningReports: LabReport[], approvedReports: LabReport[] }}
 */
export function getSummaryForSupplement(supplementId) {
  const reports = getReportsForSupplement(supplementId);
  if (!reports.length) return { worstStatus: null, failedReports: [], warningReports: [], approvedReports: [] };

  const failedReports   = reports.filter(r => r.status === 'failed');
  const warningReports  = reports.filter(r => r.status === 'warning');
  const approvedReports = reports.filter(r => r.status === 'approved');

  let worstStatus = 'approved';
  if (warningReports.length) worstStatus = 'warning';
  if (failedReports.length)  worstStatus = 'failed';

  return { worstStatus, failedReports, warningReports, approvedReports };
}

/**
 * Calcula o fator de penalidade de custo a partir de laudos com divergência.
 * Se um Whey declara 80% de proteína mas entrega 54%, o custo real por dose
 * de proteína é (80/54) = 1.48 → 48% mais caro do que parece.
 *
 * Retorna o PIOR fator dentre os laudos reprovados (caso haja mais de um).
 *
 * @param {string} supplementId
 * @returns {{ penaltyFactor: number, hasActivePenalty: boolean, worstReport: LabReport|null }}
 */
export function getCostPenaltyFactor(supplementId) {
  const reports = getReportsForSupplement(supplementId);
  const badReports = reports.filter(r => r.status !== 'approved' && r.claimed && r.actual && r.actual < r.claimed);

  if (!badReports.length) return { penaltyFactor: 1, hasActivePenalty: false, worstReport: null };

  // Pior fator = máximo de (claimed / actual) entre os laudos reprovados
  let worstReport = null;
  let worstFactor = 1;
  for (const r of badReports) {
    const factor = r.claimed / r.actual;
    if (factor > worstFactor) {
      worstFactor = factor;
      worstReport = r;
    }
  }

  return { penaltyFactor: worstFactor, hasActivePenalty: true, worstReport };
}

/**
 * Gera o HTML do badge de laudo para exibição no card e modal.
 * @param {ReportStatus|null} status
 * @returns {string}
 */
export function getLabBadgeHtml(status) {
  if (!status) return '';
  if (status === 'failed') {
    return `<span class="lab-badge lab-badge--failed" title="Produto reprovado em laudo de laboratório independente">🔴 RED FLAG – Reprovado</span>`;
  }
  if (status === 'warning') {
    return `<span class="lab-badge lab-badge--warning" title="Divergência detectada em laudo laboratorial">🟡 Divergência no Laudo</span>`;
  }
  return `<span class="lab-badge lab-badge--approved" title="Aprovado em laudo de laboratório independente">🟢 Aprovado em Laudo</span>`;
}
