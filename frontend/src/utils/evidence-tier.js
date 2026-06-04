/**
 * evidence-tier.js — Hierarquia de Evidências Científicas
 * SupliList v15 — Sistema de 3 Níveis por Claim
 *
 * FILOSOFIA: O tier não é da molécula — é do CLAIM específico.
 * Tongkat Ali pode ser T2 para libido (evidência emergente) e T3 para
 * hipertrofia (sem evidência relevante). Esta distinção é crítica para
 * não nivelar o que não deve ser nivelado.
 *
 * NÍVEIS:
 *   T1 — Consolidado: múltiplas meta-análises confirmam eficácia e segurança
 *   T2 — Contextual: evidência emergente ou eficácia limitada a cenários específicos
 *   T3 — Especulativo: promessas de marketing com respaldo clínico fraco ou nulo
 *
 * FONTES DE CRITÉRIO:
 *   - Examine.com (revisões sistemáticas)
 *   - Cochrane Database
 *   - ISSN Position Stands
 *   - European Journal of Sport Science
 *   - EFSA Health Claims
 */

/** @typedef {'T1' | 'T2' | 'T3'} EvidenceTier */

/**
 * @typedef {Object} TierDefinition
 * @property {string} label         - Nome do tier
 * @property {string} description   - Descrição curta para o usuário
 * @property {string} icon          - Emoji representativo
 * @property {string} colorClass    - Classe CSS do badge
 * @property {string} colorHex      - Cor hexadecimal para uso inline
 * @property {string} warning       - Aviso para T3 (ou vazio para T1/T2)
 */

/** @type {Record<EvidenceTier, TierDefinition>} */
export const TIER_DEFINITIONS = {
  T1: {
    label: 'Nível 1 — Consolidado',
    shortLabel: 'Consolidado',
    description: 'Múltiplas meta-análises confirmam eficácia e segurança para esta indicação.',
    icon: '🟢',
    colorClass: 'ev-tier--t1',
    colorHex: '#22C55E',
    warning: '',
  },
  T2: {
    label: 'Nível 2 — Contextual',
    shortLabel: 'Contextual',
    description: 'Evidência emergente ou eficácia limitada a cenários específicos. Resultados podem variar.',
    icon: '🟡',
    colorClass: 'ev-tier--t2',
    colorHex: '#EAB308',
    warning: 'Os efeitos para esta indicação dependem de contexto individual. Dados ainda limitados.',
  },
  T3: {
    label: 'Nível 3 — Especulativo',
    shortLabel: 'Especulativo',
    description: 'A ciência atual não confirma este efeito de forma robusta para esta indicação em indivíduos saudáveis.',
    icon: '🔶',
    colorClass: 'ev-tier--t3',
    colorHex: '#F97316',
    warning: '⚠️ Esta indicação tem respaldo científico fraco ou nulo para indivíduos saudáveis. Os efeitos descritos podem ser baseados em marketing ou estudos pré-clínicos (animais/células).',
  },
};

/**
 * Mapa completo de evidenceTiers por suplemento e por claim.
 * Chave: supplementId (mesmo ID do SUPPLEMENTS_DB).
 * Cada entrada tem um `default` (pior caso) e `claims` por indicação específica.
 *
 * @type {Record<string, { default: EvidenceTier, claims: Record<string, EvidenceTier> }>}
 */
export const EVIDENCE_TIERS_MAP = {

  // ─── Força & Performance ──────────────────────────────────────────────────

  'creatina-monohidratada': {
    default: 'T1',
    claims: {
      'hipertrofia': 'T1',
      'força': 'T1',
      'performance': 'T1',
      'cognição': 'T1',
      'recuperação': 'T1',
      'bulk': 'T1',
      'strength': 'T1',
      'endurance': 'T2',
      'general': 'T1',
    },
  },
  'beta-alanina': {
    default: 'T2',
    claims: {
      'endurance': 'T2',       // só funciona >60s alta intensidade
      'hipertrofia': 'T2',
      'força': 'T2',
      'performance': 'T2',
      'fadiga': 'T2',
      'bulk': 'T2',
      'strength': 'T2',
      'general': 'T3',
    },
  },
  'l-citrulina': {
    default: 'T1',
    claims: {
      'performance': 'T1',
      'vasodilatação': 'T1',
      'bomba muscular': 'T1',
      'ereção': 'T2',
      'libido': 'T2',
      'força': 'T1',
      'endurance': 'T1',
      'bulk': 'T2',
      'strength': 'T1',
      'cut': 'T2',
      'general': 'T2',
    },
  },
  'hmb': {
    default: 'T2',
    claims: {
      'hipertrofia': 'T2',     // T1 só para iniciantes e idosos
      'preservação muscular': 'T2',
      'recuperação': 'T2',
      'força': 'T2',
      'bulk': 'T2',
      'strength': 'T2',
      'cut': 'T2',
      'general': 'T2',
    },
  },
  'ecdisterona': {
    default: 'T3',
    claims: {
      'hipertrofia': 'T3',
      'anabolismo': 'T3',
      'força': 'T3',
      'bulk': 'T3',
      'strength': 'T3',
      'general': 'T3',
    },
  },

  // ─── Proteínas ────────────────────────────────────────────────────────────

  'whey-protein': {
    default: 'T1',
    claims: {
      'hipertrofia': 'T1',
      'síntese proteica': 'T1',
      'recuperação': 'T1',
      'emagrecimento': 'T1',
      'bulk': 'T1',
      'strength': 'T1',
      'cut': 'T1',
      'general': 'T1',
    },
  },
  'eaa': {
    default: 'T1',
    claims: {
      'hipertrofia': 'T1',
      'síntese proteica': 'T1',
      'catabolismo': 'T1',
      'bulk': 'T1',
      'strength': 'T1',
      'cut': 'T1',
      'general': 'T1',
    },
  },

  // ─── Energéticos & Cognição ───────────────────────────────────────────────

  'cafeina-teanina': {
    default: 'T1',
    claims: {
      'foco': 'T1',
      'energia': 'T1',
      'performance': 'T1',
      'emagrecimento': 'T2',   // efeito modesto isolado
      'bulk': 'T2',
      'strength': 'T1',
      'cut': 'T1',
      'endurance': 'T1',
      'general': 'T2',
    },
  },
  'l-teanina': {
    default: 'T1',
    claims: {
      'foco': 'T1',
      'relaxamento': 'T1',
      'sono': 'T2',
      'ansiedade': 'T2',
      'general': 'T2',
    },
  },
  'tirosina': {
    default: 'T2',
    claims: {
      'cognição': 'T2',
      'foco': 'T2',
      'estresse': 'T2',
      'tireoide': 'T3',        // sem evidência sólida para suplementação isolada
      'testosterona': 'T3',
      'hormônios': 'T3',
      'general': 'T3',
    },
  },
  'alpha-gpc': {
    default: 'T2',
    claims: {
      'cognição': 'T2',
      'foco': 'T2',
      'memória': 'T2',
      'força': 'T2',
      'GH': 'T3',              // estudos muito limitados
      'testosterona': 'T3',
      'general': 'T2',
    },
  },
  'bacopa-monnieri': {
    default: 'T2',
    claims: {
      'memória': 'T2',
      'aprendizado': 'T2',
      'ansiedade': 'T2',
      'cognição': 'T2',
      'performance': 'T3',
      'hipertrofia': 'T3',
      'general': 'T2',
    },
  },
  'lions-mane': {
    default: 'T2',
    claims: {
      'cognição': 'T2',
      'neuroproteção': 'T2',
      'memória': 'T2',
      'NGF': 'T2',
      'ansiedade': 'T3',
      'performance': 'T3',
      'hipertrofia': 'T3',
      'general': 'T2',
    },
  },
  'rhodiola-rosea': {
    default: 'T2',
    claims: {
      'fadiga': 'T2',
      'estresse': 'T2',
      'endurance': 'T2',
      'cognição': 'T2',
      'testosterona': 'T3',
      'hipertrofia': 'T3',
      'general': 'T2',
    },
  },

  // ─── Vitaminas & Minerais ─────────────────────────────────────────────────

  'vitamina-d3': {
    default: 'T1',
    claims: {
      'imunidade': 'T1',
      'ossos': 'T1',
      'testosterona': 'T2',    // só em deficientes
      'performance': 'T2',
      'saúde geral': 'T1',
      'general': 'T1',
    },
  },
  'omega-3': {
    default: 'T1',
    claims: {
      'cardio': 'T1',
      'inflamação': 'T1',
      'cognição': 'T2',
      'triglicerídeos': 'T1',
      'recuperação': 'T2',
      'hipertrofia': 'T2',
      'general': 'T1',
    },
  },
  'magnesio-bisglicinato': {
    default: 'T1',
    claims: {
      'sono': 'T1',
      'câimbras': 'T1',
      'ansiedade': 'T2',
      'testosterona': 'T2',    // estudos limitados
      'SHBG': 'T2',
      'performance': 'T2',
      'hipertrofia': 'T3',
      'general': 'T1',
    },
  },
  'magnesio-treonato': {
    default: 'T2',
    claims: {
      'cognição': 'T2',
      'memória': 'T2',
      'sono': 'T2',
      'neuroproteção': 'T2',
      'testosterona': 'T3',
      'hipertrofia': 'T3',
      'general': 'T2',
    },
  },
  'vitamina-c': {
    default: 'T1',
    claims: {
      'imunidade': 'T1',
      'colágeno': 'T1',
      'antioxidante': 'T1',
      'recovery': 'T2',
      'performance': 'T3',
      'general': 'T1',
    },
  },
  'ferro-bisglicinato': {
    default: 'T1',
    claims: {
      'anemia': 'T1',
      'ferritina': 'T1',
      'energia': 'T1',
      'endurance': 'T2',
      'performance': 'T2',
      'general': 'T1',
    },
  },
  'calcio-citrato-d3': {
    default: 'T1',
    claims: {
      'ossos': 'T1',
      'menopausa': 'T1',
      'prevenção de osteoporose': 'T1',
      'performance': 'T3',
      'hipertrofia': 'T3',
      'general': 'T1',
    },
  },
  'zinco-bisglicinato': {
    default: 'T2',
    claims: {
      'testosterona': 'T2',    // só em deficientes de zinco
      'imunidade': 'T1',
      'fertilidade': 'T2',
      'libido': 'T2',
      'performance': 'T2',
      'general': 'T2',
    },
  },
  'boro': {
    default: 'T2',
    claims: {
      'testosterona livre': 'T2',  // estudos com 10mg/7dias, contexto limitado
      'SHBG': 'T2',
      'libido': 'T3',
      'hipertrofia': 'T3',
      'performance': 'T3',
      'ossos': 'T2',
      'general': 'T3',
    },
  },

  // ─── Saúde Geral & Longevidade ────────────────────────────────────────────

  'nac': {
    default: 'T2',
    claims: {
      'glutationa': 'T2',
      'fígado': 'T2',
      'antioxidante': 'T2',
      'respiratório': 'T2',
      'recuperação': 'T2',
      'longevidade': 'T2',
      'general': 'T2',
    },
  },
  'coenzima-q10': {
    default: 'T2',
    claims: {
      'mitocôndria': 'T2',
      'cardio': 'T2',
      'antioxidante': 'T2',
      'estatinas': 'T1',       // evidência sólida para usuários de estatinas
      'performance': 'T2',
      'longevidade': 'T2',
      'general': 'T2',
    },
  },
  'quercetina': {
    default: 'T2',
    claims: {
      'antioxidante': 'T2',
      'anti-inflamatório': 'T2',
      'antiviral': 'T2',
      'AMPK': 'T3',
      'longevidade': 'T3',
      'performance': 'T3',
      'hipertrofia': 'T3',
      'general': 'T2',
    },
  },
  'resveratrol': {
    default: 'T3',
    claims: {
      'longevidade': 'T3',      // evidências animais > humanos
      'antioxidante': 'T2',
      'sirtuínas': 'T3',
      'cardio': 'T2',
      'hipertrofia': 'T3',
      'performance': 'T3',
      'general': 'T3',
    },
  },
  'berberina': {
    default: 'T2',
    claims: {
      'glicemia': 'T2',
      'AMPK': 'T2',
      'longevidade': 'T2',
      'emagrecimento': 'T2',
      'metabolismo': 'T2',
      'hipertrofia': 'T3',
      'general': 'T2',
    },
  },

  // ─── Digestão & Intestino ─────────────────────────────────────────────────

  'psyllium': {
    default: 'T1',
    claims: {
      'fibra': 'T1',
      'intestino': 'T1',
      'colesterol': 'T1',
      'glicemia': 'T1',
      'saciedade': 'T1',
      'emagrecimento': 'T2',
      'general': 'T1',
    },
  },
  'probiotico': {
    default: 'T2',
    claims: {
      'microbiota': 'T2',
      'intestino': 'T2',
      'imunidade': 'T2',
      'performance': 'T3',
      'hipertrofia': 'T3',
      'testosterona': 'T3',
      'general': 'T2',
    },
  },

  // ─── Sono ─────────────────────────────────────────────────────────────────

  'melatonina': {
    default: 'T1',
    claims: {
      'sono': 'T1',
      'ritmo circadiano': 'T1',
      'jet lag': 'T1',
      'antioxidante': 'T2',
      'longevidade': 'T2',
      'performance': 'T2',
      'general': 'T2',
    },
  },
  'glicina': {
    default: 'T2',
    claims: {
      'sono': 'T2',
      'colágeno': 'T2',
      'ansiedade': 'T2',
      'cognição': 'T2',
      'hipertrofia': 'T3',
      'performance': 'T3',
      'general': 'T2',
    },
  },
  'valeriana': {
    default: 'T2',
    claims: {
      'sono': 'T2',
      'ansiedade': 'T2',
      'relaxamento': 'T2',
      'performance': 'T3',
      'geral': 'T2',
    },
  },
  'apigenina': {
    default: 'T2',
    claims: {
      'sono': 'T2',
      'ansiedade': 'T2',
      'aromatase': 'T3',        // dados pré-clínicos
      'testosterona': 'T3',
      'performance': 'T3',
      'general': 'T2',
    },
  },

  // ─── Articulações & Pele ──────────────────────────────────────────────────

  'colageno': {
    default: 'T2',
    claims: {
      'pele': 'T2',
      'articulação': 'T2',
      'tendão': 'T2',
      'hipertrofia': 'T3',
      'performance': 'T3',
      'general': 'T2',
    },
  },
  'glucosamina-condroitina': {
    default: 'T2',
    claims: {
      'cartilagem': 'T2',
      'artrose': 'T2',
      'articulação': 'T2',
      'hipertrofia': 'T3',
      'performance': 'T3',
      'general': 'T2',
    },
  },
  'curcumina': {
    default: 'T2',
    claims: {
      'inflamação': 'T2',
      'articulação': 'T2',
      'antioxidante': 'T2',
      'recuperação': 'T2',
      'neuroproteção': 'T2',
      'hipertrofia': 'T3',
      'testosterona': 'T3',
      'general': 'T2',
    },
  },

  // ─── Saúde Hormonal (Feminino) ─────────────────────────────────────────────

  'inositol': {
    default: 'T2',
    claims: {
      'SOP': 'T2',
      'insulina': 'T2',
      'ciclo': 'T2',
      'ovulação': 'T2',
      'ansiedade': 'T2',
      'hipertrofia': 'T3',
      'performance': 'T3',
      'general': 'T2',
    },
  },
  'oleo-de-primula': {
    default: 'T3',
    claims: {
      'TPM': 'T3',              // evidência muito mista nos RCTs
      'pele': 'T2',
      'GLA': 'T2',
      'menopausa': 'T3',
      'hormônios': 'T3',
      'performance': 'T3',
      'general': 'T3',
    },
  },
  'shatavari': {
    default: 'T3',
    claims: {
      'libido': 'T3',
      'ciclo': 'T3',
      'adaptógeno': 'T3',
      'lactação': 'T2',         // alguma evidência Ayurvédica
      'performance': 'T3',
      'hipertrofia': 'T3',
      'general': 'T3',
    },
  },
  'cranberry': {
    default: 'T2',
    claims: {
      'ITU': 'T2',
      'trato urinário': 'T2',
      'antioxidante': 'T2',
      'performance': 'T3',
      'hipertrofia': 'T3',
      'general': 'T2',
    },
  },

  // ─── Adaptógenos & Libido (com CLAIMS distintos) ──────────────────────────

  'ashwagandha': {
    default: 'T2',
    claims: {
      'cortisol': 'T2',
      'ansiedade': 'T2',
      'sono': 'T2',
      'testosterona': 'T2',     // alguns RCTs em homens com baixa T, não geral
      'força': 'T2',
      'libido': 'T2',
      'hipertrofia': 'T3',      // sem efeito independente do treino
      'performance': 'T2',
      'GH': 'T3',
      'bulk': 'T2',
      'general': 'T2',
    },
  },
  'maca-peruana': {
    default: 'T2',
    claims: {
      'libido': 'T2',           // evidência mais robusta para libido
      'fertilidade': 'T2',
      'energia': 'T2',
      'testosterona': 'T3',     // sem alteração direta de testosterona nos RCTs
      'hipertrofia': 'T3',
      'performance': 'T3',
      'hormônio': 'T3',
      'general': 'T3',
    },
  },
  'tongkat-ali': {
    default: 'T2',
    claims: {
      'libido': 'T2',
      'testosterona livre': 'T2', // efeito em SHBG com alguma evidência
      'SHBG': 'T2',
      'ereção': 'T2',
      'hipertrofia': 'T3',
      'performance': 'T3',
      'testosterona total': 'T3',
      'general': 'T2',
    },
  },
  'feno-grego': {
    default: 'T2',
    claims: {
      'libido': 'T2',
      'testosterona': 'T2',     // dados mistos via aromatase
      'aromatase': 'T2',
      'insulina': 'T2',
      'hipertrofia': 'T3',
      'performance': 'T3',
      'massa muscular': 'T3',
      'general': 'T2',
    },
  },
  'mucuna-pruriens': {
    default: 'T2',
    claims: {
      'dopamina': 'T2',
      'libido': 'T2',
      'prolactina': 'T2',
      'testosterona': 'T2',     // via redução de prolactina, contexto limitado
      'hipertrofia': 'T3',
      'performance': 'T3',
      'GH': 'T3',
      'general': 'T2',
    },
  },
  'panax-ginseng': {
    default: 'T2',
    claims: {
      'ereção': 'T2',
      'libido': 'T2',
      'energia': 'T2',
      'adaptógeno': 'T2',
      'cognição': 'T2',
      'testosterona': 'T3',
      'hipertrofia': 'T3',
      'massa muscular': 'T3',
      'general': 'T2',
    },
  },
  'catuaba': {
    default: 'T3',
    claims: {
      'libido': 'T3',           // uso tradicional, dados clínicos humanos mínimos
      'ereção': 'T3',
      'dopamina': 'T3',
      'performance': 'T3',
      'hipertrofia': 'T3',
      'testosterona': 'T3',
      'general': 'T3',
    },
  },
  'marapuama': {
    default: 'T3',
    claims: {
      'libido': 'T3',
      'ereção': 'T3',
      'neurológico': 'T3',
      'adaptógeno': 'T3',
      'performance': 'T3',
      'hipertrofia': 'T3',
      'testosterona': 'T3',
      'general': 'T3',
    },
  },
  'saw-palmetto': {
    default: 'T2',
    claims: {
      'HPB': 'T2',
      'próstata': 'T2',
      'DHT': 'T2',
      'calvície': 'T2',
      'testosterona': 'T3',
      'hipertrofia': 'T3',
      'libido': 'T3',
      'general': 'T2',
    },
  },

  // ─── Metabolismo ──────────────────────────────────────────────────────────

  'l-carnitina': {
    default: 'T2',
    claims: {
      'recuperação': 'T2',
      'metabolismo de gordura': 'T2',
      'emagrecimento': 'T2',
      'endurance': 'T2',
      'andrógenos': 'T3',
      'testosterona': 'T3',
      'hipertrofia': 'T3',
      'cut': 'T2',
      'general': 'T2',
    },
  },
  'cromo-picolinato': {
    default: 'T2',
    claims: {
      'insulina': 'T2',
      'glicemia': 'T2',
      'compulsão': 'T2',
      'emagrecimento': 'T2',
      'performance': 'T3',
      'hipertrofia': 'T3',
      'testosterona': 'T3',
      'general': 'T2',
    },
  },
  'cha-verde': {
    default: 'T2',
    claims: {
      'antioxidante': 'T2',
      'cardio': 'T2',
      'metabolismo': 'T2',
      'termogênico': 'T3',      // efeito calórico mínimo isolado sem cafeína
      'emagrecimento': 'T3',
      'hipertrofia': 'T3',
      'testosterona': 'T3',
      'general': 'T2',
    },
  },

  // ─── Outros ───────────────────────────────────────────────────────────────

  'taurina': {
    default: 'T2',
    claims: {
      'hidratação': 'T2',
      'cardio': 'T2',
      'performance': 'T2',
      'recuperação': 'T2',
      'sono': 'T2',
      'testosterona': 'T3',
      'hipertrofia': 'T3',
      'general': 'T2',
    },
  },
  'spirulina': {
    default: 'T2',
    claims: {
      'proteína vegetal': 'T2',
      'micronutrientes': 'T2',
      'antioxidante': 'T2',
      'performance': 'T3',
      'hipertrofia': 'T3',
      'saciedade': 'T2',
      'general': 'T2',
    },
  },
  'beta-glucana': {
    default: 'T2',
    claims: {
      'imunidade': 'T2',
      'infecções': 'T2',
      'anti-inflamatório': 'T2',
      'hipertrofia': 'T3',
      'performance': 'T3',
      'general': 'T2',
    },
  },
};

/**
 * Retorna o tier de evidência para um suplemento dado um claim específico.
 * Se o claim não for encontrado, retorna o tier `default` do suplemento.
 * Se o suplemento não estiver mapeado, retorna 'T3' como fallback conservador.
 *
 * @param {string} supplementId
 * @param {string} [claim] - claim específico (ex: 'hipertrofia', 'libido')
 * @returns {EvidenceTier}
 */
export function getEvidenceTier(supplementId, claim) {
  const entry = EVIDENCE_TIERS_MAP[supplementId];
  if (!entry) return 'T3'; // fallback conservador para suplementos não mapeados

  if (!claim) return entry.default;

  const claimLower = claim.toLowerCase().trim();
  // Busca direta
  if (entry.claims[claimLower] !== undefined) {
    return entry.claims[claimLower];
  }
  // Busca parcial (ex: 'ganho de massa' → match em 'massa muscular')
  for (const [key, tier] of Object.entries(entry.claims)) {
    if (claimLower.includes(key) || key.includes(claimLower)) {
      return tier;
    }
  }

  return entry.default;
}

/**
 * Retorna a definição completa (label, cor, aviso) para um tier.
 * @param {EvidenceTier} tier
 * @returns {TierDefinition}
 */
export function getTierDefinition(tier) {
  return TIER_DEFINITIONS[tier] ?? TIER_DEFINITIONS['T3'];
}

/**
 * Gera o HTML do badge de tier para exibição em cards e modais.
 *
 * @param {EvidenceTier} tier
 * @param {'card' | 'modal'} [context='card'] - contexto de exibição
 * @returns {string}
 */
export function renderTierBadge(tier, context = 'card') {
  const def = getTierDefinition(tier);
  if (context === 'modal') {
    return `
      <div class="ev-tier-block ev-tier-block--${tier.toLowerCase()}">
        <span class="ev-tier-icon">${def.icon}</span>
        <div class="ev-tier-content">
          <span class="ev-tier-label">${def.label}</span>
          <span class="ev-tier-desc">${def.description}</span>
          ${def.warning ? `<span class="ev-tier-warning">${def.warning}</span>` : ''}
        </div>
      </div>
    `;
  }
  // card: badge compacto
  return `<span class="ev-tier-badge ${def.colorClass}" title="${def.label}: ${def.description}">${def.icon} ${def.shortLabel}</span>`;
}

/**
 * CSS para os componentes de tier. Injeta uma vez no head.
 */
export const TIER_STYLES = `
  /* ─── Evidence Tier Badge (card) ─── */
  .ev-tier-badge {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 9px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; padding: 2px 7px; border-radius: 5px;
    white-space: nowrap;
  }
  .ev-tier--t1 { background: rgba(34,197,94,0.12); color: #22C55E; border: 1px solid rgba(34,197,94,0.25); }
  .ev-tier--t2 { background: rgba(234,179,8,0.12);  color: #EAB308; border: 1px solid rgba(234,179,8,0.25); }
  .ev-tier--t3 { background: rgba(249,115,22,0.12); color: #F97316; border: 1px solid rgba(249,115,22,0.25); }

  /* ─── Evidence Tier Block (modal) ─── */
  .ev-tier-block {
    display: flex; gap: 12px; align-items: flex-start;
    background: var(--color-surface-secondary);
    border-radius: 12px; padding: 12px 14px;
    border-left: 3px solid transparent;
  }
  .ev-tier-block--t1 { border-left-color: #22C55E; }
  .ev-tier-block--t2 { border-left-color: #EAB308; }
  .ev-tier-block--t3 { border-left-color: #F97316; }
  .ev-tier-icon { font-size: 18px; flex-shrink: 0; line-height: 1.4; }
  .ev-tier-content { display: flex; flex-direction: column; gap: 3px; }
  .ev-tier-label { font-size: 12px; font-weight: 700; color: var(--color-text-primary); }
  .ev-tier-desc { font-size: 12px; color: var(--color-text-secondary); line-height: 1.4; }
  .ev-tier-warning {
    font-size: 11px; color: #F97316; font-weight: 600;
    margin-top: 4px; line-height: 1.4;
  }
`;

/**
 * Injeta os estilos de tier no documento (idempotente).
 */
export function injectTierStyles() {
  if (document.getElementById('ev-tier-styles')) return;
  const style = document.createElement('style');
  style.id = 'ev-tier-styles';
  style.textContent = TIER_STYLES;
  document.head.appendChild(style);
}
