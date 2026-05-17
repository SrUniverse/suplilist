// ══════════════════════════════════════════════════════════════
//  SUPLILIST — LINKS DE PRODUTOS
//  Como usar:
//    1. Cole o link do produto em shopee, ml ou amazon
//    2. Salve o arquivo — o tag de afiliado é aplicado automaticamente
//    3. Deixe o campo vazio ("") para usar busca automática
// ══════════════════════════════════════════════════════════════

// Nota: AFF, amazonAff(), mlAff(), utm() e searchUrl() já definidos in data.js

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

import { AFF, amazonAff, mlAff, shopeeAff, searchUrl } from './database.js';

export const PRODUCT_LINKS = {

  // 1 — Maca Peruana Preta em pó
  1: {
    amazon: "https://www.amazon.com.br/Maca-Peruana-Capsulas-Importada-Mulheres/dp/B0CVYP83Y5",
    ml: "https://www.mercadolivre.com.br/maca-negra-peruana-em-po-canuts-1kg-suplemento-nutricional/p/MLB48925546",
    pm: 76,
  },

  // 2 — Feno-grego em pó
  2: {
    amazon: "https://www.amazon.com.br/FitoViron-Grego-C%C3%A1ps-500mg-Unilife/dp/B0F7TPBBCG",
    ml: "https://www.mercadolivre.com.br/feno-grego-em-po-1-kg-para-chas-natural-niyati/p/MLB51257001",
    pm: 38,
  },

  // 3 — L-Citrulina em pó
  3: {
    amazon: "https://www.amazon.com.br/L-Citrulina-Malato-Em-P%C3%B3-F%C3%B3rmula/dp/B0FTZXRRHJ",
    ml: "https://www.mercadolivre.com.br/l-citrulina-250-g-em-po-bodyactive-sem-sabor/p/MLB63752199",
    pm: 61,
  },

  // 4 — Ashwagandha KSM-66
  4: {
    amazon: "https://www.amazon.com.br/Ginseng-Puro-120-C%C3%A1psulas-500mg/dp/B0FD7RYF21",
    ml: "https://www.mercadolivre.com.br/ksm66-300mg-infinity-pharma-suplemento-seivaflora-x-60g/p/MLB64138675",
    pm: 45,
  },

  // 5 — Tongkat Ali extrato pó
  5: {
    amazon: "https://www.amazon.com.br/Solaray-Tongkat-C%C3%A1psulas-Vc%C3%A1psulas-unidades/dp/B07K1DP3JC",
    ml: "https://www.mercadolivre.com.br/longjack-tongkat-ali-1600mg-180-capsulas-carlyle/p/MLB36314502",
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
    ml: "https://www.mercadolivre.com.br/mucuna-pruriens-smart-nutrition-60-capsulas-l-dopa-vegano-sem-gluten/p/MLB38660484",
    pm: 32,
  },

  // 8 — Zinco bisglicinato em pó
  8: {
    amazon: "https://www.amazon.com.br/Bisglicinato-Zinco-60-C%C3%A1psulas-Nutrify/dp/B0BFT4GT1Y",
    ml: "https://www.mercadolivre.com.br/zinco-quelato-easy-boost-bisglicinato-100-29mg-90-capsulas-sabor-neutro/p/MLB36713629",
    pm: 30,
  },

  // 9 — Magnésio glicinato em pó
  9: {
    amazon: "https://www.amazon.com.br/Magn%C3%A9sio-Glicinato-magn%C3%A9sio-elementar-Bigens/dp/B0D4F8JW6L",
    ml: "https://www.mercadolivre.com.br/magnesio-glicinato-500mg-120-capsulas-magnesio-glicina-sem-sabor/p/MLB56721453",
    pm: 40,
  },

  // 10 — Vitamina D3 + K2 (MK-7)
  10: {
    amazon: "https://www.amazon.com.br/Vitamina-D3-Longa-Dura%C3%A7%C3%A3o-Fortalvit/dp/B0D9ZY6B9G",
    ml: "https://www.mercadolivre.com.br/vitamina-d3-k2-mk7-2000ui-k2-100mcg-60cps-bigens-sabor-neutro/p/MLB26820032",
    pm: 59,
  },

  // 11 — Creatina Monohidratada
  11: {
    amazon: "https://www.amazon.com.br/Creatina-Monohidratada-Dark-Lab-Pureza/dp/B0CF71CJ2L",
    ml: "https://www.mercadolivre.com.br/creatina-1kg-suplemento-monohidratada-em-po-100-pura-soldiers-nutrition/p/MLB18725310",
    pm: 45,
  },

  // 12 — Beta-Alanina em pó
  12: {
    amazon: "https://www.amazon.com.br/Beta-Alanine-100-Dark-Lab/dp/B0D3VD6L14",
    ml: "https://www.mercadolivre.com.br/beta-alanina-100-pure-500g-dark-lab/p/MLB37171918",
    pm: 60,
  },

  // 13 — Cafeína + L-Teanina
  13: {
    amazon: "https://www.amazon.com.br/Focus-Theanine-Caffeine-Essential-Nutrition/dp/B0FGYDTZPJ",
    ml: "https://www.mercadolivre.com.br/l-teanina-200mg-cafeina-100mg-60-caps-sem-sabor/p/MLB53961510",
    pm: 178,
  },

  // 14 — HMB (β-Hidroxi β-Metilbutirato)
  14: {
    amazon: "https://www.amazon.com.br/Newnutrition-NEWNUTRITION-Hmb-180-Caps/dp/B0DPXXNV1X",
    ml: "https://www.mercadolivre.com.br/hmb-1500mg-formula-avancada-com-maxima-pureza-90-capsulas/p/MLB64180456",
    pm: 89,
  },

  // 15 — Whey Protein Isolado
  15: {
    amazon: "https://www.amazon.com.br/Whey-Protein-Isolado-Triple-Zero/dp/B07LCTBFMJ",
    ml: "https://www.mercadolivre.com.br/whey-protein-isolado-iso-protein-blend-complex-2kg-pretorian-sabor-baunilha/p/MLB19865651",
    pm: 250,
  },

  // 16 — EAA (Aminoácidos Essenciais)
  16: {
    amazon: "https://www.amazon.com.br/Essencial-9-225g-Limonada-Sui%C3%A7a-Action-BodyAction/dp/B07TWHKRN2",
    ml: "https://www.mercadolivre.com.br/aminoacidos-essenciais-eaa-max-bcaa-eaa9-suplemento-pre-pos-e-intra-treino-300g-sabor-frutas-vermelhas-force-full-labz/p/MLB34240551",
    pm: 68,
  },

  // 17 — Ecdisterona (20-hidroxiecdisona)
  17: {
    ml: "https://www.mercadolivre.com.br/supplements-orisilico-1400mg-beta-ecdysterone-turkesterone/p/MLB2060924173",
  },

  // 18 — Lion's Mane extrato pó
  18: {
    amazon: "https://www.amazon.com.br/Cogumelo-Juba-le%C3%A3o-Org%C3%A2nico-Nutricost/dp/B07W8TL9DZ",
    ml: "https://www.mercadolivre.com.br/extrato-lions-mane-90caps-foco-concentraco-e-memoria-microdose-life/p/MLB49085747",
    pm: 214,
  },

  // 19 — Bacopa Monnieri extrato
  19: {
    ml: "https://www.mercadolivre.com.br/bacopa-monnieri-500mg-beleza-saude-120-capsulas-extrato-seco/p/MLB28508942",
  },

  // 20 — Rhodiola Rosea extrato
  20: {
    amazon: "https://www.amazon.com.br/Rhodiola-Rosea-Nutrivitalle-Capsulas-1000mg/dp/B0CJ3Z79CC",
    ml: "https://www.mercadolivre.com.br/rhodiola-rosea-500mg-60-caps/up/MLBU1438090530",
    pm: 33,
  },

  // 21 — Alpha-GPC em pó (Glicerofosfato de Magnésio — precursor colinérgico equivalente)
  21: {
    amazon: "https://www.amazon.com.br/Maxinutri-Memorin-Glicerofosfato-Magn%C3%A9sio-Caps/dp/B0G549HHM1",
    ml: "https://www.mercadolivre.com.br/alpha-gpc-600-mg-60-capsulas-dr-botnico-sem-sabor/p/MLB65685035",
    pm: 59,
  },

  // 22 — L-Teanina em pó
  22: {
    amazon: "https://www.amazon.com.br/L-Theanine-Sem-Sabor-100-Nutricost/dp/B01AAVGK70",
    ml: "https://www.mercadolivre.com.br/teanina-250mg-relaxamento-sem-sonolncia-60-caps-bigens-sabor-neutro/p/MLB43511376",
    pm: 300,
  },

  // 23 — Ômega-3 EPA+DHA
  23: {
    amazon: "https://www.amazon.com.br/%C3%94mega-EPA-DHA-1G-120caps/dp/B07939CW22",
    ml: "https://www.mercadolivre.com.br/mega-3-epa-dha-240-capsulas-vitafor-sem-sabor/p/MLB42975434",
    pm: 90,
  },

  // 24 — Magnésio Treonato em pó
  24: {
    amazon: "https://www.amazon.com.br/Magnesio-Treonato-500mg-capsulas-Ecomev/dp/B0CGSVT17C",
    ml: "https://www.mercadolivre.com.br/magnesio-treonato-unilife-treon-mag-60-capsulas-vegano-sem-gluten/p/MLB49881987",
    pm: 40,
  },

  // 25 — Coenzima Q10 (Ubiquinol)
  25: {
    amazon: "https://www.amazon.com.br/Vitafor-Coenzima-Coq-10-30caps/dp/B07L5VNT9Q",
    ml: "https://www.mercadolivre.com.br/2un-coenzima-q10-ubiquinol-puro-500mg-240caps-4-meses-ecomev-sabor-capsulas/p/MLB29559056",
    pm: 120,
  },

  // 26 — Beta-Glucana de Cogumelos
  26: {
    amazon: "https://www.amazon.com.br/Beta-Glucan-Plus-Farelo-Aveia/dp/B07LCTKH4X",
    ml: "https://www.mercadolivre.com.br/life-extension-curcuma-curcumina-curcumina-elite-vegetarian/p/MLB2061782266",
    pm: 175,
  },

  // 27 — Vitamina C Tamponada em pó
  27: {
    amazon: "https://www.amazon.com.br/Vitamina-C-120-capsulas-Vitafor/dp/B08CL1RTFW",
    ml: "https://www.mercadolivre.com.br/vitamina-c-em-po-acido-ascobico-1kg-100-puro-soldiers-nutrition-bem-estar-energia/p/MLB25814305",
    pm: 72,
  },

  // 28 — Quercetina Fitossomada
  28: {
    amazon: "https://www.amazon.com.br/Optimized-Quercetin-C%C3%A1psulas-Life-Extension/dp/B0020XW68O",
    ml: "https://www.mercadolivre.com.br/querceteam-phytosome-250mg--60-capsulas/up/MLBU765367182",
    pm: 121,
  },

  // 29 — Catuaba extrato pó
  29: {
    amazon: "https://www.amazon.com.br/Catuaba-p%C3%B3-premium-marca-Ca-Nuts/dp/B0D58QTTTF",
    ml: "https://www.mercadolivre.com.br/extrato-de-catuaba-60ml/up/MLBU598538940",
    pm: 46,
  },

  // 30 — Marapuama (Muira Puama)
  30: {
    amazon: "https://www.amazon.com.br/Marapuama-Puro-Linha-Especial-Ca-Nuts/dp/B0DFXHPZ1C",
    ml: "https://www.mercadolivre.com.br/marapuama-em-po-1kg-natural-vegano-sem-gluten-cerealista-galvo/p/MLB52669273",
    pm: 40,
  },

  // 31 — Saw Palmetto extrato pó
  31: {
    amazon: "https://www.amazon.com.br/Saw-Palmetto-Puro-C%C3%A1psulas-500mg/dp/B0F9LNYBNB",
    ml: "https://www.mercadolivre.com.br/sawpalmetto-berries-550mg-nowfoods-100-caps--porta-capsulas/up/MLBU3668112799",
    pm: 58,
  },

  // 32 — Panax Ginseng extrato pó
  32: {
    amazon: "https://www.amazon.com.br/Ginseng-Premium-Importado-Especial-Ca-Nuts/dp/B0DDWF9G2Y",
    ml: "https://www.mercadolivre.com.br/farinha-po-ginseng-natural-premium-1kg/up/MLBU3763742775",
    pm: 45,
  },

  // 33 — Taurina em pó
  33: {
    amazon: "https://www.amazon.com.br/Taurine-Pote-60-C%C3%A1psulas-550mg/dp/B07LB8GB46",
    ml: "https://www.mercadolivre.com.br/l-taurina-1kg-suplemento-em-po-100-pura-importada-soldiers-nutrition/p/MLB26984168",
    pm: 56,
  },

  // 34 — Shatavari extrato
  34: {
    ml: "https://www.mercadolivre.com.br/aspargus--shatavari--500mg-60-capsulas/up/MLBU774257035",
  },

  // 35 — Probiótico multi-cepas
  35: {
    amazon: "https://www.amazon.com.br/Vitafor-Simfort-Plus-C%C3%A1psulas-Branco/dp/B0BDSCN8XQ",
    ml: "https://www.mercadolivre.com.br/probigut-equaliv--probiotico-com-10-bi-ufc-de-acao-rapida/up/MLBU2500624161",
    pm: 120,
  },

  // 36 — Psyllium Husk em pó
  36: {
    amazon: "https://www.amazon.com.br/Psyllium-Psillium-Husk-500g-Wenutri/dp/B07ZPBRXYY",
    ml: "https://www.mercadolivre.com.br/psyllium-husk-velez-1-kg-suplemento-natural-rico-em-fibras/p/MLB24861811",
    pm: 50,
  },

  // 37 — Berberina HCL
  37: {
    amazon: "https://www.amazon.com.br/Berberina-Premium-C%C3%A1psulas-500mg-Dura%C3%A7%C3%A3o/dp/B0FX69ZY4V",
    ml: "https://www.mercadolivre.com.br/berberina-hcl-1500mg-60-caps-dr-botanico-sabor-sem-sabor/p/MLB39457480",
    pm: 62,
  },

  // 38 — Cromo Picolinato
  38: {
    amazon: "https://www.amazon.com.br/Picolinato-250mcg-Comprimidos-Lauton-Nutrition/dp/B08MVDMHPG",
    ml: "https://www.mercadolivre.com.br/picolinato-de-cromo-120-caps-chromium-picolinate-profit-f-sabor-sem-sabor/p/MLB19533149",
    pm: 23,
  },

  // 39 — EGCG Chá Verde extrato
  39: {
    amazon: "https://www.amazon.com.br/Egcg-epigalocatequina-Galato-150mg-C%C3%A1psulas/dp/B0CFGB3X58",
    ml: "https://www.mercadolivre.com.br/now-foods-egcg-extrato-de-cha-verde-400-mg-180-capsulas-de-sabor-sem-sabor/p/MLB25346451",
    pm: 140,
  },

  // 40 — Colágeno Peptídeos Verisol/Fortigel
  40: {
    amazon: "https://www.amazon.com.br/Collagen-Renew-300-g-Nutrify/dp/B07LCT61BK",
    ml: "https://www.mercadolivre.com.br/colageno-hidrolisado-pura-vida-neutro-450g-collagen-pro-joint-bones/p/MLB28727470",
    pm: 65,
  },

  // 41 — Ferro Bisglicinato
  41: {
    amazon: "https://www.amazon.com.br/Ferro-Quelato-Plus-Vitamina-Vitafor/dp/B0FLG8GWWH",
    ml: "https://www.mercadolivre.com.br/suplemento-alimentar-ferro-plus-30-capsulas-vitafor/p/MLB54153071",
    pm: 34,
  },

  // 42 — Cranberry extrato
  42: {
    amazon: "https://www.amazon.com.br/Kit-Cranberry-120-c%C3%A1psulas-Unilife/dp/B07X7XYM3T",
    ml: "https://www.mercadolivre.com.br/cranberry-4-x-60-capsulas-unilife/up/MLBU733393780",
    pm: 55,
  },

  // 43 — Melatonina
  43: {
    amazon: "https://www.amazon.com.br/Suplemento-L%C3%ADquido-Equaliv-melatonina-Absor%C3%A7%C3%A3o/dp/B0C2ZR2LP6",
    ml: "https://www.mercadolivre.com.br/lavitan-melatonina-150-comprimidos-mastigaveis-morango/p/MLB19533191",
    pm: 27,
  },

  // 44 — Glucosamina + Condroitina
  44: {
    amazon: "https://www.amazon.com.br/Glucosamina-1500mg-Condroitina-1200mg-C%C3%A1psulas/dp/B0FV3TCBGD",
    ml: "https://www.mercadolivre.com.br/glucosamina-1500mg-condroitina-1200mg-msm-600mg-sabor-without-flavor/p/MLB37037109",
    pm: 74,
  },

  // 45 — NAC (N-Acetilcisteína)
  45: {
    amazon: "https://www.amazon.com.br/Nac-N-Acetilciste%C3%ADna-c%C3%A1psulas-A%C3%A7%C3%BAcar-Bionutri/dp/B0F4818KSF",
    ml: "https://www.mercadolivre.com.br/suplemento-alimentar-nac-60-capsulas-sem-sabor-vitafor/p/MLB19550050",
    pm: 27,
  },

  // 46 — Glicina em pó
  46: {
    amazon: "https://www.amazon.com.br/Glicina-4well-500g-Sabor-Natural/dp/B0DLWVJ74L",
    ml: "https://www.mercadolivre.com.br/glicina-4well-500g/p/MLB45916782",
    pm: 57,
  },

  // 47 — Inositol Myo + D-Chiro
  47: {
    amazon: "https://www.amazon.com.br/MIO-INOSITOL-500MG-CAPS-Mio-Inositol-associacoes/dp/B0BMBBXK8T",
    ml: "https://www.mercadolivre.com.br/suplemento-alimentar-foliane-myo-dovalle-para-mulheres-com-sop-e-tentantes/p/MLB46107008",
    pm: 43,
  },

  // 48 — Spirulina em pó
  48: {
    amazon: "https://www.amazon.com.br/Spirulina-Premium-Marca-Ca-Nuts-especial/dp/B0D3434R2J",
    ml: "https://www.mercadolivre.com.br/spirulina-em-po-500g-100-pura-sem-aditivos-nova-nutri/p/MLB19860987",
    pm: 45,
  },

  // 49 — Cálcio Citrato + D3
  49: {
    amazon: "https://www.amazon.com.br/s?k=calcio+citrato+d3+suplemento",
    ml: "https://www.mercadolivre.com.br/calcio-citrato-vitamina-d3-120-capsulas/p/MLB45213789",
    pm: 45,
  },

  // 50 — Valeriana extrato
  50: {
    amazon: "https://www.amazon.com.br/s?k=valeriana+extrato+capsulas",
    ml: "https://www.mercadolivre.com.br/valeriana-officinalis-500mg-60-capsulas-unilife/p/MLB28746301",
    pm: 35,
  },

  // 51 — Apigenina
  51: {
    amazon: "https://www.amazon.com.br/s?k=apigenina+capsulas",
    ml: "https://www.mercadolivre.com.br/apigenina-50mg-60-capsulas-dr-botanico/p/MLB57431092",
    pm: 65,
  },

  // 52 — Resveratrol Trans
  52: {
    amazon: "https://www.amazon.com.br/s?k=trans+resveratrol+capsulas",
    ml: "https://www.mercadolivre.com.br/resveratrol-trans-200mg-60-capsulas-vitafor/p/MLB29447813",
    pm: 70,
  },

  // 53 — Óleo de Prímula
  53: {
    amazon: "https://www.amazon.com.br/s?k=oleo+de+primula+capsulas",
    ml: "https://www.mercadolivre.com.br/oleo-de-primula-1000mg-120-capsulas-unilife/p/MLB27381652",
    pm: 40,
  },

  // 54 — L-Carnitina L-Tartarato
  54: {
    amazon: "https://www.amazon.com.br/s?k=l+carnitina+l+tartarato+po",
    ml: "https://www.mercadolivre.com.br/l-carnitina-l-tartarato-500g-100-pura-black-skull/p/MLB18927401",
    pm: 70,
  },

  // 55 — Tirosina em pó
  55: {
    amazon: "https://www.amazon.com.br/s?k=l+tirosina+po+suplemento",
    ml: "https://www.mercadolivre.com.br/l-tirosina-em-po-200g-100-pura-soldiers-nutrition/p/MLB27631450",
    pm: 45,
  },

  // 56 — Curcumina Fitossomada
  56: {
    amazon: "https://www.amazon.com.br/s?k=curcumina+fitossomada+capsulas",
    ml: "https://www.mercadolivre.com.br/curcumina-fitossomada-500mg-60-capsulas-vitafor/p/MLB34871209",
    pm: 75,
  },

};

// ══════════════════════════════════════════════════════════════
//  APLICAÇÃO DOS LINKS AOS ITENS DO ARRAY IT
//  Executa logo após o carregamento, antes de scripts.js
//  Adiciona linkAmazon, linkML, linkShopee e sobrescreve pm se definido
// ══════════════════════════════════════════════════════════════
export function applyProductLinks(IT) {
  if (!IT || !Array.isArray(IT)) {
    console.error('[links.js] IT não está definido. Verifique a ordem dos <script> no HTML.');
    return;
  }
  let processed = 0, skipped = 0;
  IT.forEach(function(item) {
    // [SL-06] Guard: valida que o item tem ID antes de qualquer lookup
    if (!item || item.id == null) {
      console.warn('[links.js] Item sem ID ignorado:', item);
      skipped++;
      return;
    }

    var lk = PRODUCT_LINKS[item.id];

    // [SL-06] Se não há entrada no dicionário, aplica fallback de busca e preserva dados originais
    if (!lk || typeof lk !== 'object') {
      item.linkAmazon = item.linkAmazon || searchUrl(item.name, 'amazon');
      item.linkML     = item.linkML     || searchUrl(item.name, 'ml');
      item.linkShopee = item.linkShopee || item.shopee || searchUrl(item.name, 'shopee');
      skipped++;
      return;
    }

    // Preço: sobrescreve apenas se o valor em links.js for um número válido
    if (lk.pm && typeof lk.pm === 'number' && lk.pm > 0) item.pm = lk.pm;

    // Amazon — aplica tag de afiliado; fallback para busca
    item.linkAmazon = lk.amazon ? amazonAff(lk.amazon) : searchUrl(item.name, 'amazon');

    // Mercado Livre — aplica UTM de afiliado; fallback para busca
    item.linkML = lk.ml ? mlAff(lk.ml, item.id) : searchUrl(item.name, 'ml');

    // Shopee — aplica UTM de afiliado; fallback para link direto ou busca
    item.linkShopee = lk.shopee ? shopeeAff(lk.shopee, item.id) : (item.shopee || searchUrl(item.name, 'shopee'));

    processed++;
  });
  console.info(`[links.js] ${processed} itens com links diretos, ${skipped} com fallback de busca.`);
}
