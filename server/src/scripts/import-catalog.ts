/**
 * import-catalog.ts — Build the public price/affiliate file from a CSV.
 *
 * Option 1 of the affiliate workflow, retargeted to what the site actually
 * reads: the public catalog renders prices and affiliate links from the static
 * file `frontend/public/data/prices.json` (NOT from MongoDB). This script reads
 * a curated CSV of products with DIRECT marketplace URLs, applies affiliate
 * attribution (affiliate-link.builder), and merges the result into prices.json.
 *
 * No database is required — it only touches a JSON file, so it is trivial to run
 * locally or from CI (GitHub Actions): run it, commit the updated prices.json,
 * deploy. The product appears on the site with a crediting link.
 *
 * CSV columns (header required; one row per supplement+marketplace).
 * `qty` and `unit` are OPTIONAL but recommended — they enable the per-unit
 * cost-benefit comparison the catalog shows.
 *
 *   supplementId,name,marketplace,price,url,qty,unit
 *
 *   supplementId  must match an `id` in supplements-db.json, otherwise the
 *                 product will not render on the catalog (a warning is printed).
 *   marketplace   one of: amazon | mercadolivre | shopee
 *   price         number in BRL, e.g. 79.90
 *   url           DIRECT product URL (Amazon /dp/, ML product page) or, for
 *                 Shopee, an affiliate shortlink (shope.ee/...). Search URLs work
 *                 but credit worse and look generic.
 *   qty           OPTIONAL package size, e.g. 300
 *   unit          OPTIONAL unit, e.g. g | caps | ml
 *
 * Affiliate codes are read from env (same vars the frontend uses):
 *   VITE_AMAZON_AFFILIATE_ID   e.g. "suplilist01-20"
 *   VITE_ML_AFFILIATE_ID       MUST be "matt:<word>:<toolId>", e.g. "matt:suplilist:35217033"
 *   VITE_SHOPEE_AFFILIATE_ID   informational only — Shopee credits only via an
 *                              affiliate shortlink you paste in the `url` column.
 *
 * Usage:
 *   npm run catalog:import                 # reads server/data/catalog.csv
 *   npm run catalog:import -- path/to.csv  # custom CSV path
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  buildAffiliateLink,
  type Marketplace,
} from '../shared/services/affiliate-link.builder.js';
import { resolveAffiliateCodes } from '../shared/services/affiliate-codes.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts → src → server → repo root
const REPO_ROOT = resolve(__dirname, '../../../');
const PRICES_PATH = resolve(REPO_ROOT, 'frontend/public/data/prices.json');
const CATALOG_DB_PATH = resolve(REPO_ROOT, 'frontend/public/data/supplements-db.json');

const MARKETPLACES: readonly Marketplace[] = ['amazon', 'mercadolivre', 'shopee'];
const STORE_LABELS: Record<Marketplace, string> = {
  amazon: 'Amazon',
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
};

interface CsvRow {
  supplementId: string;
  name: string;
  marketplace: Marketplace;
  price: number;
  url: string;
  qty?: number;
  unit?: string;
}

interface StoreEntry {
  price: number;
  qty?: number;
  unit?: string;
  pricePerUnit?: number;
  label: string;
  url: string;
  saving: number;
}

/** prices.json is { _comment?, _instructions?, [supplementId]: { [store]: StoreEntry } } */
type PricesFile = Record<string, unknown>;

/**
 * Minimal RFC-4180-ish CSV parser: supports quoted fields containing commas,
 * escaped quotes ("") and CRLF/LF line endings. Good enough for a hand-edited
 * product spreadsheet without pulling in a dependency.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') { inQuotes = true; }
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch === '\r') { /* swallow, handled by \n */ }
    else { field += ch; }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function toRows(rawRows: string[][]): CsvRow[] {
  if (rawRows.length === 0) throw new Error('CSV is empty');

  const header = rawRows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const idx = {
    supplementId: col('supplementid'),
    name: col('name'),
    marketplace: col('marketplace'),
    price: col('price'),
    url: col('url'),
    qty: col('qty'),
    unit: col('unit'),
  };

  const required = ['supplementId', 'name', 'marketplace', 'price', 'url'] as const;
  const missing = required.filter((k) => idx[k] === -1);
  if (missing.length) {
    throw new Error(`CSV missing required column(s): ${missing.join(', ')}`);
  }

  const out: CsvRow[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    const cells = rawRows[i];
    const get = (n: number) => (n === -1 ? '' : (cells[n] ?? '').trim());

    const supplementId = get(idx.supplementId);
    const name = get(idx.name);
    const marketplace = get(idx.marketplace).toLowerCase() as Marketplace;
    const price = Number.parseFloat(get(idx.price).replace(',', '.'));
    const url = get(idx.url);
    const qtyRaw = get(idx.qty);
    const unit = get(idx.unit) || undefined;
    const qty = qtyRaw ? Number.parseFloat(qtyRaw.replace(',', '.')) : undefined;

    const lineNo = i + 1;
    if (!supplementId || !name || !url) {
      console.warn(`[import] line ${lineNo}: skipped — supplementId, name and url are required`);
      continue;
    }
    if (!MARKETPLACES.includes(marketplace)) {
      console.warn(`[import] line ${lineNo}: skipped — invalid marketplace "${marketplace}"`);
      continue;
    }
    if (!Number.isFinite(price) || price <= 0) {
      console.warn(`[import] line ${lineNo}: skipped — invalid price "${get(idx.price)}"`);
      continue;
    }

    out.push({ supplementId, name, marketplace, price, url, qty: Number.isFinite(qty!) ? qty : undefined, unit });
  }
  return out;
}

function loadJson(path: string): unknown {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8');
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(text);
}

function knownCatalogIds(): Set<string> {
  const data = loadJson(CATALOG_DB_PATH);
  const arr = Array.isArray(data) ? data : (data as any)?.supplements;
  if (!Array.isArray(arr)) return new Set();
  return new Set(arr.map((s: any) => s?.id).filter(Boolean));
}

async function main(): Promise<void> {
  const csvPath = resolve(process.argv[2] ?? resolve(REPO_ROOT, 'server/data/catalog.csv'));

  const codes = resolveAffiliateCodes(process.env);
  if (!codes.amazon) console.warn('[import] No Amazon affiliate id set (AFFILIATE_CODE_AMAZON or VITE_AMAZON_AFFILIATE_ID) — Amazon links will not credit.');
  if (!codes.mercadolivre.startsWith('matt:')) console.warn('[import] Mercado Livre affiliate code not in "matt:<word>:<toolId>" format (AFFILIATE_CODE_MERCADOLIVRE or VITE_ML_AFFILIATE_ID) — ML links will not credit.');

  console.log(`[import] reading ${csvPath}`);
  const raw = readFileSync(csvPath, 'utf8');
  // Strip a UTF-8 BOM (Excel adds one) so the first header isn't "﻿supplementId".
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const rows = toRows(parseCsv(text));
  console.log(`[import] ${rows.length} valid price row(s)`);

  // Group by supplement → marketplace, applying affiliate attribution.
  const grouped = new Map<string, Record<Marketplace, StoreEntry>>();
  let applied = 0;
  let notApplied = 0;

  for (const r of rows) {
    const { url, affiliateApplied, reason } = buildAffiliateLink(r.url, r.marketplace, codes);
    if (affiliateApplied) applied++;
    else { notApplied++; console.warn(`[import] ${r.supplementId} (${r.marketplace}): affiliate NOT applied — ${reason}`); }

    const entry = grouped.get(r.supplementId) ?? ({} as Record<Marketplace, StoreEntry>);
    const store: StoreEntry = {
      price: r.price,
      label: STORE_LABELS[r.marketplace],
      url,
      saving: 0, // filled in below once all stores for this supplement are known
    };
    if (r.qty && r.unit) {
      store.qty = r.qty;
      store.unit = r.unit;
      store.pricePerUnit = Number((r.price / r.qty).toFixed(4));
    }
    entry[r.marketplace] = store;
    grouped.set(r.supplementId, entry);
  }

  // Compute per-store saving = (most expensive price) − (this price), so the
  // cheapest store shows the largest saving and the badge logic has signal.
  for (const stores of grouped.values()) {
    const prices = MARKETPLACES.map((m) => stores[m]?.price).filter((p): p is number => typeof p === 'number');
    if (prices.length < 2) continue;
    const max = Math.max(...prices);
    for (const m of MARKETPLACES) {
      if (stores[m]) stores[m].saving = Math.max(0, Math.round(max - stores[m].price));
    }
  }

  // Merge into the existing prices.json (preserve _comment/_instructions and any
  // supplements not present in this CSV).
  const existing = (loadJson(PRICES_PATH) as PricesFile) ?? {};
  const merged: PricesFile = { ...existing };
  for (const [supplementId, stores] of grouped) {
    merged[supplementId] = stores;
  }

  // Warn about ids that won't render because they're not in the catalog.
  const catalogIds = knownCatalogIds();
  const orphans = [...grouped.keys()].filter((id) => catalogIds.size > 0 && !catalogIds.has(id));
  for (const id of orphans) {
    console.warn(`[import] "${id}" is not in supplements-db.json — it won't appear on the catalog until added there.`);
  }

  writeFileSync(PRICES_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf8');

  console.log('────────────────────────────────────────');
  console.log(`[import] wrote ${grouped.size} supplement(s) to ${PRICES_PATH}`);
  console.log(`[import] affiliate links: ${applied} credited, ${notApplied} not credited`);
  if (orphans.length) console.log(`[import] ${orphans.length} id(s) not yet in the catalog — see warnings above.`);
  console.log('[import] next: commit the updated prices.json and deploy.');
}

main().catch((err) => {
  console.error('[import] fatal error:', err);
  process.exit(1);
});
