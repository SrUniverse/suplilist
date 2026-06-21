/**
 * admin-product-form.js — Full catalog-entry form for the admin products page.
 *
 * Renders all fields that map to a public catalog entry (supplements-db.json):
 * identity, metadata (category, evidence, dosage, targets, benefits, warnings,
 * side effects, interactions) and marketplace prices. Kept separate from
 * admin-products-page.js to keep both files focused and under the size budget.
 *
 * Array fields are edited as one-item-per-line textareas. Numbers are coerced;
 * empty optional numbers are omitted.
 */

import { escapeHtml } from '../../utils/escape.js';

export const KNOWN_CATEGORIES = [
  'Força & Performance',
  'Proteínas',
  'Energéticos & Foco',
  'Vitaminas & Minerais',
  'Saúde Cardiovascular',
  'Queima de Gordura & Recovery',
  'Adaptógenos & Foco',
  'Cognição & Neuroproteção',
  'Saúde Hormonal',
  'Saúde Articular & Pele',
  'Saúde Intestinal',
  'Antioxidantes & Anti-inflamatórios',
  'Sono & Recuperação',
];

const KNOWN_UNITS = ['g', 'mg', 'UI', 'mcg', 'bi UFC'];

function lines(arr) {
  return Array.isArray(arr) ? arr.join('\n') : '';
}

function parseLines(value) {
  return String(value || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Returns the inner HTML for the product form (without the surrounding <form>). */
export function renderProductFormFields() {
  const categoryOptions = KNOWN_CATEGORIES.map((c) => `<option value="${escapeHtml(c)}"></option>`).join('');
  const unitOptions = KNOWN_UNITS.map((u) => `<option value="${escapeHtml(u)}"></option>`).join('');

  return `
    <div class="form-section-title">Identidade</div>
    <label class="form-label">ID do Suplemento *
      <input class="form-input" id="field-supplementId" type="text" required placeholder="creatina-monohidratada" />
      <span class="form-hint">minúsculas, números e hífens (usado na URL e nos arquivos)</span>
    </label>
    <label class="form-label">Nome *
      <input class="form-input" id="field-name" type="text" required placeholder="Creatina Monohidratada" />
    </label>

    <div class="form-section-title">Metadados do catálogo</div>
    <div class="form-row">
      <label class="form-label">Categoria
        <input class="form-input" id="field-category" type="text" list="dl-categories" placeholder="Força & Performance" />
        <datalist id="dl-categories">${categoryOptions}</datalist>
      </label>
      <label class="form-label">Nível de evidência
        <select class="form-input" id="field-evidenceLevel">
          <option value="">—</option>
          <option value="A">A — forte</option>
          <option value="B">B — moderada</option>
          <option value="C">C — limitada</option>
          <option value="D">D — fraca</option>
        </select>
      </label>
    </div>
    <div class="form-row">
      <label class="form-label">Imagem (caminho)
        <input class="form-input" id="field-image" type="text" placeholder="/assets/creatina.webp" />
      </label>
      <label class="form-label">Score de segurança (0–100)
        <input class="form-input" id="field-safetyScore" type="number" min="0" max="100" step="1" />
      </label>
    </div>
    <label class="form-label">Preço por grama (R$)
      <input class="form-input" id="field-pricePerGram" type="number" min="0" step="0.01" />
    </label>

    <fieldset class="form-fieldset">
      <legend>Objetivos (0 a 1)</legend>
      <div class="form-row">
        <label class="form-label">Bulk<input class="form-input" id="field-t-bulk" type="number" min="0" max="1" step="0.1" /></label>
        <label class="form-label">Força<input class="form-input" id="field-t-strength" type="number" min="0" max="1" step="0.1" /></label>
        <label class="form-label">Cutting<input class="form-input" id="field-t-cut" type="number" min="0" max="1" step="0.1" /></label>
      </div>
      <div class="form-row">
        <label class="form-label">Resistência<input class="form-input" id="field-t-endurance" type="number" min="0" max="1" step="0.1" /></label>
        <label class="form-label">Geral<input class="form-input" id="field-t-general" type="number" min="0" max="1" step="0.1" /></label>
      </div>
    </fieldset>

    <fieldset class="form-fieldset">
      <legend>Dosagem</legend>
      <div class="form-row">
        <label class="form-label">Multiplicador (por kg)<input class="form-input" id="field-d-multiplier" type="number" min="0" step="0.01" /></label>
        <label class="form-label">Unidade
          <input class="form-input" id="field-d-unit" type="text" list="dl-units" placeholder="g" />
          <datalist id="dl-units">${unitOptions}</datalist>
        </label>
      </div>
      <div class="form-row">
        <label class="form-label">Manutenção<input class="form-input" id="field-d-maintenance" type="number" min="0" step="0.1" /></label>
        <label class="form-label">Limite superior<input class="form-input" id="field-d-upperLimit" type="number" min="0" step="0.1" /></label>
        <label class="form-label">Loading (opcional)<input class="form-input" id="field-d-loading" type="number" min="0" step="0.1" /></label>
      </div>
      <label class="form-label">Timing
        <input class="form-input" id="field-d-timing" type="text" placeholder="Pós-treino ou a qualquer hora" />
      </label>
    </fieldset>

    <label class="form-label">Benefícios (um por linha)
      <textarea class="form-input form-textarea" id="field-benefits" rows="3"></textarea>
    </label>
    <label class="form-label">Avisos (um por linha)
      <textarea class="form-input form-textarea" id="field-warnings" rows="2"></textarea>
    </label>
    <label class="form-label">Efeitos colaterais (um por linha)
      <textarea class="form-input form-textarea" id="field-sideEffects" rows="2"></textarea>
    </label>
    <label class="form-label">Restrições (um por linha)
      <textarea class="form-input form-textarea" id="field-restrictions" rows="2"></textarea>
    </label>
    <label class="form-label">Interações (um por linha)
      <textarea class="form-input form-textarea" id="field-interactions" rows="2"></textarea>
    </label>

    <div class="form-section-title">Preços & links de afiliado</div>
    <fieldset class="form-fieldset">
      <legend>Amazon</legend>
      <label class="form-label">Preço (R$)<input class="form-input" id="field-amazon-price" type="number" min="0" step="0.01" /></label>
      <label class="form-label">URL<input class="form-input" id="field-amazon-url" type="url" /></label>
    </fieldset>
    <fieldset class="form-fieldset">
      <legend>Mercado Livre</legend>
      <label class="form-label">Preço (R$)<input class="form-input" id="field-ml-price" type="number" min="0" step="0.01" /></label>
      <label class="form-label">URL<input class="form-input" id="field-ml-url" type="url" /></label>
    </fieldset>
    <fieldset class="form-fieldset">
      <legend>Shopee</legend>
      <label class="form-label">Preço (R$)<input class="form-input" id="field-shopee-price" type="number" min="0" step="0.01" /></label>
      <label class="form-label">URL<input class="form-input" id="field-shopee-url" type="url" /></label>
    </fieldset>
  `;
}

/** Fill the form fields from a product object (or clear them for a new entry). */
export function populateProductForm(root, product) {
  const set = (id, v) => { const el = root.querySelector(id); if (el) el.value = v ?? ''; };
  const m = product?.metadata ?? {};
  const t = m.targets ?? {};
  const d = m.dosage ?? {};
  const p = product?.prices ?? {};

  set('#field-supplementId', product?.supplementId);
  set('#field-name', product?.name);
  set('#field-category', m.category);
  set('#field-evidenceLevel', m.evidenceLevel);
  set('#field-image', m.image);
  set('#field-safetyScore', m.safetyScore);
  set('#field-pricePerGram', m.pricePerGram);
  set('#field-t-bulk', t.bulk);
  set('#field-t-strength', t.strength);
  set('#field-t-cut', t.cut);
  set('#field-t-endurance', t.endurance);
  set('#field-t-general', t.general);
  set('#field-d-multiplier', d.multiplier);
  set('#field-d-unit', d.unit);
  set('#field-d-maintenance', d.maintenance);
  set('#field-d-upperLimit', d.upperLimit);
  set('#field-d-loading', d.loading);
  set('#field-d-timing', d.timing);
  set('#field-benefits', lines(m.benefits));
  set('#field-warnings', lines(m.warnings));
  set('#field-sideEffects', lines(m.sideEffects));
  set('#field-restrictions', lines(m.restrictions));
  set('#field-interactions', lines(m.interactions));
  set('#field-amazon-price', p.amazon?.price);
  set('#field-amazon-url', p.amazon?.url);
  set('#field-ml-price', p.mercadolivre?.price);
  set('#field-ml-url', p.mercadolivre?.url);
  set('#field-shopee-price', p.shopee?.price);
  set('#field-shopee-url', p.shopee?.url);
}

/**
 * Collect the form into an API payload. Returns { payload } or { error }.
 * Metadata is only included when a category is filled (so price-only edits stay
 * lightweight). Empty optional numbers are omitted.
 */
export function collectProductPayload(root) {
  const val = (id) => root.querySelector(id)?.value?.trim() ?? '';
  const num = (id) => { const v = parseFloat(val(id)); return Number.isNaN(v) ? undefined : v; };

  const supplementId = val('#field-supplementId');
  const name = val('#field-name');
  if (!supplementId) return { error: 'Informe o ID do suplemento.' };
  if (!/^[a-z0-9-]+$/.test(supplementId)) return { error: 'ID inválido: use apenas letras minúsculas, números e hífens.' };
  if (!name) return { error: 'Informe o nome do suplemento.' };

  const payload = { supplementId, name };

  // Prices
  const prices = {};
  const addPrice = (store, priceId, urlId) => {
    const price = num(priceId);
    const url = val(urlId);
    if (price !== undefined && url) prices[store] = { price, url };
  };
  addPrice('amazon', '#field-amazon-price', '#field-amazon-url');
  addPrice('mercadolivre', '#field-ml-price', '#field-ml-url');
  addPrice('shopee', '#field-shopee-price', '#field-shopee-url');
  if (Object.keys(prices).length) payload.prices = prices;

  // Metadata — included only when a category is provided.
  const category = val('#field-category');
  if (category) {
    const evidenceLevel = val('#field-evidenceLevel');
    if (!evidenceLevel) return { error: 'Selecione o nível de evidência (metadados preenchidos).' };
    const timing = val('#field-d-timing');
    const unit = val('#field-d-unit');
    if (!unit) return { error: 'Informe a unidade de dosagem.' };

    const metadata = {
      image: val('#field-image') || undefined,
      category,
      evidenceLevel,
      targets: {
        bulk: num('#field-t-bulk') ?? 0,
        strength: num('#field-t-strength') ?? 0,
        cut: num('#field-t-cut') ?? 0,
        endurance: num('#field-t-endurance') ?? 0,
        general: num('#field-t-general') ?? 0,
      },
      restrictions: parseLines(val('#field-restrictions')),
      dosage: {
        multiplier: num('#field-d-multiplier') ?? 0,
        unit,
        maintenance: num('#field-d-maintenance') ?? 0,
        upperLimit: num('#field-d-upperLimit') ?? 0,
        timing,
      },
      pricePerGram: num('#field-pricePerGram') ?? 0,
      safetyScore: num('#field-safetyScore') ?? 0,
      benefits: parseLines(val('#field-benefits')),
      warnings: parseLines(val('#field-warnings')),
      sideEffects: parseLines(val('#field-sideEffects')),
      interactions: parseLines(val('#field-interactions')),
    };
    const loading = num('#field-d-loading');
    if (loading !== undefined) metadata.dosage.loading = loading;
    payload.metadata = metadata;
  }

  return { payload };
}
