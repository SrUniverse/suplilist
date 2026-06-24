#!/usr/bin/env node
/**
 * scrape-prices.js — Atualiza preços Amazon no prices.json via Firecrawl.
 * ML requer login, então só Amazon é raspado.
 * Uso: FIRECRAWL_API_KEY=fc-xxx node scripts/scrape-prices.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.FIRECRAWL_API_KEY;
const BASE_URL = 'https://api.firecrawl.dev/v1';
const PRICES_FILE = path.join(__dirname, '../frontend/public/data/prices.json');
const AMAZON_TAG = 'suplilist01-20';
const DELAY_MS = 7000; // 7s = ~8.5 req/min (limite free: 10/min)

if (!API_KEY) { console.error('FIRECRAWL_API_KEY não definida.'); process.exit(1); }

// Suplementos: query de busca + qty da embalagem buscada + unidade
const SUPPLEMENTS = [
  { id: 'creatina-monohidratada', q: 'creatina monohidratada 300g',           qty: 300, unit: 'g' },
  { id: 'whey-protein',           q: 'whey protein concentrado 900g',          qty: 900, unit: 'g' },
  { id: 'omega-3',                q: 'omega 3 fish oil 120 capsulas',          qty: 120, unit: 'caps' },
  { id: 'vitamina-d3',            q: 'vitamina d3 2000ui 120 capsulas',        qty: 120, unit: 'caps' },
  { id: 'magnesio-bisglicinato',  q: 'magnesio bisglicinato 500mg 90 caps',   qty: 90,  unit: 'caps' },
  { id: 'ashwagandha',            q: 'ashwagandha ksm66 500mg 60 capsulas',   qty: 60,  unit: 'caps' },
  { id: 'melatonina',             q: 'melatonina 0.2mg 60 capsulas',           qty: 60,  unit: 'caps' },
  { id: 'zinco-bisglicinato',     q: 'zinco bisglicinato 30mg 60 capsulas',   qty: 60,  unit: 'caps' },
  { id: 'vitamina-c',             q: 'vitamina c 1000mg 60 comprimidos',      qty: 60,  unit: 'caps' },
  { id: 'l-carnitina',            q: 'l carnitina 2000mg 60 capsulas',        qty: 60,  unit: 'caps' },
  { id: 'coenzima-q10',           q: 'coenzima q10 100mg 60 capsulas',        qty: 60,  unit: 'caps' },
  { id: 'l-teanina',              q: 'l-teanina 200mg 60 capsulas',           qty: 60,  unit: 'caps' },
  { id: 'beta-alanina',           q: 'beta alanina 3g pre treino 150g',       qty: 150, unit: 'g' },
  { id: 'cafeina-teanina',        q: 'cafeina anidra 200mg 120 capsulas',     qty: 120, unit: 'caps' },
  { id: 'spirulina',              q: 'spirulina 500mg 120 comprimidos',       qty: 120, unit: 'caps' },
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
    return scrapeAmazon(query); // retry
  }

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const data = await resp.json();
  const md = data.data?.markdown || '';

  // Extrair preços de PRODUTOS reais (em links amazon.com.br/dp/ASIN)
  // Padrão: [R$ 44,90R$44,90...](https://www.amazon.com.br/.../dp/ASIN...)
  const productPriceRe = /\[R\$\s*([\d.]+,\d{2})[^\]]*\]\(https:\/\/www\.amazon\.com\.br\/[^\)]+dp\/([A-Z0-9]{10})/g;
  const products = [];
  let m;
  while ((m = productPriceRe.exec(md)) !== null) {
    const val = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
    const asin = m[2];
    if (val > 10 && val < 2000) products.push({ val, asin });
  }

  if (!products.length) return null;
  products.sort((a, b) => a.val - b.val);
  const best = products[0];
  const bestPrice = best.val;
  const productUrl = `https://www.amazon.com.br/dp/${best.asin}?tag=${AMAZON_TAG}`;

  return { bestPrice, productUrl, pricesFound: products.slice(0, 5).map(p => p.val) };
}

async function main() {
  console.log('=== SupliList Amazon Price Scraper ===');
  console.log(`${SUPPLEMENTS.length} suplementos | ${DELAY_MS/1000}s entre requests\n`);

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

        // Calcular saving vs ML (se ML existe no db)
        const mlPrice = db[supp.id]?.mercadolivre?.price ?? bestPrice;
        const maxP = Math.max(bestPrice, mlPrice);
        const saving = parseFloat((maxP - bestPrice).toFixed(2));

        if (!db[supp.id]) db[supp.id] = {};
        db[supp.id].amazon = {
          price: parseFloat(bestPrice.toFixed(2)),
          qty: supp.qty,
          unit: supp.unit,
          pricePerUnit: ppUnit,
          label: 'Amazon',
          url: productUrl,
          saving,
        };

        // Atualizar saving do ML também
        if (db[supp.id].mercadolivre) {
          db[supp.id].mercadolivre.saving = parseFloat((maxP - mlPrice).toFixed(2));
        }

        console.log(`R$ ${bestPrice.toFixed(2)} (R$ ${ppUnit}/${supp.unit}) — preços: ${pricesFound.join(', ')}`);
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

  console.log('\n=== RANKING CUSTO-BENEFÍCIO (Amazon) ===');
  summary
    .sort((a, b) => a.ppUnit - b.ppUnit)
    .forEach((s, i) => console.log(`${i+1}. ${s.id}: R$ ${s.price.toFixed(2)} | R$ ${s.ppUnit}/${s.unit}`));

  console.log(`\npreços salvos em ${PRICES_FILE}`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
