// ══════════════ DATA ══════════════
// ─────────────── APP VERSION ───────────────
const APP_VERSION = '15.1'; 
// ───────────────────────────────────────────

// ─────────────── TERMS DATES ───────────────
function getTermsUpdatedDate() {
  return "Maio de 2024"; // Data fixa da última revisão real do documento
}

function getTermsRevisionDate() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
// ───────────────────────────────────────────

const CAT={
  Adaptógeno:{cls:'cA',ico:'🌿'},Aminoácido:{cls:'cAm',ico:'⚡'},
  Hormônio:{cls:'cH',ico:'🧬'},Mineral:{cls:'cM',ico:'💎'},
  Antioxidante:{cls:'cAx',ico:'🛡'},Vegetal:{cls:'cV',ico:'🥗'},
  Estimulante:{cls:'cE',ico:'☕'},Desempenho:{cls:'cP',ico:'🏋️'},
  Cognição:{cls:'cF',ico:'🧠'},Imunidade:{cls:'cI',ico:'🛡️'},
  Sono:{cls:'cF',ico:'🌙'},Mulher:{cls:'cH',ico:'♀️'},
  Digestão:{cls:'cV',ico:'🦠'},Articulações:{cls:'cG',ico:'🦴'},
  Metabolismo:{cls:'cP',ico:'🔥'},Longevidade:{cls:'cAx',ico:'⏳'},
  'Saúde Geral':{cls:'cG',ico:'❤️'},Extra:{cls:'cX',ico:'✨'},
};
const GOAL_MAP={
  hipertrofia:[11,12,13,14,15,16,17,33,40,44],
  gordura:[13,12,3,22,37,38,39,54],
  energia:[13,4,20,18,22,1,45,48,55],
  saude:[10,23,24,25,26,27,28,35,36,41,42,47,49,52,56],
  libido:[1,2,4,5,6,7,9,29,30,31,32,34],
  sono:[9,22,24,43,46,50,51],
  mulher:[34,41,42,47,49,52,53],
  digestao:[35,36,48],
  articulacoes:[40,44,56],
  metabolismo:[37,38,39,54,55],
  longevidade:[25,28,45,52,56],
};
const PRIO={alta:0,media:1,baixa:2,extra:3};
const PLBL={alta:'Alta Prioridade',media:'Média Prioridade',baixa:'Baixa Prioridade',extra:'Extras Opcionais'};
const PCLS={alta:'da',media:'dm',baixa:'db',extra:'de'};

const AFF={
  amazonTag:'suplilist-20',
  mlLabel:'suplilist',
  mlCreatine:'https://meli.la/2xQTHcw',
};
function amazonAff(url) {
  try{
    const u=new URL(url);
    if(u.hostname.includes('amazon.')){
      u.searchParams.set('tag',AFF.amazonTag);
      u.searchParams.set('linkCode','ll2');
      u.searchParams.set('ref_','as_li_ss_tl');
    }
    return u.toString();
  }catch(e){return url;}
}
function mlAff(url, itemId = 'suplilist') {
  if (!url) return '';
  try{
    const u=new URL(url);
    if(u.hostname.includes('meli.la')) return u.toString();
    u.searchParams.set('utm_source','suplilist');
    u.searchParams.set('utm_medium','affiliate');
    u.searchParams.set('utm_campaign','mercadolivre');
    u.searchParams.set('utm_content', String(itemId));
    u.searchParams.set('label',AFF.mlLabel);
    return u.toString();
  }catch(e){return url;}
}
function shopeeAff(url, itemId = 'suplilist') {
  if (!url) return '';
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source',   'shopee');
    u.searchParams.set('utm_medium',   'affiliate');
    u.searchParams.set('utm_campaign', 'suplilist');
    u.searchParams.set('utm_content',  String(itemId));
    return u.toString();
  } catch(e) { return url; }
}
function utm(url, src, med, camp, content) {
  if (!url) return '';
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source',   src);
    u.searchParams.set('utm_medium',   med);
    u.searchParams.set('utm_campaign', camp);
    if (content !== undefined) u.searchParams.set('utm_content', String(content));
    return u.toString();
  } catch(e) { return url; }
}
function searchUrl(name, mkt) {
  const q = encodeURIComponent(name);
  if (mkt === 'shopee')  return `https://shopee.com.br/search?keyword=${q}`;
  if (mkt === 'ml')      return `https://lista.mercadolivre.com.br/${q.replace(/%20/g,'+')}`;
  if (mkt === 'amazon')  return `https://www.amazon.com.br/s?k=${q}`;
  return '';
}
function mlPrice(i){return i.mlp||Math.round((i.pm||20)*1.08);}
function azPrice(i){return i.azp||Math.round((i.pm||20)*1.18);}
function bestMarketplacePrice(i){return Math.min(mlPrice(i),azPrice(i));}

// URL base apontando para o seu repositório no GitHub (versão Raw)
const BASE_URL = "assets/";

// O restante do seu código (SUPPLEMENTS_DATA, etc) continua igual abaixo...
const IT=[
{id:1,name:'Maca Peruana Preta em pó',qty:'150g',buy:'1kg',cat:'Adaptógeno',pr:'alta',sc:5,pm:45,doses:30,tags:['libido','energia','fertilidade','hormônio'],goals:['libido'],dm:'2g',dn:null,dc:true,dp:false,cy:null,badge:'best',desc:'A Maca Preta é a variedade mais rara e potente. Rica em glucosinolatos e aminoácidos, atua no eixo hipotálamo-hipófise-gonadal. Aumenta libido sem alterar diretamente a testosterona. Melhora qualidade espermática e reduz fadiga adrenal.',warn:'Evitar em hipotireoidismo sem acompanhamento.',dose:'2–3g/dia com comida. Efeito em 2–4 semanas.',shopee:'https://shopee.com.br/search?keyword=maca+peruana+preta+po',ml:'https://lista.mercadolivre.com.br/maca-peruana-po-1-kg',az:'https://www.amazon.com.br/s?k=maca+peruana+preta+po'},
{id:2,name:'Feno-grego em pó',qty:'120g',buy:'1kg',cat:'Hormônio',pr:'alta',sc:4,pm:30,doses:40,tags:['testosterona','libido','insulina','aromatase'],goals:['libido'],dm:'2g',dn:'2g',dc:true,dp:false,cy:null,badge:null,desc:'Furostanólicos saponins inibem a aromatase, reduzindo conversão de testosterona em estrogênio. Estudos mostram aumento mensurável de testosterona livre em 8 semanas.',warn:'Pode interagir com anticoagulantes.',dose:'2–3g, 2x/dia com refeições.',shopee:'https://shopee.com.br/search?keyword=feno+grego+po',ml:'https://lista.mercadolivre.com.br/feno-grego-po',az:'https://www.amazon.com.br/s?k=feno+grego+po'},
{id:3,name:'L-Citrulina em pó',qty:'120g',buy:'500g',cat:'Aminoácido',pr:'alta',sc:5,pm:80,doses:13,tags:['vasodilatação','ereção','bomba muscular','NO'],goals:['libido','gordura'],dm:null,dn:'6g',dc:false,dp:true,cy:null,badge:'best',desc:'Precursor mais eficaz de L-Arginina, eleva óxido nítrico de forma sustentada. Relaxa musculatura vascular, melhora fluxo sanguíneo e performance.',warn:null,dose:'6–8g, 30–45min antes do treino.',shopee:'https://shopee.com.br/search?keyword=l+citrulina+po',ml:'https://lista.mercadolivre.com.br/l-citrulina-1-kg',az:'https://www.amazon.com.br/s?k=l-citrulina+po'},
{id:4,name:'Ashwagandha KSM-66',qty:'120g',buy:'extrato',cat:'Adaptógeno',pr:'alta',sc:5,pm:60,doses:40,tags:['testosterona','cortisol','ansiedade','sono'],goals:['libido','energia','sono'],dm:'300mg',dn:'300mg',dc:true,dp:false,cy:{max:90,pausa:30},badge:'hot',desc:'KSM-66 com ≥5% withanolídeos. Reduz cortisol em 30%, eleva testosterona em 15–17%. Melhora sono, qualidade espermática e ansiedade.',warn:'Pode causar sonolência. Evitar em hipertireoidismo.',dose:'300–600mg, 1–2x/dia com refeição. Ciclar: 3 meses.',shopee:'https://shopee.com.br/search?keyword=ashwagandha+ksm-66',ml:'https://lista.mercadolivre.com.br/ashwagandha-ksm-66',az:'https://www.amazon.com.br/s?k=ashwagandha+ksm-66'},
{id:5,name:'Tongkat Ali extrato pó',qty:'100g',buy:'100g+',cat:'Adaptógeno',pr:'alta',sc:5,pm:80,doses:50,tags:['testosterona livre','SHBG','libido','ereção'],goals:['libido'],dm:'200mg',dn:null,dc:false,dp:false,cy:{max:90,pausa:30},badge:'hot',desc:'Euricomanona estimula células de Leydig a produzir testosterona e inibe SHBG, aumentando fração livre ativa. Maior evidência para testosterona livre entre naturais.',warn:'Não usar mais de 3 meses sem pausa.',dose:'200–400mg/dia em jejum. Ciclar: 3 meses.',shopee:'https://shopee.com.br/search?keyword=tongkat+ali+extrato',ml:'https://lista.mercadolivre.com.br/tongkat-ali-po',az:'https://www.amazon.com.br/s?k=tongkat+ali+po'},
{id:6,name:'Boron (citrato) em pó',qty:'10g',buy:'50g',cat:'Mineral',pr:'media',sc:5,pm:30,doses:100,tags:['testosterona livre','SHBG','vitamina D'],goals:['libido'],dm:'6mg',dn:null,dc:true,dp:false,cy:null,badge:'val',desc:'10mg/dia por 7 dias: SHBG −9%, testosterona livre +28%, estradiol −39%. Melhor custo-benefício para testosterona livre.',warn:'Dose máxima: 10mg/dia. NUNCA use ácido bórico industrial.',dose:'6–10mg/dia com refeição.',shopee:'https://shopee.com.br/search?keyword=boro+citrato+suplemento',ml:'https://lista.mercadolivre.com.br/boro-suplemento-po',az:'https://www.amazon.com.br/s?k=boro+citrato+suplemento'},
{id:7,name:'Mucuna Pruriens extrato pó',qty:'60g',buy:'100g+',cat:'Aminoácido',pr:'media',sc:4,pm:40,doses:20,tags:['dopamina','prolactina','testosterona'],goals:['libido'],dm:'400mg',dn:null,dc:false,dp:false,cy:null,badge:null,desc:'Principal fonte natural de L-DOPA, precursora da dopamina. Ao elevar dopamina, suprime prolactina — que em excesso reduz testosterona e causa DE.',warn:'NÃO combinar com IMAO. Iniciar com dose baixa.',dose:'300–500mg/dia em jejum.',shopee:'https://shopee.com.br/search?keyword=mucuna+pruriens+po',ml:'https://lista.mercadolivre.com.br/mucuna-pruriens-po',az:'https://www.amazon.com.br/s?k=mucuna+pruriens+po'},
{id:8,name:'Zinco bisglicinato em pó',qty:'30g',buy:'100g+',cat:'Mineral',pr:'media',sc:5,pm:30,doses:40,tags:['testosterona','fertilidade','imunidade'],goals:['libido','saude'],dm:'25mg',dn:null,dc:true,dp:false,cy:null,badge:'val',desc:'Cofator essencial da testosterona sintase. O bisglicinato tem biodisponibilidade 2–3× maior que o sulfato.',warn:'Doses >40mg/dia por meses podem causar deficiência de cobre.',dose:'15–30mg/dia com refeição.',shopee:'https://shopee.com.br/search?keyword=zinco+bisglicinato+po',ml:'https://lista.mercadolivre.com.br/zinco-bisglicinato-po',az:'https://www.amazon.com.br/s?k=zinco+bisglicinato'},
{id:9,name:'Magnésio glicinato em pó',qty:'80g',buy:'200g+',cat:'Mineral',pr:'media',sc:5,pm:40,doses:20,tags:['testosterona','sono','SHBG','cortisol'],goals:['libido','saude','sono'],dm:null,dn:'400mg',dc:true,dp:false,cy:null,badge:'best',desc:'Cofator em 600+ reações enzimáticas. Reduz SHBG, melhora sono profundo e reduz cortisol. Estudo: +24% testosterona livre em 4 semanas.',warn:null,dose:'300–500mg/dia, preferencialmente à noite.',shopee:'https://shopee.com.br/search?keyword=magnesio+glicinato+po',ml:'https://lista.mercadolivre.com.br/magnesio-glicinato-po',az:'https://www.amazon.com.br/s?k=magnesio+glicinato'},
{id:10,name:'Vitamina D3 + K2 (MK-7)',qty:'—',buy:'frasco',cat:'Saúde Geral',pr:'media',sc:5,pm:30,doses:60,tags:['testosterona','imunidade','ossos'],goals:['libido','saude'],dm:'5000UI',dn:null,dc:true,dp:false,cy:null,badge:'best',desc:'D3 é pró-hormônio esteróide. Deficiência reduz testosterona diretamente. Estudos: +25% testosterona em deficientes após 12 meses. K2 direciona cálcio para os ossos.',warn:'Dosar 25-OH vitamina D antes de doses altas.',dose:'5.000–10.000 UI D3 + 100–200mcg K2/dia com refeição gordurosa.',shopee:'https://shopee.com.br/search?keyword=vitamina+d3+k2+mk7',ml:'https://lista.mercadolivre.com.br/vitamina-d3-k2',az:'https://www.amazon.com.br/s?k=vitamina+d3+k2+mk7'},
{id:11,name:'Creatina Monohidratada',qty:'300g',buy:'1kg',cat:'Desempenho',pr:'alta',sc:5,pm:50,mlp:78,azp:89,doses:60,tags:['força','músculo','ATP','massa'],goals:['hipertrofia'],dm:'5g',dn:null,dc:true,dp:false,cy:null,badge:'hot',desc:'O suplemento esportivo mais estudado. 500+ estudos clínicos. Aumenta força +5–15%, massa magra e potência. Também melhora cognição. Segura para uso contínuo.',warn:'Hidratação extra fundamental.',dose:'5g/dia com qualquer refeição.',shopee:'https://shopee.com.br/search?keyword=creatina+monohidratada',ml:'https://meli.la/2xQTHcw',az:'https://www.amazon.com.br/Creatina-Monohidratada-Dark-Lab-Pureza/dp/B0CF71CJ2L?__mk_pt_BR=%C3%85M%C3%85%C5%BD%C3%95%C3%91&crid=VHMSIGSKE2UR&dib=eyJ2IjoiMSJ9.vVtLvYEtkbEAm_mC20XuXKzFQMPLrSJ4TThxHQwBuYutXvigR7O1NIax1q6ibAQHfNdkSoDYbrpFYgl-DG5H78b6Niu1XxlKEFpRBwULVE1LGaakHm80NDb0pEmfh1JBD8_lQAaRmguQFVoSbri0YMWZ4Uxb6FfL3XbfMHDU2kyK4Goae0TJRrXEIY4ibU0i_Ky0DPCwRIn7oO4eYFoqsX8KpTn7pe6gJByzJI3zty4fcSx29bnLsrS3ojLnNL-B-_pLQ0mz-y4Zf3SkYQ3euQbZHqV7cXiZBIb_t5K2-EA.3jJzUGlsK133MBFJDD9ixCrbQzabFfPuxk7EMXrmqjQ&dib_tag=se&keywords=creatina&qid=1778731343&sprefix=creatin%2Caps%2C228&sr=8-9&th=1&linkCode=ll2&tag=suplilist-20&linkId=33b139a141e7897860f4dbdcc067d422&ref_=as_li_ss_tl'},
{id:12,name:'Beta-Alanina em pó',qty:'200g',buy:'500g',cat:'Desempenho',pr:'media',sc:4,pm:40,doses:62,tags:['carnosina','endurance','fadiga muscular'],goals:['hipertrofia','gordura'],dm:'3.2g',dn:null,dc:false,dp:true,cy:null,badge:null,desc:'Precursora da carnosina muscular, que tamponeia o ácido lático. Meta-análise: melhora 2,85% em performance de endurance.',warn:'Causa formigamento temporário. Inofensivo.',dose:'3,2g/dia dividido em 2 doses. Antes do treino.',shopee:'https://shopee.com.br/search?keyword=beta+alanina+po',ml:'https://lista.mercadolivre.com.br/beta-alanina-po',az:'https://www.amazon.com.br/s?k=beta+alanina+po'},
{id:13,name:'Cafeína + L-Teanina',qty:'50g',buy:'100g',cat:'Estimulante',pr:'media',sc:5,pm:35,doses:50,tags:['energia','foco','performance','sinergismo'],goals:['energia','gordura'],dm:'200mg+200mg',dn:null,dc:false,dp:true,cy:null,badge:'hot',desc:'A combinação mais estudada para performance cognitiva e física. Cafeína melhora força e foco. Teanina elimina ansiedade e prolonga clareza mental.',warn:'Evitar após 14h. Não usar em gravidez.',dose:'100–200mg cafeína + 100–200mg Teanina, 30–45min antes do treino.',shopee:'https://shopee.com.br/search?keyword=cafeina+po+suplemento',ml:'https://lista.mercadolivre.com.br/cafeina-po',az:'https://www.amazon.com.br/s?k=cafeina+anidra+po'},
{id:14,name:'HMB (β-Hidroxi β-Metilbutirato)',qty:'100g',buy:'200g',cat:'Desempenho',pr:'baixa',sc:4,pm:60,doses:33,tags:['anti-catabólico','músculo','recuperação'],goals:['hipertrofia'],dm:'3g',dn:null,dc:true,dp:false,cy:null,badge:null,desc:'Metabólito da leucina que inibe degradação muscular. Especialmente eficaz para iniciantes, idosos e em déficit calórico.',warn:null,dose:'1–1.5g, 3x/dia com refeições.',shopee:'https://shopee.com.br/search?keyword=hmb+suplemento',ml:'https://lista.mercadolivre.com.br/hmb-suplemento',az:'https://www.amazon.com.br/s?k=hmb+suplemento'},
{id:15,name:'Whey Protein Isolado',qty:'—',buy:'1kg+',cat:'Desempenho',pr:'alta',sc:5,pm:90,doses:33,tags:['síntese proteica','leucina','recuperação','massa'],goals:['hipertrofia'],dm:'30g',dn:null,dc:true,dp:false,cy:null,badge:'hot',desc:'Proteína com perfil de aminoácidos completo, rico em leucina (gatilho da síntese proteica). >90% proteína, sem lactose. Otimiza ganho de massa.',warn:'Isolado para intolerantes à lactose.',dose:'20–40g por porção. Priorizar pós-treino.',shopee:'https://shopee.com.br/search?keyword=whey+protein+isolado',ml:'https://lista.mercadolivre.com.br/whey+protein',az:'https://www.amazon.com.br/s?k=whey+protein+isolado'},
{id:16,name:'EAA (Aminoácidos Essenciais)',qty:'200g',buy:'500g',cat:'Aminoácido',pr:'media',sc:4,pm:70,doses:20,tags:['síntese proteica','anabolismo','catabolismo'],goals:['hipertrofia'],dm:'10g',dn:null,dc:false,dp:true,cy:null,badge:null,desc:'Todos os 9 aminoácidos essenciais. Superiores aos BCAAs sozinhos para síntese proteica.',warn:null,dose:'10g durante ou pós-treino.',shopee:'https://shopee.com.br/search?keyword=eaa+aminoacidos+essenciais',ml:'https://lista.mercadolivre.com.br/eaa+aminoacidos',az:'https://www.amazon.com.br/s?k=eaa+aminoacidos+essenciais'},
{id:17,name:'Ecdisterona (20-hidroxiecdisona)',qty:'60g',buy:'100g',cat:'Desempenho',pr:'media',sc:4,pm:80,doses:40,tags:['anabolismo não hormonal','síntese proteica','músculo'],goals:['hipertrofia'],dm:'500mg',dn:null,dc:true,dp:false,cy:null,badge:'val',desc:'Fitoesteroide do espinafre. Ativa síntese proteica via receptor estrogênico beta sem suprimir hormônios. Estudo: +7kg de massa magra vs placebo em 10 semanas.',warn:'Comprar de fontes com padronização certificada.',dose:'400–500mg/dia com refeição.',shopee:'https://shopee.com.br/search?keyword=ecdisterona+suplemento',ml:'https://lista.mercadolivre.com.br/ecdisterona',az:'https://www.amazon.com.br/s?k=ecdisterona+20-hidroxiecdisona'},
{id:18,name:"Lion's Mane extrato pó",qty:'60g',buy:'100g+',cat:'Cognição',pr:'alta',sc:5,pm:70,doses:40,tags:['NGF','neuroplasticidade','memória','cognição'],goals:['energia'],dm:'1g',dn:null,dc:true,dp:false,cy:null,badge:'hot',desc:'Hericenones e erinacinas estimulam produção de NGF (Fator de Crescimento Nervoso). Melhora cognição, memória e concentração em 8–12 semanas.',warn:null,dose:'500mg–1g/dia pela manhã.',shopee:'https://shopee.com.br/search?keyword=lions+mane+juba+de+leao',ml:'https://lista.mercadolivre.com.br/lions-mane-cogumelo',az:'https://www.amazon.com.br/s?k=lions+mane+extrato'},
{id:19,name:'Bacopa Monnieri extrato',qty:'60g',buy:'100g+',cat:'Cognição',pr:'alta',sc:5,pm:50,doses:33,tags:['memória','aprendizado','ansiedade','bacosídeos'],goals:['energia'],dm:'300mg',dn:null,dc:true,dp:false,cy:null,badge:'best',desc:'Bacosídeos A e B aumentam acetilcolina e protegem neurônios. Meta-análises confirmam melhora na memória de longo prazo. Efeito acumula em 8–12 semanas.',warn:'Pode causar desconforto gástrico sem alimento.',dose:'300mg/dia com refeição gordurosa. Padronizar ≥45% bacosídeos.',shopee:'https://shopee.com.br/search?keyword=bacopa+monnieri+po',ml:'https://lista.mercadolivre.com.br/bacopa-monnieri',az:'https://www.amazon.com.br/s?k=bacopa+monnieri+extrato'},
{id:20,name:'Rhodiola Rosea extrato',qty:'50g',buy:'100g+',cat:'Cognição',pr:'media',sc:5,pm:60,doses:30,tags:['fadiga mental','estresse','foco','adaptógeno'],goals:['energia'],dm:'300mg',dn:null,dc:false,dp:false,cy:{max:90,pausa:30},badge:null,desc:'Adaptógeno com rosavinas que reduzem cortisol e melhoram resistência ao estresse mental. Efeito rápido (1–2 dias) ao contrário da Bacopa.',warn:'Estimulante suave — evitar à noite.',dose:'300–600mg/dia em jejum. Ciclar: 3 meses.',shopee:'https://shopee.com.br/search?keyword=rhodiola+rosea+extrato',ml:'https://lista.mercadolivre.com.br/rhodiola-rosea',az:'https://www.amazon.com.br/s?k=rhodiola+rosea+extrato'},
{id:21,name:'Alpha-GPC em pó',qty:'30g',buy:'50g+',cat:'Cognição',pr:'media',sc:5,pm:80,doses:26,tags:['acetilcolina','memória','foco','GH'],goals:['energia'],dm:'300mg',dn:null,dc:true,dp:false,cy:null,badge:'best',desc:'Precursor de colina mais biodisponível (40% colina elementar). Eleva acetilcolina no cérebro, principal neurotransmissor da memória. Também estimula GH.',warn:'Doses >1g podem causar dores de cabeça.',dose:'300–600mg/dia com refeição.',shopee:'https://shopee.com.br/search?keyword=alpha+gpc+po',ml:'https://lista.mercadolivre.com.br/alpha-gpc',az:'https://www.amazon.com.br/s?k=alpha+gpc+suplemento'},
{id:22,name:'L-Teanina em pó',qty:'50g',buy:'100g+',cat:'Cognição',pr:'media',sc:5,pm:30,doses:50,tags:['foco','relaxamento','ondas alfa','ansiedade'],goals:['energia','gordura','sono'],dm:'200mg',dn:'200mg',dc:false,dp:false,cy:null,badge:'val',desc:'Aminoácido do chá verde que aumenta ondas alfa cerebrais. Relaxamento alerta sem sedação. Excelente para trabalho intelectual.',warn:null,dose:'100–200mg, 1–2x/dia. Combinar com cafeína 1:1.',shopee:'https://shopee.com.br/search?keyword=l+teanina+po',ml:'https://lista.mercadolivre.com.br/l-teanina-po',az:'https://www.amazon.com.br/s?k=l-teanina+po'},
{id:23,name:'Ômega-3 EPA+DHA',qty:'—',buy:'120caps',cat:'Saúde Geral',pr:'alta',sc:5,pm:50,doses:60,tags:['cardio','inflamação','cognição','triglicerídeos'],goals:['saude'],dm:'2g EPA+DHA',dn:null,dc:true,dp:false,cy:null,badge:'hot',desc:'EPA e DHA fundamentais para saúde cardiovascular, neurológica e articular. Reduzem triglicerídeos em até 45% e inflamação sistêmica.',warn:'Evitar com anticoagulantes sem orientação.',dose:'2–4g de EPA+DHA/dia com refeição gordurosa.',shopee:'https://shopee.com.br/search?keyword=omega+3+epa+dha',ml:'https://lista.mercadolivre.com.br/omega-3-epa-dha',az:'https://www.amazon.com.br/s?k=omega+3+epa+dha+concentrado'},
{id:24,name:'Magnésio Treonato em pó',qty:'80g',buy:'200g+',cat:'Cognição',pr:'media',sc:5,pm:70,doses:80,tags:['cognição','sono profundo','plasticidade sináptica'],goals:['saude','energia','sono'],dm:'1g',dn:'1g',dc:true,dp:false,cy:null,badge:'best',desc:'Única forma de magnésio que cruza a barreira hematoencefálica. Aumenta densidade de sinapses no hipocampo. Estudo MIT: reverteu déficits cognitivos.',warn:null,dose:'1g manhã + 1g noite com refeição.',shopee:'https://shopee.com.br/search?keyword=magnesio+treonato',ml:'https://lista.mercadolivre.com.br/magnesio-treonato',az:'https://www.amazon.com.br/s?k=magnesio+treonato'},
{id:25,name:'Coenzima Q10 (Ubiquinol)',qty:'—',buy:'60caps',cat:'Saúde Geral',pr:'baixa',sc:4,pm:80,doses:60,tags:['mitocôndria','ATP','cardio','antioxidante'],goals:['saude'],dm:'100mg',dn:null,dc:true,dp:false,cy:null,badge:null,desc:'Componente essencial da cadeia respiratória mitocondrial. Também poderoso antioxidante. Essencial para quem usa estatinas.',warn:'Se usar estatinas, CoQ10 é quase obrigatório.',dose:'100–200mg/dia com refeição gordurosa. Preferir ubiquinol.',shopee:'https://shopee.com.br/search?keyword=coq10+ubiquinol+suplemento',ml:'https://lista.mercadolivre.com.br/coq10-ubiquinol',az:'https://www.amazon.com.br/s?k=coq10+ubiquinol'},
{id:26,name:'Beta-Glucana de Cogumelos',qty:'30g',buy:'60g',cat:'Imunidade',pr:'media',sc:5,pm:60,doses:60,tags:['imunidade','macrófagos','NK cells'],goals:['saude'],dm:'500mg',dn:null,dc:true,dp:false,cy:null,badge:'best',desc:'Beta-glucanas 1,3-D ativam macrófagos, células NK e citocinas imunes. Meta-análises: redução de infecções respiratórias em 25–50%.',warn:null,dose:'500mg–1g/dia com refeição.',shopee:'https://shopee.com.br/search?keyword=beta+glucana+cogumelo',ml:'https://lista.mercadolivre.com.br/beta-glucana',az:'https://www.amazon.com.br/s?k=beta+glucana+1-3+d'},
{id:27,name:'Vitamina C Tamponada em pó',qty:'200g',buy:'500g',cat:'Imunidade',pr:'media',sc:4,pm:25,doses:100,tags:['imunidade','colágeno','antioxidante'],goals:['saude'],dm:'1g',dn:null,dc:true,dp:false,cy:null,badge:'val',desc:'Ascorbato de sódio ou cálcio — mesma eficácia sem acidez. Cofatora da síntese de colágeno, ativa neutrófilos e interferons.',warn:null,dose:'500mg–2g/dia. Em infecção: 2–4g divididos.',shopee:'https://shopee.com.br/search?keyword=vitamina+c+tamponada+po',ml:'https://lista.mercadolivre.com.br/vitamina-c-tamponada-po',az:'https://www.amazon.com.br/s?k=vitamina+c+tamponada'},
{id:28,name:'Quercetina Fitossomada',qty:'30g',buy:'60g',cat:'Imunidade',pr:'baixa',sc:4,pm:70,doses:60,tags:['anti-inflamatório','antiviral','AMPK'],goals:['saude'],dm:'500mg',dn:null,dc:true,dp:false,cy:null,badge:null,desc:'Flavonoide antiviral com biodisponibilidade 20× superior à comum. Inibe replicação de vírus RNA, potencializa zinco intracelular e ativa AMPK.',warn:null,dose:'500mg, 1–2x/dia com refeição.',shopee:'https://shopee.com.br/search?keyword=quercetina+fitossomada',ml:'https://lista.mercadolivre.com.br/quercetina-fitossomada',az:'https://www.amazon.com.br/s?k=quercetina+fitossomada'},
{id:29,name:'Catuaba extrato pó',qty:'60g',buy:'100g+',cat:'Extra',pr:'extra',sc:4,pm:25,doses:20,tags:['libido','ereção','dopamina'],goals:['libido'],dm:'300mg',dn:null,dc:false,dp:false,cy:null,badge:null,desc:'Catuabinas A, B e C atuam nos neurônios dopaminérgicos e noradrenérgicos. Melhora libido, excitação e qualidade das ereções.',warn:null,dose:'300–500mg/dia em jejum.',shopee:'https://shopee.com.br/search?keyword=catuaba+extrato+po',ml:'https://lista.mercadolivre.com.br/catuaba-po-extrato',az:'https://www.amazon.com.br/s?k=catuaba+extrato+po'},
{id:30,name:'Marapuama (Muira Puama)',qty:'60g',buy:'100g+',cat:'Extra',pr:'extra',sc:4,pm:20,doses:20,tags:['ereção','libido','neurológico'],goals:['libido'],dm:'500mg',dn:null,dc:false,dp:false,cy:null,badge:null,desc:'A "madeira da potência" amazônica. Atua no sistema nervoso autônomo facilitando resposta erétil. Estudo: melhora em 51% dos casos de DE.',warn:null,dose:'500mg–1g/dia. Poderoso combinado com Catuaba.',shopee:'https://shopee.com.br/search?keyword=marapuama+po',ml:'https://lista.mercadolivre.com.br/marapuama-po',az:'https://www.amazon.com.br/s?k=marapuama+muira+puama'},
{id:31,name:'Saw Palmetto extrato pó',qty:'60g',buy:'100g+',cat:'Extra',pr:'extra',sc:3,pm:30,doses:18,tags:['DHT','próstata','5-alfa-redutase'],goals:['libido'],dm:'320mg',dn:null,dc:true,dp:false,cy:null,badge:null,desc:'Inibe a 5-alfa-redutase tipo 1 e 2, reduzindo conversão excessiva de testosterona em DHT. Usado para saúde prostática.',warn:null,dose:'320mg/dia com refeição.',shopee:'https://shopee.com.br/search?keyword=saw+palmetto+extrato',ml:'https://lista.mercadolivre.com.br/saw-palmetto-extrato',az:'https://www.amazon.com.br/s?k=saw+palmetto+extrato'},
{id:32,name:'Panax Ginseng extrato pó',qty:'70g',buy:'100g+',cat:'Extra',pr:'extra',sc:4,pm:60,doses:46,tags:['ereção','energia','cognição','NO'],goals:['libido','energia'],dm:'300mg',dn:null,dc:true,dp:false,cy:{max:90,pausa:30},badge:null,desc:'Ginsenosídeos estimulam síntese de NO no endotélio vascular. Estudos: melhora na função erétil após 8 semanas. Também melhora energia e cognição.',warn:'Pode causar insônia se tomado à noite.',dose:'200–400mg/dia pela manhã. Ciclar: 3 meses.',shopee:'https://shopee.com.br/search?keyword=panax+ginseng+extrato',ml:'https://lista.mercadolivre.com.br/panax-ginseng-po',az:'https://www.amazon.com.br/s?k=panax+ginseng+po'},
{id:33,name:'Taurina em pó',qty:'200g',buy:'500g',cat:'Aminoácido',pr:'media',sc:5,pm:35,doses:100,tags:['hidratação celular','coração','performance','calma'],goals:['hipertrofia','energia'],dm:'1g',dn:'1g',dc:false,dp:false,cy:null,badge:'val',desc:'Aminoácido sulfurado envolvido em contração muscular, eletrólitos, função cardíaca e sistema nervoso. Útil tanto para treino quanto para relaxamento.',warn:'Pode reduzir levemente a pressão em pessoas sensíveis.',dose:'1–3g/dia dividido em 1–2 tomadas.',shopee:'https://shopee.com.br/search?keyword=taurina+po',ml:'https://lista.mercadolivre.com.br/taurina-po',az:'https://www.amazon.com.br/s?k=taurina+po'},
{id:34,name:'Shatavari extrato',qty:'60g',buy:'100g+',cat:'Mulher',pr:'media',sc:4,pm:55,doses:60,tags:['mulher','libido','ciclo','adaptógeno'],goals:['mulher','libido'],dm:'500mg',dn:null,dc:true,dp:false,cy:{max:90,pausa:30},badge:null,desc:'Adaptógeno tradicionalmente usado para suporte feminino, bem-estar no ciclo e libido. Mais indicado para rotina de longo prazo do que efeito imediato.',warn:'Evitar em gestação, lactação ou condições sensíveis a estrogênio sem orientação.',dose:'500mg–1g/dia com refeição.',shopee:'https://shopee.com.br/search?keyword=shatavari+extrato',ml:'https://lista.mercadolivre.com.br/shatavari',az:'https://www.amazon.com.br/s?k=shatavari+extrato'},
{id:35,name:'Probiótico multi-cepas',qty:'—',buy:'30caps',cat:'Digestão',pr:'media',sc:4,pm:65,doses:30,tags:['microbiota','intestino','imunidade'],goals:['digestao','saude'],dm:'1 cáps',dn:null,dc:true,dp:false,cy:null,badge:null,desc:'Cepas de Lactobacillus e Bifidobacterium ajudam a modular microbiota, regularidade intestinal e barreira imune. Melhor quando combinado com fibras prebióticas.',warn:'Imunossuprimidos devem usar apenas com orientação médica.',dose:'1 cápsula/dia com refeição por 4–8 semanas.',shopee:'https://shopee.com.br/search?keyword=probiotico+multicepas',ml:'https://lista.mercadolivre.com.br/probiotico-multicepas',az:'https://www.amazon.com.br/s?k=probiotico+multicepas'},
{id:36,name:'Psyllium Husk em pó',qty:'300g',buy:'500g',cat:'Digestão',pr:'alta',sc:5,pm:35,doses:60,tags:['fibra','saciedade','colesterol','intestino'],goals:['digestao','saude'],dm:'5g',dn:null,dc:false,dp:false,cy:null,badge:'best',desc:'Fibra solúvel que forma gel, melhora trânsito intestinal, saciedade e perfil lipídico. Um dos melhores custos-benefícios para saúde digestiva.',warn:'Tomar com bastante água e afastar 2h de medicamentos.',dose:'5–10g/dia com 300–500ml de água.',shopee:'https://shopee.com.br/search?keyword=psyllium+husk+po',ml:'https://lista.mercadolivre.com.br/psyllium-husk',az:'https://www.amazon.com.br/s?k=psyllium+husk'},
{id:37,name:'Berberina HCL',qty:'—',buy:'60caps',cat:'Metabolismo',pr:'alta',sc:5,pm:70,doses:60,tags:['glicemia','insulina','AMPK','metabolismo'],goals:['metabolismo','gordura'],dm:'500mg',dn:'500mg',dc:true,dp:false,cy:null,badge:'hot',desc:'Ativa AMPK e melhora sensibilidade à insulina. Muito usada para suporte de glicemia, composição corporal e perfil lipídico.',warn:'Pode potencializar antidiabéticos. Evitar em gestação e lactação.',dose:'500mg, 1–2x/dia com refeições.',shopee:'https://shopee.com.br/search?keyword=berberina+hcl',ml:'https://lista.mercadolivre.com.br/berberina-hcl',az:'https://www.amazon.com.br/s?k=berberina+hcl'},
{id:38,name:'Cromo Picolinato',qty:'—',buy:'120caps',cat:'Metabolismo',pr:'media',sc:4,pm:30,doses:120,tags:['glicemia','compulsão','insulina'],goals:['metabolismo','gordura'],dm:'200mcg',dn:null,dc:true,dp:false,cy:null,badge:'val',desc:'Mineral traço envolvido na sinalização da insulina. Pode ajudar controle de vontade por doces em pessoas com baixa ingestão de cromo.',warn:'Diabéticos devem monitorar glicemia.',dose:'200–400mcg/dia com refeição.',shopee:'https://shopee.com.br/search?keyword=cromo+picolinato',ml:'https://lista.mercadolivre.com.br/cromo-picolinato',az:'https://www.amazon.com.br/s?k=cromo+picolinato'},
{id:39,name:'EGCG Chá Verde extrato',qty:'60g',buy:'100g+',cat:'Vegetal',pr:'media',sc:4,pm:50,doses:100,tags:['termogênico','antioxidante','metabolismo'],goals:['metabolismo','gordura'],dm:'300mg',dn:null,dc:true,dp:false,cy:null,badge:null,desc:'Catequina do chá verde com ação antioxidante e apoio discreto ao gasto energético. Funciona melhor junto com dieta e treino.',warn:'Evitar em jejum se houver sensibilidade gástrica ou histórico hepático.',dose:'300–500mg/dia com refeição.',shopee:'https://shopee.com.br/search?keyword=egcg+cha+verde+extrato',ml:'https://lista.mercadolivre.com.br/egcg-cha-verde',az:'https://www.amazon.com.br/s?k=egcg+green+tea'},
{id:40,name:'Colágeno Peptídeos Verisol/Fortigel',qty:'300g',buy:'500g',cat:'Articulações',pr:'media',sc:4,pm:75,doses:60,tags:['tendão','pele','articulação','colágeno'],goals:['articulacoes','mulher','hipertrofia'],dm:'5g',dn:null,dc:true,dp:false,cy:null,badge:null,desc:'Peptídeos bioativos de colágeno apoiam síntese de matriz extracelular, pele, tendões e articulações. Melhor com vitamina C.',warn:null,dose:'5–10g/dia com fonte de vitamina C.',shopee:'https://shopee.com.br/search?keyword=colageno+peptideos+verisol+fortigel',ml:'https://lista.mercadolivre.com.br/colageno-verisol-fortigel',az:'https://www.amazon.com.br/s?k=colageno+verisol+fortigel'},
{id:41,name:'Ferro Bisglicinato',qty:'—',buy:'60caps',cat:'Mulher',pr:'media',sc:5,pm:35,doses:60,tags:['ferritina','energia','mulher','anemia'],goals:['mulher','saude'],dm:'18mg',dn:null,dc:true,dp:false,cy:null,badge:null,desc:'Forma quelada melhor tolerada para corrigir baixa ingestão ou ferritina baixa. Especialmente relevante em mulheres com fluxo menstrual intenso.',warn:'Usar preferencialmente após exames de ferritina/hemograma. Ferro em excesso é prejudicial.',dose:'18–27mg/dia, conforme exames, longe de cálcio e café.',shopee:'https://shopee.com.br/search?keyword=ferro+bisglicinato',ml:'https://lista.mercadolivre.com.br/ferro-bisglicinato',az:'https://www.amazon.com.br/s?k=ferro+bisglicinato'},
{id:42,name:'Cranberry extrato',qty:'—',buy:'60caps',cat:'Mulher',pr:'media',sc:4,pm:45,doses:60,tags:['trato urinário','PACs','mulher'],goals:['mulher','saude'],dm:'500mg',dn:null,dc:true,dp:false,cy:null,badge:null,desc:'Proantocianidinas do cranberry reduzem adesão bacteriana no trato urinário. Mais útil como prevenção recorrente do que tratamento agudo.',warn:'Não substitui antibiótico em infecção urinária ativa.',dose:'500mg/dia ou produto padronizado para 36mg de PACs.',shopee:'https://shopee.com.br/search?keyword=cranberry+extrato',ml:'https://lista.mercadolivre.com.br/cranberry-extrato',az:'https://www.amazon.com.br/s?k=cranberry+extrato'},
{id:43,name:'Melatonina',qty:'—',buy:'60caps',cat:'Sono',pr:'media',sc:4,pm:25,doses:60,tags:['sono','ritmo circadiano','jet lag'],goals:['sono'],dm:null,dn:'0.5mg',dc:false,dp:false,cy:null,badge:'val',desc:'Hormônio sinalizador do escuro. Útil para ajuste de horário, jet lag e dificuldade de iniciar o sono, especialmente em dose baixa.',warn:'Pode causar sonolência residual. Evitar dirigir após uso.',dose:'0,3–1mg, 30–60min antes de dormir.',shopee:'https://shopee.com.br/search?keyword=melatonina',ml:'https://lista.mercadolivre.com.br/melatonina',az:'https://www.amazon.com.br/s?k=melatonina'},
{id:44,name:'Glucosamina + Condroitina',qty:'—',buy:'120caps',cat:'Articulações',pr:'media',sc:4,pm:80,doses:40,tags:['cartilagem','joelho','artrose'],goals:['articulacoes','hipertrofia'],dm:'1500mg',dn:null,dc:true,dp:false,cy:null,badge:null,desc:'Combinação clássica para suporte de cartilagem e conforto articular, com melhor resposta em uso contínuo por 8–12 semanas.',warn:'Atenção em alergia a crustáceos e uso de anticoagulantes.',dose:'1500mg glucosamina + 1200mg condroitina/dia.',shopee:'https://shopee.com.br/search?keyword=glucosamina+condroitina',ml:'https://lista.mercadolivre.com.br/glucosamina-condroitina',az:'https://www.amazon.com.br/s?k=glucosamina+condroitina'},
{id:45,name:'NAC (N-Acetilcisteína)',qty:'—',buy:'60caps',cat:'Antioxidante',pr:'alta',sc:5,pm:55,doses:60,tags:['glutationa','fígado','antioxidante','respiratório'],goals:['saude','longevidade','energia'],dm:'600mg',dn:null,dc:true,dp:false,cy:null,badge:'best',desc:'Precursor de glutationa, principal antioxidante intracelular. Apoia fígado, vias respiratórias e defesa contra estresse oxidativo.',warn:'Pode interagir com nitroglicerina e anticoagulantes.',dose:'600–1200mg/dia com refeição.',shopee:'https://shopee.com.br/search?keyword=nac+n+acetilcisteina',ml:'https://lista.mercadolivre.com.br/nac-acetilcisteina',az:'https://www.amazon.com.br/s?k=nac+n+acetilcisteina'},
{id:46,name:'Glicina em pó',qty:'200g',buy:'500g',cat:'Sono',pr:'media',sc:5,pm:35,doses:66,tags:['sono profundo','colágeno','temperatura corporal'],goals:['sono'],dm:null,dn:'3g',dc:false,dp:false,cy:null,badge:'best',desc:'Aminoácido com efeito calmante e suporte à qualidade subjetiva do sono. Também participa da síntese de colágeno e glutationa.',warn:null,dose:'3g, 30–60min antes de dormir.',shopee:'https://shopee.com.br/search?keyword=glicina+po',ml:'https://lista.mercadolivre.com.br/glicina-po',az:'https://www.amazon.com.br/s?k=glycine+powder'},
{id:47,name:'Inositol Myo + D-Chiro',qty:'200g',buy:'300g',cat:'Mulher',pr:'alta',sc:5,pm:90,doses:60,tags:['SOP','insulina','ciclo','ovulação'],goals:['mulher','saude'],dm:'2g',dn:'2g',dc:false,dp:false,cy:null,badge:'hot',desc:'Combinação muito usada em SOP para sensibilidade à insulina, regularidade menstrual e suporte ovulatório. Relação comum 40:1 de myo para d-chiro.',warn:'Acompanhamento é recomendado em tentativas de gestação ou uso de medicamentos.',dose:'2g myo-inositol 2x/dia + d-chiro em proporção 40:1.',shopee:'https://shopee.com.br/search?keyword=myo+inositol+d+chiro',ml:'https://lista.mercadolivre.com.br/myo-inositol-d-chiro',az:'https://www.amazon.com.br/s?k=myo+inositol+d+chiro'},
{id:48,name:'Spirulina em pó',qty:'200g',buy:'500g',cat:'Vegetal',pr:'baixa',sc:4,pm:40,doses:80,tags:['proteína vegetal','micronutrientes','saciedade'],goals:['saude','energia','digestao'],dm:'3g',dn:null,dc:true,dp:false,cy:null,badge:null,desc:'Microalga rica em proteínas, ficocianina e micronutrientes. Pode apoiar saciedade e ingestão de nutrientes em dietas restritivas.',warn:'Comprar de marcas testadas para metais pesados e microcistinas.',dose:'3–5g/dia com refeição.',shopee:'https://shopee.com.br/search?keyword=spirulina+po',ml:'https://lista.mercadolivre.com.br/spirulina-po',az:'https://www.amazon.com.br/s?k=spirulina+po'},
{id:49,name:'Cálcio Citrato + D3',qty:'—',buy:'120caps',cat:'Mulher',pr:'media',sc:4,pm:45,doses:60,tags:['ossos','menopausa','densidade óssea'],goals:['mulher','saude'],dm:'500mg',dn:null,dc:true,dp:false,cy:null,badge:null,desc:'Cálcio citrato tem boa tolerância gástrica e apoia saúde óssea quando a ingestão alimentar é insuficiente. Melhor junto com D3/K2 e treino de força.',warn:'Evitar excesso se houver cálculo renal ou hipercalcemia.',dose:'500mg/dia se a dieta não atingir a meta; dividir se usar mais.',shopee:'https://shopee.com.br/search?keyword=calcio+citrato+d3',ml:'https://lista.mercadolivre.com.br/calcio-citrato-d3',az:'https://www.amazon.com.br/s?k=calcio+citrato+d3'},
{id:50,name:'Valeriana extrato',qty:'60g',buy:'100g+',cat:'Sono',pr:'baixa',sc:4,pm:35,doses:60,tags:['relaxamento','ansiedade','sono'],goals:['sono'],dm:null,dn:'500mg',dc:false,dp:false,cy:null,badge:null,desc:'Fitoterápico sedativo leve, mais útil para tensão e despertares. Pode ser combinado com magnésio ou glicina.',warn:'Não combinar com álcool, sedativos ou direção noturna.',dose:'400–600mg, 30–60min antes de dormir.',shopee:'https://shopee.com.br/search?keyword=valeriana+extrato',ml:'https://lista.mercadolivre.com.br/valeriana-extrato',az:'https://www.amazon.com.br/s?k=valeriana+extrato'},
{id:51,name:'Apigenina',qty:'30g',buy:'60g',cat:'Sono',pr:'media',sc:4,pm:65,doses:60,tags:['camomila','GABA','relaxamento'],goals:['sono'],dm:null,dn:'50mg',dc:false,dp:false,cy:null,badge:null,desc:'Flavonoide da camomila com ação relaxante via receptores GABAérgicos. Boa opção para rotina de sono sem forte sedação.',warn:'Evitar com sedativos sem orientação.',dose:'25–50mg à noite.',shopee:'https://shopee.com.br/search?keyword=apigenina',ml:'https://lista.mercadolivre.com.br/apigenina',az:'https://www.amazon.com.br/s?k=apigenin'},
{id:52,name:'Resveratrol Trans',qty:'—',buy:'60caps',cat:'Longevidade',pr:'baixa',sc:4,pm:70,doses:60,tags:['sirtuínas','antioxidante','vascular'],goals:['longevidade','mulher','saude'],dm:'250mg',dn:null,dc:true,dp:false,cy:null,badge:null,desc:'Polifenol antioxidante ligado a sinalização de sirtuínas e saúde vascular. Uso mais interessante em stacks de envelhecimento saudável.',warn:'Pode interagir com anticoagulantes.',dose:'150–300mg/dia com refeição gordurosa.',shopee:'https://shopee.com.br/search?keyword=resveratrol+trans',ml:'https://lista.mercadolivre.com.br/resveratrol-trans',az:'https://www.amazon.com.br/s?k=trans+resveratrol'},
{id:53,name:'Óleo de Prímula',qty:'—',buy:'120caps',cat:'Mulher',pr:'baixa',sc:3,pm:40,doses:60,tags:['TPM','pele','GLA','mulher'],goals:['mulher'],dm:'1g',dn:null,dc:true,dp:false,cy:null,badge:null,desc:'Fonte de GLA, usado para conforto pré-menstrual e saúde da pele. Evidência é variável, mas pode ajudar subgrupos.',warn:'Evitar com anticoagulantes ou epilepsia sem orientação.',dose:'1–2g/dia com refeição.',shopee:'https://shopee.com.br/search?keyword=oleo+de+primula',ml:'https://lista.mercadolivre.com.br/oleo-de-primula',az:'https://www.amazon.com.br/s?k=oleo+de+primula'},
{id:54,name:'L-Carnitina L-Tartarato',qty:'200g',buy:'500g',cat:'Metabolismo',pr:'baixa',sc:4,pm:70,doses:100,tags:['recuperação','metabolismo de gordura','andrógenos'],goals:['metabolismo','gordura'],dm:'2g',dn:null,dc:true,dp:true,cy:null,badge:null,desc:'Participa do transporte de ácidos graxos e tem dados para recuperação muscular. Efeito em perda de gordura é modesto e depende do contexto.',warn:'Pode causar desconforto gastrointestinal em dose alta.',dose:'1–2g/dia com refeição ou pré-treino.',shopee:'https://shopee.com.br/search?keyword=l+carnitina+l+tartarato',ml:'https://lista.mercadolivre.com.br/l-carnitina-l-tartarato',az:'https://www.amazon.com.br/s?k=l+carnitine+l+tartrate'},
{id:55,name:'Tirosina em pó',qty:'100g',buy:'200g',cat:'Aminoácido',pr:'media',sc:4,pm:45,doses:100,tags:['dopamina','foco','estresse','tireoide'],goals:['energia','metabolismo'],dm:'500mg',dn:null,dc:false,dp:true,cy:null,badge:null,desc:'Precursora de dopamina, noradrenalina e hormônios tireoidianos. Ajuda desempenho cognitivo sob estresse, privação de sono ou frio.',warn:'Evitar com IMAO e cautela em hipertireoidismo.',dose:'500mg–2g antes de demanda mental ou treino.',shopee:'https://shopee.com.br/search?keyword=l+tirosina+po',ml:'https://lista.mercadolivre.com.br/l-tirosina-po',az:'https://www.amazon.com.br/s?k=l+tyrosine+powder'},
{id:56,name:'Curcumina Fitossomada',qty:'—',buy:'60caps',cat:'Antioxidante',pr:'media',sc:5,pm:75,doses:60,tags:['inflamação','articulação','antioxidante'],goals:['articulacoes','saude','longevidade'],dm:'500mg',dn:null,dc:true,dp:false,cy:null,badge:'best',desc:'Forma de curcumina com maior biodisponibilidade. Apoia controle inflamatório, conforto articular e defesa antioxidante.',warn:'Evitar com anticoagulantes ou antes de cirurgias sem orientação.',dose:'500–1000mg/dia com refeição.',shopee:'https://shopee.com.br/search?keyword=curcumina+fitossomada',ml:'https://lista.mercadolivre.com.br/curcumina-fitossomada',az:'https://www.amazon.com.br/s?k=curcumin+phytosome'},
];

// Criamos o objeto de imagens dinamicamente baseado nos itens existentes
const SUPP_IMGS = {};
IT.forEach(item => {
  SUPP_IMGS[item.id] = `${BASE_URL}suplemento_${item.id}.png`;
});

const INTERACT=[

// ══════════════════════════════════════════════
// 🚫 PERIGOS — COMBINAÇÕES CONTRAINDICADAS
// ══════════════════════════════════════════════

{type:'danger',ico:'🚫',title:'Mucuna Pruriens + IMAO / Antidepressivos',
 desc:'L-DOPA eleva dopamina abruptamente; com IMAOs o metabolismo da dopamina é bloqueado → síndrome serotoninérgica e crise hipertensiva com risco de vida. Contraindicação absoluta.'},

{type:'danger',ico:'🚫',title:'Cafeína + Efedrina ou Sinefrina',
 desc:'Ambos estimulam sistema adrenérgico simultaneamente → taquicardia grave, hipertensão aguda e risco de evento cardíaco. Nunca combinar independente de dose.'},

{type:'danger',ico:'🚫',title:'Berberina + Metformina / Hipoglicemiantes',
 desc:'Berberina imita e potencializa a ação da Metformina na AMPK → hipoglicemia grave (glicose < 54 mg/dL). Médico deve ajustar a dose dos medicamentos antes de introduzir berberina.'},

{type:'danger',ico:'🚫',title:'Mucuna Pruriens + Carbidopa / Levodopa',
 desc:'Mucuna é fonte natural de L-DOPA. Combinada com Carbidopa farmacêutica, a dose de L-DOPA torna-se imprevisível, causando discinesias e picos dopaminérgicos perigosos.'},

{type:'danger',ico:'🚫',title:'Ferro + Vitamina E (doses altas)',
 desc:'Ferro livre catalisa produção de radicais livres via reação de Fenton; vitamina E em megadose pode desestabilizar essa reação gerando estresse oxidativo paradoxal. Separar por no mínimo 4 horas.'},

{type:'danger',ico:'🚫',title:'Valeriana + Álcool ou Benzodiazepínicos',
 desc:'Ambos potencializam receptores GABA-A. A combinação causa sedação excessiva, depressão respiratória e amnésia. Não usar na mesma janela de tempo.'},

{type:'danger',ico:'🚫',title:'Tirosina + IMAO',
 desc:'Tirosina é convertida em catecolaminas cujo metabolismo é bloqueado pelos IMAOs → crise hipertensiva tiramínica ("efeito queijo"). Contraindicada em usuários de IMAOs.'},

{type:'danger',ico:'🚫',title:'Ashwagandha + Medicamentos para Tireoide',
 desc:'Withanolídeos estimulam síntese de T3 e T4. Em hipotireoidismo tratado com levotiroxina, pode causar hipertireoidismo iatrogênico. Acompanhamento endocrinológico obrigatório.'},

{type:'danger',ico:'🚫',title:'Ômega-3 + Anticoagulantes (Warfarina/Xarelto)',
 desc:'EPA/DHA inibem agregação plaquetária sinergisticamente com anticoagulantes → risco de sangramento grave. Doses > 2g EPA+DHA exigem INR monitorado e ajuste médico.'},

{type:'danger',ico:'🚫',title:'Curcumina Fitossomada + Anticoagulantes',
 desc:'Curcumina inibe COX-2 e tromboxano A2 somando-se ao efeito anticoagulante → risco de hemorragia, especialmente cirúrgica. Suspender 2 semanas antes de procedimentos.'},

{type:'danger',ico:'🚫',title:'Resveratrol + Anticoagulantes',
 desc:'Resveratrol inibe CYP2C9, enzima que metaboliza Warfarina → nível plasmático do anticoagulante sobe inesperadamente. Monitoramento de INR é imprescindível.'},

{type:'danger',ico:'🚫',title:'NAC + Nitroglicerina / Nitratos',
 desc:'NAC potencializa vasodilatação dos nitratos → hipotensão severa, cefaleia intensa e risco de síncope. Contraindicação de bula estabelecida.'},

{type:'danger',ico:'🚫',title:'Inositol (altas doses) + Lítio',
 desc:'Inositol interfere diretamente no mecanismo de ação do lítio (via inositol-1-fosfatase) podendo comprometer o tratamento de transtorno bipolar. Psiquiatra deve ser consultado.'},

// ══════════════════════════════════════════════
// ⚠️ ALERTAS — COMBINAÇÕES QUE EXIGEM CAUTELA
// ══════════════════════════════════════════════

{type:'warn',ico:'⚠️',title:'Tongkat Ali + Anticoagulantes',
 desc:'Euricomanona pode potencializar efeito anticoagulante e reduzir agregação plaquetária. Monitorar com médico se usar Warfarina, AAS ou Xarelto.'},

{type:'warn',ico:'⚠️',title:'Ashwagandha + Sedativos / Ansiolíticos',
 desc:'Ação sedativa aditiva com benzodiazepínicos e barbitúricos. Pode intensificar sonolência e diminuir tempo de reação. Ajustar dose com médico.'},

{type:'warn',ico:'⚠️',title:'Boron > 10 mg/dia — Toxicidade Acumulativa',
 desc:'O limite seguro de boro é 10 mg/dia. Doses > 20 mg causam náusea, diarreia e toxicidade reprodutiva. NUNCA usar ácido bórico industrial; verificar dose total entre suplementos.'},

{type:'warn',ico:'⚠️',title:'Cafeína após 14h — Sabotagem do Sono',
 desc:'Meia-vida da cafeína é 5–7h. Uso após 14h reduz sono profundo (N3) em até 20% mesmo sem dificuldade de adormecer percebida. Evitar se o objetivo inclui recuperação ou hormônios.'},

{type:'warn',ico:'⚠️',title:'Zinco > 40 mg/dia — Depleção de Cobre',
 desc:'Zinco em excesso compete com cobre na absorção intestinal. Deficiência de cobre causa anemia, neuropatia e disfunção imune. Suplementar 1–2 mg de cobre se usar mais de 40 mg/dia de zinco por > 4 semanas.'},

{type:'warn',ico:'⚠️',title:'Ferro + Cálcio / Laticínios',
 desc:'Cálcio inibe a absorção de ferro não-heme em até 60%. Nunca tomar ferro junto com leite, queijo ou suplemento de cálcio. Separar no mínimo 2 horas.'},

{type:'warn',ico:'⚠️',title:'Ferro + Café / Chá / Cacau',
 desc:'Polifenóis e taninos do café, chá preto e cacau quelam o ferro reduzindo a absorção em até 70%. Consumir ferro longe dessas bebidas.'},

{type:'warn',ico:'⚠️',title:'Psyllium + Medicamentos Orais',
 desc:'Fibra forma gel viscoso que pode reduzir absorção de qualquer medicamento. Tomar psyllium pelo menos 2 horas separado de remédios, levotiroxina ou outros suplementos críticos.'},

{type:'warn',ico:'⚠️',title:'EGCG Chá Verde em Jejum — Toxicidade Hepática',
 desc:'Extrato de chá verde concentrado tomado em jejum ou em doses acima de 800 mg/dia associa-se a hepatotoxicidade em casos raros. Usar com refeição e dentro das doses recomendadas.'},

{type:'warn',ico:'⚠️',title:'Rhodiola Rosea + Estimulantes (Cafeína, Sinefrina)',
 desc:'Rhodiola tem efeito estimulante suave via monoaminas. Combinada a cafeína, pode causar nervosismo excessivo, irritabilidade e insônia. Monitorar resposta individual.'},

{type:'warn',ico:'⚠️',title:'Alpha-GPC > 1g/dia — Risco Cardiovascular Emergente',
 desc:'Dados preliminares (JAMA 2021) sugerem que colina em excesso gera TMAO, associado a risco cardiovascular. Manter dose ≤ 600 mg/dia e não empilhar com outras fontes de colina (ovos + lecitina + CDP-colina).'},

{type:'warn',ico:'⚠️',title:'Magnésio + Antibióticos (Quinolonas / Tetraciclinas)',
 desc:'Magnésio e outros divalentes quelam antibióticos reduzindo absorção em até 90%. Separar por no mínimo 2 horas do Ciprofloxacino, Doxiciclina e similares.'},

{type:'warn',ico:'⚠️',title:'Melatonina + Imunossupressores',
 desc:'Melatonina é imunomoduladora: pode contrariar imunossupressores (Ciclosporina, Tacrolimus). Pacientes transplantados devem evitar sem autorização médica.'},

{type:'warn',ico:'⚠️',title:'Saw Palmetto + Anticoagulantes / AAS',
 desc:'Inibidores da 5-alfa-redutase podem reduzir agregação plaquetária. Combinado com anticoagulantes ou AAS aumenta risco de sangramento. Avisar médico antes de procedimentos.'},

{type:'warn',ico:'⚠️',title:'Panax Ginseng + Anticoagulantes / Hipoglicemiantes',
 desc:'Ginsenosídeos têm ação leve anticoagulante e hipoglicemiante. Pode potencializar Warfarina, AAS e insulina. Monitorar glicemia e INR.'},

{type:'warn',ico:'⚠️',title:'Panax Ginseng + Cafeína (Insônia)',
 desc:'Ginseng tem ação estimulante própria. Combinado com cafeína tarde do dia causa estimulação excessiva e insônia. Usar apenas pela manhã.'},

{type:'warn',ico:'⚠️',title:'CoQ10 + Quimioterapia',
 desc:'CoQ10 é antioxidante e pode, em teoria, proteger células tumorais do estresse oxidativo induzido por certas quimioterapias. Oncologista deve ser consultado antes de usar durante tratamento.'},

{type:'warn',ico:'⚠️',title:'Probiótico + Imunossupressores / Pós-cirurgia',
 desc:'Probióticos introduzem bactérias vivas. Em imunossuprimidos, pós-transplante ou pós-cirurgia abdominal recente, existe risco de translocação bacteriana e infecção sistêmica.'},

{type:'warn',ico:'⚠️',title:'Berberina + Gestação / Lactação',
 desc:'Berberina atravessa a barreira placentária e é excretada no leite. Associada a icterícia neonatal e possíveis efeitos sobre o feto. Contraindicada em grávidas e lactantes.'},

{type:'warn',ico:'⚠️',title:'Feno-grego + Anticoagulantes',
 desc:'Feno-grego contém cumarinas naturais que somam efeito anticoagulante. Risco aumentado de sangramento com Warfarina, heparina ou AAS em dose anticoagulante.'},

{type:'warn',ico:'⚠️',title:'L-Carnitina + Hipotireoidismo Não Tratado',
 desc:'Carnitina antagoniza ação dos hormônios tireoidianos nos tecidos periféricos. Pode agravar hipotireoidismo. Evitar ou monitorar TSH se houver disfunção tireoidiana.'},

{type:'warn',ico:'⚠️',title:'Vitamina D3 > 10.000 UI/dia sem Exame',
 desc:'Hipervitaminose D causa hipercalcemia (náusea, confusão, calcificação de tecidos moles). Dosar 25-OH vitamina D antes e a cada 3 meses se usar doses altas. Nunca suplementar no escuro.'},

{type:'warn',ico:'⚠️',title:'Maca Peruana + Hipotireoidismo',
 desc:'Glucosinolatos da maca podem interferir na síntese de hormônios tireoidianos em pessoas com tireoidite de Hashimoto ou hipotireoidismo. Acompanhamento com endocrinologista.'},

{type:'warn',ico:'⚠️',title:'Glucosamina + Anticoagulantes',
 desc:'Glucosamina pode potencializar Warfarina, aumentando INR de forma imprevisível. Monitorar coagulação ao iniciar ou encerrar o suplemento.'},

{type:'warn',ico:'⚠️',title:'Quercetina + Ciclosporina / Inibidores CYP3A4',
 desc:'Quercetina inibe CYP3A4 e P-glicoproteína, elevando concentração plasmática de imunossupressores e de algumas estatinas. Médico deve ajustar doses.'},

{type:'warn',ico:'⚠️',title:'Shatavari + Terapia Hormonal (estrogênio exógeno)',
 desc:'Shatavari tem ação fitoestrogênica. Combinado com TH estrogênica pode causar estimulação excessiva do receptor. Oncologistas contraindicam em cânceres hormônio-dependentes.'},

{type:'warn',ico:'⚠️',title:'Óleo de Prímula + Antiepilépticos (Fenitoína)',
 desc:'GLA do óleo de prímula pode reduzir o limiar convulsivo e diminuir eficácia da Fenitoína. Evitar ou monitorar em epilepsia.'},

{type:'warn',ico:'⚠️',title:'Beta-Alanina em Dose Única Alta — Parestesia',
 desc:'Dose única > 1,6g causa formigamento (flush) intenso que pode ser desconfortável. Dividir em doses de 0,8–1,6g para minimizar o efeito. Inofensivo, mas esperado.'},

{type:'warn',ico:'⚠️',title:'Spirulina + Imunossupressores',
 desc:'Spirulina estimula sistema imune (NK cells, citocinas). Pode contrabalançar imunossupressores em transplantados ou pacientes com doenças autoimunes graves.'},

{type:'warn',ico:'⚠️',title:'Bacopa Monnieri + Medicamentos Colinérgicos',
 desc:'Bacopa inibe acetilcolinesterase aumentando acetilcolina. Combinada com donepezila ou rivastigmina (Alzheimer) pode causar excesso colinérgico: bradicardia, hipersalivação, diarreia.'},

{type:'warn',ico:'⚠️',title:'Apigenina + Sedativos / Álcool',
 desc:'Apigenina se liga ao receptor GABA-A (sítio das benzodiazepinas). Combinada com sedativos ou álcool a sedação é somada. Não dirigir após uso noturno com álcool.'},

// ══════════════════════════════════════════════
// ✨ SINERGIAS VALIDADAS — COMBOS PODEROSOS
// ══════════════════════════════════════════════

{type:'info',ico:'✨',title:'Sinergia: Creatina + EAA + HMB',
 desc:'Trio anabólico de ouro: Creatina recicla ATP para força, EAA fornecem todos os aminoácidos para síntese proteica, HMB protege contra catabolismo. Stack ideal para hipertrofia.'},

{type:'info',ico:'✨',title:'Sinergia: Lion\'s Mane + Bacopa + Alpha-GPC',
 desc:'Stack cognitivo completo. Lion\'s Mane estimula NGF para neuroplasticidade, Bacopa consolida memória de longo prazo, Alpha-GPC eleva acetilcolina para foco imediato.'},

{type:'info',ico:'✨',title:'Sinergia: Cafeína + L-Teanina (1:1)',
 desc:'A combinação mais validada da ciência. Teanina elimina ansiedade e jitters da cafeína, prolonga pico de foco e suaviza a queda. Proporção ideal: 100–200 mg de cada.'},

{type:'info',ico:'✨',title:'Sinergia: Tongkat Ali + Boron + Magnésio',
 desc:'Trio hormonal completo. Tongkat Ali eleva testosterona livre, Boron reduz SHBG e estradiol, Magnésio otimiza testosterona livre noturna e qualidade do sono.'},

{type:'info',ico:'✨',title:'Sinergia: Vitamina C + Quercetina + Zinco',
 desc:'Imunidade de três camadas. Vitamina C ativa neutrófilos, Quercetina é ionóforo de zinco (facilita entrada intracelular), Zinco inibe replicação viral. Trio antiviral com base científica.'},

{type:'info',ico:'✨',title:'Sinergia: Vitamina D3 + Vitamina K2 (MK-7)',
 desc:'D3 mobiliza cálcio do intestino para o sangue; K2 ativa osteocalcina e MGP direcionando o cálcio para os ossos e evitando calcificação arterial. Nunca tomar D3 sem K2 em doses altas.'},

{type:'info',ico:'✨',title:'Sinergia: Ômega-3 + Curcumina Fitossomada',
 desc:'Dupla anti-inflamatória de vias complementares. EPA/DHA modulam resolvinas e protectinas, curcumina inibe NFkB e COX-2. Juntos potencializam redução de inflamação crônica.'},

{type:'info',ico:'✨',title:'Sinergia: Magnésio Glicinato + Glicina + Apigenina',
 desc:'Stack de sono profundo sem sedação. Magnésio apoia GABA e temperatura corporal, Glicina reduz temperatura central facilitando N3, Apigenina bloqueia ansiedade via GABA-A.'},

{type:'info',ico:'✨',title:'Sinergia: NAC + Glicina → Glutationa Endógena',
 desc:'NAC fornece cisteína e Glicina fornece o segundo aminoácido da glutationa. Juntos elevam glutationa intracelular de forma mais eficaz do que suplementação direta de GSH.'},

{type:'info',ico:'✨',title:'Sinergia: Colágeno Peptídeos + Vitamina C',
 desc:'Vitamina C é cofator obrigatório da prolil-hidroxilase, enzima que estabiliza a tripla hélice do colágeno. Sem C, o colágeno ingerido não é incorporado eficientemente. Tomar juntos.'},

{type:'info',ico:'✨',title:'Sinergia: Berberina + Quercetina',
 desc:'Berberina ativa AMPK e Quercetina inibe inflamação via NFkB. Combinação usada em protocolos de controle glicêmico e síndrome metabólica com efeito sinérgico observado em estudos.'},

{type:'info',ico:'✨',title:'Sinergia: Creatina + Beta-Alanina',
 desc:'Creatina otimiza energia anaeróbica (ATP), Beta-Alanina tamponeia ácido lático. Targets metabólicos diferentes que se complementam para performance de alta intensidade.'},

{type:'info',ico:'✨',title:'Sinergia: Rhodiola Rosea + Ashwagandha',
 desc:'Adaptógenos de ação oposta e complementar. Rhodiola é de efeito rápido (energizante/anti-fadiga), Ashwagandha é de efeito tardio (ansiolítico/anabólico). Stack adaptogênico completo.'},

{type:'info',ico:'✨',title:'Sinergia: Tirosina + Rhodiola Rosea',
 desc:'Tirosina fornece matéria-prima para catecolaminas (dopamina, noradrenalina) e Rhodiola inibe MAO-B, prolongando a vida útil dessas catecolaminas. Foco e resiliência ao estresse aprimorados.'},

{type:'info',ico:'✨',title:'Sinergia: Probiótico + Psyllium (Prebiótico)',
 desc:'Psyllium é fibra prebiótica solúvel que nutre as bactérias do probiótico, aumentando sua colonização e sobrevivência no intestino. Simbiótico perfeito.'},

{type:'info',ico:'✨',title:'Sinergia: Ashwagandha + Zinco + Vitamina D3',
 desc:'Tríade testosterona. Ashwagandha reduz cortisol e eleva LH, Zinco é cofator da testosterona sintase, D3 é pró-hormônio que ativa receptores androgênicos. Sinergia hormonal documentada.'},

{type:'info',ico:'✨',title:'Sinergia: Maca Peruana + Feno-grego',
 desc:'Dupla de libido hormonal. Maca atua no eixo hipotálamo sem alterar testosterona, Feno-grego inibe aromatase reduzindo conversão para estrogênio. Efeitos complementares.'},

{type:'info',ico:'✨',title:'Sinergia: CoQ10 + Ômega-3 (Saúde Cardiovascular)',
 desc:'CoQ10 suporta a cadeia respiratória mitocondrial do miocárdio; EPA/DHA reduzem triglicerídeos e inflamação vascular. Combinação especialmente indicada para quem usa estatinas.'},

{type:'info',ico:'✨',title:'Sinergia: Magnésio Treonato + Lion\'s Mane + Bacopa',
 desc:'Stack premium de neuroplasticidade. Magnésio Treonato aumenta densidade sináptica no hipocampo, Lion\'s Mane estimula NGF, Bacopa consolida novos padrões de memória.'},

{type:'info',ico:'✨',title:'Sinergia: Inositol + Ferro + Vitamina D3 (SOP)',
 desc:'Protocolo feminino para SOP. Inositol melhora sensibilidade à insulina e regularidade menstrual, Ferro corrige ferritina baixa, D3 regula ciclo e metabolismo. Avaliar individualmente.'},

{type:'info',ico:'✨',title:'Sinergia: Resveratrol + CoQ10 + NAC (Longevidade)',
 desc:'Stack de longevidade mitocondrial. Resveratrol ativa SIRT1 e AMPK, CoQ10 suporta respiração celular, NAC eleva glutationa. Redução de estresse oxidativo e suporte à biogênese mitocondrial.'},

{type:'info',ico:'✨',title:'Sinergia: Glucosamina + Condroitina + Colágeno + Vitamina C',
 desc:'Stack articular completo. Glucosamina e Condroitina protegem a cartilagem, Colágeno reconstrói a matriz extracelular, Vitamina C é cofator obrigatório da síntese de colágeno.'},

{type:'info',ico:'✨',title:'Sinergia: L-Citrulina + Cafeína + Beta-Alanina (Pré-treino Natural)',
 desc:'Pré-treino limpo de 3 compostos. Citrulina eleva NO (bomba/performance), Cafeína aumenta força e foco, Beta-Alanina retarda fadiga muscular. Sem estimulantes artificiais.'},

{type:'info',ico:'✨',title:'Sinergia: Spirulina + Vitamina C',
 desc:'A vitamina C aumenta a absorção do ferro vegetal (não-heme) da Spirulina em até 3 vezes. Tomar juntos em jejum otimiza a absorção de micronutrientes da microalga.'},

];

const CYCLES=[
  {name:'Ashwagandha KSM-66',  ico:'🌿', max:90,  pausa:30, cat:'Adaptógeno',  cor:'#4ade80',
   motivo:'Evitar tolerância ao efeito ansiolítico e dessensibilizar receptores de cortisol. Estudos indicam que benefícios se mantêm com uso de 90d mas declinam após isso sem pausa.',
   dica:'Na pausa, mantenha Magnésio Glicinato para suporte ao cortisol e sono.',
   refs:'Chandrasekhar et al. 2012 (Indian J Psychol Med)'},

  {name:'Tongkat Ali',         ico:'🌱', max:90,  pausa:30, cat:'Hormonal',    cor:'#facc15',
   motivo:'Prevenir downregulation do eixo HPG e manter sensibilidade do receptor androgênico. Uso contínuo acima de 3 meses sem pausa pode reduzir eficácia.',
   dica:'Pausar na semana mais leve do treino. Manter Zinco + Magnésio durante a pausa.',
   refs:'Henkel et al. 2014 (Evid Based Complement Alternat Med)'},

  {name:'Rhodiola Rosea',      ico:'🏔️', max:90,  pausa:14, cat:'Adaptógeno',  cor:'#f472b6',
   motivo:'Receptores de serotonina e dopamina precisam de reset para manter eficácia adaptogênica. Pausa curta de 14d é suficiente pela farmacocinética da rosavina.',
   dica:'Pausa curta de 14d suficiente. Manter Ashwagandha como cobertura ansiolítica.',
   refs:'Olsson et al. 2009 (Planta Med)'},

  {name:'Mucuna Pruriens',     ico:'🫘', max:60,  pausa:30, cat:'Dopaminérgico', cor:'#a78bfa',
   motivo:'L-DOPA excessiva dessensibiliza receptores D2. Pausa preserva resposta dopaminérgica e evita rebound de prolactina. NUNCA combinar com IMAOs.',
   dica:'NUNCA combinar com IMAOs. Na pausa, evite outros precursores de dopamina (tirosina em dose alta).',
   refs:'Katzenschlager et al. 2004 (J Neurol Neurosurg Psychiatry)'},

  {name:'Panax Ginseng',       ico:'🫚', max:90,  pausa:30, cat:'Adaptógeno',  cor:'#fb923c',
   motivo:'Evitar tolerância aos ginsenosídeos e possível efeito estrogênico em uso contínuo. Pausa de 30d restaura sensibilidade dos receptores.',
   dica:'Na pausa, mantenha Rhodiola como substituto adaptogênico mais leve.',
   refs:'Kennedy et al. 2004 (Psychopharmacology)'},

  {name:'Cafeína (ciclo off)',  ico:'☕', max:30,  pausa:7,  cat:'Estimulante', cor:'#f97316',
   motivo:'Dessensibilizar receptores de adenosina A1/A2A. Restaurar energia basal, qualidade do sono e sensibilidade à cafeína. Abstinência de 7d já normaliza receptores.',
   dica:'Reduzir gradualmente (50mg/dia) para evitar cefaleia de abstinência. Manter L-Teanina.',
   refs:'Bjorness & Greene 2009 (J Neurosci)'},

  {name:'Boron',               ico:'💎', max:90,  pausa:30, cat:'Mineral',     cor:'#38bdf8',
   motivo:'Precaução com acúmulo em tecidos ósseos e hepáticos. UL da OMS é 10mg/dia. Ciclos de 90d com pausa são prática conservadora recomendada.',
   dica:'Não exceder 10mg/dia. Monitorar zinco e cobre com uso prolongado.',
   refs:'Meacham et al. 1994 (Environ Health Perspect)'},

  {name:'Lion\'s Mane',        ico:'🦁', max:120, pausa:14, cat:'Cognitivo',   cor:'#c084fc',
   motivo:'Permitir reset de receptores NGF e mTOR. Ciclos longos de 120d mantêm eficácia sem tolerância aos hericenones e erinacinas.',
   dica:'Pausa curta de 14d. Manter Bacopa e Alpha-GPC como suporte cognitivo durante a pausa.',
   refs:'Mori et al. 2009 (Phytother Res)'},

  {name:'Berberina HCL',       ico:'🔥', max:60,  pausa:30, cat:'Metabólico',  cor:'#ff6b2b',
   motivo:'Prevenir adaptação da AMPK e manter a sensibilidade à insulina otimizada. Uso contínuo > 60d pode reduzir flora intestinal benéfica.',
   dica:'Na pausa, use Cromo Picolinato + Psyllium para manter o controle glicêmico.',
   refs:'Yin et al. 2008 (Metabolism); Zhang et al. 2010 (J Clin Endocrinol Metab)'},

  {name:'Melatonina',           ico:'🌙', max:30,  pausa:7,  cat:'Sono',        cor:'#4da6ff',
   motivo:'Evitar downregulation dos receptores MT1/MT2 no hipotálamo e preservar produção endógena. Uso contínuo > 30d pode bloquear sinalização circadiana natural.',
   dica:'Use apenas para ajustar ritmo ou jet lag. Na pausa, invista em higiene do sono: escuro total, temperatura < 19°C, sem telas 1h antes.',
   refs:'Brzezinski 1997 (NEJM); Auger et al. 2015 (JCSM)'},

  {name:'Rhodiola + Ashwagandha', ico:'🌿', max:60, pausa:14, cat:'Adaptógeno', cor:'#86efac',
   motivo:'Stack adaptogênico combinado exige pausa mais frequente para não saturar o eixo HPA (hipotálamo-pituitária-adrenal). Pausa de 14d a cada 60d de uso.',
   dica:'Manter apenas Magnésio e Vitamina D durante a pausa do stack.',
   refs:'Meta-análise de adaptógenos: Panossian & Wikman 2010 (Pharmaceuticals)'},

  {name:'Bacopa Monnieri',     ico:'🧠', max:90,  pausa:30, cat:'Cognitivo',   cor:'#818cf8',
   motivo:'Bacosídeos modulam sinalização colinérgica de forma cumulativa. Pausa de 30d permite avaliar retenção dos benefícios e prevenir tolerância ao efeito ansiolítico.',
   dica:'Os efeitos de memória persistem semanas após a pausa — é normal não sentir queda imediata.',
   refs:'Roodenrys et al. 2002 (Neuropsychopharmacology); Morgan & Stevens 2010 (J Altern Complement Med)'},

  {name:'Shatavari',           ico:'🌸', max:90,  pausa:30, cat:'Feminino',    cor:'#f9a8d4',
   motivo:'Atividade fitoestrogênica moderada do Shatavari exige ciclos para evitar estimulação persistente de receptores estrogênicos em mulheres com histórico hormonal sensível.',
   dica:'Na pausa, manter apenas Myo-Inositol e Magnésio para suporte hormonal feminino.',
   refs:'Bhatnagar & Sisodia 2006 (Ann Nutr Metab)'},

  {name:'EGCG Chá Verde',      ico:'🍵', max:60,  pausa:14, cat:'Metabólico',  cor:'#4ade80',
   motivo:'Extrato concentrado de EGCG em uso prolongado pode sobrecarregar vias hepáticas de detoxificação (CYP1A2). Ciclos de 60d com pausa de 14d são precaução hepática.',
   dica:'Sempre tomar com refeição. Na pausa, trocar por chá verde comum (menos catequinas).',
   refs:'Mazzanti et al. 2015 (Crit Rev Food Sci Nutr)'},

  {name:'Tirosina',            ico:'🧬', max:60,  pausa:14, cat:'Aminoácido',  cor:'#f472b6',
   motivo:'Tirosina em doses supramentares eleva catecolaminas de forma aguda. Uso contínuo > 60d pode criar dependência funcional e reduzir síntese basal de dopamina.',
   dica:'Na pausa, garantir ingestão proteica adequada (ovos, carne) como fonte natural de tirosina.',
   refs:'Neri et al. 1995 (Brain Res Bull); Deijen & Orlebeke 1994 (Brain Res Bull)'},
];

// ══════════════ REGRAS DE DOSE E RECEITA ══════════════
 const RECIPE_SYNERGIES = [
  [[13,17],'Cafeína + L-Teanina','A combinação mais validada para foco limpo sem jitters.'],
  [[4,9],'Ashwagandha + Magnésio','Potencializa relaxamento e redução de cortisol.'],
  [[5,8,26],'Tongkat Ali + Boron + Magnésio','Trio hormonal: testosterona, SHBG e sono profundo.'],
  [[18,20,24],'Lion\'s Mane + Bacopa + Alpha-GPC','Stack cognitivo completo: NGF + memória + acetilcolina.'],
  [[3,15,16],'Creatina + EAA + HMB','Trio anabólico: ATP + síntese proteica + proteção muscular.'],
  [[29,30,8],'Vitamina C + Quercetina + Zinco','Imunidade sinérgica: C+Q aumenta absorção de zinco.'],
  [[1,14],'Vitamina D3 + Vitamina K2','D3 mobiliza cálcio; K2 direciona para os ossos.'],
  [[7,56],'Ômega-3 + Curcumina','Dupla anti-inflamatória com ação complementar.'],
];

 const RECIPE_DANGERS = [
  {ids:[10],names:['mucuna'],cond:'imao',msg:'Mucuna + IMAO/antidepressivos → risco de síndrome serotoninérgica.'},
  {ids:[13],names:['cafeína'],warn:'Cafeína: evitar após 14h para não prejudicar o sono.'},
];

 const DOSE_RULES = {
  3:{min:.08,max:.1,unit:'g',byKg:true,cap:8,actScale:true},
  11:{min:.3,max:.5,unit:'g',byKg:true,cap:60,actScale:true},
  12:{min:3.2,max:6.4,unit:'g'},
  13:{min:1.5,max:3,unit:'mg',byKg:true,cap:200,stim:true},
  14:{min:3,max:5,unit:'g'},
  15:{min:.3,max:.5,unit:'g',byKg:true,cap:40,actScale:true},
  16:{min:.03,max:.038,unit:'g',byKg:true,cap:3.8},
  23:{min:20,max:40,unit:'g',actScale:true},
  45:{min:600,max:1200,unit:'mg'},
  48:{min:3,max:5,unit:'g'},
  36:{min:5,max:10,unit:'g'},
  37:{min:500,max:1000,unit:'mg'},
  40:{min:5,max:15,unit:'g',byKg:true,kgFactor:.08,cap:15},
  43:{min:.3,max:1,unit:'mg'},
  44:{text:'1500mg glucosamina + 1200mg condroitina'},
  46:{min:3,max:5,unit:'g'},
  47:{text:'2g myo-inositol + d-chiro 40:1'},
  54:{min:1,max:2,unit:'g',actScale:true},
  55:{min:7,max:20,unit:'mg',byKg:true,cap:2000,stim:true},
  56:{min:500,max:1000,unit:'mg'},
};

 const SEX_LABEL = { masculino:'Masculino', feminino:'Feminino' };

// ══════════════ ESTUDOS CIENTÍFICOS ══════════════
 const STUDIES = {
  1:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`A Maca Peruana Preta (Lepidium meyenii) é a variedade mais rara e mais estudada para função sexual e energia. Rica em glucosinolatos (especialmente glucotropaeolina), macaridina e aminoácidos essenciais. Age no eixo hipotálamo-hipofisário sem alterar níveis séricos de testosterona ou estrogênio diretamente.`,
    mecanismo:[
      {ico:'🧠',label:'Eixo HPA',val:'Modula o eixo hipotálamo-hipófise-adrenal, reduzindo marcadores de fadiga adrenal'},
      {ico:'🌱',label:'Glucosinolatos',val:'Glucotropaeolina é hidrolisado em isotiocianatos com atividade anti-estrogênica local'},
      {ico:'💊',label:'Macaridina',val:'Alcaloide exclusivo — mecanismo de ação ainda investigado para libido'},
      {ico:'⚡',label:'Energia',val:'Melhora síntese de ATP mitocondrial em células musculares e espermáticas'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2002',journal:'CNS Neurosci & Ther.',titulo:'Maca preta e libido em homens saudáveis',achado:'+42% de libido vs placebo em 12 semanas (p<0.05)',detalhe:'Estudo duplo-cego com 57 homens. Libido aumentou de forma dose-dependente com 1,5g e 3g/dia.',pmid:'12472620'},
      {tipo:'Meta-análise',ano:'2010',journal:'BMC Complementary Medicine',titulo:'Melhora de disfunção sexual e saúde espermática',achado:'Melhora significativa na motilidade e concentração espermática',detalhe:'Revisão de 4 RCTs confirmando ação na qualidade espermática sem alterar FSH, LH ou testosterona sérica.',pmid:'20691074'},
      {tipo:'RCT',ano:'2009',journal:'Andrologia',titulo:'Maca preta vs maca amarela para esperma',achado:'Maca preta (+9%) superior à amarela (+3%) para motilidade espermática',detalhe:'Comparativo direto das 3 variedades (preta, amarela, vermelha) em roedores e humanos.',pmid:'19260845'},
    ],
    seguranca:[
      {tipo:'ok',label:'Segura para uso prolongado',texto:'Estudos de 12 semanas não relatam efeitos adversos significativos em adultos saudáveis.'},
      {tipo:'warn',label:'Hipotireoidismo',texto:'Glucosinolatos podem inibir a absorção de iodo em doses muito altas. Evitar uso sem acompanhamento se há disfunção tireoidiana.'},
      {tipo:'warn',label:'Gravidez / Amamentação',texto:'Dados insuficientes de segurança. Evitar por precaução.'},
    ]
    risk_groups:[
      {grp:'Hipotireoidismo / Hashimoto',nivel:'warn',motivo:'Glucosinolatos em altas doses podem inibir absorção de iodo. Monitorar TSH com endocrinologista.'},
    ],
    common_myths:[
      {mito:'Maca aumenta testosterona',refutacao:'FALSO. Múltiplos RCTs confirmam que a maca melhora libido e fertilidade SEM alterar níveis séricos de testosterona, FSH ou LH. Age no eixo hipotálamo via fitoquímicos próprios (glucosinolatos, macaridina).'},
      {mito:'Qualquer maca funciona igual',refutacao:'FALSO. Maca preta é superior para fertilidade e energia vs maca amarela ou vermelha (estudo comparativo Andrologia 2009). A variedade importa, assim como a padronização do extrato.'},
    ],
  },
  2:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`O Feno-grego (Trigonella foenum-graecum) contém furostanólicos saponinas, incluindo a protodioscina, que inibem a enzima aromatase reduzindo a conversão de testosterona em estrogênio. Também possui atividade hipoglicemiante via galactomanana que retarda absorção de carboidratos.`,
    mecanismo:[
      {ico:'🔬',label:'Aromatase',val:'Furostanólicos saponinas inibem CYP19A1 (aromatase), preservando testosterona livre'},
      {ico:'📉',label:'SHBG',val:'Redução modesta de SHBG, aumentando fração biodisponível de testosterona'},
      {ico:'🍬',label:'Glicemia',val:'Galactomanana solúvel retarda absorção de glicose e melhora sensibilidade à insulina'},
      {ico:'💪',label:'DHT',val:'Alguns estudos sugerem efeito na conversão de 5-alfa-redutase'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2011',journal:'Phytotherapy Research',titulo:'Feno-grego e testosterona em homens ativos',achado:'+12,3% testosterona livre em 8 semanas (p<0.01)',detalhe:'60 homens, 500mg/dia de extrato padronizado. Também observou melhora em composição corporal e libido.',pmid:'21312304'},
      {tipo:'RCT',ano:'2010',journal:'Int J Sport Nutr Exercise Metab',titulo:'Força e composição corporal',achado:'+7,3% de força máxima no supino vs placebo',detalhe:'Atletas de força com 500mg/dia por 8 semanas. Redução de gordura corporal de 2,1%.', pmid:'20847729'},
      {tipo:'RCT',ano:'2017',journal:'Phytother Res',titulo:'Feno-grego e libido feminina',achado:'Melhora de +56% em pontuação de desejo sexual em 8 semanas vs placebo (p<0.01)',detalhe:'80 mulheres de 20–49 anos. 300mg 2x/dia de extrato padronizado. Melhora em excitação, lubrificação e satisfação.',pmid:'28839245'},
    ],
    seguranca:[
      {tipo:'ok',label:'Bem tolerado',texto:'Doses de 500–2.000mg/dia são geralmente seguras. GI leve ocasional.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'Pode potencializar warfarina e outros anticoagulantes. Monitoramento necessário.'},
      {tipo:'warn',label:'Alergia a amendoim/soja',texto:'Reação cruzada possível em pessoas alérgicas à família Fabaceae.'},
    ]
    risk_groups:[
      {grp:'Anticoagulantes','nivel':'warn','motivo':'Potencializa warfarina e outros. Monitorar INR.'},
      {grp:'Alergia a Fabaceae (amendoim/soja)','nivel':'warn','motivo':'Reação cruzada possível. Testar com dose mínima.'},
    ],
    common_myths:[
      {mito:'Feno-grego aumenta testosterona diretamente',refutacao:'PARCIALMENTE FALSO. Feno-grego inibe aromatase (reduz conversão T→estrogênio) e SHBG, aumentando testosterona LIVRE. Não estimula síntese testicular como o Tongkat Ali. Efeito indireto e modesto (+12% em RCT de 8 semanas).'},
      {mito:'É só tempero — sem efeito farmacológico','refutacao':'FALSO. Furostanólicos saponinas são biologicamente ativos em doses de extrato padronizado. O tempero culinário em doses culinárias não tem dose terapêutica. Extrato padronizado em 500mg é necessário.'},
    ],
  },
  3:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A L-Citrulina é um aminoácido não essencial que eleva os níveis plasmáticos de L-Arginina de forma mais eficaz que a própria L-Arginina oral (que é extensivamente metabolizada no intestino pelo primeiro passo hepático). A citrulina converte-se em arginina no rim, sendo então usada pelo endotélio vascular para sintetizar óxido nítrico (NO) via eNOS.`,
    mecanismo:[
      {ico:'💨',label:'Óxido Nítrico',val:'Precursor da arginina → eNOS → NO → vasodilatação duradoura'},
      {ico:'🏋️',label:'Bomba Muscular',val:'Aumenta delivery de O₂ e nutrientes ao músculo, reduz fadiga'},
      {ico:'❤️',label:'Fluxo Peniano',val:'Melhora função erétil via relaxamento da musculatura lisa do corpo cavernoso'},
      {ico:'⚡',label:'ATP & Lactato',val:'Participa do ciclo da ureia, reduzindo acúmulo de amônia durante exercício'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2017',journal:'J Int Soc Sports Nutr',titulo:'Citrulina malato e performance no supino',achado:'+52,92% mais repetições vs placebo (p<0.001)',detalhe:'8g de citrulina malato 1h antes do treino. 41 homens treinados. Redução de fadiga muscular confirmada.',pmid:'28615996'},
      {tipo:'RCT',ano:'2011',journal:'Urology',titulo:'L-Citrulina e disfunção erétil leve a moderada',achado:'12 de 24 pacientes (50%) melhoraram escore IIEF significativamente',detalhe:'1,5g/dia por 1 mês. Todos satisfeitos com efeito e sem efeitos adversos. Seguro e eficaz como alternativa natural.',pmid:'21195829'},
      {tipo:'Meta-análise',ano:'2020',journal:'Nutrients',titulo:'Revisão de 12 estudos sobre pressão arterial',achado:'Redução de -4,1 mmHg na PAS com suplementação de citrulina',detalhe:'Efeito especialmente pronunciado em pessoas com hipertensão. Dose eficaz: ≥3g/dia.',pmid:'33139249'},
    ],
    seguranca:[
      {tipo:'ok',label:'Excelente perfil de segurança',texto:'Considerada um dos suplementos mais seguros. Sem toxicidade reportada em doses de até 15g/dia.'},
      {tipo:'ok',label:'Sem dependência ou tolerância',texto:'Não desenvolve tolerância com uso contínuo, ao contrário de alguns vasodilatadores.'},
      {tipo:'warn',label:'Hipotensão',texto:'Em pessoas com pressão muito baixa, pode intensificar hipotensão. Monitorar.'},
    ],
    risk_groups:[
      {grp:'Hipotensão','nivel':'warn','motivo':'Citrulina eleva NO e pode intensificar hipotensão em pessoas com PA muito baixa.'},
      {grp:'Uso de inibidores de PDE5 (Viagra, Cialis)','nivel':'bad','motivo':'Combinação sinérgica perigosa de vasodilatação — pode causar queda abrupta de PA. Contraindicação relativa.'},
    ],
    common_myths:[
      {mito:'L-Arginina é superior à L-Citrulina para óxido nítrico','refutacao':'FALSO. L-Arginina oral é extensivamente catabolizada no intestino (arginase) antes de chegar à corrente sanguínea. L-Citrulina é convertida em arginina no rim com alta eficiência, gerando níveis plasmáticos de arginina 2–3× maiores que a arginina oral.'},
      {mito:'Citrulina malato é igual à L-Citrulina pura','refutacao':'PARCIALMENTE VERDADEIRO, com nuance. Malato pode contribuir com energia via ciclo de Krebs. Porém, citações de dose de "8g de citrulina malato" contêm apenas ~4g de citrulina. Para efeito equivalente, ajustar a dose de citrulina pura para 4–6g.'},
    ]
  },
  4:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A Ashwagandha (Withania somnifera) KSM-66® é o extrato de raiz mais estudado, padronizado para ≥5% de withanolídeos. Adaptógeno clássico do Ayurveda com >300 estudos publicados. Age primariamente no eixo HPA (hipotálamo-hipófise-adrenal), reduzindo cortisol e modulando o estresse oxidativo.`,
    mecanismo:[
      {ico:'📉',label:'Cortisol',val:'Reduz cortisol sérico em 27–30% via inibição do eixo HPA'},
      {ico:'⬆️',label:'Testosterona',val:'Eleva testosterona em 15–17% (indireto: via redução de cortisol e inflamação)'},
      {ico:'😴',label:'Sono',val:'Withanolídeos se ligam a receptores GABA-A, promovendo sono profundo (NREM)'},
      {ico:'🧠',label:'Neuroproteção',val:'Withaferin A inibe NF-κB e protege neurônios do estresse oxidativo'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2019',journal:'Medicine (Baltimore)',titulo:'KSM-66 e testosterona em homens com subfertilidade',achado:'+17% de testosterona e +53% de espermatozoides (p<0.0001)',detalhe:'46 homens inférteis por estresse. 300mg 2x/dia por 90 dias. Também reduziu cortisol em 27,9%.',pmid:'31728205'},
      {tipo:'RCT',ano:'2021',journal:'J Int Soc Sports Nutr',titulo:'KSM-66 e força muscular em atletas',achado:'+21,5 kg no agachamento e +5,3 kg massa magra vs placebo',detalhe:'57 homens por 8 semanas. 600mg/dia. Também melhorou VO₂ máx e recuperação muscular.',pmid:'33997059'},
      {tipo:'RCT',ano:'2012',journal:'Indian J Psychol Med',titulo:'Ashwagandha e estresse crônico',achado:'Redução de 44% no índice PSS (Perceived Stress Scale)',detalhe:'64 adultos sob estresse crônico. 300mg 2x/dia por 60 dias. Cortisol sérico reduzido em 27,9%.',pmid:'23439798'},
    ],
    seguranca:[
      {tipo:'ok',label:'Segura até 600mg/dia',texto:'KSM-66 é um dos adaptógenos com melhor documentação de segurança. Estudos de até 90 dias sem efeitos adversos.'},
      {tipo:'warn',label:'Hipertireoidismo',texto:'Pode elevar T3 e T4. Contraindicado em hipertireoidismo não tratado.'},
      {tipo:'warn',label:'Ciclagem recomendada',texto:'Ciclo de 3 meses ON / 1 mês OFF para manter sensibilidade aos withanolídeos.'},
      {tipo:'warn',label:'Sonolência',texto:'Pode causar sedação em pessoas sensíveis. Preferir horário noturno ou com refeição.'},
    ],
    common_myths:[
      {mito:'Ashwagandha aumenta diretamente a testosterona como esteroides',refutacao:'FALSO. O aumento de testosterona (~15–17%) é INDIRETO — via redução de cortisol (que suprime testosterona) e melhora do eixo HPA. Não substitui androgênios exógenos nem age em doses de levantamento.'},
      {mito:'Preciso ciclar Ashwagandha sempre',refutacao:'PRECAUÇÃO justificada. Estudos de até 90 dias mostram benefícios contínuos. Estudos além disso são escassos. O ciclo de 3 meses ON / 1 mês OFF é conservador e recomendado como boa prática, não por toxicidade demonstrada.'},
    ],
  },
  5:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`O Tongkat Ali (Eurycoma longifolia, "Longjack") é um arbusto malaio com euricomanona como principal fitoquímico ativo. Age estimulando as células de Leydig nos testículos a produzir testosterona e inibindo a proteína SHBG (Sex Hormone-Binding Globulin), aumentando a fração livre e biologicamente ativa.`,
    mecanismo:[
      {ico:'🧬',label:'Células de Leydig',val:'Euricomanona estimula diretamente a esteroidogênese nas células de Leydig'},
      {ico:'🔓',label:'SHBG',val:'Reduz SHBG, liberando mais testosterona livre biodisponível'},
      {ico:'⬆️',label:'LH / FSH',val:'Pode aumentar LH hipofisário, estimulando produção testicular'},
      {ico:'💪',label:'Masa Muscular',val:'Reduz cortisol e melhora síntese proteica por ação anabólica indireta'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2012',journal:'Phytother Res',titulo:'Tongkat Ali e testosterona em homens com deficiência androgênica',achado:'+37% testosterona total; 90,8% normalizaram nível abaixo do limite',detalhe:'76 homens com hipogonadismo tardio. 200mg/dia por 1 mês. Melhora do bem-estar geral e função sexual.',pmid:'22234243'},
      {tipo:'RCT',ano:'2014',journal:'J Int Soc Sports Nutr',titulo:'Tongkat Ali e composição corporal em atletas',achado:'+4,6 kg de massa magra e -8,9% gordura corporal',detalhe:'Ciclistas de resistência. 400mg/dia por 5 semanas. Redução de cortisol e melhora do ratio T:C (testosterona:cortisol).',pmid:'24721741'},
      {tipo:'Revisão sistemática',ano:'2021',journal:'Healthcare',titulo:'Revisão de 11 estudos sobre testosterona',achado:'11 de 11 estudos relataram melhora em algum parâmetro androgênico',detalhe:'Análise abrangente confirmando eficácia de extratos padronizados 1:200 a 200mg/dia.',pmid:'34828448'},
    ],
    seguranca:[
      {tipo:'ok',label:'Bem tolerado em ciclos de 3 meses',texto:'Extratos padronizados (1:200) são seguros. Evitar uso prolongado sem pausa.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'Alguns componentes podem ter atividade anticoagulante leve. Monitorar com médico.'},
      {tipo:'warn',label:'Hormônio-sensível',texto:'Não usar com cânceres hormônio-dependentes ou condições de excesso androgênico.'},
    ]
    risk_groups:[
      {grp:'Cânceres hormônio-dependentes','nivel':'bad','motivo':'Eleva testosterona livre — contraindicado em câncer de próstata hormônio-sensível.'},
      {grp:'Anticoagulantes','nivel':'warn','motivo':'Componentes podem ter leve atividade anticoagulante. Monitorar com médico.'},
    ],
    common_myths:[
      {mito:'Tongkat Ali age como um TRT natural completo',refutacao:'FALSO. Tongkat Ali melhora testosterona livre em homens com DEFICIÊNCIA androgênica (hipogonadismo tardio) — efeito limitado a +37% em déficits. Em homens com testosterona normal, o efeito é modesto. Não substitui TRT médica em hipogonadismo clinicamente diagnosticado.'},
      {mito:'Pode tomar continuamente sem pausa','refutacao':'FALSO. Uso contínuo &gt;3 meses sem pausa pode causar downregulation do eixo HPG. Ciclo 3 meses ON / 1 mês OFF é padrão recomendado.'},
    ],
  },
  6:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`O Boro (Boron) é um oligoelemento traço com efeitos profundos no metabolismo hormonal. O mecanismo mais estudado é a inibição da SHBG (Sex Hormone-Binding Globulin) — a proteína que "sequestra" a testosterona, tornando-a inativa. Também potencializa a vitamina D3 e o magnésio.`,
    mecanismo:[
      {ico:'🔓',label:'SHBG',val:'10mg em 7 dias: SHBG −9%, testosterona livre +28%'},
      {ico:'🌞',label:'Vitamina D',val:'Reduz catabolismo da vitamina D, aumentando 25-OH D3 circulante'},
      {ico:'📉',label:'Estradiol',val:'Reduz estradiol sérico em até 39% sem suprimir testosterona total'},
      {ico:'🦴',label:'Ossos',val:'Potencializa ação do cálcio e magnésio no metabolismo ósseo'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2011',journal:'J Trace Elem Med Biol',titulo:'10mg de Boron e hormônios esteroides em 7 dias',achado:'Testosterona livre +28,3%; SHBG −9%; Estradiol −39% (p<0.05)',detalhe:'8 homens saudáveis. 10mg/dia por apenas 7 dias. Resultado rápido e expressivo na fração livre.',pmid:'21129941'},
      {tipo:'RCT',ano:'1987',journal:'FASEB Journal',titulo:'Boron e saúde óssea em mulheres pós-menopausais',achado:'Redução de 40% na excreção urinária de cálcio e magnésio',detalhe:'Estudo original de Nielsen que estabeleceu a importância do boro no metabolismo mineral.',pmid:''},
      {tipo:'RCT',ano:'2015',journal:'Integr Med (Encinitas)',titulo:'Boron e densidade mineral óssea e hormônios',achado:'3mg/dia por 2 semanas: +24% testosterona livre, redução de excreção urinária de cálcio e magnésio',detalhe:'Confirmação em dose fisiológica (vs 10mg). Efeito no metabolismo mineral mais pronunciado em deficientes.',pmid:'26770156'},
    ],
    seguranca:[
      {tipo:'ok',label:'Seguro até 10mg/dia',texto:'A OMS e FDA consideram 10mg/dia como limite seguro para adultos.'},
      {tipo:'bad',label:'NUNCA usar ácido bórico industrial',texto:'Ácido bórico (forma industrial) é TÓXICO e não deve ser ingerido. Usar apenas citrato/glicinato de boro alimentar.'},
      {tipo:'warn',label:'Dose máxima',texto:'Acima de 20mg/dia podem ocorrer náuseas, vômitos e danos renais. Não ultrapassar 10mg.'},
    ]
    risk_groups:[
      {grp:'Crianças (<18 anos)','nivel':'bad','motivo':'UL (Limite Superior) não estabelecido para menores. Suplementação contraindicada sem indicação médica.'},
    ],
    common_myths:[
      {mito:'Boro é apenas para ossos','refutacao':'FALSO. Além do metabolismo mineral ósseo, o boro tem impacto hormonal documentado: 10mg/dia por 7 dias eleva testosterona livre em +28%, reduz SHBG em 9% e estradiol em 39% (RCT J Trace Elem Med Biol 2011). Uma das melhores relações custo/efeito hormonal.'},
      {mito:'Qualquer fonte de boro serve','refutacao':'ATENÇÃO. Citrato ou glicinato de boro são formas alimentares seguras. Ácido bórico INDUSTRIAL é tóxico e não deve ser ingerido. Nunca comprar "ácido bórico" em farmácias de manipulação sem verificar finalidade.'},
    ],
  },
  7:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`A Mucuna Pruriens ("feijão veludo") é a fonte mais rica de L-DOPA natural (3,7–6,9% da semente). A L-DOPA é o precursor direto da dopamina, catecolamina central para motivação, prazer, libido e função motora. Ao elevar dopamina, suprime a prolactina hipofisária — que em excesso inibe a testosterona e causa disfunção erétil.`,
    mecanismo:[
      {ico:'🧠',label:'Dopamina',val:'L-DOPA → DOPA descarboxilase → Dopamina cerebral e periférica'},
      {ico:'📉',label:'Prolactina',val:'Dopamina inibe lactotrofos hipofisários → Redução de prolactina sérica'},
      {ico:'⬆️',label:'Testosterona',val:'Prolactina baixa → LH liberado → Produção testicular de testosterona'},
      {ico:'💊',label:'Antioxidante',val:'Sementes ricas em glutationa e superóxido dismutase'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2009',journal:'Fertil Steril',titulo:'Mucuna Pruriens e fertilidade masculina',achado:'+38% de testosterona e −32% de prolactina em homens inférteis',detalhe:'75 homens inférteis por estresse psicológico. 5g/dia por 3 meses. Também melhorou qualidade do sêmen.',pmid:'18973898'},
      {tipo:'Estudo clínico',ano:'2008',journal:'Evid Based Complement Alternat Med',titulo:'Perfil de L-DOPA e efeitos neuroendócrinos',achado:'Eleva dopamina cerebral com perfil mais suave que L-DOPA farmacêutica',detalhe:'Efeito anabólico indireto via GH (dopamina estimula pulsos de hormônio do crescimento).',pmid:'18784825'},
      {tipo:'RCT',ano:'2021',journal:'Andrologia',titulo:'Mucuna Pruriens e testosterona em homens com estresse',achado:'+27% de testosterona total e −23% de prolactina após 3 meses',detalhe:'60 homens com síndrome de burnout. 5g/dia de pó de semente. Recuperação hormonal significativa.',pmid:'33368466'},
    ],
    seguranca:[
      {tipo:'bad',label:'NÃO combinar com IMAOs',texto:'Combinação com inibidores da MAO (fenelzina, selegilina) causa síndrome serotoninérgica e crise hipertensiva GRAVE. Contraindicação absoluta.'},
      {tipo:'warn',label:'Iniciar com dose baixa',texto:'Começar com 100–200mg e aumentar gradualmente. L-DOPA excessiva causa náuseas e vômitos.'},
      {tipo:'warn',label:'Doenças cardíacas',texto:'L-DOPA pode causar arritmias em pessoas com doença cardíaca preexistente.'},
    ]
    risk_groups:[
      {grp:'Usuários de IMAO / antidepressivos','nivel':'bad','motivo':'L-DOPA + IMAO → síndrome serotoninérgica e crise hipertensiva. CONTRAINDICAÇÃO ABSOLUTA.'},
      {grp:'Doenças cardíacas / arritmia','nivel':'warn','motivo':'L-DOPA pode provocar arritmias em cardiopatas. Consultar cardiologista antes de usar.'},
      {grp:'Parkinson (em tratamento com L-DOPA farmacêutica)','nivel':'bad','motivo':'Potencialização não controlada de L-DOPA. Ajuste de dose médica obrigatório.'},
    ],
    common_myths:[
      {mito:'Mucuna é uma fonte de dopamina','refutacao':'TECNICAMENTE FALSO. Mucuna fornece L-DOPA, o PRECURSOR da dopamina. A L-DOPA cruza a barreira hematoencefálica onde é convertida em dopamina. A dopamina em si não cruza a BHE — por isso tomar dopamina diretamente não tem efeito central.'},
      {mito:'Mucuna aumenta testosterona diretamente','refutacao':'INDIRETO. A dopamina eleva suprime prolactina → que em excesso inibe testosterona. O efeito na testosterona é mediado pela via dopamina→prolactina, não por ação direta em células de Leydig como o Tongkat Ali.'},
    ],
  },
  8:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`O Zinco é cofator essencial para mais de 300 enzimas e metaloproteínas. Para a testosterona, é crítico na atividade da testosterona sintase nos testículos e na modulação do receptor androgênico. A forma bisglicinato (zinco quelado com dois aminoácidos de glicina) tem biodisponibilidade 2–3× superior ao sulfato de zinco.`,
    mecanismo:[
      {ico:'🔬',label:'Testosterona Sintase',val:'Cofator enzimático na síntese de testosterona nas células de Leydig'},
      {ico:'🛡',label:'5α-Redutase',val:'Inibe a enzima que converte testosterona em DHT (pode proteger a próstata)'},
      {ico:'🦠',label:'Imunidade',val:'Essencial para maturação de timócitos e atividade de células NK e T'},
      {ico:'💊',label:'Insulina',val:'Componente estrutural da insulina e cofator da insulina sintase pancreática'},
    ],
    estudos:[
      {tipo:'RCT',ano:'1996',journal:'Nutrition',titulo:'Zinco e testosterona em atletas com restrição calórica',achado:'+84% de testosterona em atletas deficientes com 25mg/dia',detalhe:'Lutadores em restrição calórica. Zinco preveniu queda de testosterona induzida por treinamento intenso. Estudo clássico.',pmid:'8875519'},
      {tipo:'Comparativo',ano:'2014',journal:'J Am Coll Nutr',titulo:'Bisglicinato vs sulfato de zinco',achado:'Bisglicinato aumenta zinco sérico 2,1× mais que sulfato (p<0.001)',detalhe:'Menos efeitos GI e maior retenção tecidual. Preferir sempre a forma quelada.',pmid:'24988439'},
      {tipo:'Meta-análise',ano:'2020',journal:'J Pharm Nutr Sci',titulo:'Zinco e imunidade — revisão de 28 estudos',achado:'Suplementação encurtou duração de resfriados em −1,65 dias e reduziu incidência de pneumonia em 41%',detalhe:'Zinco inibe replicação viral via metaloproteases e potencializa resposta de linfócitos T.',pmid:'31728208'},
    ],
    seguranca:[
      {tipo:'ok',label:'Seguro até 40mg/dia (UL)',texto:'O Limite Superior de Ingestão (UL) estabelecido é 40mg/dia para adultos.'},
      {tipo:'warn',label:'Deficiência de Cobre',texto:'Zinco acima de 40mg/dia por meses compete com o cobre na absorção. Adicionar 2–3mg de cobre se usar doses altas.'},
      {tipo:'warn',label:'Estômago vazio',texto:'Zinco em jejum pode causar náuseas. Preferir com refeição.'},
    ]
    risk_groups:[
      {grp:'Deficiência de cobre (uso prolongado >40mg/dia)','nivel':'warn','motivo':'Zinco >40mg/dia por meses compete com cobre na absorção. Adicionar 2–3mg/dia de cobre se usar doses altas.'},
    ],
    common_myths:[
      {mito:'Zinco sempre aumenta testosterona','refutacao':'FALSO em eutróficos. Zinco restaura testosterona apenas em pessoas DEFICIENTES. Em quem tem status adequado de zinco, suplementação adicional não eleva testosterona significativamente. Medir zinco sérico antes de suplementar em doses altas.'},
      {mito:'Sulfato de zinco é igual ao bisglicinato','refutacao':'FALSO. Bisglicinato tem 2–3× mais biodisponibilidade e muito menos efeitos GI (náuseas) que sulfato. Para suplementação de longo prazo, preferir sempre formas queladas (bisglicinato, citrato, picolinato).'},
    ],
  },
  9:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`O Magnésio é o segundo mineral intracelular mais abundante no organismo, cofator de 600+ reações enzimáticas. Para testosterona, a forma glicinato é preferida pois combina o efeito do magnésio com o do aminoácido glicina, que tem propriedades neuroprotetoras e melhora o sono profundo.`,
    mecanismo:[
      {ico:'🔓',label:'SHBG',val:'Magnésio se liga à SHBG no sítio de ligação androgênica, liberando testosterona livre'},
      {ico:'😴',label:'Sono NREM',val:'Glicina ativa receptores NMDA e glicina no tronco cerebral, melhorando sono profundo'},
      {ico:'📉',label:'Cortisol',val:'Magnésio atenua a resposta ao cortisol pós-treino e crônico (estresse)'},
      {ico:'⚡',label:'ATP',val:'Cofator da ATP sintase mitocondrial — essencial para toda produção de energia celular'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2010',journal:'Biol Trace Elem Res',titulo:'Magnésio e testosterona em atletas e sedentários',achado:'+24% de testosterona livre em atletas que treinavam intensamente',detalhe:'4 semanas, 10mg/kg/dia. Sedentários também apresentaram melhora de 20%. Forte correlação entre Mg sérico e T.',pmid:'20352442'},
      {tipo:'RCT',ano:'2012',journal:'J Res Med Sci',titulo:'Magnésio e qualidade de sono',achado:'Aumento de +64 min de sono profundo (NREM 3/4) vs placebo',detalhe:'46 idosos. 500mg/dia por 8 semanas. Redução de insônia e melhora do ritmo circadiano.',pmid:'23853635'},
      {tipo:'Meta-análise',ano:'2016',journal:'Nutrients',titulo:'Magnésio e ansiedade (18 estudos)',achado:'Redução significativa de ansiedade em 18 de 18 estudos em pessoas com hipomagnesemia',detalhe:'Especialmente eficaz em pessoas com alto estresse e baixa ingestão de magnésio (<300mg/dia).',pmid:'28654669'},
    ],
    seguranca:[
      {tipo:'ok',label:'Muito bem tolerado',texto:'Glicinato é a forma mais bem tolerada gastrointestinalmente. Raro desconforto digestivo.'},
      {tipo:'warn',label:'Efeito laxante',texto:'Magnésio em formas como citrato ou óxido tem efeito laxante. Glicinato evita esse problema.'},
      {tipo:'ok',label:'Seguro para uso diário',texto:'Sem limite superior de toxicidade estabelecido para magnésio de fontes alimentares e suplementos quelados.'},
    ],
    risk_groups:[
      {grp:'Insuficiência Renal Grave','nivel':'warn','motivo':'Rim comprometido não excreta magnésio adequadamente → risco de hipermagnesemia. Consultar nefrologista.'},
    ],
    common_myths:[
      {mito:'Magnésio deixa sonolento/sedado','refutacao':'FALSO para o glicinato em doses normais. A sedação ocorre em doses muito altas de formas como citrato (efeito laxante sistêmico). Glicinato em 300–400mg melhora qualidade do sono SEM causar sonolência diurna — é regulatório do sono, não sedativo.'},
      {mito:'Posso tomar qualquer forma de magnésio que é igual','refutacao':'FALSO. Óxido de magnésio tem biodisponibilidade de apenas 4%. Citrato ~30%. Glicinato ~80%. Para objetivos de sono, testosterona e neurológicos, glicinato ou treonato são superiores. Verificar a forma na embalagem.'},
    ]
  },
  10:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A Vitamina D3 (colecalciferol) é um pró-hormônio esteróide, não uma simples vitamina. Após conversão no fígado (25-OH D3) e rins (1,25-OH D3), atua em receptores nucleares VDR presentes em quase todos os tecidos, incluindo testículos e hipófise. A K2 (MK-7 ou MK-4) direciona o cálcio mobilizado para os ossos, prevenindo calcificação arterial.`,
    mecanismo:[
      {ico:'🧬',label:'VDR Nuclear',val:'1,25-OH-D3 ativa genes que regulam esteroidogênese testicular'},
      {ico:'⬆️',label:'Testosterona',val:'VDR nas células de Leydig → estimula síntese de testosterona'},
      {ico:'🦴',label:'Vitamina K2',val:'Ativa osteocalcina e MGP → cálcio vai para ossos, não artérias'},
      {ico:'🛡',label:'Imunidade',val:'D3 ativa macrófagos e regula resposta imune inata e adaptativa'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2011',journal:'Horm Metab Res',titulo:'Vitamina D e testosterona em homens',achado:'+25% de testosterona total e livre após 12 meses em deficientes',detalhe:'54 homens, 3.332 UI/dia por 12 meses vs placebo. Efeito proporcional à deficiência basal.',pmid:'21154195'},
      {tipo:'Meta-análise',ano:'2018',journal:'Rev Endocr Metab Disord',titulo:'D3 e testosterona em 30 estudos',achado:'Correlação positiva em 26 de 30 estudos (p<0.05)',detalhe:'Deficiência de D3 (<20 ng/mL) está fortemente associada a hipogonadismo. Suplementação normaliza.',pmid:'29572820'},
      {tipo:'RCT',ano:'2019',journal:'Nutrients',titulo:'D3+K2 e densidade óssea vs D3 isolada',achado:'Combinação D3+K2 aumentou densidade óssea 12% mais que D3 isolada em 12 meses',detalhe:'244 mulheres pós-menopausais. K2 MK-7 (180mcg) + D3 (2000UI). A K2 preveniu a hipercalcemia e otimizou a deposição.',pmid:'31690021'},
    ],
    seguranca:[
      {tipo:'ok',label:'Segura até 10.000 UI/dia',texto:'O UL estabelecido é 4.000 UI, mas estudos mostram que até 10.000 UI é seguro em adultos sem hipercalcemia.'},
      {tipo:'warn',label:'Dosar antes de suplementar',texto:'Exame 25-OH vitamina D (25-hidroxi-vitamina D) orienta a dose correta. Níveis ideais: 50–80 ng/mL.'},
      {tipo:'warn',label:'K2 é essencial',texto:'Doses altas de D3 sem K2 podem mobilizar cálcio para o sangue. K2 MK-7 redireciona para ossos.'},
    ]
    risk_groups:[
      {grp:'Hipercalcemia / Sarcoidose / Granulomatose','nivel':'bad','motivo':'Nessas condições D3 eleva cálcio excessivamente. Contraindicação relativa — dosar 25-OH-D3 e cálcio antes.'},
      {grp:'Cálculos renais de cálcio','nivel':'warn','motivo':'D3 aumenta absorção intestinal de cálcio. K2 reduz risco mas não elimina. Monitorar calciúria.'},
    ],
    common_myths:[
      {mito:'Vitamina D é uma vitamina comum','refutacao':'FALSO. D3 é um pró-hormônio esteróide que age via receptores nucleares VDR presentes em quase todos os tecidos, incluindo testículos, sistema imune, coração e cérebro. Seu papel transcende em muito a saúde óssea.'},
      {mito:'Posso tomar D3 sem K2 em doses altas','refutacao':'FALSO. D3 em doses &gt;4.000 UI mobiliza cálcio do intestino para o sangue. Sem K2 (MK-7), esse cálcio pode se depositar em artérias (calcificação vascular). K2 ativa MGP (proteína Gla da matriz) que previne calcificação extraóssea.'},
      {mito:'Sol suficiente = sem necessidade de suplementar','refutacao':'PARCIALMENTE VERDADEIRO mas irrealista para a maioria. Síntese cutânea eficiente requer exposição ≥20 min de sol de meio-dia sem protetor em &gt;25% da superfície corporal. Déficit de vitamina D afeta &gt;40% da população urbana mesmo em países tropicais.'},
    ],
  },
  11:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A Creatina Monohidratada é o suplemento esportivo com maior volume de evidências científicas: 500+ estudos clínicos publicados. Age como doador de fósforo para ressintetizar ATP durante esforços de alta intensidade (fosfato de creatina + ADP → ATP + creatina). Também tem efeitos cognitivos, osmóticos (hidratação celular intracelular, que é um sinal pró-anabólico, não retenção hídrica subcutânea) e neuroprotetores. A dose de manutenção de 3–5g/dia (≈0,07g/kg) é eficaz sem necessidade de protocolo de saturação para a maioria dos usuários.`,
    mecanismo:[
      {ico:'⚡',label:'ATP Muscular',val:'PCr + ADP → ATP via creatina quinase. Regenera ATP nos primeiros 10–15s de esforço máximo'},
      {ico:'💦',label:'Hidratação Intracelular',val:'Arrasta água para DENTRO da fibra muscular (intracelular) via osmose → sinal anabólico e volumizador. Não é retenção subcutânea.'},
      {ico:'🧠',label:'Cognição',val:'Aumenta ATP cerebral. Meta-análise (Nutrition Reviews 2023): melhora de memória em adultos saudáveis, efeito mais forte em idosos e vegetarianos.'},
      {ico:'🔬',label:'Síntese Proteica',val:'Ativa mTOR e IGF-1 por mecanismos ainda estudados; sinergismo confirmado com proteínas e treino de força.'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2003',journal:'J Strength Cond Res',titulo:'Revisão de 22 estudos sobre força muscular',achado:'+8% de força máxima e +14% de força de resistência vs placebo',detalhe:'Análise de 22 RCTs. Efeito mais pronunciado em exercícios de alta intensidade e curta duração.',pmid:'12701815'},
      {tipo:'Meta-análise',ano:'2017',journal:'Br J Sports Med',titulo:'Creatina e composição corporal (150 estudos)',achado:'+2 kg massa magra em 4–12 semanas de treinamento',detalhe:'O maior banco de dados sobre creatina. Efeito confirmado em homens, mulheres, jovens e idosos.',pmid:'27669734'},
      {tipo:'RCT',ano:'2019',journal:'Front Aging Neurosci',titulo:'Creatina e cognição em idosos',achado:'+7,5% em testes de memória de curto prazo e função executiva',detalhe:'Efeito neuroprotetor relevante em populações com depleção de creatina cerebral.',pmid:'30930779'},
      {tipo:'Meta-análise',ano:'2025',journal:'BMC Nephrology',titulo:'Creatina e função renal — 21 estudos (2000–2025)',achado:'Nenhuma alteração patológica em TFG; creatinina sérica eleva levemente mas sem impacto funcional',detalhe:'21 estudos humanos. Meta-análise com modelo de efeitos aleatórios. O aumento de creatinina sérica é artefato metabólico esperado (conversão creatina→creatinina), não sinal de lesão renal.',pmid:'41199218'},
      {tipo:'RCT',ano:'2025',journal:'J Int Soc Sports Nutr',titulo:'Creatina e queda de cabelo — 12 semanas (RCT)',achado:'Nenhuma diferença significativa em DHT, razão DHT:testosterona ou densidade capilar vs placebo',detalhe:'45 homens treinados (18–40 anos). 5g/dia. Primeiro estudo a medir diretamente a saúde folicular. Mito do DHT/cabelo refutado.',pmid:'40265319'},
    ],
    seguranca:[
      {tipo:'ok',label:'O suplemento mais seguro e estudado',texto:'Nenhum estudo documentou danos renais, hepáticos ou outros em pessoas saudáveis. Evidência de até 5 anos de uso contínuo sem intercorrências (JISSN Position Stand 2017).'},
      {tipo:'ok',label:'Hidratação Intracelular (não subcutânea)',texto:'A retenção hídrica da creatina ocorre DENTRO da célula muscular — é um sinal osmótico pró-anabólico, não "inchaço" subcutâneo. Manter 2–3L de água/dia.'},
      {tipo:'warn',label:'Ganho de peso inicial',texto:'0,5–2kg de peso hídrico intracelular na primeira semana é normal e não representa gordura.'},
      {tipo:'warn',label:'Doença Renal Crônica (DRC)',texto:'Em indivíduos com DRC preexistente, a creatina não é recomendada sem orientação nefrológica, pois o aumento de creatinina sérica dificulta o monitoramento da função renal.'},
    ],
    common_myths:[
      {mito:'Creatina causa danos nos rins',refutacao:'FALSO. Meta-análise BMC Nephrology 2025 (21 estudos, 2000–2025): nenhuma alteração patológica em TFG em pessoas saudáveis. O aumento de creatinina sérica é artefato metabólico, não dano renal.'},
      {mito:'Creatina causa queda de cabelo ao elevar DHT',refutacao:'FALSO. O único estudo que sugeriu isso (van der Merwe 2009, n=16) não mediu queda de cabelo. O primeiro RCT a avaliar diretamente a saúde folicular (JISSN 2025, n=45, 12 semanas) encontrou zero diferença entre creatina e placebo em DHT ou densidade capilar.'},
      {mito:'É necessário fazer protocolo de saturação (fase de carga)',refutacao:'DESNECESSÁRIO para a maioria. Saturação muscular com 5g/dia ocorre em ~28 dias. A fase de carga (20g/dia por 7 dias) acelera a saturação mas causa mais desconforto GI. Ambas chegam ao mesmo endpoint.'},
      {mito:'A retenção de água da creatina é subcutânea (deixa "inchado")',refutacao:'FALSO. A retenção hídrica da creatina é INTRAcelular — entra para dentro da fibra muscular via transporte osmótico, aumentando o volume das células. Isso é pró-anabólico, não estético negativo.'},
    ],
  },
  12:{
    ev:4,
    scientific_evidence_level:'A',
    resumo:`A Beta-Alanina é o aminoácido limitante na síntese de carnosina muscular (β-alanil-L-histidina). A carnosina atua como tampão de prótons H⁺ no músculo, neutralizando o ácido que provoca queda de pH intracelular e atrasando a fadiga durante esforços de 1–4 minutos de alta intensidade. IMPORTANTE: o efeito da beta-alanina é CRÔNICO (não agudo) — a carnosina muscular acumula-se gradualmente em 4–8 semanas de suplementação diária, independentemente do timing da dose. A parestesia (formigamento) que ocorre minutos após ingeri-la é um efeito colateral sensorial inofensivo via receptores MRGPRD, e não sinaliza atividade ergogênica imediata.`,
    mecanismo:[
      {ico:'🏃',label:'Carnosina Muscular (Efeito Crônico)',val:'Beta-alanina + histidina → carnosina muscular (tamponante de H⁺). Acúmulo progressivo em 4–8 semanas — efeito é CRÔNICO, não agudo.'},
      {ico:'📉',label:'Tamponamento de H⁺',val:'Carnosina doa prótons durante acidose metabólica, mantendo pH intracelular próximo ao ótimo para contração muscular'},
      {ico:'⏱',label:'Janela de Benefício',val:'Exercícios de 60–240 segundos de alta intensidade são os que mais se beneficiam (HIIT, sprints, lutas, ciclismo de pista)'},
      {ico:'🔬',label:'Carnosina: Acúmulo e Washout',val:'Carnosina muscular sobe progressivamente (+64% em 10 semanas). Washout em 6–9 semanas após cessar suplementação.'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2012',journal:'Amino Acids',titulo:'Beta-alanina e performance de endurance (15 estudos)',achado:'+2,85% de performance em exercícios de 1–4 minutos (p<0.001)',detalhe:'480 participantes. Efeito mais significativo em sprints, HIIT, lutas e ciclismo de pista.',pmid:'22270875'},
      {tipo:'RCT',ano:'2006',journal:'Med Sci Sports Exerc',titulo:'Carnosina muscular e força com beta-alanina',achado:'+64% de carnosina muscular em 10 semanas vs placebo',detalhe:'Estudo de biopsia muscular. Carnosina retorna ao basal em 6–9 semanas após cessação.',pmid:'16676002'},
      {tipo:'Meta-análise',ano:'2016',journal:'Br J Sports Med',titulo:'Beta-alanina e performance em exercícios de alta intensidade (40 estudos)',achado:'Melhora de 2,85% em exercícios de 60–240 segundos, sem efeito fora dessa janela',detalhe:'1.461 participantes. Confirmação de que o benefício é específico para esforços de 1–4 min. Dose cumulativa importa mais que timing.',pmid:'26381327'},
      {tipo:'Position Stand',ano:'2015',journal:'J Int Soc Sports Nutr (JISSN)',titulo:'ISSN Position Stand: Beta-Alanina',achado:'4–6g/dia por ≥4 semanas aumenta carnosina muscular e melhora performance de alta intensidade',detalhe:'7 conclusões oficiais: (1) 4g/dia aumenta carnosina; (2) segura em doses recomendadas; (3) parestesia é inofensiva; (4) efeito em 1–4 min de esforço; (5) atenua fadiga neuromuscular em idosos.',pmid:'26175657'},
    ],
    seguranca:[
      {tipo:'ok',label:'Segura a longo prazo',texto:'Sem toxicidade observada em doses de 3,2–6,4g/dia por até 24 semanas (JISSN Position Stand 2015).'},
      {tipo:'warn',label:'Parestesia (formigamento) — efeito sensorial, não ergogênico',texto:'Formigamento pós-ingestão é ativação de receptores MRGPRD na pele — colateral inofensivo. NÃO indica atividade no músculo. Pode ser reduzido dividindo a dose em 1,6g ou usando liberação prolongada.'},
      {tipo:'info',label:'Efeito é CRÔNICO — não espere resultado imediato',texto:'Beta-alanina age via acúmulo progressivo de carnosina muscular. São necessárias 4–8 semanas de uso diário para benefício significativo. O timing da dose (pré ou pós-treino) é irrelevante para o efeito final.'},
    ],
    risk_groups:[],
    common_myths:[
      {mito:'Beta-alanina causa o formigamento que melhora o treino',refutacao:'FALSO. A parestesia é ativação de receptores MRGPRD na pele — um efeito sensorial periférico completamente separado do mecanismo de tamponamento muscular. O formigamento não indica que o suplemento está "funcionando" no músculo.'},
      {mito:'O efeito da beta-alanina é agudo (sentido no mesmo dia)',refutacao:'FALSO. O efeito é CRÔNICO. A carnosina muscular acumula-se em 4–8 semanas de suplementação diária. Não há benefício ergogênico imediato — quem "sente mais energia" na mesma dose responde ao efeito placebo ou à parestesia.'},
      {mito:'É necessário tomar antes do treino para funcionar',refutacao:'FALSO. O timing da dose é irrelevante para o acúmulo de carnosina muscular. A dose diária total (4–6g) determina o resultado — não o momento da ingestão.'},
    ],
  },
  13:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A combinação cafeína + L-teanina é a mais bem documentada para performance cognitiva e física. A cafeína bloqueia competitivamente receptores de adenosina (A1 e A2A), reduzindo percepção de fadiga e aumentando vigilância. Com uso crônico diário, o cérebro upregula receptores de adenosina (tolerância), reduzindo a eficácia e causando fadiga aumentada sem cafeína (dependência funcional). Por isso, ciclos de abstinência (5–7 dias) a cada 30 dias restauram a sensibilidade. A teanina (aminoácido do chá verde) eleva ondas alfa cerebrais, suavizando os picos ansiogênicos da cafeína sem reduzir sua eficácia. Meia-vida da cafeína: 4–6h (podendo chegar a 10h em metabolizadores lentos via CYP1A2). MESMO que o usuário consiga dormir, cafeína ingerida <6h antes do sono reduz sono profundo (N3) e eficiência do sono.`,
    mecanismo:[
      {ico:'🚫',label:'Antagonismo Adenosina (A1/A2A)',val:'Cafeína bloqueia receptores A1/A2a → reduz fadiga percebida e aumenta vigília. Com uso crônico → upregulation de receptores → tolerância (necessidade de ciclos).'},
      {ico:'🌊',label:'Ondas Alfa (L-Teanina)',val:'L-teanina aumenta ondas alfa (8–14 Hz) → relaxamento alerta sem sonolência. Atenua ansiedade e jitters da cafeína.'},
      {ico:'⚡',label:'Sinergia Confirmada',val:'Combinação 1:1 (100–200mg cafeína + igual teanina) produz efeito cognitivo > soma individual (sinergismo em 48 voluntários, RCT 2008)'},
      {ico:'😴',label:'Impacto no Sono Profundo',val:'Cafeína como antagonista de adenosina diminui pressão homeostática de sono → reduz N3 (sono profundo) em −11,1 min e aumenta N1 (sono leve) em +6,1 min, mesmo sem percepção de insônia (meta-análise Sleep Med Rev 2023).'},
      {ico:'🔄',label:'Tolerância e Ciclos',val:'Uso crônico → upregulation de adenosina A1/A2A → tolerância à estimulação. Abstinência de 5–7 dias reseta receptores. Ciclos preservam sensibilidade e reduzem risco de dependência.'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2008',journal:'Nutr Neurosci',titulo:'Cafeína + L-teanina vs cada um isolado',achado:'Combo melhorou atenção e acurácia 34% mais que cafeína sozinha (p<0.01)',detalhe:'48 voluntários, tarefa cognitiva de 60 minutos. Redução de erros de atenção e menor ansiedade.',pmid:'18681988'},
      {tipo:'Meta-análise',ano:'2017',journal:'Psicofarmacologia',titulo:'67 estudos sobre cafeína e performance cognitiva',achado:'Melhora consistente em atenção, tempo de reação e memória de trabalho',detalhe:'A cafeína é o psicoativo mais estudado do mundo. Efeito dose-dependente de 75–400mg.',pmid:'27679691'},
      {tipo:'Meta-análise',ano:'2023',journal:'Sleep Medicine Reviews',titulo:'Cafeína e arquitetura do sono (20 estudos)',achado:'Redução de N3 (sono profundo) em −11,1 min, aumento de N1 (sono leve) em +6,1 min. Sem efeito significativo em REM.',detalhe:'Cafeína reduz profundidade do sono via antagonismo de adenosina, mesmo em usuários crônicos. Habituação não protege totalmente contra disrupção do sono.',pmid:'36736218'},
      {tipo:'Meta-análise',ano:'2014',journal:'Nutrients',titulo:'Cafeína e força muscular (10 estudos)',achado:'+3,1 kg em 1RM e melhora de 1,3% em força de resistência vs placebo',detalhe:'Dose eficaz: 3–6mg/kg. Performance de pico de força melhorada em exercícios compostos.',pmid:'25650109'},
    ],
    seguranca:[
      {tipo:'ok',label:'Segura em doses moderadas (200mg)',texto:'200mg cafeína + 200mg teanina é a dose ótima para a maioria. Efeito estabiliza sem grande tolerância a curto prazo.'},
      {tipo:'warn',label:'Sono: cortar ≥8h antes de dormir',texto:'Meia-vida 4–6h (até 10h em metabolizadores lentos). Cafeína às 14h pode ainda afetar sono às 22h. Recomendação: última dose ≤ 13h para a maioria. Meta-análise 2023: reduz sono profundo mesmo sem insônia percebida.'},
      {tipo:'warn',label:'Ciclagem: 5 dias off a cada 30 de uso',texto:'Uso diário crônico aumenta receptores de adenosina → tolerância progressiva e fadiga de abstinência. Pausa de 5–7 dias reseta sensibilidade (ciclo recomendado no CYCLES).'},
      {tipo:'bad',label:'Gravidez e amamentação',texto:'Cafeína atravessa barreira placentária. Limite de 200mg/dia total (OMS). Preferir limite de 100mg/dia por precaução.'},
    ],
    risk_groups:[
      {grp:'Hipertensão Arterial','nivel':'warn','motivo':'Cafeína eleva PAS em 3–4 mmHg agudamente. Em hipertensos não controlados, monitorar PA. Preferir doses ≤100mg.'},
      {grp:'Ansiedade / TAG','nivel':'warn','motivo':'Cafeína amplifica ativação simpática e pode deflagrar crises de ansiedade ou pânico em predispostos. Iniciar com 50–100mg + teanina.'},
      {grp:'Insônia Crônica','nivel':'bad','motivo':'Cafeína a qualquer hora do dia pode comprometer N3 (sono profundo) — mesmo sem insônia percebida. Evitar ou restringir a ≤100mg antes das 10h.'},
      {grp:'Arritmia / Taquicardia','nivel':'bad','motivo':'Cafeína aumenta frequência cardíaca e pode precipitar arritmias supraventriculares em predispostos. Contraindicação relativa — consultar cardiologista.'},
    ],
    common_myths:[
      {mito:'Posso tomar cafeína até às 18h se consigo dormir normalmente',refutacao:'FALSO. Meta-análise Sleep Medicine Reviews 2023 (20 estudos): cafeína reduz sono profundo (N3) em −11 minutos e aumenta sono leve (N1), mesmo em usuários que não percebem insônia. A redução de N3 prejudica recuperação muscular e consolidação de memória.'},
      {mito:'Se já sou tolerante, a cafeína não atrapalha mais meu sono',refutacao:'PARCIALMENTE FALSO. A tolerância se desenvolve para os efeitos estimulantes (vigilância), mas os estudos mostram que usuários habituais em altas doses (400mg) ainda apresentam disrupção do sono (Oxford Academic 2024).'},
      {mito:'Cafeína dá energia real',refutacao:'TECNICAMENTE FALSO. Cafeína bloqueia a PERCEPÇÃO de fadiga ao mascarar adenosina acumulada. A fadiga real (deplição de ATP) segue ocorrendo. Por isso a "queda" pós-cafeína é real — a adenosina bloqueada se liga aos receptores assim que a cafeína é metabolizada.'},
    ],
  },
  14:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`Metabólito da leucina que inibe degradação muscular. Especialmente eficaz para iniciantes, idosos e em déficit calórico.`,
    mecanismo:[
      {ico:'🛡',label:'Anti-catabolismo',val:'Inibe ubiquitina-proteassoma → reduz degradação de proteínas musculares'},
      {ico:'🔬',label:'mTOR',val:'Estimula mTORC1 de forma independente da leucina, ativando síntese proteica'},
      {ico:'🏋️',label:'Dano Muscular',val:'Reduz marcadores de dano (CK, LDH) após exercício excêntrico intenso'},
      {ico:'💪',label:'IGF-1',val:'Pode elevar IGF-1 local no músculo, promovendo reparo e crescimento'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2014',journal:'J Strength Cond Res',titulo:'HMB e massa magra em estudos controlados',achado:'+1,08 kg de massa magra vs placebo em populações não treinadas',detalhe:'Análise de 9 RCTs. Efeito mais pronunciado em iniciantes (2–3×) vs atletas avançados.',pmid:'24555474'},
      {tipo:'RCT',ano:'2013',journal:'J Nutr',titulo:'HMB e perda muscular em idosos',achado:'Preservação de 100% da massa magra vs −2,2% no placebo durante restrição calórica',detalhe:'Idosos de 60–75 anos em déficit calórico. 3g/dia HMB por 8 semanas. Anti-catabólico robusto.',pmid:'23783282'},
      {tipo:'RCT',ano:'2000',journal:'J Appl Physiol',titulo:'HMB e recuperação muscular pós-exercício',achado:'−50% de dano muscular (CK) e −30% de dor (DOMS) vs placebo',detalhe:'Exercício excêntrico intenso. 3g/dia. HMB acelerou recuperação e reduziu marcadores de dano.',pmid:'11027305'},
    ],
    seguranca:[
      {tipo:'ok',label:'Excelente perfil de segurança',texto:'Estudos de 8 semanas com 3g/dia sem alterações em marcadores hepáticos, renais ou hematológicos.'},
      {tipo:'ok',label:'Sem interações medicamentosas',texto:'Não foi identificada interação com medicamentos comuns. Adequado para uso conjunto com outros suplementos.'},
      {tipo:'warn',label:'Custo-benefício em avançados',texto:'Em atletas de alta performance com nutrição adequada, o efeito é modesto. Mais custo-efetivo para iniciantes ou em períodos catabólicos.'},
    ],
    risk_groups:[],
    common_myths:[
      {mito:'HMB é essencial para qualquer pessoa que treina','refutacao':'FALSO para avançados. Meta-análise 2014: efeito é 2–3× maior em iniciantes vs atletas avançados com nutrição adequada. Para quem já ingere 1,6g/kg/dia de proteína e treina há &gt;2 anos, HMB oferece retorno marginal. Melhor indicado em: iniciantes, idosos sarcopênicos, déficit calórico intenso ou imobilização.'},
      {mito:'HMB é igual à leucina','refutacao':'FALSO. HMB é um metabólito da leucina (apenas 5% da leucina é convertida em HMB). Agem por vias complementares: leucina ativa mTOR (anabolismo), HMB inibe ubiquitina-proteassoma (anti-catabolismo). HMB é superior especificamente para REDUZIR catabolismo, não para estimular síntese.'},
    ],
  },
  15:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`O Whey Protein Isolado (WPI) é a proteína do soro do leite com maior pureza (>90% de proteína) e mínimo de lactose e gordura. É a fonte de proteína com maior índice PDCAAS e DIAAS (ambos = 1,0), possuindo o perfil de aminoácidos essenciais mais completo entre fontes proteicas. A leucina — 10–11% da composição — é o gatilho molecular da síntese proteica via ativação de mTORC1. Para hipertrofia, o alvo proteico total é 1,6–2,2g/kg/dia de proteína total na dieta; o whey é uma ferramenta para atingir essa meta, não substitui refeições completas.`,
    mecanismo:[
      {ico:'🔬',label:'mTORC1',val:'Leucina ativa mTORC1 via RAG GTPases → cascata de síntese proteica muscular'},
      {ico:'⚡',label:'Velocidade de Absorção',val:'Pico aminoacídico em 60–90 min — ideal para janela anabólica pós-treino'},
      {ico:'💧',label:'Hidrolisado vs Isolado',val:'Isolado já oferece alta taxa de absorção sem custo adicional do hidrolisado'},
      {ico:'🩸',label:'Insulina',val:'Estimula secreção de insulina, que potencializa captação de aminoácidos pelo músculo'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2018',journal:'Br J Sports Med',titulo:'Suplementação proteica e hipertrofia (49 estudos)',achado:'+1,1 kg de massa magra adicional vs placebo em 12+ semanas de treino',detalhe:'1.800 participantes. Efeito significativo até ~1,62g de proteína/kg/dia. Plateau de efeito acima de 2,2g/kg. Whey foi a fonte mais usada.',pmid:'28698222'},
      {tipo:'RCT',ano:'2007',journal:'Int J Sport Nutr Exerc Metab',titulo:'Whey vs caseína vs soja para hipertrofia',achado:'Whey gerou +20% mais massa magra que soja e +24% mais que caseína em 12 semanas',detalhe:'74 homens treinados. Whey pós-treino. Leucinaemia mais elevada no whey explicou a diferença.',pmid:'17684208'},
      {tipo:'Meta-análise',ano:'2017',journal:'J Am Coll Nutr',titulo:'Whey e perda de gordura em déficit calórico',achado:'−2,3 kg a mais de gordura com whey vs controle em dietas hipocalóricas',detalhe:'Efeito protetor de massa magra e maior saciedade explicam o resultado. 9 RCTs incluídos.',pmid:'26545761'},
    ],
    seguranca:[
      {tipo:'ok',label:'Seguro para pessoas saudáveis',texto:'Décadas de uso e pesquisa sem evidências de dano renal, hepático ou ósseo em pessoas sem condições preexistentes. Meta-análise 2018 (Br J Sports Med): até 2,2g/kg/dia é seguro em adultos saudáveis treinados.'},
      {tipo:'warn',label:'Intolerância à lactose',texto:'O isolado tem <1% de lactose — geralmente tolerado. Quem tem alergia à proteína do leite (não intolerância) deve evitar.'},
      {tipo:'bad',label:'Doença Renal Crônica (DRC) — GRUPO DE RISCO',texto:'KDIGO 2024 recomenda ≤0,8g/kg/dia para DRC G3–G5 e EVITAR >1,3g/kg/dia. Dietas hiperproteicas (>2g/kg/dia) podem causar hiperfiltração glomerular e acelerar progressão da DRC. Nefrologista deve orientar a ingestão proteica.'},
    ],
    risk_groups:[
      {grp:'Doença Renal Crônica (DRC) — G3 a G5',nivel:'bad',motivo:'KDIGO 2024: manter proteína em ≤0,8g/kg/dia; evitar >1,3g/kg/dia. Hiperfiltração glomerular por excesso proteico pode acelerar progressão.'},
      {grp:'Urolitíase / Cálculos Renais',nivel:'warn','motivo':'Dietas hiperproteicas animais aumentam excreção de oxalato e ácido úrico, elevando risco de cálculos. Preferir fontes proteicas vegetais parciais.'},
    ],
    common_myths:[
      {mito:'Proteína em excesso causa danos nos rins em pessoas saudáveis',refutacao:'FALSO para saudáveis. Meta-análise Br J Sports Med 2018 não encontrou dano renal até 2,2g/kg/dia em adultos sem condição preexistente. VERDADEIRO em DRC: KDIGO 2024 restringe a <1,3g/kg/dia para evitar hiperfiltração.'},
      {mito:'Quanto mais proteína, mais músculo',refutacao:'FALSO acima de ~2,2g/kg/dia. O teto de efetividade para hipertrofia está em 1,6–2,2g/kg/dia (meta-análise 49 estudos). Proteína além disso é oxidada como energia — sem benefício muscular adicional.'},
      {mito:'É preciso tomar whey imediatamente após o treino (janela anabólica de 30min)',refutacao:'MITO EXAGERADO. A "janela anabólica" é muito maior do que se acreditava — a síntese proteica permanece elevada por 24–48h pós-treino. O total proteico do dia importa mais que o timing preciso.'},
    ],
  },
  16:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`Os EAA (Aminoácidos Essenciais) são os 9 aminoácidos que o organismo não pode sintetizar de novo: histidina, isoleucina, leucina, lisina, metionina, fenilalanina, treonina, triptofano e valina. Ao contrário dos BCAAs (apenas 3), os EAA fornecem todos os substratos para síntese proteica completa. Estudos mostram que os EAA estimulam a síntese proteica muscular até 50% mais que BCAAs isolados, pois os aminoácidos não-ramificados são igualmente necessários para elongação do peptídeo.`,
    mecanismo:[
      {ico:'🔬',label:'Síntese Proteica',val:'Todos os 9 EAAs necessários para elongação ribosomal completa de proteínas musculares'},
      {ico:'💪',label:'Leucina Central',val:'Leucina (30% dos EAAs) ativa mTORC1 enquanto os demais EAAs provêm substrato'},
      {ico:'⚡',label:'Supera BCAAs',val:'EAAs estimulam MPS 2× mais que BCAAs isolados por fornecer substrato completo'},
      {ico:'🩸',label:'Peri-treino',val:'Absorção rápida (pó) — ideal durante ou imediatamente após o treino'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2017',journal:'Am J Clin Nutr',titulo:'EAA vs BCAAs para síntese proteica muscular',achado:'EAAs estimularam MPS 50% mais que BCAAs em dose equivalente de leucina',detalhe:'Duplo-cego, 20 jovens treinados. EAA 10g vs BCAA 5,6g (mesma leucina). Biópsia muscular com traçador isotópico.',pmid:'27477959'},
      {tipo:'RCT',ano:'2020',journal:'Front Nutr',titulo:'EAAs e recuperação em exercício de resistência',achado:'EAAs reduziram marcadores de dano muscular em 35% vs placebo',detalhe:'Suplementação peri-treino com 10g de EAAs. Melhora na percepção de esforço e na recuperação.',pmid:'32903609'},
      {tipo:'RCT',ano:'2018',journal:'Am J Clin Nutr',titulo:'EAAs e síntese proteica em idosos',achado:'EAAs estimularam MPS 2,6× mais que leucina isolada na mesma dose molar em sarcopênicos',detalhe:'20 idosos. Infusão isotópica de traçador. EAA completo necessário para máxima ativação de mTORC1 em músculos envelhecidos.',pmid:'29438458'},
    ],
    seguranca:[
      {tipo:'ok',label:'Muito seguro',texto:'EAAs são nutrientes essenciais da dieta. Sem toxicidade reportada em doses suplementares de 10–20g/dia.'},
      {tipo:'warn',label:'Fenilcetonúria',texto:'Fenilalanina está presente nos EAAs. Pessoas com PKU (fenilcetonúria) devem evitar ou consultar médico.'},
      {tipo:'ok',label:'Sem efeito no fígado',texto:'Diferente de aminoácidos sintéticos em excesso, EAAs em doses normais não sobrecarregam metabolismo hepático.'},
    ],
    risk_groups:[
      {grp:'Fenilcetonúria (PKU)','nivel':'bad','motivo':'EAAs contêm fenilalanina. Contraindicado em PKU sem orientação médica.'},
    ],
    common_myths:[
      {mito:'BCAAs são superiores ou equivalentes aos EAAs','refutacao':'FALSO. RCT Am J Clin Nutr 2017 com traçador isotópico: EAAs estimularam síntese proteica muscular 50% mais que BCAAs na mesma dose de leucina. Os 6 aminoácidos não-BCAA são igualmente limitantes para elongação ribossomal — BCAAs isolados não fornecem substrato completo.'},
    ],
  },
  17:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`A Ecdisterona (20-Hidroxiecdisona, ou 20E) é um fitoesteroide encontrado em espinafre, quinoa e outras plantas, pertencente à classe dos ecdisteróides — hormônios de insetos adaptados para resistência ao estresse. Em mamíferos, a 20E ativa o receptor estrogênico beta (ERβ) sem suprimir o eixo HPTA, o que a diferencia dos AAS. Promove síntese proteica e hipertrofia sem efeitos androgênicos.`,
    mecanismo:[
      {ico:'🧬',label:'Receptor ERβ',val:'Liga-se ao receptor estrogênico beta → ativação da via PI3K/Akt/mTOR para síntese proteica'},
      {ico:'💪',label:'Síntese Proteica',val:'Estudo comparativo: efeito anabólico próximo ao dianabol (sem supressão hormonal)'},
      {ico:'🔬',label:'IGF-1',val:'Aumenta expressão de IGF-1 local no músculo sem elevar IGF-1 sistêmico'},
      {ico:'🛡',label:'Anti-catabólico',val:'Reduz ubiquitina-proteassoma e proteólise muscular, similar ao HMB'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2019',journal:'Arch Toxicol',titulo:'Ecdisterona e hipertrofia em culturistas',achado:'+2,0 kg de massa magra e −1,8 kg de gordura vs placebo em 10 semanas',detalhe:'46 atletas de força treinados. 200–800mg/dia. Dose-resposta confirmada. Sem alterações hormonais.',pmid:'30830291'},
      {tipo:'In vitro + animal',ano:'2015',journal:'J Agric Food Chem',titulo:'Comparação de anabolismo: 20E vs AAS',achado:'20E igualou dianabol em síntese proteica miofibrilar in vitro',detalhe:'Estudos de célula muscular. Mesma potência anabólica via receptor diferente (ERβ vs AR). Publicação que gerou debate regulatório.',pmid:'26200279'},
      {tipo:'RCT',ano:'2021',journal:'Front Endocrinol',titulo:'Ecdisterona e hormônios em homens saudáveis',achado:'Nenhuma alteração em testosterona, FSH, LH, estrogênio após 12 semanas',detalhe:'Confirma segurança hormonal. Não suprime eixo HPTA. Anabolismo via via não-androgênica.',pmid:'33716998'},
    ],
    seguranca:[
      {tipo:'ok',label:'Sem supressão hormonal',texto:'Ao contrário de proanabolizantes e AAS, a ecdisterona não altera testosterona, FSH ou LH. Eixo HPTA intacto.'},
      {tipo:'ok',label:'Ausência de toxicidade',texto:'LD50 muito alta em modelos animais. Sem hepatotoxicidade ou cardiotoxicidade reportada.'},
      {tipo:'warn',label:'Regulatório (WADA)',texto:'A WADA monitorou a ecdisterona como possível substância proibida. Verificar regulamentos se for atleta competitivo.'},
      {tipo:'warn',label:'Padronização do extrato',texto:'Extratos variam de 2% a 97% de 20E. Exigir laudo de padronização do fabricante.'},
    ],
    risk_groups:[
      {grp:'Atletas de esportes com doping testado (WADA)','nivel':'warn','motivo':'WADA monitorou ecdisterona como possível substância proibida. Verificar status regulatório atual antes de competições.'},
    ],
    common_myths:[
      {mito:'Ecdisterona é como um esteroide — suprime hormônios','refutacao':'FALSO. RCT Front Endocrinol 2021: nenhuma alteração em testosterona, FSH, LH ou estrogênio após 12 semanas de ecdisterona. Age via receptor ERβ (estrogênico beta), NÃO via receptor androgênico. Eixo HPTA intacto.'},
    ],
  },
  18:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`O Lion's Mane (Hericium erinaceus, "Juba de Leão") contém hericenones (no corpo de frutificação) e erinacinas (no micélio) — as únicas substâncias naturais conhecidas por cruzar a barreira hematoencefálica e estimular a síntese de NGF (Fator de Crescimento Nervoso). O NGF é essencial para sobrevivência, manutenção e crescimento de neurônios.`,
    mecanismo:[
      {ico:'🧠',label:'NGF',val:'Hericenones C e D estimulam síntese de NGF no SNC → neuroplasticidade'},
      {ico:'🔬',label:'Mielina',val:'Erinacinas promovem remielinização de axônios danificados'},
      {ico:'😌',label:'Ansiedade',val:'Inibição de ceramida no hipocampo → efeito ansiolítico em modelos animais'},
      {ico:'🧬',label:'BDNF',val:'Efeito indireto em BDNF (Fator Neurotrófico do Cérebro) via NGF'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2009',journal:'Phytother Res',titulo:'Lion\'s Mane e função cognitiva em idosos com MCI',achado:'+5,2 pontos no MMSE vs placebo após 16 semanas (p<0.001)',detalhe:'30 idosos com declínio cognitivo leve. 250mg 3x/dia. Efeito reverteu após cessação.',pmid:'18844328'},
      {tipo:'RCT',ano:'2019',journal:'Front Aging Neurosci',titulo:'Lion\'s Mane e ansiedade em adultos jovens',achado:'Redução de 32% na escala de ansiedade BAI vs placebo',detalhe:'Adultos jovens saudáveis. 1,8g/dia por 4 semanas. Melhora em humor e concentração.',pmid:'31140015'},
      {tipo:'Estudo in vitro + humano',ano:'2015',journal:'IJMS',titulo:'Estímulo de NGF e neuroproteção',achado:'Hericenones aumentaram NGF 3,7× em culturas neurais',detalhe:'Base mecanística confirmada. Tradução clínica em 8–12 semanas de uso contínuo.',pmid:'25869831'},
    ],
    seguranca:[
      {tipo:'ok',label:'Excelente perfil de segurança',texto:'Sem toxicidade reportada em estudos de até 16 semanas. GRAS (Generally Recognized as Safe).'},
      {tipo:'warn',label:'Alergia a cogumelos',texto:'Evitar em pessoas com histórico de alergia a outros fungos (shiitake, portobello).'},
      {tipo:'warn',label:'Preferir corpo de frutificação',texto:'Extrato do corpo de frutificação tem hericenones. Extrato de micélio tem erinacinas. Preferir extrato com ambos.'},
    ],
    risk_groups:[
      {grp:'Alergia a fungos / cogumelos','nivel':'warn','motivo':'Reação alérgica possível em sensibilizados a shiitake, portobello ou outros fungos. Testar dose mínima.'},
    ],
    common_myths:[
      {mito:'Lion\'s Mane age imediatamente como um nootrópico',refutacao:'FALSO. O efeito via NGF é CRÔNICO — hericenones e erinacinas estimulam crescimento neuronal que se manifesta em 8–12 semanas de uso contínuo. Não há efeito agudo de "foco" na primeira dose.'},
      {mito:'Micélio é igual ao corpo de frutificação','refutacao':'RELEVANTE. Hericenones (atividade NGF) estão principalmente no CORPO DE FRUTIFICAÇÃO. Erinacinas estão no micélio. Extratos apenas de micélio cultivados em substrato de grãos podem ter mais amido que fitoquímicos ativos. Preferir extratos com ambas as partes ou certificação de teor de hericenones.'},
    ],
  },
  19:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A Bacopa Monnieri é uma erva ayurvédica cujos princípios ativos — bacosídeos A e B — inibem a acetilcolinesterase (elevando acetilcolina) e protegem neurônios do estresse oxidativo. Diferente de estimulantes, seu efeito é acumulativo: requer 8–12 semanas para pleno efeito e persiste após cessação (neuroproteção de longo prazo via BDNF e NGF). Especialmente eficaz para memória de longo prazo e aprendizado.`,
    mecanismo:[
      {ico:'🧠',label:'Acetilcolina',val:'Bacosídeos inibem acetilcolinesterase → mais ACh disponível para sinapses colinérgicas'},
      {ico:'🔬',label:'BDNF',val:'Eleva BDNF no hipocampo → neuroplasticidade e consolidação de memória de longo prazo'},
      {ico:'🛡',label:'Antioxidante Neural',val:'Bacosídeos neutralizam radicais livres em mitocôndrias neuronais e inibem lipoperoxidação'},
      {ico:'⚖️',label:'Ansiedade',val:'Modula receptor GABA-A e reduz cortisol, gerando efeito ansiolítico sem sedação'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2014',journal:'J Ethnopharmacol',titulo:'Bacopa e memória (9 RCTs)',achado:'Melhora significativa em velocidade de processamento e memória de trabalho (p<0.01)',detalhe:'437 participantes. Dose típica: 300–450mg/dia (45% bacosídeos). Efeito em 12 semanas.',pmid:'24176230'},
      {tipo:'RCT',ano:'2008',journal:'J Altern Complement Med',titulo:'Bacopa e cognição em adultos saudáveis de 18–60 anos',achado:'+37% em retenção de novas informações vs placebo em 12 semanas',detalhe:'98 adultos saudáveis. 300mg/dia (45% bacosídeos). Redução de ansiedade também observada.',pmid:'18611150'},
      {tipo:'RCT',ano:'2012',journal:'J Med Food',titulo:'Bacopa e declínio cognitivo em idosos',achado:'Melhora de 15% no Teste de Aprendizado de Rey e −40% em ansiedade (STAI)',detalhe:'60 adultos >65 anos. 300mg/dia. Também reduziu cortisol matinal em 14%.',pmid:'22747190'},
    ],
    seguranca:[
      {tipo:'ok',label:'Segura em uso prolongado',texto:'Estudos de até 12 semanas sem efeitos adversos graves. Neuroprotegida confirmada em idosos.'},
      {tipo:'warn',label:'Desconforto gástrico',texto:'Deve ser tomada com refeição gordurosa para evitar náuseas. Bacosídeos são lipossolúveis.'},
      {tipo:'warn',label:'Sedação leve',texto:'Em pessoas sensíveis pode causar sonolência. Testar dose inicial baixa (150mg) e titular.'},
      {tipo:'ok',label:'Sem interação com estimulantes',texto:'Pode ser combinada com cafeína + teanina e nootrópicos. Não há interação negativa conhecida.'},
    ],
    risk_groups:[
      {grp:'Usuários de medicamentos colinérgicos (Alzheimer)','nivel':'warn','motivo':'Bacopa inibe acetilcolinesterase — combinada com donepezila/rivastigmina pode causar excesso colinérgico: bradicardia, hipersalivação, diarreia.'},
    ],
    common_myths:[
      {mito:'Bacopa age rapidamente como a cafeína','refutacao':'FALSO. Bacopa é neuroproteção CUMULATIVA. Requer 8–12 semanas de uso contínuo para efeito máximo. Meta-análise 2014 (9 RCTs): efeito cognitivo significativo em memória e velocidade de processamento aparece entre 6–12 semanas. Quem abandona na primeira semana nunca verá o efeito real.'},
    ],
  },
  20:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A Rhodiola Rosea é um adaptógeno ártico cujos compostos-chave (rosavinas e salidrosídeos) modulam o eixo HPA e atuam no nível das monoaminas cerebrais. Diferente da Ashwagandha (efeito em semanas), a Rhodiola produz efeito adaptogênico e energizante em 1–2 dias. Reduz fadiga mental e física, melhora performance cognitiva sob estresse e acelera recuperação após exercício intenso.`,
    mecanismo:[
      {ico:'⚡',label:'Monoaminas',val:'Rosavinas inibem MAO (monoamino oxidase) A e B → mais dopamina e serotonina disponíveis'},
      {ico:'📉',label:'Cortisol',val:'Salidrosídeos inibem liberação de cortisol via supressão do CRH hipotalâmico'},
      {ico:'🏃',label:'ATP Mitocondrial',val:'Aumenta síntese de ATP via ativação de AMPK e melhora da cadeia respiratória'},
      {ico:'🧠',label:'Neuroprotecção',val:'Salidrosídeos inibem apoptose neuronal via Bcl-2 e reduzem neuroinflamação'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2009',journal:'Phytomedicine',titulo:'Rhodiola e fadiga em estudantes durante exames',achado:'−24% de fadiga mental e +10% em desempenho cognitivo vs placebo em 20 dias',detalhe:'56 médicos jovens em turno noturno. 170mg 2x/dia. Efeito estabilizado já na primeira semana.',pmid:'19016404'},
      {tipo:'Meta-análise',ano:'2012',journal:'Phytomedicine',titulo:'Revisão de 11 estudos sobre Rhodiola e estresse',achado:'Melhora consistente em fadiga, humor e performance em 9 de 11 estudos (p<0.05)',detalhe:'Extrato WS® 1375 (1,8% rosavinas + 3% salidrosídeos). Dose eficaz: 170–680mg/dia.',pmid:'22895270'},
      {tipo:'RCT',ano:'2004',journal:'Phytother Res',titulo:'Rhodiola e exercício físico intenso',achado:'−10% de tempo de recuperação e −30% de danos oxidativos pós-maratona',detalhe:'Corredores de maratona. 600mg 1h antes da prova. Redução de CK e lactato 24h após.',pmid:'15260004'},
    ],
    seguranca:[
      {tipo:'ok',label:'Bem tolerada',texto:'Sem efeitos adversos graves em estudos de 12 semanas. GRAS por autoridades europeias (EMA).'},
      {tipo:'warn',label:'Estimulante suave',texto:'Pode causar agitação ou insônia se tomada após 14h. Preferir dose matinal em jejum.'},
      {tipo:'warn',label:'Ciclagem recomendada',texto:'Ciclos de 3 meses ON + 1 mês OFF para manter sensibilidade às rosavinas.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'Inibição leve de MAO pode potencializar medicamentos serotoninérgicos. Usar com cautela com antidepressivos.'},
    ],
    risk_groups:[
      {grp:'Transtorno Bipolar','nivel':'warn','motivo':'Rhodiola tem atividade estimulante/energizante. Pode precipitar episódios maníacos em predispostos. Usar com cautela.'},
    ],
    common_myths:[
      {mito:'Rhodiola e Ashwagandha fazem a mesma coisa','refutacao':'FALSO. São adaptógenos de PERFIL OPOSTO e complementar. Rhodiola: efeito RÁPIDO (1–2 dias), energizante, anti-fadiga via inibição de MAO-A/B. Ashwagandha: efeito TARDIO (4–8 semanas), ansiolítico, anabólico via redução de cortisol. Stack ideal combina os dois para cobertura completa.'},
    ],
  },
  21:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A Alpha-GPC (L-Alfa-glicerilfosforilcolina) é a forma de colina com maior biodisponibilidade ao cérebro (40% de colina elementar biodisponível). Após absorção, a Alpha-GPC cruza a barreira hematoencefálica e serve de precursor para a síntese de acetilcolina (ACh) — o principal neurotransmissor da memória, aprendizado e controle motor. Além do efeito colinérgico, estimula a secreção de GH via amplificação da grelina.`,
    mecanismo:[
      {ico:'🧠',label:'Acetilcolina',val:'Alpha-GPC → colina → acetilcolina via colina acetiltransferase (ChAT) em neurônios colinérgicos'},
      {ico:'💪',label:'GH (Hormônio do Crescimento)',val:'Potencializa pulsos de GH ao amplificar sinalização da grelina no hipotálamo'},
      {ico:'🔬',label:'Membrana Neuronal',val:'GPC é componente estrutural de fosfolipídeos de membrana — apoia plasticidade neuronal'},
      {ico:'⚡',label:'Força Neuromuscular',val:'Melhora recrutamento de unidades motoras via sinalização colinérgica na junção neuromuscular'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2008',journal:'J Int Soc Sports Nutr',titulo:'Alpha-GPC e pico de GH pós-exercício',achado:'+44% de pico de GH vs placebo 60 min após treino',detalhe:'7 homens, 600mg Alpha-GPC 90 min antes do treino. Efeito aditivo com exercício na liberação pulsátil de GH.',pmid:'19100367'},
      {tipo:'Meta-análise',ano:'2003',journal:'Aging Clin Exp Res',titulo:'Alpha-GPC e declínio cognitivo em idosos (13 RCTs)',achado:'Melhora significativa em 12 de 13 RCTs em pacientes com Alzheimer e MCI',detalhe:'1.570 pacientes. 400mg 3x/dia. Aprovado como medicamento (Choline alfoscerate) na Itália e Rússia.',pmid:'12748841'},
      {tipo:'RCT',ano:'2015',journal:'J Int Soc Sports Nutr',titulo:'Alpha-GPC e força muscular em atletas',achado:'+14% no pico de torque isométrico do quadríceps vs placebo',detalhe:'13 atletas universitários. Dose única de 600mg 90 min antes do teste. Efeito agudo confirmado.',pmid:'26175486'},
    ],
    seguranca:[
      {tipo:'ok',label:'Segura em doses terapêuticas',texto:'400–600mg/dia é a dose mais estudada. Sem hepatotoxicidade, cardiotoxicidade ou efeitos endócrinos adversos.'},
      {tipo:'warn',label:'Cefaleia em doses altas',texto:'Acima de 1g pode ocorrer dor de cabeça por hiperestimulação colinérgica. Não exceder 1g/dia sem acompanhamento.'},
      {tipo:'warn',label:'Síndrome colinérgica',texto:'Em pessoas com miastenia gravis ou em uso de inibidores de colinesterase, pode haver exacerbação colinérgica.'},
    ],
    risk_groups:[],
    common_myths:[
      {mito:'Qualquer forma de colina é igual à Alpha-GPC','refutacao':'FALSO. Alpha-GPC tem 40% de colina elementar e alta biodisponibilidade cerebral. Colina bitartarato tem menos de 40% e atravessa pior a BHE. CDP-colina (citicolina) é equivalente mas mais cara. Lecitina de soja tem colina mas em doses muito baixas por cápsula.'},
    ],
  },
  22:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A L-Teanina (γ-glutamiletionamina) é um aminoácido exclusivo do chá verde (Camellia sinensis) que cruza a barreira hematoencefálica e modula vários neurotransmissores simultaneamente. Aumenta ondas alfa cerebrais (8–14 Hz) — o estado de "relaxamento alerta" — sem causar sedação. Eleva GABA, serotonina e dopamina enquanto reduz adrenalina. Em combinação com cafeína, é a dupla psicoativa mais bem estudada na literatura.`,
    mecanismo:[
      {ico:'🌊',label:'Ondas Alfa',val:'Aumenta potência de ondas alfa EEG em 30 min → foco tranquilo sem sonolência'},
      {ico:'⚖️',label:'GABA',val:'Estimula receptores GABA-A → reduz excitabilidade neuronal e ansiedade'},
      {ico:'🔬',label:'Glutamato',val:'Bloqueia receptores NMDA e AMPA → reduz hiperexcitação e neurotoxicidade'},
      {ico:'☕',label:'Sinergia Cafeína',val:'Neutraliza vasoconstrição e ansiedade da cafeína mantendo seu efeito estimulante'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2007',journal:'Asia Pac J Clin Nutr',titulo:'L-teanina e ondas alfa em EEG',achado:'+8% em potência de ondas alfa no córtex occipital em 40 min',detalhe:'16 voluntários. 50mg de L-teanina. Comparado ao placebo. Diferença significativa em p<0.01.',pmid:'17182482'},
      {tipo:'RCT',ano:'2008',journal:'Biol Psychol',titulo:'L-teanina, cafeína e performance cognitiva',achado:'Combo 97mg cafeína + 99mg teanina: +20% em atenção sustentada vs cafeína isolada',detalhe:'44 participantes, tarefa de atenção de 90 min. Teanina eliminou jitter da cafeína sem reduzir alerta.',pmid:'18006208'},
      {tipo:'RCT',ano:'2016',journal:'Nutrients',titulo:'L-teanina e estresse em profissionais',achado:'Redução de −35% no cortisol salivar e −17% no escore de ansiedade (STAI)',detalhe:'34 adultos sob estresse agudo. 200mg de L-teanina. Efeito em 30 minutos.',pmid:'27396868'},
    ],
    seguranca:[
      {tipo:'ok',label:'Excelente segurança',texto:'GRAS (Generally Recognized as Safe) pelo FDA. Sem efeitos adversos em estudos de até 8 semanas com 400mg/dia.'},
      {tipo:'ok',label:'Sem tolerância ou dependência',texto:'Ao contrário da cafeína, a teanina não desenvolve tolerância. Pode ser usada diariamente sem perda de efeito.'},
      {tipo:'ok',label:'Segura em gravidez (dose de chá)',texto:'Dose do chá verde (~25mg/xícara) é segura. Suplementos de alta dose (>200mg) carecem de estudos gestacionais.'},
    ],
    risk_groups:[],
    common_myths:[
      {mito:'L-Teanina causa sedação','refutacao':'FALSO. Teanina eleva ondas alfa (relaxamento alerta) mas NÃO eleva ondas delta/teta (sedação). Estudos EEG confirmam: relaxamento sem sonolência. É por isso que chá verde (rico em teanina) não é sedativo apesar de ter menos cafeína que o café.'},
    ],
  },
  23:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`O Ômega-3 marinho (EPA e DHA) é o lipídeo mais estudado para saúde cardiovascular e neurológica. EPA reduz triglicerídeos e inflamação via resolução (resolvinas, protectinas). DHA é o principal ácido graxo estrutural do cérebro (40% das membranas dos neurônios) e da retina. Ambos modulam positivamente a expressão gênica via PPARγ.`,
    mecanismo:[
      {ico:'❤️',label:'Triglicerídeos',val:'EPA inibe diacilglicerol aciltransferase hepática → reduz produção de VLDL'},
      {ico:'🔥',label:'Anti-inflamação',val:'EPA → resolvinas E1–E4 e lipoxinas → resolução ativa da inflamação'},
      {ico:'🧠',label:'DHA Cerebral',val:'DHA é incorporado em membranas neurais → sinapses mais fluidas e funcionais'},
      {ico:'🩸',label:'Plaquetas',val:'Reduz agregação plaquetária via PGI3 vs TXA2 → menos trombose'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2019',journal:'NEJM / REDUCE-IT',titulo:'EPA e eventos cardiovasculares em alto risco',achado:'−25% de eventos cardiovasculares maiores (MACE) com 4g/dia de EPA',detalhe:'8.179 pacientes por 4,9 anos. Redução de 28% de morte cardiovascular. Droga aprovada: icosapentaenoato de etila.',pmid:'29963978'},
      {tipo:'Meta-análise',ano:'2018',journal:'J Clin Lipidol',titulo:'Ômega-3 e triglicerídeos (78 estudos)',achado:'Redução média de −45% de triglicerídeos com 4g/dia de EPA+DHA',detalhe:'Efeito dose-dependente. 2g/dia reduz 20–25%. 4g/dia: 40–50%.',pmid:'30098246'},
      {tipo:'Meta-análise',ano:'2020',journal:'Nat Commun',titulo:'EPA/DHA e saúde cerebral — OMEGA-3 INDEX',achado:'Índice ômega-3 >8% associado a −39% de demência e −27% de AVC vs índice <4%',detalhe:'Análise de 17 coortes prospectivas, 45.637 participantes. EPA+DHA nos eritrócitos como biomarcador de risco.',pmid:'33173094'},
    ],
    seguranca:[
      {tipo:'ok',label:'Muito seguro até 4g/dia',texto:'FDA aprovou 4g/dia como GRAS. EFSA endossou segurança até 5g/dia.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'Doses acima de 3g/dia têm atividade antiagregante plaquetária. Monitorar com warfarina.'},
      {tipo:'warn',label:'Qualidade é crítica',texto:'Verificar certificação IFOS ou análise de metais pesados. Preferir formas rTG (triglicerídeo reesterificado).'},
    ],
    risk_groups:[
      {grp:'Anticoagulantes (Warfarina, AAS)','nivel':'warn','motivo':'Doses >3g/dia de EPA+DHA têm atividade antiagregante plaquetária. Monitorar INR com médico.'},
    ],
    common_myths:[
      {mito:'Qualquer ômega-3 serve — o de peixe é igual ao de chia/linhaça',refutacao:'FALSO. EPA e DHA (de peixe) são biologicamente ativos. ALA (de chia/linhaça) é convertido em EPA/DHA com eficiência <5% em humanos. Para efeitos cardiovasculares e cerebrais, fontes marinhas são necessárias.'},
      {mito:'Tomar ômega-3 em qualquer horário é igual',refutacao:'PARCIALMENTE FALSO. Absorção é otimizada com refeição gordurosa (+50%). Forma rTG (triglicerídeo reesterificado) é 70% mais biodisponível que EE (etil éster).'},
    ],
  },
  24:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`O Magnésio Treonato (MgT) é uma forma patenteada (Magtein®) desenvolvida pelo MIT para maximizar o transporte de magnésio ao SNC. Diferente de outras formas, o MgT cruza a barreira hematoencefálica com alta eficiência, aumentando a concentração de magnésio no líquor cerebrospinal e no hipocampo (sede da memória).`,
    mecanismo:[
      {ico:'🧠',label:'Hipocampo',val:'MgT aumenta densidade de sinapses no hipocampo em até +100% (modelos animais)'},
      {ico:'🔬',label:'NMDA',val:'Magnésio regula receptores NMDA (glutamato) → plasticidade sináptica'},
      {ico:'😴',label:'Sono NREM',val:'MgT combinado com glicina melhora eficiência do sono e memória consolidada'},
      {ico:'📚',label:'LTP',val:'Potenciação de Longo Prazo (LTP) — base biológica do aprendizado'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2016',journal:'Neuropharm',titulo:'MgT e cognição em adultos de 50–70 anos',achado:'Melhora de 9 anos na "idade cognitiva" avaliada em 12 semanas',detalhe:'44 adultos com declínio cognitivo. 2g/dia. Executivo, memória de trabalho e atenção melhorados.',pmid:'27412962'},
      {tipo:'Estudo MIT',ano:'2010',journal:'Neuron',titulo:'Papel do magnésio na plasticidade sináptica',achado:'MgT eleva Mg cerebrospinal em 15% (vs. outras formas que não o elevam)',detalhe:'Estudo seminal do MIT (Liu et al.) que estabeleceu o MgT como forma preferencial para SNC.',pmid:'20152124'},
      {tipo:'RCT',ano:'2022',journal:'Front Aging Neurosci',titulo:'MgT e cognição em adultos de meia-idade (40–65 anos)',achado:'Melhora de +9,4 pontos no escore composto de cognição vs placebo em 12 semanas',detalhe:'109 participantes. 1,5–2g/dia. Melhora significativa em memória episódica, atenção e velocidade de processamento.',pmid:'36304010'},
    ],
    seguranca:[
      {tipo:'ok',label:'Muito bem tolerado',texto:'Forma quelada com treonato. Sem efeitos laxativos. Estudos de 12 semanas sem efeitos adversos.'},
      {tipo:'warn',label:'Custo elevado',texto:'MgT é mais caro que outras formas. Para efeitos sistêmicos (músculo, coração), magnésio glicinato é igualmente eficaz e mais barato.'},
    ],
    risk_groups:[],
    common_myths:[
      {mito:'Magnésio treonato é superior para todos os efeitos do magnésio',refutacao:'FALSO. MgT é superior especificamente para efeitos cerebrais (barreira hematoencefálica). Para músculo, sono geral, e testosterona — o glicinato tem evidência equivalente e custo menor.'},
    ],
  },
  25:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`A Coenzima Q10 (CoQ10 ou ubiquinona/ubiquinol) é uma molécula lipossolúvel indispensável para a cadeia de transporte de elétrons mitocondrial (Complexos I, II e III). Sem CoQ10, a produção de ATP cessa. Além disso, é um dos mais potentes antioxidantes lipossolúveis do organismo, protegendo LDL e membranas celulares da oxidação. A forma ubiquinol (reduzida) é 2–8× mais biodisponível que a ubiquinona (oxidada). A síntese endógena declina com a idade e é bloqueada pelas estatinas.`,
    mecanismo:[
      {ico:'⚡',label:'ATP Mitocondrial',val:'Carreador de elétrons nos Complexos I→III da cadeia respiratória → síntese de ATP'},
      {ico:'🛡',label:'Antioxidante',val:'Ubiquinol recicla vitamina E e C, neutralizando radicais livres em membranas lipídicas'},
      {ico:'❤️',label:'Função Cardíaca',val:'Miocárdio tem maior concentração de CoQ10. Essencial para contração muscular cardíaca.'},
      {ico:'💊',label:'Estatinas',val:'Estatinas bloqueiam a via do mevalonato → suprimem síntese de CoQ10 → suplementação essencial'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2013',journal:'J Hum Hypertens',titulo:'CoQ10 e pressão arterial (12 RCTs)',achado:'Redução de −11 mmHg na PAS e −7 mmHg na PAD vs placebo',detalhe:'362 pacientes hipertensos. Ubiquinol 200mg/dia. Mecanismo: redução de resistência vascular.',pmid:'23364626'},
      {tipo:'RCT',ano:'2014',journal:'JACC Heart Fail',titulo:'CoQ10 e mortalidade cardiovascular (Q-SYMBIO)',achado:'−43% de mortalidade cardiovascular em insuficiência cardíaca com 3 anos de CoQ10',detalhe:'420 pacientes com IC grave. 300mg/dia. Primeiro suplemento a reduzir mortalidade cardiovascular em RCT.',pmid:'25066585'},
      {tipo:'RCT',ano:'2018',journal:'Muscle Nerve',titulo:'CoQ10 e miopatia por estatinas',achado:'−38% na dor muscular (CK e escala visual) vs placebo após 60 dias',detalhe:'Pacientes com miopatia induzida por estatinas. 600mg/dia de CoQ10. Melhora em força e tolerância.',pmid:'28750151'},
    ],
    seguranca:[
      {tipo:'ok',label:'Muito bem tolerado',texto:'Sem toxicidade em estudos de até 30 meses com 1.200mg/dia. Perfil de efeitos adversos similar ao placebo.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'CoQ10 tem estrutura química similar à vitamina K. Pode reduzir levemente INR em pacientes com warfarina.'},
      {tipo:'warn',label:'Preferir ubiquinol',texto:'Ubiquinol (forma reduzida) tem 8× mais biodisponibilidade. Acima de 40 anos, o organismo converte ubiquinona menos eficientemente.'},
    ],
    risk_groups:[
      {grp:'Usuários de estatinas','nivel':'warn','motivo':'Estatinas inibem a síntese de CoQ10 (via mesmo caminho do colesterol). Suplementar 100–200mg/dia é quase obrigatório para quem usa estatinas cronicamente.'},
      {grp:'Anticoagulantes','nivel':'warn','motivo':'CoQ10 pode ter leve efeito sobre coagulação. Monitorar INR com warfarina.'},
    ],
    common_myths:[
      {mito:'CoQ10 e ubiquinol são a mesma coisa','refutacao':'NUANCE IMPORTANTE. CoQ10 (ubiquinona) precisa ser reduzido a ubiquinol pelo organismo. Em jovens, essa conversão é eficiente. Em &gt;40 anos, a conversão declina — nesse caso ubiquinol já na forma ativa é superior. Para &lt;35 anos, ubiquinona é igualmente eficaz e mais barato.'},
    ],
  },
  26:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`As Beta-glucanas 1,3-D e 1,6-D são polissacarídeos da parede celular de fungos medicinais (Reishi, Shiitake, Maitake, Turkey Tail) que atuam como modificadores da resposta biológica (BRMs). Elas são reconhecidas por receptores Dectin-1 e TLR2 em macrófagos e células NK, desencadeando uma cascata imune que prepara o organismo para patógenos sem causar inflamação excessiva — imunidade de base.`,
    mecanismo:[
      {ico:'🦠',label:'Macrófagos',val:'Beta-glucanas ligam Dectin-1 → ativação e polarização M1 de macrófagos'},
      {ico:'🔪',label:'Células NK',val:'Amplificam citotoxicidade de células Natural Killer → defesa antitumoral'},
      {ico:'🧬',label:'Citocinas',val:'Aumentam IL-2, IL-10 e IFN-γ — reguladores da resposta imune adaptativa'},
      {ico:'🛡',label:'Anticorpos',val:'Potencializam produção de IgA secretória nas mucosas — primeira linha de defesa'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2014',journal:'J Am Coll Nutr',titulo:'Beta-glucanas e infecções respiratórias (11 RCTs)',achado:'−25% de incidência de IVAS e −31% de duração dos sintomas vs placebo',detalhe:'1.100 adultos saudáveis. Beta-glucana 250–900mg/dia. Efeito mais robusto em pessoas com alta exposição (professores, militares).',pmid:'24724766'},
      {tipo:'RCT',ano:'2010',journal:'J Appl Physiol',titulo:'Beta-glucanas e imunidade pós-maratona',achado:'Incidência de infecções respiratórias 3× menor vs placebo nas 2 semanas pós-corrida',detalhe:'75 maratonistas. 1g/dia de beta-glucana de aveia. Prevenção da imunossupressão induzida pelo exercício intenso.',pmid:'20847257'},
      {tipo:'Meta-análise',ano:'2020',journal:'Nutrients',titulo:'Beta-glucanas e imunidade (54 estudos)',achado:'Redução de −22% de dias de infecção e −28% de gravidade dos sintomas vs placebo',detalhe:'Análise abrangente de beta-glucanas de aveia, cogumelos e leveduras. Ativação de macrófagos e células NK confirmada.',pmid:'32942756'},
    ],
    seguranca:[
      {tipo:'ok',label:'Excelente segurança',texto:'Consumo milenar de cogumelos medicinais. Estudos de 12 semanas com até 2g/dia sem efeitos adversos.'},
      {tipo:'warn',label:'Doenças autoimunes',texto:'Em doenças autoimunes ativas (lúpus, EM, AR), a estimulação imune pode ser contraindicada. Consultar médico.'},
      {tipo:'ok',label:'Sinérgico com vitamina C e zinco',texto:'Combinação com micronutrientes imunológicos amplifica o efeito. Não há interação negativa conhecida.'},
    ],
    risk_groups:[
      {grp:'Imunossuprimidos / transplantados','nivel':'warn','motivo':'Beta-glucanas estimulam sistema imune — pode contrabalançar imunossupressores em transplantados. Consultar médico.'},
    ],
    common_myths:[
      {mito:'Beta-glucana de aveia é igual à de cogumelo','refutacao':'FALSO. Beta-glucanas de aveia são predominantemente (1,3/1,4)-β-D-glucanas (efeito colesterol). Beta-glucanas de cogumelos são (1,3/1,6)-β-D-glucanas com atividade imunomoduladora via receptores Dectin-1 em macrófagos. Estrutura molecular define o efeito — não são interchangeáveis.'},
    ],
  },
  27:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`A Vitamina C (ácido ascórbico) é um antioxidante hidrossolúvel essencial para humanos (não sintetizamos endogenamente). A forma tamponada (ascorbato de sódio ou cálcio) tem o mesmo efeito fisiológico com pH neutro — ideal para quem tem sensibilidade gástrica. É cofatora da síntese de colágeno (hidroxilação de prolina e lisina via prolil e lisil hidroxilases), da síntese de carnitina, da absorção de ferro não-heme e da regeneração de vitamina E.`,
    mecanismo:[
      {ico:'🧬',label:'Colágeno',val:'Cofator obrigatório de prolil e lisil hidroxilase → síntese de colágeno estável'},
      {ico:'🦠',label:'Imunidade',val:'Acumula em neutrófilos (50× a concentração plasmática) → ativação e quimiotaxia'},
      {ico:'🛡',label:'Antioxidante',val:'Doa elétrons para regenerar vitamina E e glutationa oxidadas'},
      {ico:'🔴',label:'Ferro',val:'Reduz Fe³⁺ a Fe²⁺ no intestino → aumenta absorção de ferro não-heme em 3–4×'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2013',journal:'Cochrane Review',titulo:'Vitamina C e duração do resfriado comum',achado:'Redução de −14% na duração em atletas com alto stress físico',detalhe:'29 RCTs, 11.306 participantes. Em pessoas comuns, não previne mas reduz duração em 8%. Em atletas, reduz incidência em 50%.',pmid:'23440782'},
      {tipo:'RCT',ano:'2020',journal:'Nutrients',titulo:'Vitamina C e colágeno para articulações',achado:'Melhora de 40% em dor articular vs placebo com combo vitamina C + colágeno',detalhe:'Colágeno hidrolisado + 48mg vitamina C pré-treino. Shaw et al. Vitamina C é essencial para síntese de colágeno pós-estímulo.',pmid:'31936667'},
      {tipo:'Meta-análise',ano:'2017',journal:'Nutrients',titulo:'Vitamina C intravenosa e tempo de internação em UTI',achado:'Redução de −7,8% no tempo de internação com 1–3g/dia de vitamina C IV',detalhe:'18 estudos, 2.004 pacientes de UTI. Efeito mais robusto em sepse e pós-operatório cardíaco.',pmid:'29099763'},
    ],
    seguranca:[
      {tipo:'ok',label:'Muito seguro em doses moderadas',texto:'Até 2g/dia tem excelente perfil de segurança. Forma tamponada é mais bem tolerada que o ácido livre.'},
      {tipo:'warn',label:'Oxalúria em doses altas',texto:'Acima de 2g/dia cronicamente, pode elevar oxalato urinário e risco de pedra nos rins em predispostos.'},
      {tipo:'warn',label:'Interação com ferro',texto:'A vitamina C potencializa absorção de ferro. Em hemocromatose ou policitemia, monitorar com médico.'},
    ],
    risk_groups:[
      {grp:'Hemocromatose','nivel':'warn','motivo':'Vitamina C aumenta absorção de ferro não-heme. Em pessoas com sobrecarga de ferro, pode agravar a condição.'},
      {grp:'Cálculos renais de oxalato','nivel':'warn','motivo':'Doses >1g/dia aumentam oxalúria. Pessoas com histórico de cálculos devem manter <500mg/dia.'},
    ],
    common_myths:[
      {mito:'Vitamina C megadose cura resfriados','refutacao':'EXAGERADO. Meta-análise Cochrane 2023 (29 estudos): vitamina C reduz DURAÇÃO do resfriado em 8–14% em adultos, mas NÃO previne resfriados em população geral. Em atletas de alta performance e condições de estresse extremo, a prevenção é mais evidente. Megadoses &gt;2g/dia não oferecem benefício adicional para a maioria.'},
    ],
  },
  28:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`A Quercetina é o flavonoide mais abundante da dieta ocidental (maçã, cebola, alcaparra), com potente atividade antiviral, anti-inflamatória e ionófora de zinco. A forma fitossomada (complexada com fosfatidilcolina de soja) supera a biodisponibilidade da quercetina padrão em até 20×, tornando viáveis as doses utilizadas nos estudos. Seu mecanismo antiviral mais relevante é a inibição de RNA polimerases virais e a facilitação da entrada de zinco nas células.`,
    mecanismo:[
      {ico:'🦠',label:'Antiviral',val:'Inibe RNA polimerase dependente de RNA em vírus RNA (influenza, coronavírus, rinovírus)'},
      {ico:'🔑',label:'Ionóforo de Zinco',val:'Transporta zinco para dentro de células infectadas → zinco inibe replicação viral'},
      {ico:'📉',label:'NF-κB',val:'Inibe NF-κB → reduz cascata inflamatória e produção de citocinas pró-inflamatórias'},
      {ico:'⚡',label:'AMPK',val:'Ativa AMPK (sensor de energia) → melhora sensibilidade à insulina e longevidade celular'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2011',journal:'Phytother Res',titulo:'Quercetina e infecções respiratórias em atletas',achado:'−33% de incidência de IVAS em atletas de alta intensidade em 12 semanas',detalhe:'1g/dia de quercetina + vitamina C + niacinamida. 1.002 ciclistas. Efeito mais robusto em atletas com maior estresse imune.',pmid:'21542856'},
      {tipo:'RCT',ano:'2021',journal:'Int J Gen Med',titulo:'Quercetina e COVID-19 leve a moderado',achado:'−68% de hospitalização e −45% de duração sintomática vs placebo',detalhe:'152 pacientes com COVID leve-moderado. 1g/dia + vitamina C + zinco. Não substitui vacinas/tratamento.',pmid:'34276853'},
      {tipo:'RCT',ano:'2022',journal:'Phytother Res',titulo:'Quercetina fitossomada e longevidade celular (senolytics)',achado:'Redução de −30% em marcadores de senescência celular (p16, p21, SA-β-Gal) após 4 semanas',detalhe:'40 adultos de 65–80 anos. 500mg 2x/dia. Primeiros dados de ação senolítica da quercetina em humanos.',pmid:'35475282'},
    ],
    seguranca:[
      {tipo:'ok',label:'Bem tolerada em doses terapêuticas',texto:'500–1000mg/dia de quercetina fitossomada sem eventos adversos significativos em estudos de 12 semanas.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'Quercetina inibe CYP3A4 e P-glicoproteína, podendo elevar níveis de warfarina, ciclosporina e outras drogas metabolizadas por essas vias.'},
      {tipo:'warn',label:'Gravidez',texto:'Dados insuficientes de segurança em gestação. Evitar doses suplementares.'},
    ],
    risk_groups:[
      {grp:'Imunossupressores (ciclosporina)','nivel':'bad','motivo':'Quercetina inibe CYP3A4 → eleva nível plasmático de imunossupressores. Risco de toxicidade imunossupressora.'},
    ],
    common_myths:[
      {mito:'Quercetina comum absorve bem','refutacao':'FALSO. Quercetina aglicona tem biodisponibilidade de <3–5%. Formas fitossomadas (complexo com fosfatidilcolina) têm biodisponibilidade até 20× superior. Sempre verificar se é quercetina fitossomada ou padronizada para absorção.'},
    ],
  },
  29:{
    ev:3,
    scientific_evidence_level:'C',
    resumo:`A Catuaba (Trichilia catigua, Erythroxylum catuaba) é um arbusto amazônico cujas cascas contêm catuabinas A, B e C — alcaloides com ação sobre o sistema nervoso central dopaminérgico e noradrenérgico. Estimula a liberação de dopamina e noradrenalina em regiões límbicas, melhorando libido, excitação sexual e sensações. Considerada um afrodisíaco clínico na medicina tradicional brasileira, com estudos modernos ainda limitados mas crescentes.`,
    mecanismo:[
      {ico:'🧠',label:'Dopamina',val:'Catuabinas potencializam liberação de dopamina no núcleo accumbens → motivação e desejo sexual'},
      {ico:'⚡',label:'Noradrenalina',val:'Aumenta noradrenalina simpática → vasodilatação periférica e facilitação da ereção'},
      {ico:'🔬',label:'PDE-5',val:'Estudos in vitro sugerem inibição discreta de PDE-5 — mecanismo similar ao sildenafil'},
      {ico:'🛡',label:'Antioxidante',val:'Catuabinas neutralizam radicais livres e protegem neurônios dopaminérgicos'},
    ],
    estudos:[
      {tipo:'Estudo clínico',ano:'2007',journal:'Phytomedicine',titulo:'Catuaba e função sexual em homens com DE leve',achado:'+45% de escore IIEF vs placebo após 8 semanas',detalhe:'28 homens com disfunção erétil leve. 300mg/dia. Aumento de libido e qualidade das ereções. Estudo aberto.',pmid:'17596974'},
      {tipo:'In vitro',ano:'2011',journal:'J Ethnopharmacol',titulo:'Catuabinas e neuroproteção dopaminérgica',achado:'Proteção de 70% de neurônios dopaminérgicos contra toxicidade por 6-OHDA',detalhe:'Base mecanística da ação dopaminérgica. Também demonstrou efeito antidepressivo em modelos animais.',pmid:'21699961'},
      {tipo:'Estudo animal',ano:'2017',journal:'J Ethnopharmacol',titulo:'Catuaba e efeito antidepressivo comparado com fluoxetina',achado:'Extrato de Trichilia catigua igualou a fluoxetina no FST (forced swim test) em roedores',detalhe:'Múltiplos modelos de depressão. Ação dopaminérgica e noradrenérgica confirma o mecanismo de ação.',pmid:'28040481'},
    ],
    seguranca:[
      {tipo:'ok',label:'Bem tolerada nas doses tradicionais',texto:'300–500mg/dia sem efeitos adversos relatados em estudos de curto prazo. Amplo uso histórico na medicina popular.'},
      {tipo:'warn',label:'Hipertensão',texto:'A ação noradrenérgica pode elevar levemente a pressão arterial em hipertensos. Monitorar.'},
      {tipo:'warn',label:'IMAOs',texto:'Como outras plantas dopaminérgicas, evitar combinação com IMAOs por risco de crise hipertensiva.'},
    ],
    risk_groups:[],
    common_myths:[
      {mito:'Catuaba tem evidência científica robusta como o Tongkat Ali','refutacao':'FALSO. A evidência de Catuaba é de BAIXA qualidade — principalmente estudos in vitro, animais e relatos anedóticos. Não há RCTs humanos de qualidade comparáveis ao Tongkat Ali ou Ashwagandha. Classificação de evidência: C. Efeito anedótico expressivo mas base científica fraca.'},
    ],
  },
  30:{
    ev:3,
    scientific_evidence_level:'C',
    resumo:`A Marapuama (Ptychopetalum olacoides), conhecida como "madeira da potência" ou Muira Puama, é uma planta amazônica com uso tradicional para disfunção erétil e neurostenia. Seus compostos ativos (ácido ptychopetalico, lupeol, beta-sitosterol) atuam principalmente no sistema nervoso autônomo, facilitando a resposta erétil via estimulação parassimpática, e podem modular receptores colinérgicos e dopaminérgicos.`,
    mecanismo:[
      {ico:'🧠',label:'Colinérgico',val:'Potencializa acetilcolina no sistema nervoso autônomo → facilita vasodilatação genital'},
      {ico:'⚡',label:'Dopamina',val:'Extratos inibem MAO-B → eleva dopamina → melhora desejo e função sexual'},
      {ico:'🔬',label:'Beta-Sitosterol',val:'Fitosterol com atividade anti-inflamatória na próstata e melhora do fluxo urinário'},
      {ico:'🧬',label:'Neuroadaptogênico',val:'Estudos em modelos animais sugerem efeito adaptogênico sobre estresse oxidativo neural'},
    ],
    estudos:[
      {tipo:'Estudo clínico',ano:'1994',journal:'Am J Nat Med',titulo:'Marapuama e disfunção erétil (estudo Waynberg)',achado:'Melhora em 51% dos casos de DE e aumento de libido em 62% dos participantes',detalhe:'262 homens com DE ou libido reduzida. 1–1,5g/dia por 2 semanas. Estudo aberto, sem controle. Base histórica da indicação.',pmid:''},
      {tipo:'Estudo animal',ano:'2009',journal:'Phytother Res',titulo:'Ptychopetalum e função sexual em modelos animais',achado:'Aumento de 100% no índice de monta e de 40% em comportamento sexual vs controle',detalhe:'Modelo animal validado de disfunção sexual. Extratos aquosos e etanólicos. Base para estudos humanos futuros.',pmid:'19551706'},
      {tipo:'Estudo clínico',ano:'2000',journal:'J Sex Marital Ther',titulo:'Marapuama + Ginkgo e libido feminina',achado:'Melhora de libido e satisfação sexual em 65% das mulheres tratadas com combinação',detalhe:'202 mulheres com libido reduzida. Combinação de 175mg Marapuama + 120mg Ginkgo. Estudo de longo prazo.',pmid:'10728109'},
    ],
    seguranca:[
      {tipo:'ok',label:'Segura em doses tradicionais',texto:'500mg–1g/dia sem efeitos adversos sérios. Longo histórico de uso popular sem relatos de toxicidade significativa.'},
      {tipo:'warn',label:'Dados humanos limitados',texto:'A maioria dos estudos é em animais ou estudos abertos sem controle. Evidência ainda incipiente para humanos.'},
      {tipo:'warn',label:'IMAOs',texto:'A inibição de MAO-B pode interagir com antidepressivos IMAOs. Evitar combinação.'},
    ],
    risk_groups:[],
    common_myths:[
      {mito:'Marapuama funciona como um viagra natural','refutacao':'PARCIALMENTE VERDADEIRO mas exagerado. O estudo clássico citado (51% de melhora) é observacional sem placebo e de 1994. A marapuama age no SNA facilitando resposta erétil — efeito real mas muito mais lento e modesto que inibidores de PDE5. Melhor como complemento de longo prazo que agente agudo.'},
    ],
  },
  31:{
    ev:3,
    scientific_evidence_level:'C',
    resumo:`O Saw Palmetto (Serenoa repens) é um arbusto cujos frutos contêm ácidos graxos livres (ácido láurico, ácido mirístico) e fitosteróis que inibem a enzima 5-alfa-redutase tipos 1 e 2. Essa enzima converte testosterona em DHT (dihidrotestosterona), que em excesso é o principal mediador da hiperplasia benigna da próstata (HBP) e da alopecia androgênica. O Saw Palmetto reduz a conversão sem alterar a testosterona total sérica.`,
    mecanismo:[
      {ico:'🔬',label:'5α-Redutase',val:'Ácidos graxos inibem 5α-redutase tipos 1 e 2 → reduz DHT local (próstata, folículo piloso)'},
      {ico:'🚿',label:'Próstata',val:'Reduz hiperplasia do epitélio prostático → melhora sintomas urinários (LUTS)'},
      {ico:'💊',label:'Anti-inflamatório',val:'Inibe COX-1, COX-2 e 5-LOX → reduz inflamação prostática'},
      {ico:'🔓',label:'Receptores Androgênicos',val:'Bloqueia receptores DHT nas células prostáticas sem afetar testosterona sistêmica'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2002',journal:'Urology',titulo:'Saw Palmetto e sintomas urinários (HBP)',achado:'Melhora de 20–25% nos sintomas urinários vs placebo. Efeito similar à finasterida',detalhe:'18 RCTs, 2.939 homens. 320mg/dia de extrato padronizado. Menos efeitos adversos que a finasterida.',pmid:'12139048'},
      {tipo:'RCT',ano:'2018',journal:'J Altern Complement Med',titulo:'Saw Palmetto e alopecia androgênica',achado:'Aumento de 60% na densidade capilar vs placebo em 24 semanas',detalhe:'100 homens com alopecia AGA. 320mg/dia. Menos eficaz que finasterida oral, mas sem efeitos sexuais adversos.',pmid:'28700274'},
      {tipo:'Meta-análise',ano:'2009',journal:'Ann Pharmacother',titulo:'Saw Palmetto vs finasterida — revisão de longo prazo',achado:'Benefício similar nos sintomas IPSS em 1–2 anos, com perfil de efeitos adversos muito mais favorável',detalhe:'Efeitos adversos sexuais (DE, redução de libido): 1,1% com Saw Palmetto vs 4,9% com finasterida.',pmid:'19174558'},
    ],
    seguranca:[
      {tipo:'ok',label:'Bem tolerado',texto:'320mg/dia de extrato padronizado (85–95% ácidos graxos). Sem efeitos adversos sérios em até 3 anos de uso.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'Risco de potencialização antiagregante. Cessar 2 semanas antes de cirurgias.'},
      {tipo:'warn',label:'Diagnóstico prévio',texto:'Sintomas urinários podem mascarar câncer de próstata. Realizar PSA e exame digital antes de iniciar.'},
    ],
    risk_groups:[
      {grp:'Gravidez / amamentação','nivel':'bad','motivo':'Atividade anti-androgênica e anti-estrogênica. Contraindicado na gestação.'},
    ],
    common_myths:[
      {mito:'Saw Palmetto previne calvície ao bloquear DHT','refutacao':'EVIDÊNCIA FRACA. Embora iniba 5-alfa-redutase, a inibição é muito mais branda que finasterida farmacêutica. Não há RCT de qualidade demonstrando reversão de alopecia androgênica com Saw Palmetto. Tem ação em saúde prostática com melhor evidência.'},
    ],
  },
  32:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`O Panax Ginseng (ginseng asiático ou coreano) contém ginsenosídeos Rb1, Rb2, Rc, Rd (série Rb — sedativos/ansiolíticos) e Rg1, Rg2, Rf (série Rg — estimulantes). Essa dualidade o torna um adaptógeno verdadeiro: regula o eixo HPA bidirecionalmente. O mecanismo para função erétil é via estímulo da síntese de óxido nítrico (NO) no endotélio vascular dos corpos cavernosos, mediado pelos ginsenosídeos Rb1 e Rg1.`,
    mecanismo:[
      {ico:'💨
      {grp:'Hipertensão Arterial',nivel:'warn',motivo:'Cafeína eleva PAS em 3–4 mmHg agudamente. Em hipertensos não controlados, monitorar PA. Preferir doses ≤100mg.'},
      {grp:'Ansiedade / TAG',nivel:'warn',motivo:'Cafeína amplifica ativação simpática e pode deflagrar crises de ansiedade ou pânico em predispostos. Iniciar com 50–100mg + teanina.'},
      {grp:'Insônia Crônica',nivel:'bad',motivo:'Cafeína a qualquer hora do dia pode comprometer N3 (sono profundo) — mesmo sem insônia percebida. Evitar ou restringir a ≤100mg antes das 10h.'},
      {grp:'Arritmia / Taquicardia',nivel:'bad',motivo:'Cafeína aumenta frequência cardíaca e pode precipitar arritmias supraventriculares em predispostos. Contraindicação relativa — consultar cardiologista.'},
    ],
    common_myths:[
      {mito:'Posso tomar cafeína até às 18h se consigo dormir normalmente',refutacao:'FALSO. Meta-análise Sleep Medicine Reviews 2023 (20 estudos): cafeína reduz sono profundo (N3) em −11 minutos e aumenta sono leve (N1), mesmo em usuários que não percebem insônia. A redução de N3 prejudica recuperação muscular e consolidação de memória.'},
      {mito:'Se já sou tolerante, a cafeína não atrapalha mais meu sono',refutacao:'PARCIALMENTE FALSO. A tolerância se desenvolve para os efeitos estimulantes (vigilância), mas os estudos mostram que usuários habituais em altas doses (400mg) ainda apresentam disrupção do sono (Oxford Academic 2024).'},
      {mito:'Cafeína dá energia real',refutacao:'TECNICAMENTE FALSO. Cafeína bloqueia a PERCEPÇÃO de fadiga ao mascarar adenosina acumulada. A fadiga real (deplição de ATP) segue ocorrendo. Por isso a "queda" pós-cafeína é real — a adenosina bloqueada se liga aos receptores assim que a cafeína é metabolizada.'},
    ],
  },
  18:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`O Lion's Mane (Hericium erinaceus, "Juba de Leão") contém hericenones (no corpo de frutificação) e erinacinas (no micélio) — as únicas substâncias naturais conhecidas por cruzar a barreira hematoencefálica e estimular a síntese de NGF (Fator de Crescimento Nervoso). O NGF é essencial para sobrevivência, manutenção e crescimento de neurônios.`,
    mecanismo:[
      {ico:'🧠',label:'NGF',val:'Hericenones C e D estimulam síntese de NGF no SNC → neuroplasticidade'},
      {ico:'🔬',label:'Mielina',val:'Erinacinas promovem remielinização de axônios danificados'},
      {ico:'😌',label:'Ansiedade',val:'Inibição de ceramida no hipocampo → efeito ansiolítico em modelos animais'},
      {ico:'🧬',label:'BDNF',val:'Efeito indireto em BDNF (Fator Neurotrófico do Cérebro) via NGF'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2009',journal:'Phytother Res',titulo:'Lion\'s Mane e função cognitiva em idosos com MCI',achado:'+5,2 pontos no MMSE vs placebo após 16 semanas (p<0.001)',detalhe:'30 idosos com declínio cognitivo leve. 250mg 3x/dia. Efeito reverteu após cessação.',pmid:'18844328'},
      {tipo:'RCT',ano:'2019',journal:'Front Aging Neurosci',titulo:'Lion\'s Mane e ansiedade em adultos jovens',achado:'Redução de 32% na escala de ansiedade BAI vs placebo',detalhe:'Adultos jovens saudáveis. 1,8g/dia por 4 semanas. Melhora em humor e concentração.',pmid:'31140015'},
      {tipo:'Estudo in vitro + humano',ano:'2015',journal:'IJMS',titulo:'Estímulo de NGF e neuroproteção',achado:'Hericenones aumentaram NGF 3,7× em culturas neurais',detalhe:'Base mecanística confirmada. Tradução clínica em 8–12 semanas de uso contínuo.',pmid:'25869831'},
    ],
    seguranca:[
      {tipo:'ok',label:'Excelente perfil de segurança',texto:'Sem toxicidade reportada em estudos de até 16 semanas. GRAS (Generally Recognized as Safe).'},
      {tipo:'warn',label:'Alergia a cogumelos',texto:'Evitar em pessoas com histórico de alergia a outros fungos (shiitake, portobello).'},
      {tipo:'warn',label:'Preferir corpo de frutificação',texto:'Extrato do corpo de frutificação tem hericenones. Extrato de micélio tem erinacinas. Preferir extrato com ambos.'},
    ]
  },
  23:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`O Ômega-3 marinho (EPA e DHA) é o lipídeo mais estudado para saúde cardiovascular e neurológica. EPA reduz triglicerídeos e inflamação via resolução (resolvinas, protectinas). DHA é o principal ácido graxo estrutural do cérebro (40% das membranas dos neurônios) e da retina. Ambos modulam positivamente a expressão gênica via PPARγ.`,
    mecanismo:[
      {ico:'❤️',label:'Triglicerídeos',val:'EPA inibe diacilglicerol aciltransferase hepática → reduz produção de VLDL'},
      {ico:'🔥',label:'Anti-inflamação',val:'EPA → resolvinas E1–E4 e lipoxinas → resolução ativa da inflamação'},
      {ico:'🧠',label:'DHA Cerebral',val:'DHA é incorporado em membranas neurais → sinapses mais fluidas e funcionais'},
      {ico:'🩸',label:'Plaquetas',val:'Reduz agregação plaquetária via PGI3 vs TXA2 → menos trombose'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2019',journal:'NEJM / REDUCE-IT',titulo:'EPA e eventos cardiovasculares em alto risco',achado:'−25% de eventos cardiovasculares maiores (MACE) com 4g/dia de EPA',detalhe:'8.179 pacientes por 4,9 anos. Redução de 28% de morte cardiovascular. Droga aprovada: icosapentaenoato de etila.',pmid:'29963978'},
      {tipo:'Meta-análise',ano:'2018',journal:'J Clin Lipidol',titulo:'Ômega-3 e triglicerídeos (78 estudos)',achado:'Redução média de −45% de triglicerídeos com 4g/dia de EPA+DHA',detalhe:'Efeito dose-dependente. 2g/dia reduz 20–25%. 4g/dia: 40–50%.',pmid:'30098246'},
      {tipo:'Meta-análise',ano:'2020',journal:'Nat Commun',titulo:'EPA/DHA e saúde cerebral — OMEGA-3 INDEX',achado:'Índice ômega-3 >8% associado a −39% de demência e −27% de AVC vs índice <4%',detalhe:'Análise de 17 coortes prospectivas, 45.637 participantes. EPA+DHA nos eritrócitos como biomarcador de risco.',pmid:'33173094'},
    ],
    seguranca:[
      {tipo:'ok',label:'Muito seguro até 4g/dia',texto:'FDA aprovou 4g/dia como GRAS. EFSA endossou segurança até 5g/dia.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'Doses acima de 3g/dia têm atividade antiagregante plaquetária. Monitorar com warfarina.'},
      {tipo:'warn',label:'Qualidade é crítica',texto:'Verificar certificação IFOS ou análise de metais pesados. Preferir formas rTG (triglicerídeo reesterificado).'},
    ],
    risk_groups:[
      {grp:'Anticoagulantes (Warfarina, AAS)',nivel:'warn',motivo:'Doses >3g/dia de EPA+DHA têm atividade antiagregante plaquetária. Monitorar INR com médico.'},
    ],
    common_myths:[
      {mito:'Qualquer ômega-3 serve — o de peixe é igual ao de chia/linhaça',refutacao:'FALSO. EPA e DHA (de peixe) são biologicamente ativos. ALA (de chia/linhaça) é convertido em EPA/DHA com eficiência <5% em humanos. Para efeitos cardiovasculares e cerebrais, fontes marinhas são necessárias.'},
      {mito:'Tomar ômega-3 em qualquer horário é igual',refutacao:'PARCIALMENTE FALSO. Absorção é otimizada com refeição gordurosa (+50%). Forma rTG (triglicerídeo reesterificado) é 70% mais biodisponível que EE (etil éster).'},
    ],
  },
  24:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`O Magnésio Treonato (MgT) é uma forma patenteada (Magtein®) desenvolvida pelo MIT para maximizar o transporte de magnésio ao SNC. Diferente de outras formas, o MgT cruza a barreira hematoencefálica com alta eficiência, aumentando a concentração de magnésio no líquor cerebrospinal e no hipocampo (sede da memória).`,
    mecanismo:[
      {ico:'🧠',label:'Hipocampo',val:'MgT aumenta densidade de sinapses no hipocampo em até +100% (modelos animais)'},
      {ico:'🔬',label:'NMDA',val:'Magnésio regula receptores NMDA (glutamato) → plasticidade sináptica'},
      {ico:'😴',label:'Sono NREM',val:'MgT combinado com glicina melhora eficiência do sono e memória consolidada'},
      {ico:'📚',label:'LTP',val:'Potenciação de Longo Prazo (LTP) — base biológica do aprendizado'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2016',journal:'Neuropharm',titulo:'MgT e cognição em adultos de 50–70 anos',achado:'Melhora de 9 anos na "idade cognitiva" avaliada em 12 semanas',detalhe:'44 adultos com declínio cognitivo. 2g/dia. Executivo, memória de trabalho e atenção melhorados.',pmid:'27412962'},
      {tipo:'Estudo MIT',ano:'2010',journal:'Neuron',titulo:'Papel do magnésio na plasticidade sináptica',achado:'MgT eleva Mg cerebrospinal em 15% (vs. outras formas que não o elevam)',detalhe:'Estudo seminal do MIT (Liu et al.) que estabeleceu o MgT como forma preferencial para SNC.',pmid:'20152124'},
      {tipo:'RCT',ano:'2022',journal:'Front Aging Neurosci',titulo:'MgT e cognição em adultos de meia-idade (40–65 anos)',achado:'Melhora de +9,4 pontos no escore composto de cognição vs placebo em 12 semanas',detalhe:'109 participantes. 1,5–2g/dia. Melhora significativa em memória episódica, atenção e velocidade de processamento.',pmid:'36304010'},
    ],
    seguranca:[
      {tipo:'ok',label:'Muito bem tolerado',texto:'Forma quelada com treonato. Sem efeitos laxativos. Estudos de 12 semanas sem efeitos adversos.'},
      {tipo:'warn',label:'Custo elevado',texto:'MgT é mais caro que outras formas. Para efeitos sistêmicos (músculo, coração), magnésio glicinato é igualmente eficaz e mais barato.'},
    ],
    risk_groups:[],
    common_myths:[
      {mito:'Magnésio treonato é superior para todos os efeitos do magnésio',refutacao:'FALSO. MgT é superior especificamente para efeitos cerebrais (barreira hematoencefálica). Para músculo, sono geral, e testosterona — o glicinato tem evidência equivalente e custo menor.'},
    ],
  },
  14:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`O HMB (β-Hidroxi β-Metilbutirato) é um metabólito ativo da leucina, produzido em pequena quantidade no metabolismo normal de proteínas. Seu mecanismo principal é a inibição da via ubiquitina-proteassoma, que degrada proteínas musculares (proteólise). Especialmente eficaz em estados catabólicos: iniciantes, idosos sarcopênicos, períodos de déficit calórico ou imobilização. Em atletas avançados o efeito é menor.`,
    mecanismo:[
      {ico:'🛡',label:'Anti-catabolismo',val:'Inibe ubiquitina-proteassoma → reduz degradação de proteínas musculares'},
      {ico:'🔬',label:'mTOR',val:'Estimula mTORC1 de forma independente da leucina, ativando síntese proteica'},
      {ico:'🏋️',label:'Dano Muscular',val:'Reduz marcadores de dano (CK, LDH) após exercício excêntrico intenso'},
      {ico:'💪',label:'IGF-1',val:'Pode elevar IGF-1 local no músculo, promovendo reparo e crescimento'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2014',journal:'J Strength Cond Res',titulo:'HMB e massa magra em estudos controlados',achado:'+1,08 kg de massa magra vs placebo em populações não treinadas',detalhe:'Análise de 9 RCTs. Efeito mais pronunciado em iniciantes (2–3×) vs atletas avançados.',pmid:'24555474'},
      {tipo:'RCT',ano:'2013',journal:'J Nutr',titulo:'HMB e perda muscular em idosos',achado:'Preservação de 100% da massa magra vs −2,2% no placebo durante restrição calórica',detalhe:'Idosos de 60–75 anos em déficit calórico. 3g/dia HMB por 8 semanas. Anti-catabólico robusto.',pmid:'23783282'},
      {tipo:'RCT',ano:'2000',journal:'J Appl Physiol',titulo:'HMB e recuperação muscular pós-exercício',achado:'−50% de dano muscular (CK) e −30% de dor (DOMS) vs placebo',detalhe:'Exercício excêntrico intenso. 3g/dia. HMB acelerou recuperação e reduziu marcadores de dano.',pmid:'11027305'},
    ],
    seguranca:[
      {tipo:'ok',label:'Excelente perfil de segurança',texto:'Estudos de 8 semanas com 3g/dia sem alterações em marcadores hepáticos, renais ou hematológicos.'},
      {tipo:'ok',label:'Sem interações medicamentosas',texto:'Não foi identificada interação com medicamentos comuns. Adequado para uso conjunto com outros suplementos.'},
      {tipo:'warn',label:'Custo-benefício em avançados',texto:'Em atletas de alta performance com nutrição adequada, o efeito é modesto. Mais custo-efetivo para iniciantes ou em períodos catabólicos.'},
    ]
  },
  15:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`O Whey Protein Isolado (WPI) é a proteína do soro do leite com maior pureza (>90% de proteína) e mínimo de lactose e gordura. É a fonte de proteína com maior índice PDCAAS e DIAAS (ambos = 1,0), possuindo o perfil de aminoácidos essenciais mais completo entre fontes proteicas. A leucina — 10–11% da composição — é o gatilho molecular da síntese proteica via ativação de mTORC1. Para hipertrofia, o alvo proteico total é 1,6–2,2g/kg/dia de proteína total na dieta; o whey é uma ferramenta para atingir essa meta, não substitui refeições completas.`,
    mecanismo:[
      {ico:'🔬',label:'mTORC1',val:'Leucina ativa mTORC1 via RAG GTPases → cascata de síntese proteica muscular'},
      {ico:'⚡',label:'Velocidade de Absorção',val:'Pico aminoacídico em 60–90 min — ideal para janela anabólica pós-treino'},
      {ico:'💧',label:'Hidrolisado vs Isolado',val:'Isolado já oferece alta taxa de absorção sem custo adicional do hidrolisado'},
      {ico:'🩸',label:'Insulina',val:'Estimula secreção de insulina, que potencializa captação de aminoácidos pelo músculo'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2018',journal:'Br J Sports Med',titulo:'Suplementação proteica e hipertrofia (49 estudos)',achado:'+1,1 kg de massa magra adicional vs placebo em 12+ semanas de treino',detalhe:'1.800 participantes. Efeito significativo até ~1,62g de proteína/kg/dia. Plateau de efeito acima de 2,2g/kg. Whey foi a fonte mais usada.',pmid:'28698222'},
      {tipo:'RCT',ano:'2007',journal:'Int J Sport Nutr Exerc Metab',titulo:'Whey vs caseína vs soja para hipertrofia',achado:'Whey gerou +20% mais massa magra que soja e +24% mais que caseína em 12 semanas',detalhe:'74 homens treinados. Whey pós-treino. Leucinaemia mais elevada no whey explicou a diferença.',pmid:'17684208'},
      {tipo:'Meta-análise',ano:'2017',journal:'J Am Coll Nutr',titulo:'Whey e perda de gordura em déficit calórico',achado:'−2,3 kg a mais de gordura com whey vs controle em dietas hipocalóricas',detalhe:'Efeito protetor de massa magra e maior saciedade explicam o resultado. 9 RCTs incluídos.',pmid:'26545761'},
    ],
    seguranca:[
      {tipo:'ok',label:'Seguro para pessoas saudáveis',texto:'Décadas de uso e pesquisa sem evidências de dano renal, hepático ou ósseo em pessoas sem condições preexistentes. Meta-análise 2018 (Br J Sports Med): até 2,2g/kg/dia é seguro em adultos saudáveis treinados.'},
      {tipo:'warn',label:'Intolerância à lactose',texto:'O isolado tem <1% de lactose — geralmente tolerado. Quem tem alergia à proteína do leite (não intolerância) deve evitar.'},
      {tipo:'bad',label:'Doença Renal Crônica (DRC) — GRUPO DE RISCO',texto:'KDIGO 2024 recomenda ≤0,8g/kg/dia para DRC G3–G5 e EVITAR >1,3g/kg/dia. Dietas hiperproteicas (>2g/kg/dia) podem causar hiperfiltração glomerular e acelerar progressão da DRC. Nefrologista deve orientar a ingestão proteica.'},
    ],
    risk_groups:[
      {grp:'Doença Renal Crônica (DRC) — G3 a G5',nivel:'bad',motivo:'KDIGO 2024: manter proteína em ≤0,8g/kg/dia; evitar >1,3g/kg/dia. Hiperfiltração glomerular por excesso proteico pode acelerar progressão.'},
      {grp:'Urolitíase / Cálculos Renais',nivel:'warn',motivo:'Dietas hiperproteicas animais aumentam excreção de oxalato e ácido úrico, elevando risco de cálculos. Preferir fontes proteicas vegetais parciais.'},
    ],
    common_myths:[
      {mito:'Proteína em excesso causa danos nos rins em pessoas saudáveis',refutacao:'FALSO para saudáveis. Meta-análise Br J Sports Med 2018 não encontrou dano renal até 2,2g/kg/dia em adultos sem condição preexistente. VERDADEIRO em DRC: KDIGO 2024 restringe a <1,3g/kg/dia para evitar hiperfiltração.'},
      {mito:'Quanto mais proteína, mais músculo',refutacao:'FALSO acima de ~2,2g/kg/dia. O teto de efetividade para hipertrofia está em 1,6–2,2g/kg/dia (meta-análise 49 estudos). Proteína além disso é oxidada como energia — sem benefício muscular adicional.'},
      {mito:'É preciso tomar whey imediatamente após o treino (janela anabólica de 30min)',refutacao:'MITO EXAGERADO. A "janela anabólica" é muito maior do que se acreditava — a síntese proteica permanece elevada por 24–48h pós-treino. O total proteico do dia importa mais que o timing preciso.'},
    ],
  },
  16:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`Os EAA (Aminoácidos Essenciais) são os 9 aminoácidos que o organismo não pode sintetizar de novo: histidina, isoleucina, leucina, lisina, metionina, fenilalanina, treonina, triptofano e valina. Ao contrário dos BCAAs (apenas 3), os EAA fornecem todos os substratos para síntese proteica completa. Estudos mostram que os EAA estimulam a síntese proteica muscular até 50% mais que BCAAs isolados, pois os aminoácidos não-ramificados são igualmente necessários para elongação do peptídeo.`,
    mecanismo:[
      {ico:'🔬',label:'Síntese Proteica',val:'Todos os 9 EAAs necessários para elongação ribosomal completa de proteínas musculares'},
      {ico:'💪',label:'Leucina Central',val:'Leucina (30% dos EAAs) ativa mTORC1 enquanto os demais EAAs provêm substrato'},
      {ico:'⚡',label:'Supera BCAAs',val:'EAAs estimulam MPS 2× mais que BCAAs isolados por fornecer substrato completo'},
      {ico:'🩸',label:'Peri-treino',val:'Absorção rápida (pó) — ideal durante ou imediatamente após o treino'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2017',journal:'Am J Clin Nutr',titulo:'EAA vs BCAAs para síntese proteica muscular',achado:'EAAs estimularam MPS 50% mais que BCAAs em dose equivalente de leucina',detalhe:'Duplo-cego, 20 jovens treinados. EAA 10g vs BCAA 5,6g (mesma leucina). Biópsia muscular com traçador isotópico.',pmid:'27477959'},
      {tipo:'RCT',ano:'2020',journal:'Front Nutr',titulo:'EAAs e recuperação em exercício de resistência',achado:'EAAs reduziram marcadores de dano muscular em 35% vs placebo',detalhe:'Suplementação peri-treino com 10g de EAAs. Melhora na percepção de esforço e na recuperação.',pmid:'32903609'},
      {tipo:'RCT',ano:'2018',journal:'Am J Clin Nutr',titulo:'EAAs e síntese proteica em idosos',achado:'EAAs estimularam MPS 2,6× mais que leucina isolada na mesma dose molar em sarcopênicos',detalhe:'20 idosos. Infusão isotópica de traçador. EAA completo necessário para máxima ativação de mTORC1 em músculos envelhecidos.',pmid:'29438458'},
    ],
    seguranca:[
      {tipo:'ok',label:'Muito seguro',texto:'EAAs são nutrientes essenciais da dieta. Sem toxicidade reportada em doses suplementares de 10–20g/dia.'},
      {tipo:'warn',label:'Fenilcetonúria',texto:'Fenilalanina está presente nos EAAs. Pessoas com PKU (fenilcetonúria) devem evitar ou consultar médico.'},
      {tipo:'ok',label:'Sem efeito no fígado',texto:'Diferente de aminoácidos sintéticos em excesso, EAAs em doses normais não sobrecarregam metabolismo hepático.'},
    ]
  },
  17:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`A Ecdisterona (20-Hidroxiecdisona, ou 20E) é um fitoesteroide encontrado em espinafre, quinoa e outras plantas, pertencente à classe dos ecdisteróides — hormônios de insetos adaptados para resistência ao estresse. Em mamíferos, a 20E ativa o receptor estrogênico beta (ERβ) sem suprimir o eixo HPTA, o que a diferencia dos AAS. Promove síntese proteica e hipertrofia sem efeitos androgênicos.`,
    mecanismo:[
      {ico:'🧬',label:'Receptor ERβ',val:'Liga-se ao receptor estrogênico beta → ativação da via PI3K/Akt/mTOR para síntese proteica'},
      {ico:'💪',label:'Síntese Proteica',val:'Estudo comparativo: efeito anabólico próximo ao dianabol (sem supressão hormonal)'},
      {ico:'🔬',label:'IGF-1',val:'Aumenta expressão de IGF-1 local no músculo sem elevar IGF-1 sistêmico'},
      {ico:'🛡',label:'Anti-catabólico',val:'Reduz ubiquitina-proteassoma e proteólise muscular, similar ao HMB'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2019',journal:'Arch Toxicol',titulo:'Ecdisterona e hipertrofia em culturistas',achado:'+2,0 kg de massa magra e −1,8 kg de gordura vs placebo em 10 semanas',detalhe:'46 atletas de força treinados. 200–800mg/dia. Dose-resposta confirmada. Sem alterações hormonais.',pmid:'30830291'},
      {tipo:'In vitro + animal',ano:'2015',journal:'J Agric Food Chem',titulo:'Comparação de anabolismo: 20E vs AAS',achado:'20E igualou dianabol em síntese proteica miofibrilar in vitro',detalhe:'Estudos de célula muscular. Mesma potência anabólica via receptor diferente (ERβ vs AR). Publicação que gerou debate regulatório.',pmid:'26200279'},
      {tipo:'RCT',ano:'2021',journal:'Front Endocrinol',titulo:'Ecdisterona e hormônios em homens saudáveis',achado:'Nenhuma alteração em testosterona, FSH, LH, estrogênio após 12 semanas',detalhe:'Confirma segurança hormonal. Não suprime eixo HPTA. Anabolismo via via não-androgênica.',pmid:'33716998'},
    ],
    seguranca:[
      {tipo:'ok',label:'Sem supressão hormonal',texto:'Ao contrário de proanabolizantes e AAS, a ecdisterona não altera testosterona, FSH ou LH. Eixo HPTA intacto.'},
      {tipo:'ok',label:'Ausência de toxicidade',texto:'LD50 muito alta em modelos animais. Sem hepatotoxicidade ou cardiotoxicidade reportada.'},
      {tipo:'warn',label:'Regulatório (WADA)',texto:'A WADA monitorou a ecdisterona como possível substância proibida. Verificar regulamentos se for atleta competitivo.'},
      {tipo:'warn',label:'Padronização do extrato',texto:'Extratos variam de 2% a 97% de 20E. Exigir laudo de padronização do fabricante.'},
    ]
  },
  19:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A Bacopa Monnieri é uma erva ayurvédica cujos princípios ativos — bacosídeos A e B — inibem a acetilcolinesterase (elevando acetilcolina) e protegem neurônios do estresse oxidativo. Diferente de estimulantes, seu efeito é acumulativo: requer 8–12 semanas para pleno efeito e persiste após cessação (neuroproteção de longo prazo via BDNF e NGF). Especialmente eficaz para memória de longo prazo e aprendizado.`,
    mecanismo:[
      {ico:'🧠',label:'Acetilcolina',val:'Bacosídeos inibem acetilcolinesterase → mais ACh disponível para sinapses colinérgicas'},
      {ico:'🔬',label:'BDNF',val:'Eleva BDNF no hipocampo → neuroplasticidade e consolidação de memória de longo prazo'},
      {ico:'🛡',label:'Antioxidante Neural',val:'Bacosídeos neutralizam radicais livres em mitocôndrias neuronais e inibem lipoperoxidação'},
      {ico:'⚖️',label:'Ansiedade',val:'Modula receptor GABA-A e reduz cortisol, gerando efeito ansiolítico sem sedação'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2014',journal:'J Ethnopharmacol',titulo:'Bacopa e memória (9 RCTs)',achado:'Melhora significativa em velocidade de processamento e memória de trabalho (p<0.01)',detalhe:'437 participantes. Dose típica: 300–450mg/dia (45% bacosídeos). Efeito em 12 semanas.',pmid:'24176230'},
      {tipo:'RCT',ano:'2008',journal:'J Altern Complement Med',titulo:'Bacopa e cognição em adultos saudáveis de 18–60 anos',achado:'+37% em retenção de novas informações vs placebo em 12 semanas',detalhe:'98 adultos saudáveis. 300mg/dia (45% bacosídeos). Redução de ansiedade também observada.',pmid:'18611150'},
      {tipo:'RCT',ano:'2012',journal:'J Med Food',titulo:'Bacopa e declínio cognitivo em idosos',achado:'Melhora de 15% no Teste de Aprendizado de Rey e −40% em ansiedade (STAI)',detalhe:'60 adultos >65 anos. 300mg/dia. Também reduziu cortisol matinal em 14%.',pmid:'22747190'},
    ],
    seguranca:[
      {tipo:'ok',label:'Segura em uso prolongado',texto:'Estudos de até 12 semanas sem efeitos adversos graves. Neuroprotegida confirmada em idosos.'},
      {tipo:'warn',label:'Desconforto gástrico',texto:'Deve ser tomada com refeição gordurosa para evitar náuseas. Bacosídeos são lipossolúveis.'},
      {tipo:'warn',label:'Sedação leve',texto:'Em pessoas sensíveis pode causar sonolência. Testar dose inicial baixa (150mg) e titular.'},
      {tipo:'ok',label:'Sem interação com estimulantes',texto:'Pode ser combinada com cafeína + teanina e nootrópicos. Não há interação negativa conhecida.'},
    ]
  },
  20:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A Rhodiola Rosea é um adaptógeno ártico cujos compostos-chave (rosavinas e salidrosídeos) modulam o eixo HPA e atuam no nível das monoaminas cerebrais. Diferente da Ashwagandha (efeito em semanas), a Rhodiola produz efeito adaptogênico e energizante em 1–2 dias. Reduz fadiga mental e física, melhora performance cognitiva sob estresse e acelera recuperação após exercício intenso.`,
    mecanismo:[
      {ico:'⚡',label:'Monoaminas',val:'Rosavinas inibem MAO (monoamino oxidase) A e B → mais dopamina e serotonina disponíveis'},
      {ico:'📉',label:'Cortisol',val:'Salidrosídeos inibem liberação de cortisol via supressão do CRH hipotalâmico'},
      {ico:'🏃',label:'ATP Mitocondrial',val:'Aumenta síntese de ATP via ativação de AMPK e melhora da cadeia respiratória'},
      {ico:'🧠',label:'Neuroprotecção',val:'Salidrosídeos inibem apoptose neuronal via Bcl-2 e reduzem neuroinflamação'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2009',journal:'Phytomedicine',titulo:'Rhodiola e fadiga em estudantes durante exames',achado:'−24% de fadiga mental e +10% em desempenho cognitivo vs placebo em 20 dias',detalhe:'56 médicos jovens em turno noturno. 170mg 2x/dia. Efeito estabilizado já na primeira semana.',pmid:'19016404'},
      {tipo:'Meta-análise',ano:'2012',journal:'Phytomedicine',titulo:'Revisão de 11 estudos sobre Rhodiola e estresse',achado:'Melhora consistente em fadiga, humor e performance em 9 de 11 estudos (p<0.05)',detalhe:'Extrato WS® 1375 (1,8% rosavinas + 3% salidrosídeos). Dose eficaz: 170–680mg/dia.',pmid:'22895270'},
      {tipo:'RCT',ano:'2004',journal:'Phytother Res',titulo:'Rhodiola e exercício físico intenso',achado:'−10% de tempo de recuperação e −30% de danos oxidativos pós-maratona',detalhe:'Corredores de maratona. 600mg 1h antes da prova. Redução de CK e lactato 24h após.',pmid:'15260004'},
    ],
    seguranca:[
      {tipo:'ok',label:'Bem tolerada',texto:'Sem efeitos adversos graves em estudos de 12 semanas. GRAS por autoridades europeias (EMA).'},
      {tipo:'warn',label:'Estimulante suave',texto:'Pode causar agitação ou insônia se tomada após 14h. Preferir dose matinal em jejum.'},
      {tipo:'warn',label:'Ciclagem recomendada',texto:'Ciclos de 3 meses ON + 1 mês OFF para manter sensibilidade às rosavinas.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'Inibição leve de MAO pode potencializar medicamentos serotoninérgicos. Usar com cautela com antidepressivos.'},
    ]
  },
  21:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A Alpha-GPC (L-Alfa-glicerilfosforilcolina) é a forma de colina com maior biodisponibilidade ao cérebro (40% de colina elementar biodisponível). Após absorção, a Alpha-GPC cruza a barreira hematoencefálica e serve de precursor para a síntese de acetilcolina (ACh) — o principal neurotransmissor da memória, aprendizado e controle motor. Além do efeito colinérgico, estimula a secreção de GH via amplificação da grelina.`,
    mecanismo:[
      {ico:'🧠',label:'Acetilcolina',val:'Alpha-GPC → colina → acetilcolina via colina acetiltransferase (ChAT) em neurônios colinérgicos'},
      {ico:'💪',label:'GH (Hormônio do Crescimento)',val:'Potencializa pulsos de GH ao amplificar sinalização da grelina no hipotálamo'},
      {ico:'🔬',label:'Membrana Neuronal',val:'GPC é componente estrutural de fosfolipídeos de membrana — apoia plasticidade neuronal'},
      {ico:'⚡',label:'Força Neuromuscular',val:'Melhora recrutamento de unidades motoras via sinalização colinérgica na junção neuromuscular'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2008',journal:'J Int Soc Sports Nutr',titulo:'Alpha-GPC e pico de GH pós-exercício',achado:'+44% de pico de GH vs placebo 60 min após treino',detalhe:'7 homens, 600mg Alpha-GPC 90 min antes do treino. Efeito aditivo com exercício na liberação pulsátil de GH.',pmid:'19100367'},
      {tipo:'Meta-análise',ano:'2003',journal:'Aging Clin Exp Res',titulo:'Alpha-GPC e declínio cognitivo em idosos (13 RCTs)',achado:'Melhora significativa em 12 de 13 RCTs em pacientes com Alzheimer e MCI',detalhe:'1.570 pacientes. 400mg 3x/dia. Aprovado como medicamento (Choline alfoscerate) na Itália e Rússia.',pmid:'12748841'},
      {tipo:'RCT',ano:'2015',journal:'J Int Soc Sports Nutr',titulo:'Alpha-GPC e força muscular em atletas',achado:'+14% no pico de torque isométrico do quadríceps vs placebo',detalhe:'13 atletas universitários. Dose única de 600mg 90 min antes do teste. Efeito agudo confirmado.',pmid:'26175486'},
    ],
    seguranca:[
      {tipo:'ok',label:'Segura em doses terapêuticas',texto:'400–600mg/dia é a dose mais estudada. Sem hepatotoxicidade, cardiotoxicidade ou efeitos endócrinos adversos.'},
      {tipo:'warn',label:'Cefaleia em doses altas',texto:'Acima de 1g pode ocorrer dor de cabeça por hiperestimulação colinérgica. Não exceder 1g/dia sem acompanhamento.'},
      {tipo:'warn',label:'Síndrome colinérgica',texto:'Em pessoas com miastenia gravis ou em uso de inibidores de colinesterase, pode haver exacerbação colinérgica.'},
    ]
  },
  22:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A L-Teanina (γ-glutamiletionamina) é um aminoácido exclusivo do chá verde (Camellia sinensis) que cruza a barreira hematoencefálica e modula vários neurotransmissores simultaneamente. Aumenta ondas alfa cerebrais (8–14 Hz) — o estado de "relaxamento alerta" — sem causar sedação. Eleva GABA, serotonina e dopamina enquanto reduz adrenalina. Em combinação com cafeína, é a dupla psicoativa mais bem estudada na literatura.`,
    mecanismo:[
      {ico:'🌊',label:'Ondas Alfa',val:'Aumenta potência de ondas alfa EEG em 30 min → foco tranquilo sem sonolência'},
      {ico:'⚖️',label:'GABA',val:'Estimula receptores GABA-A → reduz excitabilidade neuronal e ansiedade'},
      {ico:'🔬',label:'Glutamato',val:'Bloqueia receptores NMDA e AMPA → reduz hiperexcitação e neurotoxicidade'},
      {ico:'☕',label:'Sinergia Cafeína',val:'Neutraliza vasoconstrição e ansiedade da cafeína mantendo seu efeito estimulante'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2007',journal:'Asia Pac J Clin Nutr',titulo:'L-teanina e ondas alfa em EEG',achado:'+8% em potência de ondas alfa no córtex occipital em 40 min',detalhe:'16 voluntários. 50mg de L-teanina. Comparado ao placebo. Diferença significativa em p<0.01.',pmid:'17182482'},
      {tipo:'RCT',ano:'2008',journal:'Biol Psychol',titulo:'L-teanina, cafeína e performance cognitiva',achado:'Combo 97mg cafeína + 99mg teanina: +20% em atenção sustentada vs cafeína isolada',detalhe:'44 participantes, tarefa de atenção de 90 min. Teanina eliminou jitter da cafeína sem reduzir alerta.',pmid:'18006208'},
      {tipo:'RCT',ano:'2016',journal:'Nutrients',titulo:'L-teanina e estresse em profissionais',achado:'Redução de −35% no cortisol salivar e −17% no escore de ansiedade (STAI)',detalhe:'34 adultos sob estresse agudo. 200mg de L-teanina. Efeito em 30 minutos.',pmid:'27396868'},
    ],
    seguranca:[
      {tipo:'ok',label:'Excelente segurança',texto:'GRAS (Generally Recognized as Safe) pelo FDA. Sem efeitos adversos em estudos de até 8 semanas com 400mg/dia.'},
      {tipo:'ok',label:'Sem tolerância ou dependência',texto:'Ao contrário da cafeína, a teanina não desenvolve tolerância. Pode ser usada diariamente sem perda de efeito.'},
      {tipo:'ok',label:'Segura em gravidez (dose de chá)',texto:'Dose do chá verde (~25mg/xícara) é segura. Suplementos de alta dose (>200mg) carecem de estudos gestacionais.'},
    ]
  },
  25:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`A Coenzima Q10 (CoQ10 ou ubiquinona/ubiquinol) é uma molécula lipossolúvel indispensável para a cadeia de transporte de elétrons mitocondrial (Complexos I, II e III). Sem CoQ10, a produção de ATP cessa. Além disso, é um dos mais potentes antioxidantes lipossolúveis do organismo, protegendo LDL e membranas celulares da oxidação. A forma ubiquinol (reduzida) é 2–8× mais biodisponível que a ubiquinona (oxidada). A síntese endógena declina com a idade e é bloqueada pelas estatinas.`,
    mecanismo:[
      {ico:'⚡',label:'ATP Mitocondrial',val:'Carreador de elétrons nos Complexos I→III da cadeia respiratória → síntese de ATP'},
      {ico:'🛡',label:'Antioxidante',val:'Ubiquinol recicla vitamina E e C, neutralizando radicais livres em membranas lipídicas'},
      {ico:'❤️',label:'Função Cardíaca',val:'Miocárdio tem maior concentração de CoQ10. Essencial para contração muscular cardíaca.'},
      {ico:'💊',label:'Estatinas',val:'Estatinas bloqueiam a via do mevalonato → suprimem síntese de CoQ10 → suplementação essencial'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2013',journal:'J Hum Hypertens',titulo:'CoQ10 e pressão arterial (12 RCTs)',achado:'Redução de −11 mmHg na PAS e −7 mmHg na PAD vs placebo',detalhe:'362 pacientes hipertensos. Ubiquinol 200mg/dia. Mecanismo: redução de resistência vascular.',pmid:'23364626'},
      {tipo:'RCT',ano:'2014',journal:'JACC Heart Fail',titulo:'CoQ10 e mortalidade cardiovascular (Q-SYMBIO)',achado:'−43% de mortalidade cardiovascular em insuficiência cardíaca com 3 anos de CoQ10',detalhe:'420 pacientes com IC grave. 300mg/dia. Primeiro suplemento a reduzir mortalidade cardiovascular em RCT.',pmid:'25066585'},
      {tipo:'RCT',ano:'2018',journal:'Muscle Nerve',titulo:'CoQ10 e miopatia por estatinas',achado:'−38% na dor muscular (CK e escala visual) vs placebo após 60 dias',detalhe:'Pacientes com miopatia induzida por estatinas. 600mg/dia de CoQ10. Melhora em força e tolerância.',pmid:'28750151'},
    ],
    seguranca:[
      {tipo:'ok',label:'Muito bem tolerado',texto:'Sem toxicidade em estudos de até 30 meses com 1.200mg/dia. Perfil de efeitos adversos similar ao placebo.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'CoQ10 tem estrutura química similar à vitamina K. Pode reduzir levemente INR em pacientes com warfarina.'},
      {tipo:'warn',label:'Preferir ubiquinol',texto:'Ubiquinol (forma reduzida) tem 8× mais biodisponibilidade. Acima de 40 anos, o organismo converte ubiquinona menos eficientemente.'},
    ]
  },
  26:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`As Beta-glucanas 1,3-D e 1,6-D são polissacarídeos da parede celular de fungos medicinais (Reishi, Shiitake, Maitake, Turkey Tail) que atuam como modificadores da resposta biológica (BRMs). Elas são reconhecidas por receptores Dectin-1 e TLR2 em macrófagos e células NK, desencadeando uma cascata imune que prepara o organismo para patógenos sem causar inflamação excessiva — imunidade de base.`,
    mecanismo:[
      {ico:'🦠',label:'Macrófagos',val:'Beta-glucanas ligam Dectin-1 → ativação e polarização M1 de macrófagos'},
      {ico:'🔪',label:'Células NK',val:'Amplificam citotoxicidade de células Natural Killer → defesa antitumoral'},
      {ico:'🧬',label:'Citocinas',val:'Aumentam IL-2, IL-10 e IFN-γ — reguladores da resposta imune adaptativa'},
      {ico:'🛡',label:'Anticorpos',val:'Potencializam produção de IgA secretória nas mucosas — primeira linha de defesa'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2014',journal:'J Am Coll Nutr',titulo:'Beta-glucanas e infecções respiratórias (11 RCTs)',achado:'−25% de incidência de IVAS e −31% de duração dos sintomas vs placebo',detalhe:'1.100 adultos saudáveis. Beta-glucana 250–900mg/dia. Efeito mais robusto em pessoas com alta exposição (professores, militares).',pmid:'24724766'},
      {tipo:'RCT',ano:'2010',journal:'J Appl Physiol',titulo:'Beta-glucanas e imunidade pós-maratona',achado:'Incidência de infecções respiratórias 3× menor vs placebo nas 2 semanas pós-corrida',detalhe:'75 maratonistas. 1g/dia de beta-glucana de aveia. Prevenção da imunossupressão induzida pelo exercício intenso.',pmid:'20847257'},
      {tipo:'Meta-análise',ano:'2020',journal:'Nutrients',titulo:'Beta-glucanas e imunidade (54 estudos)',achado:'Redução de −22% de dias de infecção e −28% de gravidade dos sintomas vs placebo',detalhe:'Análise abrangente de beta-glucanas de aveia, cogumelos e leveduras. Ativação de macrófagos e células NK confirmada.',pmid:'32942756'},
    ],
    seguranca:[
      {tipo:'ok',label:'Excelente segurança',texto:'Consumo milenar de cogumelos medicinais. Estudos de 12 semanas com até 2g/dia sem efeitos adversos.'},
      {tipo:'warn',label:'Doenças autoimunes',texto:'Em doenças autoimunes ativas (lúpus, EM, AR), a estimulação imune pode ser contraindicada. Consultar médico.'},
      {tipo:'ok',label:'Sinérgico com vitamina C e zinco',texto:'Combinação com micronutrientes imunológicos amplifica o efeito. Não há interação negativa conhecida.'},
    ]
  },
  27:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`A Vitamina C (ácido ascórbico) é um antioxidante hidrossolúvel essencial para humanos (não sintetizamos endogenamente). A forma tamponada (ascorbato de sódio ou cálcio) tem o mesmo efeito fisiológico com pH neutro — ideal para quem tem sensibilidade gástrica. É cofatora da síntese de colágeno (hidroxilação de prolina e lisina via prolil e lisil hidroxilases), da síntese de carnitina, da absorção de ferro não-heme e da regeneração de vitamina E.`,
    mecanismo:[
      {ico:'🧬',label:'Colágeno',val:'Cofator obrigatório de prolil e lisil hidroxilase → síntese de colágeno estável'},
      {ico:'🦠',label:'Imunidade',val:'Acumula em neutrófilos (50× a concentração plasmática) → ativação e quimiotaxia'},
      {ico:'🛡',label:'Antioxidante',val:'Doa elétrons para regenerar vitamina E e glutationa oxidadas'},
      {ico:'🔴',label:'Ferro',val:'Reduz Fe³⁺ a Fe²⁺ no intestino → aumenta absorção de ferro não-heme em 3–4×'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2013',journal:'Cochrane Review',titulo:'Vitamina C e duração do resfriado comum',achado:'Redução de −14% na duração em atletas com alto stress físico',detalhe:'29 RCTs, 11.306 participantes. Em pessoas comuns, não previne mas reduz duração em 8%. Em atletas, reduz incidência em 50%.',pmid:'23440782'},
      {tipo:'RCT',ano:'2020',journal:'Nutrients',titulo:'Vitamina C e colágeno para articulações',achado:'Melhora de 40% em dor articular vs placebo com combo vitamina C + colágeno',detalhe:'Colágeno hidrolisado + 48mg vitamina C pré-treino. Shaw et al. Vitamina C é essencial para síntese de colágeno pós-estímulo.',pmid:'31936667'},
      {tipo:'Meta-análise',ano:'2017',journal:'Nutrients',titulo:'Vitamina C intravenosa e tempo de internação em UTI',achado:'Redução de −7,8% no tempo de internação com 1–3g/dia de vitamina C IV',detalhe:'18 estudos, 2.004 pacientes de UTI. Efeito mais robusto em sepse e pós-operatório cardíaco.',pmid:'29099763'},
    ],
    seguranca:[
      {tipo:'ok',label:'Muito seguro em doses moderadas',texto:'Até 2g/dia tem excelente perfil de segurança. Forma tamponada é mais bem tolerada que o ácido livre.'},
      {tipo:'warn',label:'Oxalúria em doses altas',texto:'Acima de 2g/dia cronicamente, pode elevar oxalato urinário e risco de pedra nos rins em predispostos.'},
      {tipo:'warn',label:'Interação com ferro',texto:'A vitamina C potencializa absorção de ferro. Em hemocromatose ou policitemia, monitorar com médico.'},
    ]
  },
  28:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`A Quercetina é o flavonoide mais abundante da dieta ocidental (maçã, cebola, alcaparra), com potente atividade antiviral, anti-inflamatória e ionófora de zinco. A forma fitossomada (complexada com fosfatidilcolina de soja) supera a biodisponibilidade da quercetina padrão em até 20×, tornando viáveis as doses utilizadas nos estudos. Seu mecanismo antiviral mais relevante é a inibição de RNA polimerases virais e a facilitação da entrada de zinco nas células.`,
    mecanismo:[
      {ico:'🦠',label:'Antiviral',val:'Inibe RNA polimerase dependente de RNA em vírus RNA (influenza, coronavírus, rinovírus)'},
      {ico:'🔑',label:'Ionóforo de Zinco',val:'Transporta zinco para dentro de células infectadas → zinco inibe replicação viral'},
      {ico:'📉',label:'NF-κB',val:'Inibe NF-κB → reduz cascata inflamatória e produção de citocinas pró-inflamatórias'},
      {ico:'⚡',label:'AMPK',val:'Ativa AMPK (sensor de energia) → melhora sensibilidade à insulina e longevidade celular'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2011',journal:'Phytother Res',titulo:'Quercetina e infecções respiratórias em atletas',achado:'−33% de incidência de IVAS em atletas de alta intensidade em 12 semanas',detalhe:'1g/dia de quercetina + vitamina C + niacinamida. 1.002 ciclistas. Efeito mais robusto em atletas com maior estresse imune.',pmid:'21542856'},
      {tipo:'RCT',ano:'2021',journal:'Int J Gen Med',titulo:'Quercetina e COVID-19 leve a moderado',achado:'−68% de hospitalização e −45% de duração sintomática vs placebo',detalhe:'152 pacientes com COVID leve-moderado. 1g/dia + vitamina C + zinco. Não substitui vacinas/tratamento.',pmid:'34276853'},
      {tipo:'RCT',ano:'2022',journal:'Phytother Res',titulo:'Quercetina fitossomada e longevidade celular (senolytics)',achado:'Redução de −30% em marcadores de senescência celular (p16, p21, SA-β-Gal) após 4 semanas',detalhe:'40 adultos de 65–80 anos. 500mg 2x/dia. Primeiros dados de ação senolítica da quercetina em humanos.',pmid:'35475282'},
    ],
    seguranca:[
      {tipo:'ok',label:'Bem tolerada em doses terapêuticas',texto:'500–1000mg/dia de quercetina fitossomada sem eventos adversos significativos em estudos de 12 semanas.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'Quercetina inibe CYP3A4 e P-glicoproteína, podendo elevar níveis de warfarina, ciclosporina e outras drogas metabolizadas por essas vias.'},
      {tipo:'warn',label:'Gravidez',texto:'Dados insuficientes de segurança em gestação. Evitar doses suplementares.'},
    ]
  },
  29:{
    ev:3,
    scientific_evidence_level:'C',
    resumo:`A Catuaba (Trichilia catigua, Erythroxylum catuaba) é um arbusto amazônico cujas cascas contêm catuabinas A, B e C — alcaloides com ação sobre o sistema nervoso central dopaminérgico e noradrenérgico. Estimula a liberação de dopamina e noradrenalina em regiões límbicas, melhorando libido, excitação sexual e sensações. Considerada um afrodisíaco clínico na medicina tradicional brasileira, com estudos modernos ainda limitados mas crescentes.`,
    mecanismo:[
      {ico:'🧠',label:'Dopamina',val:'Catuabinas potencializam liberação de dopamina no núcleo accumbens → motivação e desejo sexual'},
      {ico:'⚡',label:'Noradrenalina',val:'Aumenta noradrenalina simpática → vasodilatação periférica e facilitação da ereção'},
      {ico:'🔬',label:'PDE-5',val:'Estudos in vitro sugerem inibição discreta de PDE-5 — mecanismo similar ao sildenafil'},
      {ico:'🛡',label:'Antioxidante',val:'Catuabinas neutralizam radicais livres e protegem neurônios dopaminérgicos'},
    ],
    estudos:[
      {tipo:'Estudo clínico',ano:'2007',journal:'Phytomedicine',titulo:'Catuaba e função sexual em homens com DE leve',achado:'+45% de escore IIEF vs baseline após 8 semanas',detalhe:'28 homens com disfunção erétil leve. 300mg/dia. Aumento de libido e qualidade das ereções. Estudo aberto.',pmid:'17596974'},
      {tipo:'In vitro',ano:'2011',journal:'J Ethnopharmacol',titulo:'Catuabinas e neuroproteção dopaminérgica',achado:'Proteção de 70% de neurônios dopaminérgicos contra toxicidade por 6-OHDA',detalhe:'Base mecanística da ação dopaminérgica. Também demonstrou efeito antidepressivo em modelos animais.',pmid:'21699961'},
      {tipo:'Estudo animal',ano:'2017',journal:'J Ethnopharmacol',titulo:'Catuaba e efeito antidepressivo comparado com fluoxetina',achado:'Extrato de Trichilia catigua igualou a fluoxetina no FST (forced swim test) em roedores',detalhe:'Múltiplos modelos de depressão. Ação dopaminérgica e noradrenérgica confirma o mecanismo de ação.',pmid:'28040481'},
    ],
    seguranca:[
      {tipo:'ok',label:'Bem tolerada nas doses tradicionais',texto:'300–500mg/dia sem efeitos adversos relatados em estudos de curto prazo. Amplo uso histórico na medicina popular.'},
      {tipo:'warn',label:'Hipertensão',texto:'A ação noradrenérgica pode elevar levemente a pressão arterial em hipertensos. Monitorar.'},
      {tipo:'warn',label:'IMAOs',texto:'Como outras plantas dopaminérgicas, evitar combinação com IMAOs por risco de crise hipertensiva.'},
    ]
  },
  30:{
    ev:3,
    scientific_evidence_level:'C',
    resumo:`A Marapuama (Ptychopetalum olacoides), conhecida como "madeira da potência" ou Muira Puama, é uma planta amazônica com uso tradicional para disfunção erétil e neurostenia. Seus compostos ativos (ácido ptychopetalico, lupeol, beta-sitosterol) atuam principalmente no sistema nervoso autônomo, facilitando a resposta erétil via estimulação parassimpática, e podem modular receptores colinérgicos e dopaminérgicos.`,
    mecanismo:[
      {ico:'🧠',label:'Colinérgico',val:'Potencializa acetilcolina no sistema nervoso autônomo → facilita vasodilatação genital'},
      {ico:'⚡',label:'Dopamina',val:'Extratos inibem MAO-B → eleva dopamina → melhora desejo e função sexual'},
      {ico:'🔬',label:'Beta-Sitosterol',val:'Fitosterol com atividade anti-inflamatória na próstata e melhora do fluxo urinário'},
      {ico:'🧬',label:'Neuroadaptogênico',val:'Estudos em modelos animais sugerem efeito adaptogênico sobre estresse oxidativo neural'},
    ],
    estudos:[
      {tipo:'Estudo clínico',ano:'1994',journal:'Am J Nat Med',titulo:'Marapuama e disfunção erétil (estudo Waynberg)',achado:'Melhora em 51% dos casos de DE e aumento de libido em 62% dos participantes',detalhe:'262 homens com DE ou libido reduzida. 1–1,5g/dia por 2 semanas. Estudo aberto, sem controle. Base histórica da indicação.',pmid:''},
      {tipo:'Estudo animal',ano:'2009',journal:'Phytother Res',titulo:'Ptychopetalum e função sexual em modelos animais',achado:'Aumento de 100% no índice de monta e de 40% em comportamento sexual vs controle',detalhe:'Modelo animal validado de disfunção sexual. Extratos aquosos e etanólicos. Base para estudos humanos futuros.',pmid:'19551706'},
      {tipo:'Estudo clínico',ano:'2000',journal:'J Sex Marital Ther',titulo:'Marapuama + Ginkgo e libido feminina',achado:'Melhora de libido e satisfação sexual em 65% das mulheres tratadas com combinação',detalhe:'202 mulheres com libido reduzida. Combinação de 175mg Marapuama + 120mg Ginkgo. Estudo de longo prazo.',pmid:'10728109'},
    ],
    seguranca:[
      {tipo:'ok',label:'Segura em doses tradicionais',texto:'500mg–1g/dia sem efeitos adversos sérios. Longo histórico de uso popular sem relatos de toxicidade significativa.'},
      {tipo:'warn',label:'Dados humanos limitados',texto:'A maioria dos estudos é em animais ou estudos abertos sem controle. Evidência ainda incipiente para humanos.'},
      {tipo:'warn',label:'IMAOs',texto:'A inibição de MAO-B pode interagir com antidepressivos IMAOs. Evitar combinação.'},
    ]
  },
  31:{
    ev:3,
    scientific_evidence_level:'C',
    resumo:`O Saw Palmetto (Serenoa repens) é um arbusto cujos frutos contêm ácidos graxos livres (ácido láurico, ácido mirístico) e fitosteróis que inibem a enzima 5-alfa-redutase tipos 1 e 2. Essa enzima converte testosterona em DHT (dihidrotestosterona), que em excesso é o principal mediador da hiperplasia benigna da próstata (HBP) e da alopecia androgênica. O Saw Palmetto reduz a conversão sem alterar a testosterona total sérica.`,
    mecanismo:[
      {ico:'🔬',label:'5α-Redutase',val:'Ácidos graxos inibem 5α-redutase tipos 1 e 2 → reduz DHT local (próstata, folículo piloso)'},
      {ico:'🚿',label:'Próstata',val:'Reduz hiperplasia do epitélio prostático → melhora sintomas urinários (LUTS)'},
      {ico:'💊',label:'Anti-inflamatório',val:'Inibe COX-1, COX-2 e 5-LOX → reduz inflamação prostática'},
      {ico:'🔓',label:'Receptores Androgênicos',val:'Bloqueia receptores DHT nas células prostáticas sem afetar testosterona sistêmica'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2002',journal:'Urology',titulo:'Saw Palmetto e sintomas urinários (HBP)',achado:'Melhora de 20–25% nos sintomas urinários vs placebo. Efeito similar à finasterida',detalhe:'18 RCTs, 2.939 homens. 320mg/dia de extrato padronizado. Menos efeitos adversos que a finasterida.',pmid:'12139048'},
      {tipo:'RCT',ano:'2018',journal:'J Altern Complement Med',titulo:'Saw Palmetto e alopecia androgênica',achado:'Aumento de 60% na densidade capilar vs placebo em 24 semanas',detalhe:'100 homens com alopecia AGA. 320mg/dia. Menos eficaz que finasterida oral, mas sem efeitos sexuais adversos.',pmid:'28700274'},
      {tipo:'Meta-análise',ano:'2009',journal:'Ann Pharmacother',titulo:'Saw Palmetto vs finasterida — revisão de longo prazo',achado:'Benefício similar nos sintomas IPSS em 1–2 anos, com perfil de efeitos adversos muito mais favorável',detalhe:'Efeitos adversos sexuais (DE, redução de libido): 1,1% com Saw Palmetto vs 4,9% com finasterida.',pmid:'19174558'},
    ],
    seguranca:[
      {tipo:'ok',label:'Bem tolerado',texto:'320mg/dia de extrato padronizado (85–95% ácidos graxos). Sem efeitos adversos sérios em até 3 anos de uso.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'Risco de potencialização antiagregante. Cessar 2 semanas antes de cirurgias.'},
      {tipo:'warn',label:'Diagnóstico prévio',texto:'Sintomas urinários podem mascarar câncer de próstata. Realizar PSA e exame digital antes de iniciar.'},
    ]
  },
  32:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`O Panax Ginseng (ginseng asiático ou coreano) contém ginsenosídeos Rb1, Rb2, Rc, Rd (série Rb — sedativos/ansiolíticos) e Rg1, Rg2, Rf (série Rg — estimulantes). Essa dualidade o torna um adaptógeno verdadeiro: regula o eixo HPA bidirecionalmente. O mecanismo para função erétil é via estímulo da síntese de óxido nítrico (NO) no endotélio vascular dos corpos cavernosos, mediado pelos ginsenosídeos Rb1 e Rg1.`,
    mecanismo:[
      {ico:'💨',label:'Óxido Nítrico',val:'Ginsenosídeos Rb1/Rg1 ativam eNOS endotelial → vasodilatação e ereção'},
      {ico:'⚡',label:'Adaptogênico',val:'Série Rb2 ativa GABA → calma; Série Rg1 ativa dopamina → energia. Equilíbrio bidirecional'},
      {ico:'🧠',label:'Cognição',val:'Ginsenosídeos cruzam a BHE → ativam receptores NMDA e nicotínicos → melhora cognitiva'},
      {ico:'🩸',label:'Glicemia',val:'Ginsenosídeos Rb ativam PPAR-γ → melhora sensibilidade à insulina e metabolismo de glicose'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2008',journal:'Br J Clin Pharmacol',titulo:'Panax Ginseng e disfunção erétil (6 RCTs)',achado:'Melhora significativa no IIEF em 5 de 6 estudos com ginseng vermelho coreano',detalhe:'349 homens. 900–1.000mg de extrato 3x/dia. Efeito sobre NO endotelial confirmado por marcadores vasculares.',pmid:'18373723'},
      {tipo:'Meta-análise',ano:'2010',journal:'J Psychopharmacol',titulo:'Ginseng e cognição (9 RCTs)',achado:'Melhora em atenção, velocidade de processamento e memória de trabalho em 7 de 9 estudos',detalhe:'Dose eficaz: 200–400mg/dia de extrato padronizado (4–7% ginsenosídeos). Efeito em 8–12 semanas.',pmid:'18467659'},
      {tipo:'RCT',ano:'2020',journal:'J Ginseng Res',titulo:'Ginseng vermelho e fadiga crônica',achado:'Redução de −44% na escala de fadiga (MFI) e +18% em capacidade funcional vs placebo',detalhe:'90 pacientes com síndrome de fadiga crônica. 2g/dia de extrato de ginseng vermelho por 8 semanas.',pmid:'32148403'},
    ],
    seguranca:[
      {tipo:'ok',label:'Seguro em ciclos de 3 meses',texto:'Extratos padronizados (4–7% ginsenosídeos) são seguros. EMA aprovou para fadiga e vitalidade.'},
      {tipo:'warn',label:'Insônia',texto:'A série Rg (estimulante) pode causar insônia se tomado após 14h. Uso matinal recomendado.'},
      {tipo:'warn',label:'Anticoagulantes e antidiabéticos',texto:'Ginsenosídeos podem potencializar warfarina e hipoglicemiantes. Monitoramento necessário.'},
      {tipo:'warn',label:'Ciclagem',texto:'Ciclo de 3 meses ON + 1 mês OFF. Uso contínuo pode levar à tolerância e efeito estrogênico fraco.'},
    ]
  },
  33:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A Taurina é o aminoácido livre mais abundante no tecido muscular e no cérebro — não é um aminoácido proteínico (não incorporado em proteínas), mas desempenha funções regulatórias críticas. Atua como osmorregulador (regula volume celular), modulador de íons (Ca²⁺, Na⁺, K⁺, Cl⁻), antioxidante e neuroprotetor. No músculo, melhora contratilidade e reduz oxidação mitocondrial. Estudos revelaram impacto no envelhecimento.`,
    mecanismo:[
      {ico:'💦',label:'Osmorregulação',val:'Regula volume celular via transporte de Cl⁻ → hidratação ótima da fibra muscular'},
      {ico:'⚡',label:'Cálcio',val:'Modula liberação de Ca²⁺ do retículo sarcoplasmático → contração muscular mais eficiente'},
      {ico:'🧠',label:'Neuroproteção',val:'Agonista de receptores glicina e GABA-A → efeito calmante e neuroprotetor'},
      {ico:'🩸',label:'Cardiovascular',val:'Reduz pressão arterial via inibição do sistema renina-angiotensina e estresse oxidativo vascular'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2003',journal:'Med Sci Sports Exerc',titulo:'Taurina e performance de corrida',achado:'+1,7% de VO₂max e −1,7% de tempo em teste de corrida de 3km vs placebo',detalhe:'11 corredores de resistência. 1g/dia de taurina. Redução de marcadores oxidativos e melhora no uso de O₂.',pmid:'14647180'},
      {tipo:'Estudo de longevidade',ano:'2023',journal:'Science',titulo:'Deficiência de taurina e envelhecimento',achado:'Níveis de taurina declinam 80% dos 5 aos 60 anos. Suplementação reverteu envelhecimento em modelos animais',detalhe:'Estudo do Instituto Nacional de Saúde dos EUA. Sugere papel central da taurina na longevidade. Gerou grande repercussão.',pmid:'37289583'},
      {tipo:'Meta-análise',ano:'2016',journal:'Nutrients',titulo:'Taurina e saúde cardiovascular (16 estudos)',achado:'Redução de −3,6 mmHg na PAS e −1,2 mmHg na PAD com suplementação',detalhe:'Meta-análise de estudos em hipertensos. Dose: 1,5–3g/dia. Mecanismo: redução do estresse oxidativo vascular.',pmid:'27579524'},
    ],
    seguranca:[
      {tipo:'ok',label:'Excelente segurança',texto:'EFSA considera até 6g/dia seguro. Estudos de 12 meses sem toxicidade. Aminoácido natural em abundância na dieta onívora.'},
      {tipo:'ok',label:'Sem interações significativas',texto:'Nenhuma interação medicamentosa clinicamente relevante documentada com taurina em doses suplementares.'},
      {tipo:'warn',label:'Hipotensão',texto:'Em doses altas (>3g/dia) pode reduzir pressão em pessoas com hipotensão basal ou em uso de anti-hipertensivos.'},
    ]
  },
  34:{
    ev:3,
    scientific_evidence_level:'C',
    resumo:`O Shatavari (Asparagus racemosus) é a principal erva adaptogênica ayurvédica para saúde feminina. Seus princípios ativos — saponinas esteroídicas (shatavarina I–IV), isoflavonas e polissacarídeos — têm atividade fitoestrogênica fraca, adaptogênica e galactagoga. Modula o eixo hipotálamo-hipófise-gonadal, apoia regulação do ciclo menstrual, lubrificação vaginal e libido feminina.`,
    mecanismo:[
      {ico:'♀️',label:'Fitoestrógenos',val:'Shatavarina I-IV se ligam fracamente a receptor ERα/ERβ → ação estrogênica modulada'},
      {ico:'🧠',label:'Eixo HPA',val:'Reduz cortisol e modulação adrenal → efeito adaptogênico em estresse crônico feminino'},
      {ico:'🌿',label:'Galactagogo',val:'Eleva prolactina via ação dopaminérgica → apoia produção de leite na lactação'},
      {ico:'🛡',label:'Anti-inflamatório',val:'Racemofuran inibe COX-2 → reduz dismenorreia e inflamação pélvica'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2018',journal:'J Ethnopharmacol',titulo:'Shatavari e sintomas da perimenopausa',achado:'Redução de −42% em fogachos e −35% em distúrbios de humor vs placebo',detalhe:'117 mulheres perimenopáusicas. 500mg 2x/dia por 12 semanas. Sem alterações em FSH, LH ou estrogênio sérico.',pmid:'30316251'},
      {tipo:'Estudo clínico',ano:'2010',journal:'J Altern Complement Med',titulo:'Shatavari e produção de leite em lactantes',achado:'Aumento de 33% no volume de leite vs placebo em 30 dias',detalhe:'60 mães com hipogalactia. Extrato padronizado 500mg/dia. Confirmação clínica do efeito galactagogo.',pmid:'20950166'},
      {tipo:'Revisão sistemática',ano:'2019',journal:'J Ethnopharmacol',titulo:'Shatavari e saúde reprodutiva feminina (12 estudos)',achado:'Evidência moderada para suporte do ciclo menstrual, libido e alívio de sintomas menopausais',detalhe:'Revisão de 12 estudos clínicos e pré-clínicos. Extrato padronizado para shatavarina I (≥5%) mais eficaz.',pmid:'30268608'},
    ],
    seguranca:[
      {tipo:'ok',label:'Bem tolerada',texto:'500mg–1g/dia sem efeitos adversos sérios em estudos de 12 semanas.'},
      {tipo:'warn',label:'Condições hormônio-sensíveis',texto:'A atividade fitoestrogênica fraca contraindica uso em cânceres hormônio-dependentes (mama, endométrio) sem orientação oncológica.'},
      {tipo:'warn',label:'Gestação e lactação',texto:'Uso na lactação é apoiado. Na gestação, dados são insuficientes — consultar ginecologista/obstetra.'},
    ]
  },
  36:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`O Psyllium husk (casca de Plantago ovata) é a fibra solúvel viscosa mais estudada para saúde digestiva e cardiovascular. Ao se hidratar, forma um gel mucilaginoso que retarda o trânsito intestinal, aumenta saciedade, envolve o bolo alimentar e reduz a absorção de colesterol e glicose. Aprovado pelo FDA como alimento funcional com claim de saúde cardiovascular (redução de LDL).`,
    mecanismo:[
      {ico:'🌊',label:'Gel Mucilaginoso',val:'Absorve água → forma gel viscoso → retarda esvaziamento gástrico e absorção de macros'},
      {ico:'🩸',label:'Colesterol',val:'Liga-se a ácidos biliares no intestino → remoção fecal → fígado usa colesterol para resintetizá-los'},
      {ico:'🦠',label:'Microbioma',val:'Fermentação parcial por bactérias produz AGCC (propionato, butirato) → saúde do cólon'},
      {ico:'📉',label:'Glicemia',val:'Gel retarda absorção de carboidratos → pico glicêmico atenuado → melhor controle de insulina'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2009',journal:'Am J Clin Nutr',titulo:'Psyllium e colesterol LDL (21 RCTs)',achado:'Redução de −6,7 mg/dL de LDL com 10,2g/dia de psyllium',detalhe:'1.030 participantes. Efeito dose-dependente. FDA aprovou claim de saúde com ≥7g/dia. Maior efeito em hipercolesterolêmicos.',pmid:'19335543'},
      {tipo:'Meta-análise',ano:'2012',journal:'Br J Nutr',titulo:'Psyllium e glicemia em diabetes tipo 2',achado:'−15% na glicemia pós-prandial e −6% na HbA1c em diabéticos tipo 2',detalhe:'35 RCTs. 5–10g de psyllium antes das refeições principais. Aprovado como complemento dietético para diabetes.',pmid:'22142813'},
      {tipo:'RCT',ano:'2018',journal:'Nutr J',titulo:'Psyllium e saciedade em sobrepeso',achado:'Redução de −12% na ingestão calórica no almoço quando psyllium tomado 30 min antes do café da manhã',detalhe:'50 adultos com sobrepeso. 10,2g de psyllium + 240ml de água 30 min pré-prandial. Redução de grelina.',pmid:'29986838'},
    ],
    seguranca:[
      {tipo:'ok',label:'Amplamente seguro',texto:'Usado por décadas em formações farmacêuticas (Metamucil). Sem efeitos adversos sérios com até 30g/dia de psyllium.'},
      {tipo:'warn',label:'Hidratação obrigatória',texto:'Tomar com 250–500ml de água. Sem água adequada, o gel pode causar obstrução esofágica.'},
      {tipo:'warn',label:'Medicamentos',texto:'Separar 2h de qualquer medicamento oral. O gel pode reduzir absorção de metformina, digitálicos e antidepressivos.'},
    ]
  },
  37:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A Berberina é um alcaloide isoquinolínico encontrado em Berberis vulgaris, Hydrastis canadensis e Coptis chinensis. É um dos fitoquímicos mais estudados para metabolismo, com ação principal na ativação de AMPK (proteína quinase ativada por AMP) — o "sensor de energia" celular. O efeito metabólico da berberina é comparável à metformina em estudos diretos, incluindo redução de HbA1c, glicemia e colesterol LDL.`,
    mecanismo:[
      {ico:'⚡',label:'AMPK',val:'Berberina inibe Complex I mitocondrial → ativa AMPK (como metformina) → melhora captação de glicose'},
      {ico:'🩸',label:'Insulina',val:'Aumenta expressão de GLUT4 na membrana muscular → captação de glicose insulino-independente'},
      {ico:'🦠',label:'Microbioma',val:'Modifica composição do microbioma intestinal → aumenta produção de AGCC benéficos'},
      {ico:'📉',label:'LDL',val:'Inibe PCSK9 → reduz degradação de receptor de LDL → mais captação hepática de LDL'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2008',journal:'Metabolism',titulo:'Berberina vs metformina para diabetes tipo 2',achado:'HbA1c: −1,9% (berberina) vs −1,8% (metformina) — sem diferença significativa',detalhe:'116 pacientes diabéticos. 500mg 3x/dia por 3 meses. Berberina também reduziu triglicerídeos e LDL melhor que metformina.',pmid:'18547887'},
      {tipo:'Meta-análise',ano:'2015',journal:'Evid Based Complement Alternat Med',titulo:'Berberina e síndrome metabólica (27 RCTs)',achado:'Redução de −23% de glicemia de jejum, −12% de LDL e −19% de triglicerídeos',detalhe:'Análise abrangente confirmando eficácia em múltiplos marcadores metabólicos com 500–1500mg/dia.',pmid:'26246802'},
      {tipo:'Meta-análise',ano:'2019',journal:'Front Pharmacol',titulo:'Berberina e não-alcoólica hepática (12 RCTs)',achado:'Redução de −18% de ALT, −15% de AST e melhora histológica em NAFLD',detalhe:'AMPK hepática como alvo principal. Berberina reduziu acúmulo de gordura hepática e inflamação.',pmid:'31244647'},
    ],
    seguranca:[
      {tipo:'ok',label:'Eficaz e bem tolerada',texto:'500mg 2–3x/dia com refeições é a dose mais estudada. Sem hepatotoxicidade ou nefrotoxicidade.'},
      {tipo:'warn',label:'Hipoglicemia',texto:'Combinar com insulina ou hipoglicemiantes requer monitoramento da glicemia. Pode ocorrer hipoglicemia.'},
      {tipo:'warn',label:'Gravidez e lactação',texto:'Contraindicada. Alcaloides podem cruzar a barreira placentária e afetar o desenvolvimento fetal.'},
      {tipo:'warn',label:'Interação com ciclosporina',texto:'Inibe CYP3A4 — pode elevar concentrações de imunossupressores e outras drogas metabolizadas por essa via.'},
    ]
  },
  38:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`O Cromo trivalente (Cr³⁺) é um mineral traço com papel na sinalização da insulina — potencializa a ligação de insulina ao seu receptor via uma molécula chamada cromodulina (ou factor de tolerância à glicose). A forma picolinato é a mais biodisponível (15× mais que cloreto de cromo). A deficiência de cromo, comum em dietas ocidentais, está associada a resistência à insulina, compulsão por carboidratos e dislipidemia.`,
    mecanismo:[
      {ico:'🩸',label:'Insulina',val:'Cr³⁺ + cromoliguem → cromodulina ativa → potencializa sinalização do receptor de insulina'},
      {ico:'🍬',label:'Compulsão',val:'Melhora sinalização de insulina cerebral → reduz compulsão por doces e carboidratos'},
      {ico:'📉',label:'Glicemia',val:'Aumenta captação de glicose periférica via GLUT4, especialmente em resistência à insulina'},
      {ico:'💊',label:'Lipídeos',val:'Pode reduzir triglicerídeos e LDL leve e melhorar HDL em pessoas com resistência à insulina'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2006',journal:'Diabetes Care',titulo:'Cromo e glicemia em diabetes (41 RCTs)',achado:'Redução de −0,6% na HbA1c e −1,0 mmol/L na glicemia de jejum',detalhe:'1.690 participantes. Efeito mais robusto em pessoas com deficiência basal de cromo ou diabetes tipo 2.',pmid:'16801600'},
      {tipo:'RCT',ano:'2005',journal:'Biol Psychiatry',titulo:'Cromo e compulsão alimentar em depressão atípica',achado:'−42% de compulsão por carboidratos e melhora de humor vs placebo em 8 semanas',detalhe:'113 pacientes. 600mcg/dia. Interessante para manejo de compulsão associada a estados depressivos.',pmid:'15780862'},
      {tipo:'Meta-análise',ano:'2020',journal:'Nutr Metab Cardiovasc Dis',titulo:'Cromo e resistência à insulina (25 RCTs)',achado:'Redução de −0,54 mmol/L na glicemia de jejum e melhora de HOMA-IR em pré-diabéticos',detalhe:'1.049 participantes. Efeito mais robusto em pré-diabéticos vs normoglicêmicos. Dose eficaz: 200–1000mcg/dia.',pmid:'33041130'},
    ],
    seguranca:[
      {tipo:'ok',label:'Seguro nas doses recomendadas',texto:'200–400mcg/dia de cromo picolinato é seguro. UL não formalmente estabelecido, mas 1.000mcg/dia é considerado limite prático.'},
      {tipo:'warn',label:'Risco de hipoglicemia',texto:'Com antidiabéticos orais ou insulina, pode ocorrer hipoglicemia. Monitorar glicemia.'},
      {tipo:'warn',label:'Dano oxidativo em doses altas',texto:'Doses muito altas (>1mg/dia) de cromo picolinato geraram danos oxidativos in vitro. Não exceder 400mcg/dia sem supervisão.'},
    ]
  },
  39:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`O EGCG (Epigalocatequina-3-galato) é a catequina mais abundante e biologicamente ativa do chá verde (Camellia sinensis). É um polifenol com múltiplas ações: antioxidante, anti-inflamatório, termogênico suave e anticancerígeno potencial. Inibe a enzima COMT (catecol-O-metiltransferase), que degrada adrenalina e noradrenalina — potencializando levemente o efeito da cafeína e elevando termogênese.`,
    mecanismo:[
      {ico:'🔥',label:'Termogênese',val:'Inibe COMT → mais noradrenalina disponível → ativa β3-adrenorreceptores em tecido adiposo'},
      {ico:'📉',label:'NF-κB',val:'EGCG inibe IKKβ → bloqueia NF-κB → redução de citocinas pró-inflamatórias'},
      {ico:'🛡',label:'Antioxidante',val:'Neutraliza radicais livres diretamente e quelata metais pesados (ferro, cobre) prooxidantes'},
      {ico:'🧬',label:'Apoptose',val:'Em células tumorais, ativa caspase-3 e inibe survivina → apoptose seletiva'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2009',journal:'Int J Obes',titulo:'EGCG e perda de peso (15 estudos)',achado:'+1,31 kg de perda adicional vs placebo em 12 semanas (modesto mas consistente)',detalhe:'Efeito mais pronunciado em asiáticos que não consomem cafeína regularmente. Aumenta gasto energético ~80kcal/dia.',pmid:'19597519'},
      {tipo:'RCT',ano:'2007',journal:'Am J Clin Nutr',titulo:'Chá verde e gordura abdominal',achado:'Redução de −7,7% em gordura visceral vs controle em 12 semanas',detalhe:'240 homens obesos. 583mg EGCG/dia (chá verde). Sem diferença no peso total, mas redução de gordura visceral.',pmid:'17557985'},
      {tipo:'Meta-análise',ano:'2020',journal:'Crit Rev Food Sci Nutr',titulo:'EGCG e marcadores de inflamação (31 estudos)',achado:'Redução significativa de IL-6, TNF-α e PCR-us com suplementação de catequinas de chá verde',detalhe:'Análise de 31 RCTs. EGCG como anti-inflamatório sistêmico com eficácia especialmente em pacientes com obesidade.',pmid:'32079419'},
    ],
    seguranca:[
      {tipo:'ok',label:'Seguro nas doses de suplementação',texto:'300–500mg de EGCG/dia tem bom perfil de segurança em adultos saudáveis.'},
      {tipo:'warn',label:'Hepatotoxicidade em doses altas',texto:'Casos raros de dano hepático com extratos de chá verde em doses >800mg de EGCG/dia em jejum. Preferir com refeição.'},
      {tipo:'warn',label:'Ferro',texto:'EGCG quelata ferro não-heme — reduz absorção. Separar de refeições ricas em ferro e suplementos de ferro.'},
    ]
  },
  40:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`O colágeno é a proteína estrutural mais abundante do organismo (30% da proteína total), essencial para tendões, ligamentos, cartilagens, pele e ossos. Os peptídeos bioativos (VERISOL® para pele/cabelo, FORTIGEL® para cartilagem) são dipeptídeos e tripeptídeos específicos — Pro-Hyp e Hyp-Gly — que estimulam fibroblastos e condrócitos a produzir novo colágeno, ao invés de apenas fornecer aminoácidos. A vitamina C é cofatora obrigatória da síntese de colágeno.`,
    mecanismo:[
      {ico:'🔬',label:'Peptídeos Bioativos',val:'Pro-Hyp e Hyp-Gly estimulam fibroblastos e condrócitos via receptores específicos'},
      {ico:'🧬',label:'Síntese de Colágeno',val:'Induzem expressão de genes COL1A1, COL1A2 e COL3A1 em células do tecido conjuntivo'},
      {ico:'🦴',label:'Cartilagem',val:'FORTIGEL estimula síntese de colágeno tipo II e proteoglicanos em condrócitos'},
      {ico:'💊',label:'Vitamina C',val:'Cofatora das enzimas prolil e lisil hidroxilase — indispensável para estabilidade do colágeno'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2018',journal:'Br J Sports Med',titulo:'Colágeno + Vitamina C e tendinite',achado:'Melhora de +65% na síntese de colágeno peritendinoso vs placebo',detalhe:'Estudo de Shaw et al. 15g de colágeno hidrolisado + 48mg vitamina C antes do exercício. Melhora funcional em tendinite patelar.',pmid:'28174772'},
      {tipo:'RCT',ano:'2014',journal:'J Sci Med Sport',titulo:'FORTIGEL e cartilagem em atletas',achado:'Redução de −50% em dor articular ao repouso e exercício em 24 semanas',detalhe:'147 atletas com desconforto articular. 10g/dia de peptídeos de colágeno. Diferença significativa a partir da semana 12.',pmid:'25529024'},
      {tipo:'RCT',ano:'2019',journal:'Skin Pharmacol Physiol',titulo:'VERISOL e elasticidade da pele',achado:'Aumento de +15% em elasticidade e −11% em profundidade das rugas vs placebo',detalhe:'69 mulheres de 35–55 anos. 2,5g/dia de VERISOL por 8 semanas. Efeito dose-dependente confirmado.',pmid:'30884513'},
    ],
    seguranca:[
      {tipo:'ok',label:'Muito seguro',texto:'Colágeno é uma proteína alimentar. Sem toxicidade em doses de 5–15g/dia. Amplamente tolerado.'},
      {tipo:'warn',label:'Alergia a peixe/bovino',texto:'Colágeno marinho (peixe) pode desencadear reações em alérgicos a frutos do mar. Verificar origem do produto.'},
      {tipo:'ok',label:'Não é proteína completa',texto:'Colágeno é pobre em triptofano. Não deve substituir proteína completa (whey, ovo) na dieta de hipertrofia.'},
    ]
  },
  41:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`O Ferro é o mineral mais carente na dieta global, especialmente em mulheres (menstruação = perda de 15–30mg/ciclo). A forma bisglicinato quelado é 2–4× mais biodisponível que o sulfato ferroso (forma farmacêutica comum) e causa muito menos efeitos gastrointestinais. O ferro é cofator da hemoglobina (transporte de O₂), da mioglobina (armazenamento de O₂ muscular) e de enzimas mitocondriais. Ferritina baixa causa fadiga e queda de cabelo antes da anemia.`,
    mecanismo:[
      {ico:'🔴',label:'Hemoglobina',val:'Fe²⁺ é componente do heme → hemoglobina transporta O₂ nos eritrócitos'},
      {ico:'💪',label:'Mioglobina',val:'Fe²⁺ em mioglobina armazena O₂ no músculo → libera durante contração anaeróbia'},
      {ico:'⚡',label:'Cadeia Respiratória',val:'Ferro é cofator dos Complexos II, III e IV da cadeia mitocondrial → produção de ATP'},
      {ico:'🧬',label:'Tireoide',val:'Cofator da tireoide peroxidase → essencial para síntese de T3 e T4'},
    ],
    estudos:[
      {tipo:'Comparativo',ano:'2014',journal:'Int J Vitam Nutr Res',titulo:'Bisglicinato vs sulfato ferroso — biodisponibilidade',achado:'Bisglicinato tem 4× mais biodisponibilidade relativa e −70% de efeitos GI adversos',detalhe:'Estudo crossover. Ferritina elevou 40% mais com bisglicinato. Tolerância GI significativamente superior.',pmid:'25532497'},
      {tipo:'Meta-análise',ano:'2017',journal:'Nutrients',titulo:'Ferro e performance cognitiva em mulheres com deficiência',achado:'Suplementação restaurou atenção e função executiva em mulheres com ferritina <20 ng/mL',detalhe:'Confirmação do impacto cognitivo da deficiência de ferro antes da anemia evidente.',pmid:'28241450'},
      {tipo:'RCT',ano:'2012',journal:'Br J Nutr',titulo:'Ferro bisglicinato vs sulfato na gravidez',achado:'Bisglicinato atingiu os mesmos níveis de ferritina com 50% da dose do sulfato ferroso, com −65% de náusea',detalhe:'125 gestantes no 2º trimestre. Tolerância superior é especialmente importante na gravidez. Adesão 2× maior.',pmid:'21711582'},
    ],
    seguranca:[
      {tipo:'warn',label:'Exames antes de suplementar',texto:'Ferro em excesso é pró-oxidante e hepatotóxico. Realizar ferritina e hemograma antes. Não suplementar sem deficiência confirmada.'},
      {tipo:'warn',label:'Interações',texto:'Separar 2h de cálcio, zinco, café, chá e antiácidos. Tomar com vitamina C para potencializar absorção.'},
      {tipo:'bad',label:'Hemocromatose',texto:'Absolutamente contraindicado em hemocromatose hereditária ou sobrecarga de ferro documentada.'},
    ]
  },
  42:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`O Cranberry (Vaccinium macrocarpon) contém proantocianidinas tipo A (PACs-A), estruturalmente únicas na capacidade de prevenir a adesão de bactérias uropatogênicas (especialmente E. coli cepa P-fimbriated) ao epitélio do trato urinário. A dose eficaz é de 36mg de PACs-A/dia — concentração que requer extrato padronizado, pois o suco comercial geralmente tem <10mg por porção.`,
    mecanismo:[
      {ico:'🦠',label:'Anti-adesão',val:'PACs-A bloqueiam fímbrias tipo P de E. coli → bactérias não aderem ao urotélio → eliminação urinária'},
      {ico:'🛡',label:'Biofilme',val:'Inibem formação de biofilme bacteriano no cateter e mucosa vesical'},
      {ico:'📉',label:'pH Urinário',val:'Ácidos hipúrico e benzoico do cranberry acidificam levemente a urina → ambiente menos favorável a bactérias'},
      {ico:'🔬',label:'Antioxidante',val:'Antocianinas e quercetina do cranberry têm atividade antioxidante sistêmica adicional'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2017',journal:'J Urol',titulo:'Cranberry e ITU recorrente (24 RCTs)',achado:'Redução de −26% na incidência de ITU em mulheres propensas a recorrência',detalhe:'4.473 participantes. Efeito mais robusto em mulheres jovens com ≥2 ITUs/ano. Produto padronizado para PACs-A necessário.',pmid:'28012646'},
      {tipo:'RCT',ano:'2012',journal:'Urology',titulo:'Cranberry e ITU pós-cirurgia ginecológica',achado:'−50% de ITU nas 6 semanas pós-operatórias com cranberry vs placebo',detalhe:'160 mulheres. 500mg 2x/dia de extrato padronizado (36mg PACs/dia). Prevenção eficaz em período de risco elevado.',pmid:'22507471'},
      {tipo:'RCT',ano:'2016',journal:'J Urol',titulo:'Cranberry e ITU em mulheres jovens (COLARIS trial)',achado:'Redução de 39% de ITUs no grupo cranberry em 24 semanas vs placebo',detalhe:'185 mulheres com ≥2 ITUs/ano. 2 cápsulas de extrato 500mg/dia. Efeito máximo em mulheres com pH urinário <6.',pmid:'26614114'},
    ],
    seguranca:[
      {tipo:'ok',label:'Bem tolerado',texto:'Extrato padronizado 500mg/dia bem tolerado. Sem nefrotoxicidade ou hepatotoxicidade.'},
      {tipo:'warn',label:'Não substitui antibiótico',texto:'Cranberry é preventivo, não terapêutico. Em ITU ativa com sintomas, antibióticos são necessários.'},
      {tipo:'warn',label:'Cálculo renal de oxalato',texto:'Cranberry eleva levemente oxalato urinário. Pessoas com histórico de cálculo oxálico devem consultar urologista.'},
    ]
  },
  43:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`A Melatonina é um neurormônio sintetizado pela glândula pineal a partir do triptofano → serotonina → melatonina, em resposta ao escuro. Não é sedativo — é um sinalizador de fase circadiana que informa ao organismo que é "hora de dormir". Sua eficácia é maior para jet lag, trabalho em turnos e adiantamento ou atraso de fase do sono. Para insônia crônica, eficácia é moderada. A dose eficaz é surpreendentemente baixa: 0,3–1mg é igual ou superior a 5–10mg.`,
    mecanismo:[
      {ico:'🌙',label:'Receptores MT1/MT2',val:'Melatonina liga-se a MT1 (induz sono) e MT2 (regula fase circadiana) no hipotálamo anterior'},
      {ico:'🧠',label:'Temperatura Corporal',val:'Via MT1 no hipotálamo → reduz temperatura central → facilita início do sono'},
      {ico:'⏰',label:'Relógio Circadiano',val:'Sincroniza o relógio biológico (nucleus suprachiasmaticus) ao ciclo claro-escuro'},
      {ico:'🛡',label:'Antioxidante',val:'Melatonina é potente eliminadora de radicais livres nas mitocôndrias — função independente do sono'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2013',journal:'PLoS One',titulo:'Melatonina e distúrbios do sono (19 RCTs)',achado:'Reduz latência do sono em −7 minutos e aumenta tempo total em +8 minutos',detalhe:'1.683 participantes. Eficácia modesta para insônia, mas muito segura. Sem rebote após interrupção.',pmid:'23691095'},
      {tipo:'Estudo Clínico',ano:'2001',journal:'J Clin Endocrinol Metab',titulo:'Doses fisiológicas vs farmacológicas',achado:'0,3mg foi tão eficaz quanto 3mg para induzir o sono, mas sem ressaca',detalhe:'O estudo que provou que "menos é mais". Altas doses dessensibilizam receptores e causam letargia matinal.',pmid:'11581442'},
      {tipo:'Meta-análise',ano:'2014',journal:'J Pineal Res',titulo:'Melatonina e jet lag (9 RCTs)',achado:'Redução de −53% nos sintomas de jet lag em viagens com ≥5 fusos horários',detalhe:'Eficácia mais robusta para jet lag e shift work do que para insônia primária. Melhor tomado no horário de dormir do destino.',pmid:'24827678'},
    ],
    seguranca:[
      {tipo:'ok',label:'Segura a curto/médio prazo',texto:'Excelente segurança em doses fisiológicas (0,3–1mg). Sem risco de dependência química.'},
      {tipo:'warn',label:'Doses excessivas',texto:'A maioria dos suplementos tem 3–10mg (10–30× o que o cérebro produz). Pode causar "ressaca" e pesadelos.'},
      {tipo:'warn',label:'Doenças autoimunes',texto:'A melatonina estimula algumas vias imunes (células T). Cautela em lúpus e artrite reumatoide.'},
    ]
  },
  45:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A NAC (N-Acetilcisteína) é um derivado do aminoácido L-cisteína. É o principal doador de cisteína para a síntese de Glutationa — o antioxidante intracelular "mestre" do corpo humano. A NAC tem também propriedade mucolítica direta (quebra pontes dissulfeto do muco) e modula o neurotransmissor glutamato no cérebro. É medicamento de emergência (antídoto) para overdose de paracetamol.`,
    mecanismo:[
      {ico:'🛡',label:'Glutationa',val:'Fornece cisteína (aminoácido limitante) para ressíntese de glutationa (GSH)'},
      {ico:'🧠',label:'Glutamato',val:'Ativa o antiporte cistina-glutamato → reduz excesso de glutamato na fenda sináptica'},
      {ico:'💨',label:'Mucolítico',val:'Quebra ligações dissulfeto das mucoproteínas → fluidifica secreções respiratórias'},
      {ico:'🦠',label:'Imunidade',val:'Preserva função de células T e reduz tempestade de citocinas em infecções virais'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2015',journal:'Eur Respir Rev',titulo:'NAC e bronquite crônica / DPOC',achado:'−41% de risco de exacerbações agudas com 600mg/dia vs placebo',detalhe:'13 RCTs, 4.155 pacientes. Eficácia sólida em doenças respiratórias crônicas. Mucolítico e antioxidante.',pmid:'25726556'},
      {tipo:'Revisão sistemática',ano:'2018',journal:'J Clin Psychiatry',titulo:'NAC em distúrbios psiquiátricos e compulsivos',achado:'Eficácia significativa para tricotilomania, escoriação e fissura por substâncias',detalhe:'Mecanismo via modulação de glutamato. Dose usual: 1.200–2.400mg/dia. Seguro como terapia adjunta.',pmid:'29536614'},
      {tipo:'RCT',ano:'2021',journal:'Eur Respir J',titulo:'NAC e COVID-19 grave / síndrome respiratória',achado:'Redução de −33% em mortalidade em pacientes graves suplementados com NAC IV',detalhe:'Meta-análise de 4 estudos pandêmicos. Mecanismo: repleção de glutationa pulmonar e redução de tempestade de citocinas.',pmid:'34413159'},
    ],
    seguranca:[
      {tipo:'ok',label:'Ampla margem de segurança',texto:'Usada como medicamento oral e intravenoso por décadas. Bem tolerada em 600–1200mg/dia.'},
      {tipo:'warn',label:'Desconforto gástrico',texto:'Pode causar acidez e náusea. O enxofre na molécula confere odor característico (não é produto estragado).'},
      {tipo:'warn',label:'Nitroglicerina',texto:'Pode potencializar vasodilatação da nitroglicerina, causando dor de cabeça severa e hipotensão.'},
    ]
  },
  46:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A Glicina é um aminoácido inibitório não essencial (o corpo produz, mas frequentemente não o suficiente para demandas otimizadas, especialmente de colágeno). Atua como co-agonista dos receptores NMDA e ativador dos receptores de glicina no tronco cerebral, induzindo vasodilatação periférica, queda da temperatura corporal central e aprofundamento do sono (ondas lentas). Também é 1/3 da estrutura do colágeno e necessária para a síntese de glutationa.`,
    mecanismo:[
      {ico:'😴',label:'Sono NREM',val:'Ativa receptores inibitórios no tronco cerebral → facilita transição para sono de ondas lentas'},
      {ico:'🌡',label:'Termorregulação',val:'Induz vasodilatação periférica → queda da temperatura central → indução do sono'},
      {ico:'🧬',label:'Colágeno',val:'Representa 33% dos aminoácidos da hélice do colágeno. Exigência diária alta (10–15g)'},
      {ico:'🛡',label:'Glutationa',val:'Junto com cisteína (NAC) e glutamato, é bloco construtor do antioxidante glutationa'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2007',journal:'Sleep and Biological Rhythms',titulo:'Glicina e qualidade do sono',achado:'Melhora significativa na arquitetura do sono e redução da fadiga matinal',detalhe:'3g de glicina 1h antes de dormir vs placebo. Aumentou eficiência do sono sem sedação pesada ou "ressaca".',pmid:''},
      {tipo:'RCT',ano:'2012',journal:'Front Neurol',titulo:'Glicina e privação de sono',achado:'Preservou performance psicomotora no dia seguinte após sono restrito (25% menos)',detalhe:'Voluntários privados de sono. 3g de glicina mitigou os efeitos cognitivos da restrição de sono.',pmid:'22529837'},
      {tipo:'RCT',ano:'2015',journal:'Sleep Biol Rhythms',titulo:'Glicina e termorregulação noturna',achado:'Redução de 0,5°C na temperatura corporal core e aumento de +14% em ondas lentas (NREM 3)',detalhe:'Mecanismo confirmado: glicina promove vasodilatação periférica → dissipação de calor → queda de temperatura central → sono mais profundo.',pmid:'25596369'},
    ],
    seguranca:[
      {tipo:'ok',label:'Extremamente segura',texto:'Aminoácido abundante na dieta (ex: gelatina, caldos). Doses de 3–5g/dia são fisiológicas.'},
      {tipo:'ok',label:'Sabor doce',texto:'Glicina é naturalmente doce (70% da doçura da sacarose) sem calorias de carboidrato. Fácil de diluir em chás.'},
    ]
  },
  47:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`Os Inositóis (especialmente a combinação Myo-inositol e D-chiro-inositol) são carboidratos cíclicos que atuam como "segundos mensageiros" celulares para a insulina e para o hormônio folículo-estimulante (FSH). São a intervenção natural mais estudada e recomendada (Primeira Linha) para a Síndrome dos Ovários Policísticos (SOP), restaurando a ovulação, reduzindo hiperandrogenismo (acne, pelos) e melhorando a sensibilidade à insulina. A proporção fisiológica plasmática é 40:1 (Myo:D-Chiro).`,
    mecanismo:[
      {ico:'🩸',label:'Sensibilidade à Insulina',val:'Inositofosfoglicanos facilitam a captação de glicose pós-ativação do receptor de insulina'},
      {ico:'♀️',label:'SOP / Ovulação',val:'Myo-inositol no ovário melhora sinalização de FSH → restaura maturação folicular'},
      {ico:'📉',label:'Andrógenos',val:'Redução de insulina basal → redução da produção ovariana de testosterona'},
      {ico:'🧠',label:'Sinalização Serotoninérgica',val:'Myo-inositol em altas doses (12g+) modula serotonina em transtornos de pânico (off-label)'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2017',journal:'Int J Endocrinol',titulo:'Inositóis na SOP (9 RCTs)',achado:'Redução significativa de testosterona sérica, melhora de HOMA-IR e regularidade menstrual',detalhe:'247 mulheres com SOP. Combinação 40:1 (Myo:D-chiro) foi superior ao Myo-inositol isolado para resultados metabólicos.',pmid:'29410688'},
      {tipo:'RCT',ano:'2015',journal:'Eur Rev Med Pharmacol Sci',titulo:'Inositol vs Metformina na SOP',achado:'Inositol igualou a eficácia da metformina na restauração da ovulação, com 5× menos efeitos adversos',detalhe:'120 pacientes. 4g/dia de inositol vs 1500mg metformina. Tolerância GI do inositol foi muito superior.',pmid:'25652599'},
      {tipo:'RCT',ano:'2019',journal:'Reprod Biomed Online',titulo:'Myo-inositol e fertilização in vitro na SOP',achado:'Melhora de +15% na taxa de embriões de qualidade top e −18% de doses de FSH necessárias',detalhe:'120 mulheres com SOP em protocolo FIV. 4g/dia de myo-inositol. Melhora na maturidade dos oócitos.',pmid:'30853259'},
    ],
    seguranca:[
      {tipo:'ok',label:'Excelente segurança e tolerância',texto:'Considerado vitamina B8 no passado. Doses de 2–4g/dia são muito bem toleradas. Raro desconforto GI apenas em doses altas.'},
      {tipo:'ok',label:'Seguro em tentativas de gestação',texto:'Geralmente mantido durante fertilização in vitro (FIV) para melhorar qualidade oocitária.'},
    ]
  },
  48:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`A Spirulina (Arthrospira platensis) é uma cianobactéria (alga azul-verde) e um dos alimentos mais densos do planeta em nutrientes por grama. Contém 60% de proteína completa, betacaroteno, ferro, ácido gama-linolênico (GLA) e seu pigmento ativo exclusivo: a ficocianina. Possui forte evidência para redução de colesterol, modulação imunológica e auxílio na redução da rinite alérgica.`,
    mecanismo:[
      {ico:'🛡',label:'Ficocianina',val:'Pigmento azul antioxidante → inibe NADPH oxidase e reduz estresse oxidativo sistêmico'},
      {ico:'🩸',label:'Lipídeos',val:'Inibe absorção intestinal de colesterol e modula síntese hepática (reduz LDL e triglicerídeos)'},
      {ico:'🤧',label:'Rinite Alérgica',val:'Inibe a liberação de histamina por mastócitos e modula citocinas Th2 → alívio sintomático'},
      {ico:'⚡',label:'Fadiga',val:'Polissacarídeos da spirulina promovem saúde intestinal e melhoram tolerância ao exercício'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2015',journal:'Clin Nutr',titulo:'Spirulina e perfil lipídico (7 RCTs)',achado:'−41 mg/dL em triglicerídeos, −33 mg/dL em LDL e +6 mg/dL em HDL',detalhe:'522 pacientes com dislipidemia. Doses de 1–8g/dia. Resultados consistentes na proteção cardiovascular.',pmid:'26433766'},
      {tipo:'RCT',ano:'2008',journal:'Eur Arch Otorhinolaryngol',titulo:'Spirulina e Rinite Alérgica',achado:'Redução significativa (p<0.001) em coriza, espirros e congestão nasal vs placebo',detalhe:'129 pacientes com rinite alérgica. 2g/dia por 6 meses. O tratamento natural mais validado para rinite.',pmid:'18343939'},
      {tipo:'RCT',ano:'2016',journal:'Nutrients',titulo:'Spirulina e força muscular em idosos',achado:'+12% de força de preensão palmar e −14% de fadiga muscular vs placebo em 12 semanas',detalhe:'40 idosos de 60–87 anos. 7,5g/dia. Proteção contra sarcopenia via antioxidação mitocondrial.',pmid:'27854247'},
    ],
    seguranca:[
      {tipo:'warn',label:'Origem é fundamental',texto:'Pode acumular metais pesados ou microcistinas (toxinas hepáticas) se cultivada em águas contaminadas. Exigir laudo de pureza.'},
      {tipo:'warn',label:'Fenilcetonúria',texto:'Rica em fenilalanina. Contraindicada para portadores de PKU.'},
      {tipo:'warn',label:'Doenças Autoimunes',texto:'Sendo estimulante imune, pode exacerbar condições como lúpus ou artrite reumatoide em pessoas sensíveis.'},
    ]
  },
  56:{
    ev:5,
    scientific_evidence_level:'A',
    resumo:`A Curcumina é o principal polifenol da Cúrcuma (Curcuma longa). É um dos anti-inflamatórios naturais mais potentes estudados, inibindo a via da COX-2, LOX e TNF-α. O problema histórico da curcumina é a péssima absorção (biodisponibilidade <1%). A forma Fitossomada (complexada com fosfolipídeos de soja ou girassol — ex: Meriva®) eleva a absorção em 29×, permitindo efeitos sistêmicos potentes, especialmente em dores articulares e saúde endotelial.`,
    mecanismo:[
      {ico:'🔥',label:'Anti-inflamatório',val:'Inibe COX-2, 5-LOX, TNF-α e NF-κB → paralisa a cascata inflamatória mestre'},
      {ico:'🦴',label:'Articulações',val:'Inibe metaloproteinases que degradam cartilagem → protege matriz articular em osteoartrite'},
      {ico:'🧠',label:'Neuroproteção',val:'Cruza a barreira hematoencefálica (BHE) e reduz inflamação e placas amiloides no cérebro'},
      {ico:'🛡',label:'Antioxidante',val:'Estimula via Nrf2 → ativa enzimas antioxidantes endógenas (SOD, catalase)'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2016',journal:'J Med Food',titulo:'Curcumina e osteoartrite (8 RCTs)',achado:'Eficácia idêntica a AINEs (como ibuprofeno) na redução da dor, mas sem toxicidade gástrica',detalhe:'606 pacientes. 500–1000mg/dia de extratos otimizados. Melhora no índice WOMAC.',pmid:'27533649'},
      {tipo:'RCT',ano:'2012',journal:'Panminerva Med',titulo:'Curcumina fitossomada (Meriva) em osteoartrite',achado:'Redução de 58% na dor (WOMAC) e 400% de aumento na distância caminhada em 8 meses',detalhe:'100 pacientes. 1g/dia de Meriva (200mg curcumina). Confirmação de longo prazo.',pmid:'21145326'},
      {tipo:'RCT',ano:'2014',journal:'J Affect Disord',titulo:'Curcumina e depressão maior',achado:'Eficácia similar à fluoxetina em 6 semanas, melhor quando combinados',detalhe:'60 pacientes com depressão maior. 1g/dia. Mecanismo via redução de neuroinflamação.',pmid:'23832433'},
    ],
    seguranca:[
      {tipo:'ok',label:'Extremamente segura na forma fitossomada',texto:'Aprovada como GRAS. Sem risco de sangramento gástrico, diferente dos AINEs.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'Inibe agregação plaquetária levemente. Usar com cautela junto a anticoagulantes ou antes de cirurgias.'},
      {tipo:'warn',label:'Cálculos biliares',texto:'Pode estimular contração da vesícula. Contraindicado para quem tem cálculos biliares diagnosticados.'},
    ]
  },
  54:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`A L-Carnitina é responsável pelo transporte de ácidos graxos de cadeia longa para o interior da mitocôndria, onde são oxidados (queimados) para gerar ATP. A forma L-Tartarato (LCLT) é a mais absorvida pelo tecido muscular. Ao contrário do mito, ela não "queima gordura sozinha" se não houver déficit calórico e treino. Seu maior diferencial cientificamente comprovado é a aceleração da recuperação muscular e modulação da densidade de receptores androgênicos.`,
    mecanismo:[
      {ico:'🔥',label:'Beta-oxidação',val:'Carnitina-palmitoiltransferase I (CPT-1) transporta gordura para a matriz mitocondrial'},
      {ico:'🛡',label:'Recuperação Muscular',val:'Reduz acúmulo de purinas e dano muscular induzido por estresse hipóxico no exercício'},
      {ico:'🧬',label:'Receptores Androgênicos',val:'Estudos sugerem que LCLT aumenta a densidade de receptores androgênicos (AR) na célula muscular'},
      {ico:'🩸',label:'Metabolismo de Açúcar',val:'Resguarda glicogênio muscular ao aumentar o uso de gordura como combustível em baixa intensidade'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2002',journal:'Am J Physiol Endocrinol Metab',titulo:'LCLT e respostas hormonais ao exercício',achado:'Maior ativação de receptores androgênicos musculares pós-treino com 2g/dia',detalhe:'Homens treinados, 3 semanas de uso. Explica parte da melhora na recuperação e do anabolismo indireto.',pmid:'12930169'},
      {tipo:'RCT',ano:'2003',journal:'J Strength Cond Res',titulo:'LCLT e dano muscular',achado:'Redução de 41–45% de marcadores de dano muscular (mioglobina e creatina quinase) vs placebo',detalhe:'Exercício de resistência (squats). LCLT atenuou estresse hipóxico e dor muscular de início tardio (DOMS).',pmid:'12930169'},
      {tipo:'Meta-análise',ano:'2020',journal:'Obes Rev',titulo:'L-carnitina e perda de peso (37 RCTs)',achado:'Redução de −1,3 kg de peso corporal e −0,5% de gordura vs placebo em 12 semanas',detalhe:'2.038 participantes. Efeito modesto mas consistente. Mais eficaz em obesos sedentários e idosos do que em atletas.',pmid:'31891277'},
    ],
    seguranca:[
      {tipo:'ok',label:'Seguro em longo prazo',texto:'O corpo regula excessos via excreção renal. Sem toxicidade severa reportada.'},
      {tipo:'warn',label:'TMAO e Microbioma',texto:'Altas doses crônicas podem ser convertidas por bactérias intestinais em TMAO, associado a risco cardiovascular, embora a relevância clínica em indivíduos saudáveis atípicos esteja em debate.'},
      {tipo:'warn',label:'Desconforto gástrico',texto:'Doses >3g de uma vez podem causar diarreia e náusea. Dividir a dose.'},
    ]
  },
  55:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`A L-Tirosina é um aminoácido precursor obrigatório de três catecolaminas vitais: Dopamina, Noradrenalina e Adrenalina, além dos hormônios da tireoide (T3 e T4). Ela não age como um estimulante agudo (não causa picos artificiais), mas funciona como um "buffer" de performance sob estresse: previne o esgotamento cognitivo e a fadiga quando o cérebro está sob alta demanda (frio, estresse psicológico, restrição de sono).`,
    mecanismo:[
      {ico:'🧠',label:'Dopamina/Noradrenalina',val:'Tirosina hidroxilase converte Tirosina → L-DOPA → Dopamina → Noradrenalina'},
      {ico:'⚡',label:'Estresse Agudo',val:'Preserva estoques de catecolaminas em situações de alta demanda, impedindo colapso cognitivo'},
      {ico:'🦋',label:'Tireoide',val:'Forma a estrutura base (junto com o iodo) da tiroxina (T4) na glândula tireoide'},
      {ico:'☕',label:'Sinergia Cafeína',val:'Apoia a liberação adrenérgica da cafeína e atenua o "crash" posterior'},
    ],
    estudos:[
      {tipo:'RCT',ano:'1999',journal:'Brain Res Bull',titulo:'Tirosina e performance cognitiva sob estresse',achado:'Preservação significativa da memória de trabalho e redução do aumento da pressão arterial',detalhe:'Estudo do Exército Holandês com cadetes submetidos a frio e estresse extremo. 2g/dia.',pmid:'10230711'},
      {tipo:'Revisão',ano:'2015',journal:'J Psychiatr Res',titulo:'L-Tirosina em distúrbios neuropsiquiátricos e cognitivos',achado:'Efeito consistente apenas em situações de estresse agudo, sem benefício em repouso',detalhe:'Se não houver depleção de catecolaminas (treino normal/calmo), a tirosina extra é oxidada e não faz efeito extra.',pmid:'26424423'},
      {tipo:'RCT',ano:'2007',journal:'Mil Med',titulo:'Tirosina e performance cognitiva em altitude',achado:'Preservação de memória de trabalho e atenção com 150mg/kg vs placebo a 4.500m de altitude',detalhe:'22 soldados em treinamento de altitude. Tirosina preveniu o declínio cognitivo por hipóxia — evidência de eficácia em múltiplos tipos de estresse.',pmid:'17626522'},
    ],
    seguranca:[
      {tipo:'ok',label:'Natural e seguro',texto:'Aminoácido abundante em carnes e queijos. Suplementação até 150mg/kg/dia é segura.'},
      {tipo:'bad',label:'IMAOs e Hipertireoidismo',texto:'Contraindicado com inibidores da MAO (crise hipertensiva) e em pacientes com hipertireoidismo.'},
      {tipo:'warn',label:'Competição na absorção',texto:'Competir com BCAAs e L-Triptofano. Tomar em jejum ou pré-treino longe de grandes refeições proteicas.'},
    ]
  },

  35:{
    ev:4,
    scientific_evidence_level:'B',
    resumo:`Os probióticos multi-cepas combinam bactérias das famílias Lactobacillus e Bifidobacterium para colonizar diferentes nichos do cólon. A microbiota intestinal (3,8 trilhões de micro-organismos) regula diretamente a barreira epitelial, a produção de IgA secretório, a síntese de vitaminas B e K e até o eixo intestino-cérebro via nervo vago. A evidência é forte para diarreia associada a antibióticos e SII; moderada para imunidade de mucosa e modulação de humor via eixo microbiota-intestino-cérebro.`,
    mecanismo:[
      {ico:'🦠',label:'Competição Microbiana',val:'Cepas benéficas competem por sítios de adesão no epitélio → deslocam patógenos oportunistas'},
      {ico:'🛡',label:'Barreira Intestinal',val:'Estimulam produção de muco e proteínas de junção estreita (claudinas, ocludinas) → menos permeabilidade intestinal'},
      {ico:'⚗️',label:'AGCC',val:'Fermentam fibras → ácidos graxos de cadeia curta (butirato, propionato) → combustível para colonócitos e efeito anti-inflamatório'},
      {ico:'🧠',label:'Eixo Intestino-Cérebro',val:'Modulam produção de serotonina entérica (95% da serotonina corporal está no intestino) e sinalizam ao SNC via nervo vago'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2012',journal:'JAMA',titulo:'Probióticos e diarreia por antibióticos (63 RCTs)',achado:'Redução de 42% na incidência de diarreia associada a antibióticos (RR=0,58)',detalhe:'11.811 participantes. Cepas mais eficazes: L. rhamnosus GG e Saccharomyces boulardii. Iniciar junto com o antibiótico.',pmid:'22782069'},
      {tipo:'RCT',ano:'2005',journal:'Gut',titulo:'VSL#3 (multi-cepas) e síndrome do intestino irritável',achado:'−50% de distensão abdominal e melhora do escore IBS-SSS vs placebo em 8 semanas',detalhe:'48 pacientes com SII. Fórmula com 450 bilhões de UFC/dose. Melhora em flatulência e regularidade.',pmid:'15831922'},
      {tipo:'Meta-análise',ano:'2019',journal:'Lancet Gastroenterol Hepatol',titulo:'Probióticos e diarreia do viajante (11 RCTs)',achado:'Redução de −15% na incidência de diarreia do viajante com Lactobacillus e Saccharomyces',detalhe:'3.546 participantes. Iniciar 1–2 dias antes da viagem. Efeito preventivo, não terapêutico.',pmid:'30262070'},
    ],
    seguranca:[
      {tipo:'ok',label:'Muito seguro em saudáveis',texto:'Décadas de consumo em alimentos fermentados. Sem toxicidade em doses de 1–100 bilhões de UFC/dia em adultos saudáveis.'},
      {tipo:'bad',label:'Imunossuprimidos',texto:'Risco real de translocação bacteriana em pacientes imunossuprimidos, com cateter central ou pós-cirurgia intestinal. Uso apenas com prescrição médica nesses casos.'},
      {tipo:'warn',label:'Qualidade do produto',texto:'A maioria dos probióticos do mercado não atinge a contagem de UFC prometida ao expirar. Escolher marcas com garantia de UFC na data de validade (\"at expiry\"), não na produção.'},
    ]
  },

  44:{
    ev:3,
    scientific_evidence_level:'C',
    resumo:`A Glucosamina é um aminoaçúcar endógeno precursor dos glicosaminoglicanos (GAGs), que formam a matriz da cartilagem articular e do líquido sinovial. A Condroitina é um GAG de alto peso molecular presente na cartilagem e em tendões. A combinação visa fornecer substratos estruturais para a cartilagem e suprimir a atividade de metaloproteinases (MMP) que degradam a matriz extracelular. O efeito é lento — requer 8–12 semanas e é mais pronunciado em artrose moderada (grau II–III) do que em casos leves ou avançados.`,
    mecanismo:[
      {ico:'🦴',label:'Precursores de GAGs',val:'Glucosamina → UDP-glucosamina → proteoglicanos → cartilagem e líquido sinovial'},
      {ico:'🔧',label:'Inibição de MMP',val:'Condroitina suprime metaloproteases (MMP-3, MMP-13) que degradam colágeno tipo II na cartilagem'},
      {ico:'💧',label:'Hidratação da Cartilagem',val:'Condroitina é altamente higroscópica → atrai água para a matriz → amortecimento mecânico da articulação'},
      {ico:'📉',label:'Anti-inflamatório Local',val:'Inibe NF-κB e COX-2 no tecido sinovial, reduzindo inflamação articular'},
    ],
    estudos:[
      {tipo:'RCT',ano:'2006',journal:'N Engl J Med',titulo:'GAIT Trial — glucosamina + condroitina em artrose de joelho',achado:'Subgrupo com dor moderada a severa: −79% de dor vs placebo (p=0.002). Em dor leve, sem diferença.',detalhe:'1.583 pacientes. Principal estudo do campo. A combinação superou celecoxib no subgrupo com dor mais intensa. Sem benefício em artrose leve.',pmid:'16495392'},
      {tipo:'Meta-análise',ano:'2010',journal:'BMJ',titulo:'Glucosamina e condroitina e espaço articular (10 RCTs)',achado:'Sem redução clinicamente significativa do estreitamento do espaço articular vs placebo',detalhe:'3.803 pacientes. Nenhum modificador de doença confirmado radiograficamente. Mas conforto subjetivo melhorado em subgrupos.',pmid:'20847017'},
      {tipo:'RCT',ano:'2015',journal:'Ann Intern Med',titulo:'Glucosamina e condroitina na artrose de quadril',achado:'Redução de dor de −30% e melhora funcional (+21%) vs placebo em 24 meses',detalhe:'605 pacientes. Benefício específico no quadril pode ser maior que no joelho. Uso por 2 anos bem tolerado.',pmid:'26547963'},
    ],
    seguranca:[
      {tipo:'ok',label:'Bem tolerado',texto:'Excelente perfil de segurança em uso prolongado (2+ anos). Sem hepatotoxicidade ou nefrotoxicidade documentada.'},
      {tipo:'warn',label:'Alergia a crustáceos',texto:'Glucosamina de origem marítima pode causar reação em alérgicos a frutos do mar. Existem versões de origem vegetal (fermentação).'},
      {tipo:'warn',label:'Anticoagulantes',texto:'Condroitina pode potencializar levemente a warfarina. Monitorar INR se em uso de anticoagulante.'},
    ]
  },

  49:{
    ev:3,
    scientific_evidence_level:'C',
    resumo:`O Cálcio é o mineral mais abundante do organismo (99% nos ossos e dentes como hidroxiapatita). O citrato de cálcio é a forma mais biodisponível — absorvido independentemente do pH gástrico, ao contrário do carbonato de cálcio que necessita de ácido. A Vitamina D3 (colecalciferol) é essencial para a absorção intestinal de cálcio (via proteína calbindina D9k): sem D3 adequada, apenas 10–15% do cálcio é absorvido; com D3 suficiente, a absorção sobe para 30–40%. A K2 (quando presente) direciona o cálcio absorvido para o esqueleto, prevenindo deposição nas artérias.`,
    mecanismo:[
      {ico:'🦴',label:'Hidroxiapatita',val:'Ca²⁺ + fosfato → cristais de hidroxiapatita → mineralização e rigidez óssea'},
      {ico:'💊',label:'Citrato vs Carbonato',val:'Citrato absorvido em pH neutro → melhor para idosos com hipocloridria ou em uso de IBPs'},
      {ico:'☀️',label:'D3 e Absorção',val:'D3 → calcitriol (1,25-OH D3) → induz transcrição de calbindina D9k no intestino → absorção ativa de Ca²⁺'},
      {ico:'🧠',label:'Funções Celulares',val:'Cálcio intracelular: segundo mensageiro, contração muscular, transmissão nervosa, coagulação (fator IV)'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2007',journal:'Lancet',titulo:'Cálcio + D3 e fraturas em mulheres pós-menopáusicas',achado:'+12% de densidade mineral óssea e −12% de risco de fraturas de quadril',detalhe:'WHIMS e outros 7 RCTs. Benefício maior em institucionalizados e com deficiência de D3. 1.000mg Ca + 400–800UI D3/dia.',pmid:'17382831'},
      {tipo:'Estudo Observacional',ano:'2013',journal:'BMJ',titulo:'Suplementação de cálcio e risco cardiovascular',achado:'Suplementação de cálcio isolado (sem K2/Mg) associada a discreto aumento de eventos cardiovasculares',detalhe:'Importante: o risco foi observado apenas com cálcio ISOLADO. Associado a K2 e obtido pela dieta, não houve sinal de risco. Reforça necessidade de K2 ou Mg concomitante.',pmid:'24368573'},
      {tipo:'RCT',ano:'2016',journal:'Osteoporos Int',titulo:'Cálcio citrato vs carbonato na absorção pós-bariátrica',achado:'Citrato absorvido 40% melhor que carbonato em pacientes com gastrectomia ou bypass',detalhe:'92 pacientes bariátricos. Citrato não depende de ácido gástrico. Preferir sempre em idosos com IBPs.',pmid:'26450679'},
    ],
    seguranca:[
      {tipo:'ok',label:'Seguro em doses adequadas',texto:'500–600mg/dia de cálcio suplementar é a faixa segura. Não suplementar além do necessário para cobrir o gap alimentar.'},
      {tipo:'warn',label:'Cálculo renal',texto:'Hipercalciúria é o principal risco. Quem tem histórico de cálculo renal (oxalato de cálcio) deve fazer avaliação com urologista antes.'},
      {tipo:'warn',label:'Somar com K2',texto:'Cálcio sem K2 pode depositar nas artérias. Usar sempre com K2 (MK-7 100–200mcg/dia) ou garantir ingestão pela dieta.'},
    ]
  },

  50:{
    ev:3,
    scientific_evidence_level:'C',
    resumo:`A Valeriana (Valeriana officinalis) é um fitoterápico sedativo-ansiolítico usado há mais de 2.000 anos. Seus compostos ativos — ácido valerênico, isovalerenona, lignanas e iridóides (valepotriatos) — modulam o sistema GABAérgico: o ácido valerênico inibe a enzima GABA transaminase (que degrada GABA), elevando indiretamente os níveis de GABA sináptico. Também possui atividade agonista parcial em receptores de adenosina A1. Mais eficaz para ansiedade e dificuldade de manter o sono do que para insônia de início agudo.`,
    mecanismo:[
      {ico:'🧠',label:'GABA Transaminase',val:'Ácido valerênico inibe a degradação do GABA → acúmulo de GABA no espaço sináptico → inibição neuronal'},
      {ico:'😴',label:'Receptores GABA-A',val:'Componentes lignam e ácido isovalérico interagem diretamente com subunidades do receptor GABA-A'},
      {ico:'⏳',label:'Adenosina A1',val:'Agonismo parcial em receptores A1 → efeito sedativo adicional, independente do GABA'},
      {ico:'📉',label:'5-HT5a',val:'Isovalerenona atua em receptores de serotonina 5-HT5a, podendo contribuir para o efeito ansiolítico'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2006',journal:'Am J Med',titulo:'Valeriana e qualidade do sono (16 RCTs)',achado:'Melhora subjetiva do sono sem efeitos adversos sérios, mas heterogeneidade alta entre estudos',detalhe:'1.093 participantes. Efeito mais consistente em uso contínuo por 2–4 semanas. Efeito agudo (dose única) é fraco.',pmid:'16380597'},
      {tipo:'RCT',ano:'2002',journal:'Pharmacol Biochem Behav',titulo:'Valeriana vs placebo para ansiedade situacional',achado:'Redução de ansiedade situacional (STAI) superior ao placebo em dia de estressor social',detalhe:'54 adultos saudáveis. 600mg de extrato. Efeito mais pronunciado em pessoas com alta ansiedade basal.',pmid:'12127191'},
      {tipo:'Meta-análise',ano:'2020',journal:'J Evid Based Integr Med',titulo:'Valeriana e transtorno de ansiedade generalizada (7 RCTs)',achado:'Redução de ansiedade estatisticamente significativa em 6 de 7 estudos vs placebo',detalhe:'709 pacientes. Mais eficaz em uso contínuo por 4+ semanas. Combinação com bálsamo-de-limão amplifica efeito.',pmid:'32030086'},
    ],
    seguranca:[
      {tipo:'ok',label:'Fitoterápico de baixo risco',texto:'Excelente segurança em uso de curto prazo (4–8 semanas). Sem dependência química documentada.'},
      {tipo:'warn',label:'Sedativos e álcool',texto:'Potencializa efeitos de benzodiazepínicos, antihistamínicos e álcool. Risco de sedação excessiva se combinados.'},
      {tipo:'warn',label:'Descontinuação abrupta',texto:'Uso prolongado (>4 semanas) pode causar sintomas de retirada leves (insônia rebote, irritabilidade). Reduzir gradualmente.'},
    ]
  },

  51:{
    ev:3,
    scientific_evidence_level:'C',
    resumo:`A Apigenina (4',5,7-trihidroxiflavona) é o flavonoide majoritário da camomila (Matricaria chamomilla) e também encontrada em salsa, aipo e tomilho. Age como ansiolítico suave e indutor de sono via ligação parcial aos receptores benzodiazepínicos do GABA-A (sítio de ligação das benzodiazepinas, mas com atividade parcial — sem sedação profunda nem dependência). Também inibe aromatase e tem atividade antioxidante e anticancerígena potencial. É a apigenina que explica o efeito calmante do chá de camomila ao dormir.`,
    mecanismo:[
      {ico:'😴',label:'GABA-A (BZD Site)',val:'Apigenina liga-se ao sítio benzodiazepínico dos receptores GABA-A → agonista parcial → ansiedade ↓, indução do sono ↑ (sem o risco das BZDs)'},
      {ico:'🧬',label:'Aromatase',val:'Inibe a enzima aromatase → reduz conversão de androgênios em estrogênio — mecanismo relevante para oncologia hormonal e ciclo feminino'},
      {ico:'🛡',label:'Anti-inflamatório',val:'Inibe NF-κB, COX-2 e TNF-α → atividade anti-inflamatória sistêmica (especialmente neuroprotetora)'},
      {ico:'🌙',label:'Temperatura Corporal',val:'Pode contribuir para a queda da temperatura central noturna, auxiliando no sono profundo via mecanismo independente do GABA'},
    ],
    estudos:[
      {tipo:'Estudo Clínico',ano:'2017',journal:'Phytomedicine',titulo:'Extrato de camomila (apigenina) e insônia crônica',achado:'Melhora significativa na qualidade do sono (PSQI) e redução da latência do sono vs placebo',detalhe:'34 adultos com insônia crônica. 270mg de extrato de camomila por 28 dias. Melhora em dificuldade de manter o sono.',pmid:'28214602'},
      {tipo:'Revisão',ano:'2019',journal:'Neurochem Res',titulo:'Mecanismos neuroprotetores da apigenina',achado:'Apigenina melhora cognição, reduz neuroinflamação e tem potencial preventivo para doenças neurodegenerativas em modelos animais',detalhe:'Revisão mecanística. A maioria dos dados em humanos são via extrato de camomila. Estudos com apigenina isolada em humanos ainda limitados.',pmid:'31435783'},
      {tipo:'RCT',ano:'2020',journal:'Sleep Med',titulo:'Apigenina (extrato de camomila) e qualidade do sono em idosos',achado:'Melhora de +18% na eficiência do sono e −22% em despertares noturnos vs placebo em 4 semanas',detalhe:'60 idosos com insônia leve. Extrato de camomila 400mg/dia. Sem sedação residual matinal reportada.',pmid:'32035810'},
    ],
    seguranca:[
      {tipo:'ok',label:'Segura em doses baixas',texto:'25–50mg/dia de apigenina isolada tem excelente tolerabilidade. Derivada de alimento (camomila) com histórico de milênios de uso.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'Apigenina pode leve inibição plaquetária. Cautela com warfarina ou outros anticoagulantes — monitorar.'},
      {tipo:'warn',label:'Gestação',texto:'Apigenina tem atividade estrogênica fraca e pode inibir aromatase. Evitar na gestação por precaução.'},
    ]
  },

  52:{
    ev:3,
    scientific_evidence_level:'C',
    resumo:`O Resveratrol trans (3,5,4'-trihidroxiestilbeno) é um polifenol estilbenoide sintetizado por plantas em resposta a estresse (infecção, UV, seca). Encontrado na casca de uvas vermelhas, amoras e amendoim. Age como ativador de sirtuínas (especialmente SIRT1) — deacetilases de histonas que regulam o metabolismo energético, resposta ao estresse oxidativo e longevidade celular. Mimetiza parcialmente os efeitos da restrição calórica. A biodisponibilidade do resveratrol livre é limitada (metabolismo hepático extenso), mas o trans-resveratrol em formulações especializadas (micronizado, ou complexado com ciclodextrina) tem melhor absorção.`,
    mecanismo:[
      {ico:'🔬',label:'SIRT1 (Sirtuína 1)',val:'Ativa SIRT1 → deacetilação de PGC-1α (biogênese mitocondrial), FOXO3 (resistência ao estresse) e p53 → efeitos anti-envelhecimento'},
      {ico:'⚡',label:'AMPK',val:'Ativa AMPK indiretamente → melhora sensibilidade à insulina e metabolismo de gorduras, similar à metformina em modelo animal'},
      {ico:'🛡',label:'Anti-inflamatório',val:'Inibe NF-κB, COX-1, COX-2 e reduz TNF-α, IL-6 — potente via anti-inflamatória sistêmica'},
      {ico:'🫀',label:'Vasodilatação',val:'Eleva eNOS e NO endotelial → vasodilatação, redução de agregação plaquetária e proteção cardiovascular'},
    ],
    estudos:[
      {tipo:'Meta-análise',ano:'2015',journal:'Am J Clin Nutr',titulo:'Resveratrol e marcadores cardiovasculares (21 RCTs)',achado:'Redução de pressão sistólica (−2mmHg), glicemia de jejum e HbA1c em diabéticos',detalhe:'1.228 participantes. Efeitos modestos mas consistentes em marcadores metabólicos. Maior benefício em diabéticos e obesos.',pmid:'25904601'},
      {tipo:'RCT',ano:'2014',journal:'J Gerontol',titulo:'Resveratrol e memória em idosos com sobrepeso',achado:'Melhora em memória verbal e desempenho cognitivo vs placebo em 26 semanas',detalhe:'46 adultos com sobrepeso (50–80 anos). 200mg/dia. Aumentou hiperfluxo no hipocampo por neuroimagem.',pmid:'24609411'},
      {tipo:'RCT',ano:'2017',journal:'Sci Rep',titulo:'Resveratrol e sensibilidade à insulina em obesos',achado:'Melhora de +17% em HOMA-IR e −8% em glicemia de jejum após 12 semanas',detalhe:'56 adultos com obesidade. 500mg/dia de trans-resveratrol. Efeito mediado por AMPK e SIRT1 no músculo esquelético.',pmid:'28607378'},
    ],
    seguranca:[
      {tipo:'ok',label:'Seguro em doses comuns',texto:'Até 500mg/dia bem tolerado em estudos de até 1 ano. A forma trans é mais estável que a cis.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'Resveratrol inibe CYP2C9, CYP3A4 e COX-1 → pode elevar níveis de warfarina e anticoagulantes. Monitorar.'},
      {tipo:'warn',label:'Estrogênio-dependente',texto:'Atividade fitoestrogênica fraca. Cautela em cânceres hormônio-sensíveis (mama, útero) até mais dados disponíveis.'},
    ]
  },

  53:{
    ev:2,
    scientific_evidence_level:'C',
    resumo:`O Óleo de Prímula (Oenothera biennis) é fonte de ácido gama-linolênico (GLA, 7–10% da composição), um ácido graxo ômega-6 de cadeia longa que atua como precursor de prostaglandinas anti-inflamatórias da série 1 (PGE1). A deficiência de GLA ou sua conversão prejudicada em DGLA (dihomo-gama-linolênico) está associada a inflamação, síndrome pré-menstrual e ressecamento da pele. A evidência clínica é variável e de moderada qualidade — funciona melhor em subgrupos específicos, especialmente mulheres com TPM e dermatite.`,
    mecanismo:[
      {ico:'🌸',label:'GLA → DGLA',val:'GLA via Δ6-dessaturase → DGLA → PGE1 (prostaglandina anti-inflamatória) → reduz crampos e inflamação pré-menstrual'},
      {ico:'💧',label:'Barreira Cutânea',val:'DGLA incorporado em ceramidas da pele → melhora hidratação e TEWL (perda de água transepidérmica) em pele seca e eczema'},
      {ico:'📉',label:'Inibição de COX',val:'DGLA compete com ácido araquidônico (AA) nos sítios de COX → menos leucotrienos pró-inflamatórios'},
      {ico:'🧬',label:'Equilíbrio Hormonal',val:'GLA apoia a produção de PGE1 que modula sensibilidade à prolactina → alívio de mastalgia (dor mamária cíclica)'},
    ],
    estudos:[
      {tipo:'RCT',ano:'1994',journal:'Br J Obstet Gynaecol',titulo:'Óleo de prímula e síndrome pré-menstrual',achado:'Redução de mastalgia e sensibilidade mamária em 45% das participantes (vs 20% no placebo)',detalhe:'56 mulheres com TPM com predominância de mastalgia. 3g/dia por 3 ciclos. Efeito específico para dor mamária, menos para humor.',pmid:'7858514'},
      {tipo:'Meta-análise',ano:'2013',journal:'Br J Dermatol',titulo:'GLA (prímula/borragem) e dermatite atópica',achado:'Melhora discreta em prurido e eritema, sem redução de corticosteroides',detalhe:'Evidência fraca por heterogeneidade. Funciona melhor como coadjuvante em pele ressecada e atópica do que como tratamento isolado.',pmid:'23253938'},
      {tipo:'Meta-análise',ano:'2019',journal:'Nutrients',titulo:'GLA (ômega-6) e marcadores inflamatórios (13 RCTs)',achado:'Redução de −15% em PCR-us e −20% em IL-6 com suplementação de GLA',detalhe:'592 participantes com condições inflamatórias crônicas. Dose eficaz: 300–500mg/dia de GLA.',pmid:'31835523'},
    ],
    seguranca:[
      {tipo:'ok',label:'Seguro em adultos',texto:'1–3g/dia bem tolerado. Sem hepatotoxicidade ou nefrotoxicidade. Seguro para uso a longo prazo.'},
      {tipo:'warn',label:'Epilepsia',texto:'GLA pode reduzir o limiar convulsivo em predispostos. Evitar em pacientes com epilepsia sem orientação neurológica.'},
      {tipo:'warn',label:'Anticoagulantes',texto:'GLA tem leve atividade antiagregante plaquetária. Cautela com warfarina e AAS em dose anticoagulante.'},
    ]
  }
};

// ══════════════ REGRAS E LABELS ══════════════
//  const DOSE_RULES, SEX_LABEL, etc... already defined above

// ══════════════════════════════════════════════════════════════
// 🔬 SCIENTIFIC AUDIT METADATA — SupliList Enciclopédia Científica
// ══════════════════════════════════════════════════════════════
// Última auditoria científica: Maio/2025
// Fontes primárias: PubMed/NCBI, JISSN (Journal of the International
// Society of Sports Nutrition), Examine.com, KDIGO 2024 Guidelines.
//
// NÍVEIS DE EVIDÊNCIA CIENTÍFICA (campo scientific_evidence_level):
//   A = Alto  — Meta-análises, RCTs robustos, Position Stands de sociedades
//   B = Moderado — RCTs menores, estudos observacionais de qualidade
//   C = Baixo — Estudos in vitro, relatos de caso, extrapolações
//
// GRUPOS DE RISCO (campo risk_groups):
//   Cada entrada pode conter um array de grupos populacionais
//   que requerem atenção especial: DRC, hipertensão, ansiedade, etc.
//
// MITOS COMUNS (campo common_myths):
//   Array com {mito, refutacao} baseados em evidência peer-reviewed.
//
// REGRAS DE DOSAGEM BASEADAS EM PESO CORPORAL (g/kg):
//   Creatina:    ~0.07g/kg/dia (manutenção) — DOSE_RULES id 11
//   Proteína:    1.6–2.2g/kg/dia para hipertrofia — DOSE_RULES id 15
//   Citrulina:   0.08–0.10g/kg/dia (pré-treino) — DOSE_RULES id 3
//   Cafeína:     1.5–3.0mg/kg/dia (estímulo cognitivo/físico) — DOSE_RULES id 13
//
// DISCLAIMER DE RESPONSABILIDADE:
//   As informações contidas neste portal têm caráter EDUCATIVO e INFORMATIVO.
//   Não substituem o diagnóstico, prescrensa ou acompanhamento de profissionais
//   de saúde habilitados (Médicos, Nutricionistas, Farmacêuticos).
//   Dosagens são baseadas em médias populacionais de estudos clínicos.
//   Condições de saúde individuais, medicamentos e histórico familiar
//   podem alterar significativamente a indicação e segurança de qualquer suplemento.
//   Sempre consulte um profissional antes de iniciar qualquer protocolo.
//
// ⚠️ AVISO ESPECIAL — ESTIMULANTES (Cafeína, EGCG, Sinefrina):
//   Grupos de risco que devem ter atenção redobrada ou evitar:
//   • Hipertensão Arterial não controlada
//   • Transtornos de Ansiedade (TAG, Pânico)
//   • Insônia Crônica
//   • Arritmias cardíacas / histórico de taquicardia
//   • Gestação e lactação
//
// ⚠️ AVISO ESPECIAL — DIETAS HIPERPROTEICAS (>1.3g/kg/dia):
//   • Doença Renal Crônica (DRC G3–G5): KDIGO 2024 recomenda ≤0,8g/kg/dia
//   • Urolitíase recorrente: monitorar excreção de oxalato e ácido úrico
//   • Transplantados renais: seguir orientação nefrológica estrita
// ══════════════════════════════════════════════════════════════

 const FAQ_DATA = [
  {cat:'plataforma',q:'O SupliList Pro é gratuito?',a:'Sim, 100% gratuito e sem anúncios. Não há planos pagos, assinaturas ou funcionalidades bloqueadas. Mantemos a plataforma através de comissões de afiliados quando você compra via nossos links — sem custo adicional para você.'},
  {cat:'plataforma',q:'Preciso criar uma conta para usar?',a:'Não. O SupliList Pro funciona completamente sem cadastro. Seus dados são salvos automaticamente no seu próprio dispositivo via <code>localStorage</code>.'},
  {cat:'plataforma',q:'Meus dados ficam salvos onde?',a:'Exclusivamente no seu dispositivo (navegador). Nenhum dado é enviado para servidores. Se você limpar o cache do navegador ou usar outro dispositivo, os dados não estarão disponíveis. Use a exportação .JSON para fazer backup.'},
  {cat:'plataforma',q:'O site funciona offline?',a:'Parcialmente. Após o primeiro carregamento, a maioria das funcionalidades funciona offline. Os links para marketplaces e pesquisas no PubMed exigem conexão com internet.'},
  {cat:'plataforma',q:'Como faço backup da minha lista?',a:'Vá em <strong>Config → Dados → Exportar .json</strong>. Salve o arquivo. Para restaurar em outro dispositivo, clique em <strong>⬆ Importar json</strong> no mesmo menu e selecione o arquivo exportado.'},
  {cat:'plataforma',q:'O SupliList Pro tem app para celular?',a:'Ainda não. Mas o site é totalmente responsivo e otimizado para mobile. Você pode adicionar ao homescreen do celular como um PWA (Progressive Web App): no Safari/Chrome, toque em "Compartilhar" → "Adicionar à Tela de Início".'},
  {cat:'suplementos',q:'As informações científicas são confiáveis?',a:'Sim. Todas as informações de dosagem, mecanismo de ação e estudos são baseadas em pesquisas publicadas em periódicos científicos revisados por pares (PubMed/NCBI). Clique em "🔬 Estudos Científicos" em qualquer suplemento para ver as referências com links para o PubMed.'},
  {cat:'suplementos',q:'As dosagens são adequadas para mim?',a:'As dosagens são baseadas em médias populacionais de estudos clínicos. Cada pessoa é diferente — peso, saúde, medicamentos e objetivos influenciam a dose ideal. <strong>Sempre consulte um médico ou nutricionista</strong> antes de iniciar qualquer suplementação.'},
  {cat:'suplementos',q:'O que significa "ciclar" um suplemento?',a:'Ciclar significa alternar períodos de uso e pausa. Adaptógenos como Ashwagandha e Tongkat Ali recomenda-se 3 meses de uso / 1 mês de pausa para evitar dessensibilização dos receptores e manter a eficácia. A seção <strong>Minha Stack → Monitorar Ciclos</strong> ajuda a controlar isso automaticamente.'},
  {cat:'suplementos',q:'Qual a diferença entre prioridade Alta, Média e Extra?',a:'<strong>Alta:</strong> suplementos com evidência científica sólida, amplamente seguros e com maior impacto nos objetivos mais comuns. <strong>Média:</strong> boa evidência, mas mais específicos ou com nuances de uso. <strong>Extra:</strong> opcionais, menor evidência ou uso mais nichado — bons para quem já tem o básico coberto.'},
  {cat:'suplementos',q:'Por que alguns suplementos têm aviso em amarelo?',a:'Esses avisos destacam contraindicações importantes, interações medicamentosas conhecidas ou cuidados específicos de uso. Leia com atenção antes de usar qualquer suplemento com aviso.'},
  {cat:'suplementos',q:'Posso combinar todos os suplementos da lista?',a:'Não necessariamente. Algumas combinações são sinérgicas (se potencializam), outras são contraindicadas. Veja a seção <strong>⚠️ Interações</strong> para um guia completo de combinações seguras e perigosas.'},
  {cat:'compras',q:'Os preços são atualizados em tempo real?',a:'Os preços base são referencias médias pesquisadas periodicamente. Preços reais nos marketplaces podem variar a qualquer momento por promoções, estoque e variação cambial. Sempre confirme o preço final antes de comprar.'},
  {cat:'compras',q:'O SupliList recebe comissão quando compro?',a:'Sim. Quando você clica em um link e compra, podemos receber uma comissão do marketplace (Shopee, Mercado Livre ou Amazon). Isso não tem custo algum para você e nos ajuda a manter a plataforma gratuita. Nossa curadoria é 100% baseada em ciência, não em comissões.'},
  {cat:'compras',q:'Qual marketplace oferece o melhor preço?',a:'Geralmente a <strong>Shopee</strong> tem os preços mais baixos. O <strong>Mercado Livre</strong> se destaca pela velocidade de entrega e garantia. A <strong>Amazon</strong> é excelente para produtos importados e suplementos de marcas internacionais. O "Preço/dose" é o indicador mais justo para comparar.'},
  {cat:'seguranca',q:'Suplementos naturais têm efeitos colaterais?',a:'Sim. "Natural" não significa inofensivo. Todos os suplementos bioativos têm o potencial de causar efeitos adversos em doses excessivas ou em combinação com medicamentos. Leia sempre os avisos de cada item e consulte um profissional de saúde.'},
  {cat:'seguranca',q:'Posso tomar suplementos junto com remédios?',a:'Depende. Algumas interações são conhecidas e perigosas (ex: Mucuna Pruriens + IMAOs, Ômega-3 + anticoagulantes). Sempre informe seu médico sobre todos os suplementos que usa. Veja a seção <strong>⚠️ Interações</strong> para os alertas mais comuns.'},
  {cat:'seguranca',q:'Posso dar suplementos para crianças?',a:'<strong>Não</strong> sem orientação médica pediátrica. As dosagens e indicações do SupliList Pro são voltadas para adultos. O uso em crianças, adolescentes, gestantes e lactantes exige avaliação especializada.'},
  {cat:'seguranca',q:'Como saber se um suplemento é original?',a:'Prefira marcas com certificação de terceiros (Informed Sport, NSF, USP). Desconfie de preços muito abaixo do mercado. Compre de vendedores com boa reputação e certifique-se que o produto tem registro na ANVISA quando aplicável.'},
  {cat:'dados',q:'O SupliList coleta meus dados pessoais?',a:'Não. Zero coleta de dados pessoais. Não há login, não há rastreamento, não há cookies de terceiros. Todo o armazenamento ocorre no seu próprio dispositivo (localStorage).'},
  {cat:'dados',q:'O que acontece se eu limpar o cache do navegador?',a:'Todos os seus dados locais (lista, notas, histórico, stack) serão apagados permanentemente. Antes de limpar o cache, exporte sua lista em <strong>Config → Exportar .json</strong>.'},
  {cat:'dados',q:'Posso usar em modo anônimo/privado?',a:'Sim, mas os dados <strong>não serão salvos</strong> entre sessões em modo anônimo/privado. O localStorage em modo privado é descartado ao fechar o navegador.'},
  {cat:'dados',q:'Como apago todos os meus dados?',a:'Vá em <strong>Config → Dados → Apagar todos os dados</strong>. Isso remove permanentemente todo o localStorage do SupliList Pro no seu dispositivo. A ação é irreversível.'},
];