/**
 * export-catalog.ts — Generate the public price file from MongoDB.
 *
 * This is the bridge that connects the admin panel (which writes supplements to
 * the `supplements_data` MongoDB collection via POST/PUT /api/supplements) to
 * the public site (which renders prices/affiliate links from the STATIC file
 * `frontend/public/data/prices.json`).
 *
 * It reads every supplement from Mongo, applies affiliate attribution to each
 * stored marketplace URL (affiliate-link.builder), and MERGES the result into
 * prices.json — preserving any ids not present in Mongo (e.g. ids you maintain
 * via the CSV `catalog:import` path). Run it after editing the catalog in the
 * admin panel, then commit prices.json and deploy. The GitHub Action
 * `.github/workflows/catalog-sync.yml` automates this on a schedule.
 *
 * Affiliate codes come from env (same vars the frontend uses):
 *   VITE_AMAZON_AFFILIATE_ID, VITE_ML_AFFILIATE_ID (matt:<word>:<toolId>),
 *   VITE_SHOPEE_AFFILIATE_ID.
 *
 * Usage:
 *   npm run catalog:export
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  buildAffiliateLink,
  type Marketplace,
  type AffiliateCodes,
} from '../shared/services/affiliate-link.builder.js';
import {
  SupplementDataModel,
  type ISupplementMetadata,
} from '../modules/supplements/infrastructure/mongoose/supplement-data.model.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../');
const PRICES_PATH = resolve(REPO_ROOT, 'frontend/public/data/prices.json');
const CATALOG_DB_PATH = resolve(REPO_ROOT, 'frontend/public/data/supplements-db.json');

const MARKETPLACES: readonly Marketplace[] = ['amazon', 'mercadolivre', 'shopee'];
const STORE_LABELS: Record<Marketplace, string> = {
  amazon: 'Amazon',
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
};

interface StoreEntry {
  price: number;
  label: string;
  url: string;
  saving: number;
}

type PricesFile = Record<string, unknown>;

function loadJson(path: string): unknown {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8');
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(text);
}

interface CatalogEntry extends ISupplementMetadata {
  id: string;
  name: string;
}

function loadCatalogArray(): CatalogEntry[] {
  const data = loadJson(CATALOG_DB_PATH);
  const arr = Array.isArray(data) ? data : (data as any)?.supplements;
  return Array.isArray(arr) ? (arr as CatalogEntry[]) : [];
}

/**
 * Merge Mongo-sourced catalog entries into the existing supplements-db.json
 * array. Existing order is preserved; entries present in Mongo are overwritten;
 * entries only in the file (e.g. not yet seeded) are kept; new Mongo entries are
 * appended. Returns null if nothing in Mongo carries metadata (so we never wipe
 * the file when the collection hasn't been seeded yet).
 */
function mergeCatalog(
  existing: CatalogEntry[],
  fromMongo: Map<string, CatalogEntry>
): CatalogEntry[] | null {
  if (fromMongo.size === 0) return null;
  const seen = new Set<string>();
  const merged: CatalogEntry[] = existing.map((entry) => {
    const replacement = fromMongo.get(entry.id);
    if (replacement) {
      seen.add(entry.id);
      return replacement;
    }
    return entry;
  });
  for (const [id, entry] of fromMongo) {
    if (!seen.has(id)) merged.push(entry);
  }
  return merged;
}

function computeSavings(stores: Partial<Record<Marketplace, StoreEntry>>): void {
  const prices = MARKETPLACES.map((m) => stores[m]?.price).filter((p): p is number => typeof p === 'number');
  if (prices.length < 2) return;
  const max = Math.max(...prices);
  for (const m of MARKETPLACES) {
    const s = stores[m];
    if (s) s.saving = Math.max(0, Math.round(max - s.price));
  }
}

async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('[export] MONGO_URI is not set. Add it to server/.env or the environment.');
    process.exit(1);
  }

  const codes: AffiliateCodes = {
    amazon: process.env.VITE_AMAZON_AFFILIATE_ID ?? '',
    mercadolivre: process.env.VITE_ML_AFFILIATE_ID ?? '',
    shopee: process.env.VITE_SHOPEE_AFFILIATE_ID ?? '',
  };
  if (!codes.amazon) console.warn('[export] VITE_AMAZON_AFFILIATE_ID not set — Amazon links will not credit.');
  if (!codes.mercadolivre.startsWith('matt:')) console.warn('[export] VITE_ML_AFFILIATE_ID is not in "matt:<word>:<toolId>" format — Mercado Livre links will not credit.');

  console.log('[export] connecting to MongoDB…');
  await mongoose.connect(mongoUri);

  let applied = 0;
  let notApplied = 0;
  const fromMongo: Record<string, Record<string, StoreEntry>> = {};
  const fromMongoCatalog = new Map<string, CatalogEntry>();

  try {
    const docs = await SupplementDataModel.find()
      .select('supplementId name prices metadata')
      .lean();

    for (const doc of docs) {
      // Catalog metadata → regenerate supplements-db.json. Only docs that carry
      // metadata contribute; price-only docs are left to the static file.
      if (doc.metadata && (doc.metadata as ISupplementMetadata).category) {
        fromMongoCatalog.set(doc.supplementId, {
          id: doc.supplementId,
          name: doc.name,
          ...(doc.metadata as ISupplementMetadata),
        });
      }

      const stores: Partial<Record<Marketplace, StoreEntry>> = {};
      for (const m of MARKETPLACES) {
        const p = (doc.prices as any)?.[m];
        if (!p?.url || typeof p.price !== 'number') continue;
        const { url, affiliateApplied, reason } = buildAffiliateLink(p.url, m, codes);
        if (affiliateApplied) applied++;
        else { notApplied++; console.warn(`[export] ${doc.supplementId} (${m}): affiliate NOT applied — ${reason}`); }
        stores[m] = { price: p.price, label: STORE_LABELS[m], url, saving: 0 };
      }
      if (Object.keys(stores).length === 0) continue;
      computeSavings(stores);
      fromMongo[doc.supplementId] = stores as Record<string, StoreEntry>;
    }
  } finally {
    await mongoose.disconnect();
  }

  // ── 1) Regenerate supplements-db.json (catalog metadata) ─────────────────────
  const existingCatalog = loadCatalogArray();
  const mergedCatalog = mergeCatalog(existingCatalog, fromMongoCatalog);
  if (mergedCatalog) {
    writeFileSync(CATALOG_DB_PATH, JSON.stringify(mergedCatalog, null, 2) + '\n', 'utf8');
    console.log(`[export] wrote ${mergedCatalog.length} catalog entr(ies) to ${CATALOG_DB_PATH} (${fromMongoCatalog.size} from Mongo)`);
  } else {
    console.warn('[export] no Mongo docs carry catalog metadata — supplements-db.json left untouched. Run `npm run catalog:seed` first.');
  }

  // ── 2) Regenerate prices.json (affiliate prices/links) ───────────────────────
  const existing = (loadJson(PRICES_PATH) as PricesFile) ?? {};
  const merged: PricesFile = { ...existing };
  for (const [id, stores] of Object.entries(fromMongo)) {
    merged[id] = stores;
  }

  const catalogIds = new Set(
    (mergedCatalog ?? existingCatalog).map((s) => s.id).filter(Boolean)
  );
  const orphans = Object.keys(fromMongo).filter((id) => catalogIds.size > 0 && !catalogIds.has(id));
  for (const id of orphans) {
    console.warn(`[export] "${id}" has prices but no catalog entry — it won't appear until its metadata is added.`);
  }

  writeFileSync(PRICES_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf8');

  console.log('────────────────────────────────────────');
  console.log(`[export] wrote ${Object.keys(fromMongo).length} supplement price set(s) from Mongo to ${PRICES_PATH}`);
  console.log(`[export] affiliate links: ${applied} credited, ${notApplied} not credited`);
  if (orphans.length) console.log(`[export] ${orphans.length} id(s) not yet in the catalog — see warnings above.`);
}

main().catch((err) => {
  console.error('[export] fatal error:', err);
  process.exit(1);
});
