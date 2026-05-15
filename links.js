// ══════════════════════════════════════════════════════════════
//  SUPLILIST — LINKS DE PRODUTOS
//  Como usar:
//    1. Cole o link do produto em shopee, ml ou amazon
//    2. Salve o arquivo — o tag de afiliado é aplicado automaticamente
//    3. Deixe o campo vazio ("") para usar busca automática
// ══════════════════════════════════════════════════════════════

const AFF = {
  amazonTag : "suplilist01-20",   // seu Associates tag
  mlLabel   : "cv20251229193743", // seu label do Mercado Livre
  shopeeId  : "18350911123",      // seu ID Shopee (informativo)
};

// ──────────────────────────────────────────────────────────────
//  LINKS DOS PRODUTOS
//  Formato por suplemento:
//    ID_DO_SUPLEMENTO: {
//      shopee : "https://shopee.com.br/product/...",
//      ml     : "https://produto.mercadolivre.com.br/...",
//      amazon : "https://www.amazon.com.br/dp/...",
//      pm     : 89,   // preço atual em R$ (opcional — sobrescreve o data.js)
//    }
//
//  → Você pode preencher só os marketplaces que encontrou
//  → Os campos vazios ("") usam busca automática pelo nome
//  → O ID fica no data.js em cada objeto { id: X, name: "..." }
// ──────────────────────────────────────────────────────────────

const PRODUCT_LINKS = {

  // 1 — Maca Peruana Preta em pó
  1: {
    amazon: "https://www.amazon.com.br/Maca-Peruana-Capsulas-Importada-Mulheres/dp/B0CVYP83Y5",
    pm: 76,
  },

  // 2 — Feno-grego em pó
  2: {
    amazon: "https://www.amazon.com.br/FitoViron-Grego-C%C3%A1ps-500mg-Unilife/dp/B0F7TPBBCG",
    pm: 38,
  },

  // 3 — L-Citrulina em pó
  3: {
    amazon: "https://www.amazon.com.br/L-Citrulina-Malato-Em-P%C3%B3-F%C3%B3rmula/dp/B0FTZXRRHJ",
    pm: 61,
  },

  // 4 — Ashwagandha KSM-66
  4: {
    amazon: "https://www.amazon.com.br/Ginseng-Puro-120-C%C3%A1psulas-500mg/dp/B0FD7RYF21",
    pm: 45,
  },

  // 5 — Tongkat Ali extrato pó
  5: {
    amazon: "https://www.amazon.com.br/Solaray-Tongkat-C%C3%A1psulas-Vc%C3%A1psulas-unidades/dp/B07K1DP3JC",
    pm: 340,
  },

  // 6 — Boron (citrato) em pó
  6: {
    amazon: "https://www.amazon.com.br/Boro-Decahidratado-Comprimidos-Lauton-Nutrition/dp/B0996P6BH2",
    pm: 22,
  },

  // 7 — Mucuna Pruriens extrato pó
  7: {
    amazon: "https://www.amazon.com.br/Mucuna-60-C%C3%A1psulas-800mg-Nutrivitalle/dp/B0CFBCSTH8",
    pm: 32,
  },

  // 8 — Zinco bisglicinato em pó
  8: {
    amazon: "https://www.amazon.com.br/Bisglicinato-Zinco-60-C%C3%A1psulas-Nutrify/dp/B0BFT4GT1Y",
    pm: 30,
  },

  // 9 — Magnésio glicinato em pó
  9: {
    amazon: "https://www.amazon.com.br/Magn%C3%A9sio-Glicinato-magn%C3%A9sio-elementar-Bigens/dp/B0D4F8JW6L",
    pm: 40,
  },

  // 10 — Vitamina D3 + K2 (MK-7)
  10: {
    amazon: "https://www.amazon.com.br/Vitamina-D3-Longa-Dura%C3%A7%C3%A3o-Fortalvit/dp/B0D9ZY6B9G",
    pm: 59,
  },

  // 11 — Creatina Monohidratada
  11: {
    amazon: "https://www.amazon.com.br/Creatina-Monohidratada-Dark-Lab-Pureza/dp/B0CF71CJ2L",
    pm: 45,
  },

  // 12 — Beta-Alanina em pó
  12: {
    amazon: "https://www.amazon.com.br/Beta-Alanine-100-Dark-Lab/dp/B0D3VD6L14",
    pm: 60,
  },

  // 13 — Cafeína + L-Teanina
  13: {
    amazon: "https://www.amazon.com.br/Focus-Theanine-Caffeine-Essential-Nutrition/dp/B0FGYDTZPJ",
    pm: 178,
  },

  // 14 — HMB (β-Hidroxi β-Metilbutirato)
  14: {
    amazon: "https://www.amazon.com.br/Newnutrition-NEWNUTRITION-Hmb-180-Caps/dp/B0DPXXNV1X",
    pm: 89,
  },

  // 15 — Whey Protein Isolado
  15: {
    amazon: "https://www.amazon.com.br/Whey-Protein-Isolado-Triple-Zero/dp/B07LCTBFMJ",
    pm: 250,
  },

  // 16 — EAA (Aminoácidos Essenciais)
  16: {
    amazon: "https://www.amazon.com.br/Essencial-9-225g-Limonada-Sui%C3%A7a-Action-BodyAction/dp/B07TWHKRN2",
    pm: 68,
  },

  // 18 — Lion's Mane extrato pó
  18: {
    amazon: "https://www.amazon.com.br/Cogumelo-Juba-le%C3%A3o-Org%C3%A2nico-Nutricost/dp/B07W8TL9DZ",
    pm: 214,
  },

  // 20 — Rhodiola Rosea extrato
  20: {
    amazon: "https://www.amazon.com.br/Rhodiola-Rosea-Nutrivitalle-Capsulas-1000mg/dp/B0CJ3Z79CC",
    pm: 33,
  },

  // 21 — Alpha-GPC em pó (Glicerofosfato de Magnésio — precursor colinérgico equivalente)
  21: {
    amazon: "https://www.amazon.com.br/Maxinutri-Memorin-Glicerofosfato-Magn%C3%A9sio-Caps/dp/B0G549HHM1",
    pm: 59,
  },

  // 22 — L-Teanina em pó
  22: {
    amazon: "https://www.amazon.com.br/L-Theanine-Sem-Sabor-100-Nutricost/dp/B01AAVGK70",
    pm: 300,
  },

  // 23 — Ômega-3 EPA+DHA
  23: {
    amazon: "https://www.amazon.com.br/%C3%94mega-EPA-DHA-1G-120caps/dp/B07939CW22",
    pm: 90,
  },

  // 24 — Magnésio Treonato em pó
  24: {
    amazon: "https://www.amazon.com.br/Magnesio-Treonato-500mg-capsulas-Ecomev/dp/B0CGSVT17C",
    pm: 40,
  },

  // 25 — Coenzima Q10 (Ubiquinol)
  25: {
    amazon: "https://www.amazon.com.br/Vitafor-Coenzima-Coq-10-30caps/dp/B07L5VNT9Q",
    pm: 120,
  },

  // 26 — Beta-Glucana de Cogumelos
  26: {
    amazon: "https://www.amazon.com.br/Beta-Glucan-Plus-Farelo-Aveia/dp/B07LCTKH4X",
    pm: 175,
  },

  // 27 — Vitamina C Tamponada em pó
  27: {
    amazon: "https://www.amazon.com.br/Vitamina-C-120-capsulas-Vitafor/dp/B08CL1RTFW",
    pm: 72,
  },

  // 28 — Quercetina Fitossomada
  28: {
    amazon: "https://www.amazon.com.br/Optimized-Quercetin-C%C3%A1psulas-Life-Extension/dp/B0020XW68O",
    pm: 121,
  },

  // 29 — Catuaba extrato pó
  29: {
    amazon: "https://www.amazon.com.br/Catuaba-p%C3%B3-premium-marca-Ca-Nuts/dp/B0D58QTTTF",
    pm: 46,
  },

  // 30 — Marapuama (Muira Puama)
  30: {
    amazon: "https://www.amazon.com.br/Marapuama-Puro-Linha-Especial-Ca-Nuts/dp/B0DFXHPZ1C",
    pm: 40,
  },

  // 31 — Saw Palmetto extrato pó
  31: {
    amazon: "https://www.amazon.com.br/Saw-Palmetto-Puro-C%C3%A1psulas-500mg/dp/B0F9LNYBNB",
    pm: 58,
  },

  // 32 — Panax Ginseng extrato pó
  32: {
    amazon: "https://www.amazon.com.br/Ginseng-Premium-Importado-Especial-Ca-Nuts/dp/B0DDWF9G2Y",
    pm: 45,
  },

  // 33 — Taurina em pó
  33: {
    amazon: "https://www.amazon.com.br/Taurine-Pote-60-C%C3%A1psulas-550mg/dp/B07LB8GB46",
    pm: 56,
  },

  // 35 — Probiótico multi-cepas
  35: {
    amazon: "https://www.amazon.com.br/Vitafor-Simfort-Plus-C%C3%A1psulas-Branco/dp/B0BDSCN8XQ",
    pm: 120,
  },

  // 36 — Psyllium Husk em pó
  36: {
    amazon: "https://www.amazon.com.br/Psyllium-Psillium-Husk-500g-Wenutri/dp/B07ZPBRXYY",
    pm: 50,
  },

  // 37 — Berberina HCL
  37: {
    amazon: "https://www.amazon.com.br/Berberina-Premium-C%C3%A1psulas-500mg-Dura%C3%A7%C3%A3o/dp/B0FX69ZY4V",
    pm: 62,
  },

  // 38 — Cromo Picolinato
  38: {
    amazon: "https://www.amazon.com.br/Picolinato-250mcg-Comprimidos-Lauton-Nutrition/dp/B08MVDMHPG",
    pm: 23,
  },

  // 39 — EGCG Chá Verde extrato
  39: {
    amazon: "https://www.amazon.com.br/Egcg-epigalocatequina-Galato-150mg-C%C3%A1psulas/dp/B0CFGB3X58",
    pm: 140,
  },

  // 40 — Colágeno Peptídeos Verisol/Fortigel
  40: {
    amazon: "https://www.amazon.com.br/Collagen-Renew-300-g-Nutrify/dp/B07LCT61BK",
    pm: 65,
  },

  // 41 — Ferro Bisglicinato
  41: {
    amazon: "https://www.amazon.com.br/Ferro-Quelato-Plus-Vitamina-Vitafor/dp/B0FLG8GWWH",
    pm: 34,
  },

  // 42 — Cranberry extrato
  42: {
    amazon: "https://www.amazon.com.br/Kit-Cranberry-120-c%C3%A1psulas-Unilife/dp/B07X7XYM3T",
    pm: 55,
  },

  // 43 — Melatonina
  43: {
    amazon: "https://www.amazon.com.br/Suplemento-L%C3%ADquido-Equaliv-melatonina-Absor%C3%A7%C3%A3o/dp/B0C2ZR2LP6",
    pm: 27,
  },

  // 44 — Glucosamina + Condroitina
  44: {
    amazon: "https://www.amazon.com.br/Glucosamina-1500mg-Condroitina-1200mg-C%C3%A1psulas/dp/B0FV3TCBGD",
    pm: 74,
  },

  // 45 — NAC (N-Acetilcisteína)
  45: {
    amazon: "https://www.amazon.com.br/Nac-N-Acetilciste%C3%ADna-c%C3%A1psulas-A%C3%A7%C3%BAcar-Bionutri/dp/B0F4818KSF",
    pm: 27,
  },

  // 46 — Glicina em pó
  46: {
    amazon: "https://www.amazon.com.br/Glicina-4well-500g-Sabor-Natural/dp/B0DLWVJ74L",
    pm: 57,
  },

  // 47 — Inositol Myo + D-Chiro
  47: {
    amazon: "https://www.amazon.com.br/MIO-INOSITOL-500MG-CAPS-Mio-Inositol-associacoes/dp/B0BMBBXK8T",
    pm: 43,
  },

  // 48 — Spirulina em pó
  48: {
    amazon: "https://www.amazon.com.br/Spirulina-Premium-Marca-Ca-Nuts-especial/dp/B0D3434R2J",
    pm: 35,
  },

  // 49 — Cálcio Citrato + D3
  49: {
    amazon: "https://www.amazon.com.br/C%C3%A1lcio-Citrato-Malato-Magn%C3%A9sio-Suplemento/dp/B08MV5Q2FB",
    pm: 34,
  },

  // 50 — Valeriana extrato
  50: {
    amazon: "https://www.amazon.com.br/Valeriana-unidade-500mg-C%C3%A1psulas-EuAtivo/dp/B0FM2P9F6W",
    pm: 40,
  },

  // 51 — Apigenina
  51: {
    amazon: "https://www.amazon.com.br/Nutricost-Apigenin-50mg-180-Capsules/dp/B0BXV9Q67P",
    pm: 300,
  },

  // 52 — Resveratrol Trans
  52: {
    amazon: "https://www.amazon.com.br/Vitafor-Resveratrol-Plus-60-C%C3%A1psulas/dp/B0C94T17L9",
    pm: 105,
  },

  // 53 — Óleo de Prímula
  53: {
    amazon: "https://www.amazon.com.br/LAVITAN-PRIMULA-MENOPAUSA-BORRAGEM-TOCOFEROL/dp/B082Z7T2V5",
    pm: 36,
  },

  // 54 — L-Carnitina L-Tartarato
  54: {
    amazon: "https://www.amazon.com.br/L-Carnitina-120-C%C3%A1psulas-Vitafor-Branco/dp/B09V8JKS34",
    pm: 90,
  },

  // 55 — Tirosina em pó
  55: {
    amazon: "https://www.amazon.com.br/L-Tirosina-BIOTERAH-Suplemento-Alimentar-Vitaminas/dp/B0DLJ2QQ38",
    pm: 56,
  },

  // 56 — Curcumina Fitossomada
  56: {
    amazon: "https://www.amazon.com.br/Curcuma-Plus-C%C3%A1psulas-Vitafor-Branco/dp/B0BV85JSD2",
    pm: 60,
  },

  // ──────────────────────────────────────────────────────────────
  // IDs sem link Amazon na lista fornecida — usando busca automática:
  // 17 — Ecdisterona (20-hidroxiecdisona)
  // 19 — Bacopa Monnieri extrato
  // 21 — Alpha-GPC em pó
  // 34 — Shatavari extrato
  // ──────────────────────────────────────────────────────────────


};

// ══════════════════════════════════════════════════════════════
//  MOTOR DE AFILIADOS — não precisa mexer daqui pra baixo
// ══════════════════════════════════════════════════════════════

/** Aplica tag de afiliado Amazon em qualquer URL da Amazon */
function amazonAff(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('amazon.')) {
      u.searchParams.set('tag', AFF.amazonTag);
      u.searchParams.set('linkCode', 'll2');
      u.searchParams.set('ref_', 'as_li_ss_tl');
    }
    return u.toString();
  } catch (e) { return url; }
}

/** Aplica parâmetros de afiliado Mercado Livre */
function mlAff(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('meli.la')) return u.toString();
    u.searchParams.set('utm_source',   'suplilistpro');
    u.searchParams.set('utm_medium',   'affiliate');
    u.searchParams.set('utm_campaign', 'mercadolivre');
    u.searchParams.set('utm_content',  AFF.mlLabel);
    u.searchParams.set('label',        AFF.mlLabel);
    return u.toString();
  } catch (e) { return url; }
}

/** Gera URL de busca automática quando não há link manual */
function searchUrl(name, marketplace) {
  const q = encodeURIComponent(name.trim());
  if (marketplace === 'shopee')
    return `https://shopee.com.br/search?keyword=${q}&sortBy=sales`;
  if (marketplace === 'ml')
    return `https://lista.mercadolivre.com.br/${q}`;
  if (marketplace === 'amazon')
    return `https://www.amazon.com.br/s?k=${q}&tag=${AFF.amazonTag}&s=review-rank`;
  return '#';
}

/** Adiciona parâmetros UTM para rastreamento interno */
function utm(url, src, medium, campaign, pos) {
  if (!url || url === '#') return '#';
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source',   src);
    u.searchParams.set('utm_medium',   medium);
    u.searchParams.set('utm_campaign', campaign);
    if (pos) u.searchParams.set('utm_term', String(pos));
    return u.toString();
  } catch (e) { return url; }
}

/**
 * Injeta os links do PRODUCT_LINKS no array IT (vindo do data.js).
 * Chamado automaticamente após o carregamento do data.js.
 * - Aplica tag de afiliado em todos os links fornecidos
 * - Preenche com busca automática onde o link está vazio
 * - Sobrescreve pm (preço) se informado
 */
function applyProductLinks() {
  if (typeof IT === 'undefined') {
    console.warn('[links.js] IT não encontrado — certifique que data.js carrega antes de links.js');
    return;
  }

  let applied = 0;

  IT.forEach(item => {
    const entry = PRODUCT_LINKS[item.id];

    // Links manuais (com afiliado aplicado) ou busca automática
    item.linkShopee = entry?.shopee
      ? utm(entry.shopee, 'shopee', 'affiliate', 'suplilist', item.id)
      : searchUrl(item.name, 'shopee');

    item.linkML = entry?.ml
      ? utm(mlAff(entry.ml), 'mercadolivre', 'affiliate', 'suplilist', item.id)
      : searchUrl(item.name, 'ml');

    item.linkAmazon = entry?.amazon
      ? utm(amazonAff(entry.amazon), 'amazon', 'affiliate', 'suplilist', item.id)
      : searchUrl(item.name, 'amazon');

    // Sobrescreve preço se informado manualmente
    if (entry?.pm) {
      item.pm = entry.pm;
      if (entry.amazon) item.azp = entry.pm;
      if (entry.ml) item.mlp = entry.pm;
    }

    if (entry) applied++;
  });

  const total = IT.length;
  const auto  = total - applied;
  console.log(`[links.js] ✅ ${applied} link(s) manuais aplicados · 🔍 ${auto} usando busca automática`);
}

// Roda assim que o script carrega
applyProductLinks();
