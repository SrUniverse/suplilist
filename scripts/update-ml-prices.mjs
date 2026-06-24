import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRICES_FILE = path.join(__dirname, '../frontend/public/data/prices.json');
const ML_TAG = 'matt_word=suplilist&matt_tool=35217033';

// Preços reais coletados do ML via browser (mínimo dos primeiros 8 resultados)
const ML_DATA = {
  'creatina-monohidratada':   { price: 36.99,  q: 'creatina-monohidratada' },
  'whey-protein':             { price: 114.90, q: 'whey-protein-concentrado' },
  'omega-3':                  { price: 25.27,  q: 'omega-3-120-capsulas' },
  'vitamina-d3':              { price: 29.52,  q: 'vitamina-d3-2000ui' },
  'magnesio-bisglicinato':    { price: 28.12,  q: 'magnesio-bisglicinato' },
  'ashwagandha':              { price: 84.78,  q: 'ashwagandha-ksm66' },
  'cafeina-teanina':          { price: 25.57,  q: 'cafeina-anidra-200mg' },
  'melatonina':               { price: 17.83,  q: 'melatonina-suplemento' },
  'l-citrulina':              { price: 47.31,  q: 'l-citrulina-suplemento' },
  'beta-alanina':             { price: 25.21,  q: 'beta-alanina-suplemento' },
  'zinco-bisglicinato':       { price: 29.68,  q: 'zinco-bisglicinato' },
  'vitamina-c':               { price: 18.84,  q: 'vitamina-c-1000mg' },
  'l-carnitina':              { price: 35.01,  q: 'l-carnitina-suplemento' },
  'colageno':                 { price: 28.97,  q: 'colageno-hidrolisado-tipo-2' },
  'probiotico':               { price: 60.94,  q: 'probiotico-suplemento' },
  'alpha-gpc':                { price: 27.60,  q: 'alpha-gpc-suplemento' },
  'apigenina':                { price: 93.71,  q: 'apigenina-suplemento' },
  'bacopa-monnieri':          { price: 35.91,  q: 'bacopa-monnieri-suplemento' },
  'berberina':                { price: 27.28,  q: 'berberina-suplemento' },
  'boro':                     { price: 27.73,  q: 'boro-suplemento' },
  'calcio-citrato-d3':        { price: 19.99,  q: 'calcio-vitamina-d3' },
  'catuaba':                  { price: 25.07,  q: 'catuaba-suplemento' },
  'cha-verde':                { price: 62.99,  q: 'cha-verde-extrato-suplemento' },
  'coenzima-q10':             { price: 22.49,  q: 'coenzima-q10-suplemento' },
  'cranberry':                { price: 30.70,  q: 'cranberry-suplemento' },
  'cromo-picolinato':         { price: 20.70,  q: 'cromo-picolinato-suplemento' },
  'curcumina':                { price: 29.60,  q: 'curcumina-suplemento' },
  'eaa':                      { price: 54.00,  q: 'eaa-aminoacidos-essenciais' },
  'ecdisterona':              { price: 39.90,  q: 'ecdisterona-suplemento' },
  'feno-grego':               { price: 35.90,  q: 'feno-grego-suplemento' },
  'ferro-bisglicinato':       { price: 28.72,  q: 'ferro-bisglicinato-suplemento' },
  'glicina':                  { price: 28.12,  q: 'glicina-suplemento' },
  'glucosamina-condroitina':  { price: 31.04,  q: 'glucosamina-condroitina-suplemento' },
  'hmb':                      { price: 46.71,  q: 'hmb-suplemento' },
  'inositol':                 { price: 39.90,  q: 'inositol-suplemento' },
  'lions-mane':               { price: 66.28,  q: 'lions-mane-suplemento' },
  'l-teanina':                { price: 33.90,  q: 'l-teanina-suplemento' },
  'magnesio-treonato':        { price: 26.00,  q: 'magnesio-treonato-suplemento' },
  'marapuama':                { price: 22.04,  q: 'marapuama-suplemento' },
  'mucuna-pruriens':          { price: 28.71,  q: 'mucuna-pruriens-suplemento' },
  'myco-defense-extra':       { price: 99.00,  q: 'cogumelo-medicinal-suplemento' },
  'nac':                      { price: 34.91,  q: 'nac-n-acetil-cisteina' },
  'oleo-de-primula':          { price: 35.05,  q: 'oleo-de-primula-suplemento' },
  'panax-ginseng':            { price: 29.70,  q: 'panax-ginseng-suplemento' },
  'psyllium':                 { price: 17.87,  q: 'psyllium-suplemento' },
  'quercetina':               { price: 78.80,  q: 'quercetina-suplemento' },
  'resveratrol':              { price: 35.44,  q: 'resveratrol-suplemento' },
  'rhodiola-rosea':           { price: 17.65,  q: 'rhodiola-rosea-suplemento' },
  'saw-palmetto':             { price: 196.78, q: 'saw-palmetto-suplemento' },
  'shatavari':                { price: 98.08,  q: 'shatavari-suplemento' },
  'spirulina':                { price: 21.50,  q: 'spirulina-suplemento' },
  'taurina':                  { price: 35.63,  q: 'taurina-suplemento' },
  'tirosina':                 { price: 36.84,  q: 'tirosina-suplemento' },
  'tongkat-ali':              { price: 79.90,  q: 'tongkat-ali-suplemento' },
  'valeriana':                { price: 21.59,  q: 'valeriana-suplemento' },
};

const db = JSON.parse(fs.readFileSync(PRICES_FILE, 'utf8'));
db._instructions.last_updated = new Date().toISOString().slice(0, 10);

let updated = 0;

for (const [id, ml] of Object.entries(ML_DATA)) {
  if (!db[id]) {
    console.log(`SKIP ${id} — não encontrado no prices.json`);
    continue;
  }

  const entry = db[id];
  const amazonPrice = entry.amazon?.price ?? ml.price;
  const mlPrice = ml.price;
  const qty = entry.mercadolivre?.qty ?? 60;
  const unit = entry.mercadolivre?.unit ?? 'caps';
  const pricePerUnit = parseFloat((mlPrice / qty).toFixed(4));
  const maxP = Math.max(amazonPrice, mlPrice);
  const mlSaving = parseFloat(Math.max(0, maxP - mlPrice).toFixed(2));
  const amazonSaving = parseFloat(Math.max(0, maxP - amazonPrice).toFixed(2));

  entry.mercadolivre = {
    price: mlPrice,
    qty,
    unit,
    pricePerUnit,
    label: 'Mercado Livre',
    url: `https://lista.mercadolivre.com.br/${ml.q}?${ML_TAG}`,
    saving: mlSaving,
  };

  // Atualiza saving do Amazon também
  if (entry.amazon) {
    entry.amazon.saving = amazonSaving;
  }

  console.log(`${id}: R$ ${mlPrice} (${pricePerUnit}/${unit}) saving=${mlSaving} url=.../${ml.q}`);
  updated++;
}

fs.writeFileSync(PRICES_FILE, JSON.stringify(db, null, 2));
console.log(`\n${updated}/${Object.keys(ML_DATA).length} entradas ML atualizadas → ${PRICES_FILE}`);
