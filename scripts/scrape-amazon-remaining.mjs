#!/usr/bin/env node
/**
 * scrape-amazon-remaining.mjs — Raspa preços Amazon para os ~41 suplementos
 * que ainda têm preços estimados (não reais) no prices.json.
 * Uso: FIRECRAWL_API_KEY=fc-xxx node scripts/scrape-amazon-remaining.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.FIRECRAWL_API_KEY;
const BASE_URL = 'https://api.firecrawl.dev/v1';
const PRICES_FILE = path.join(__dirname, '../frontend/public/data/prices.json');
const AMAZON_TAG = 'suplilist01-20';
const DELAY_MS = 8000;

if (!API_KEY) { console.error('FIRECRAWL_API_KEY não definida.'); process.exit(1); }

const SUPPLEMENTS = [
  { id: 'ashwagandha',           q: 'ashwagandha ksm66 500mg 60 capsulas',      qty: 60,  unit: 'caps' },
  { id: 'l-citrulina',           q: 'l-citrulina pura 300g po',                 qty: 300, unit: 'g' },
  { id: 'colageno',              q: 'colageno hidrolisado tipo 2 300g',          qty: 300, unit: 'g' },
  { id: 'probiotico',            q: 'probiotico 10 bilhoes ufc 30 capsulas',     qty: 30,  unit: 'caps' },
  { id: 'alpha-gpc',             q: 'alpha gpc 300mg 60 capsulas',              qty: 60,  unit: 'caps' },
  { id: 'apigenina',             q: 'apigenina 50mg 60 capsulas',               qty: 60,  unit: 'caps' },
  { id: 'bacopa-monnieri',       q: 'bacopa monnieri extrato 60 capsulas',      qty: 60,  unit: 'caps' },
  { id: 'berberina',             q: 'berberina 500mg 60 capsulas',              qty: 60,  unit: 'caps' },
  { id: 'boro',                  q: 'boro suplemento 3mg 60 capsulas',          qty: 60,  unit: 'caps' },
  { id: 'calcio-citrato-d3',     q: 'calcio citrato vitamina d3 60 capsulas',   qty: 60,  unit: 'caps' },
  { id: 'catuaba',               q: 'catuaba extrato 60 capsulas',              qty: 60,  unit: 'caps' },
  { id: 'cha-verde',             q: 'cha verde egcg extrato 60 capsulas',       qty: 60,  unit: 'caps' },
  { id: 'cranberry',             q: 'cranberry 500mg 60 capsulas',              qty: 60,  unit: 'caps' },
  { id: 'cromo-picolinato',      q: 'cromo picolinato 200mcg 60 capsulas',      qty: 60,  unit: 'caps' },
  { id: 'curcumina',             q: 'curcumina piperina 500mg 60 capsulas',     qty: 60,  unit: 'caps' },
  { id: 'eaa',                   q: 'eaa aminoacidos essenciais po 300g',        qty: 300, unit: 'g' },
  { id: 'ecdisterona',           q: 'ecdisterona suplemento 60 capsulas',       qty: 60,  unit: 'caps' },
  { id: 'feno-grego',            q: 'feno grego 500mg 60 capsulas',             qty: 60,  unit: 'caps' },
  { id: 'ferro-bisglicinato',    q: 'ferro bisglicinato 25mg 60 capsulas',      qty: 60,  unit: 'caps' },
  { id: 'glicina',               q: 'glicina pura po 300g',                    qty: 300, unit: 'g' },
  { id: 'glucosamina-condroitina',q: 'glucosamina condroitina 60 capsulas',     qty: 60,  unit: 'caps' },
  { id: 'hmb',                   q: 'hmb monohidratado 1000mg 60 capsulas',     qty: 60,  unit: 'caps' },
  { id: 'inositol',              q: 'inositol myo inositol po 300g',            qty: 300, unit: 'g' },
  { id: 'lions-mane',            q: 'lions mane juba de leao 60 capsulas',      qty: 60,  unit: 'caps' },
  { id: 'magnesio-treonato',     q: 'magnesio treonato magtein 60 capsulas',    qty: 60,  unit: 'caps' },
  { id: 'marapuama',             q: 'marapuama extrato 60 capsulas',            qty: 60,  unit: 'caps' },
  { id: 'mucuna-pruriens',       q: 'mucuna pruriens l-dopa 60 capsulas',       qty: 60,  unit: 'caps' },
  { id: 'myco-defense-extra',    q: 'cogumelos medicinais blend 60 capsulas',   qty: 60,  unit: 'caps' },
  { id: 'nac',                   q: 'nac n-acetil-cisteina 600mg 60 capsulas',  qty: 60,  unit: 'caps' },
  { id: 'oleo-de-primula',       q: 'oleo de primula 500mg 60 capsulas',        qty: 60,  unit: 'caps' },
  { id: 'panax-ginseng',         q: 'panax ginseng extrato 200mg 60 capsulas',  qty: 60,  unit: 'caps' },
  { id: 'psyllium',              q: 'psyllium casca po 300g',                   qty: 300, unit: 'g' },
  { id: 'quercetina',            q: 'quercetina 500mg 60 capsulas',             qty: 60,  unit: 'caps' },
  { id: 'resveratrol',           q: 'resveratrol 500mg 60 capsulas',            qty: 60,  unit: 'caps' },
  { id: 'rhodiola-rosea',        q: 'rhodiola rosea extrato 60 capsulas',       qty: 60,  unit: 'caps' },
  { id: 'saw-palmetto',          q: 'saw palmetto 320mg 60 capsulas',           qty: 60,  unit: 'caps' },
  { id: 'shatavari',             q: 'shatavari extrato 60 capsulas',            qty: 60,  unit: 'caps' },
  { id: 'taurina',               q: 'taurina pura po 300g',                    qty: 300, unit: 'g' },
  { id: 'tirosina',              q: 'tirosina l-tirosina 60 capsulas',          qty: 60,  unit: 'caps' },
  { id: 'tongkat-ali',           q: 'tongkat ali longjack 60 capsulas',         qty: 60,  unit: 'caps' },
  { id: 'valeriana',             q: 'valeriana extrato 60 capsulas',            qty: 60,  unit: 'caps' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function scrapeAmazon(query) {
  const url = `https://www.amazon.com.br/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TAG}&s=review-rank`;
  const resp = await fetch(`${BASE_URL}/scrape`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, waitFor: 2000 })
  });

  if (resp.status === 429) {
    const text = await resp.text();
    const match = text.match(/retry after (\d+)s/i);
    const wait = match ? (parseInt(match[1]) + 5) * 1000 : 70000;
    console.log(`    Rate limit — aguardando ${wait/1000}s...`);
    await sleep(wait);
    return scrapeAmazon(query);
  }

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const data = await resp.json();
  const md = data.data?.markdown || '';

  const productPriceRe = /\[R\$\s*([\d.]+,\d{2})[^\]]*\]\(https:\/\/www\.amazon\.com\.br\/[^\)]+dp\/([A-Z0-9]{10})/g;
  const products = [];
  let m;
  while ((m = productPriceRe.exec(md)) !== null) {
    const val = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
    const asin = m[2];
    if (val > 8 && val < 2000) products.push({ val, asin });
  }

  if (!products.length) return null;
  products.sort((a, b) => a.val - b.val);
  const best = products[0];
  return {
    bestPrice: best.val,
    productUrl: `https://www.amazon.com.br/dp/${best.asin}?tag=${AMAZON_TAG}`,
    pricesFound: products.slice(0, 5).map(p => p.val),
  };
}

async function main() {
  console.log(`=== SupliList Amazon Scraper — ${SUPPLEMENTS.length} suplementos ===\n`);

  const db = JSON.parse(fs.readFileSync(PRICES_FILE, 'utf8'));
  db._instructions.last_updated = new Date().toISOString().slice(0, 10);

  const summary = [];

  for (const supp of SUPPLEMENTS) {
    process.stdout.write(`${supp.id}: `);

    try {
      const result = await scrapeAmazon(supp.q);

      if (result) {
        const { bestPrice, productUrl, pricesFound } = result;
        const ppUnit = parseFloat((bestPrice / supp.qty).toFixed(4));
        const mlPrice = db[supp.id]?.mercadolivre?.price ?? bestPrice;
        const maxP = Math.max(bestPrice, mlPrice);
        const amazonSaving = parseFloat(Math.max(0, maxP - bestPrice).toFixed(2));
        const mlSaving = parseFloat(Math.max(0, maxP - mlPrice).toFixed(2));

        if (!db[supp.id]) db[supp.id] = {};
        db[supp.id].amazon = {
          price: parseFloat(bestPrice.toFixed(2)),
          qty: supp.qty,
          unit: supp.unit,
          pricePerUnit: ppUnit,
          label: 'Amazon',
          url: productUrl,
          saving: amazonSaving,
        };

        if (db[supp.id].mercadolivre) {
          db[supp.id].mercadolivre.saving = mlSaving;
        }

        console.log(`R$ ${bestPrice.toFixed(2)} (${ppUnit}/${supp.unit}) | preços: ${pricesFound.join(', ')}`);
        summary.push({ id: supp.id, price: bestPrice, ppUnit, unit: supp.unit });
      } else {
        console.log('sem preço extraído');
      }
    } catch (err) {
      console.log(`ERRO: ${err.message}`);
    }

    fs.writeFileSync(PRICES_FILE, JSON.stringify(db, null, 2));
    await sleep(DELAY_MS);
  }

  // Copia para dist
  const distFile = PRICES_FILE.replace('/public/', '/dist/');
  fs.writeFileSync(distFile, JSON.stringify(db, null, 2));

  console.log('\n=== RANKING CUSTO-BENEFÍCIO (Amazon — novos) ===');
  summary.sort((a, b) => a.ppUnit - b.ppUnit)
    .slice(0, 10)
    .forEach((s, i) => console.log(`${i+1}. ${s.id}: R$ ${s.price.toFixed(2)} | ${s.ppUnit}/${s.unit}`));

  console.log(`\nPreços salvos em ${PRICES_FILE}`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
