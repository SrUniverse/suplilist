/**
 * updater.js — SupliList
 *
 * Busca o melhor preço (custo-benefício) no Mercado Livre via scraping público,
 * e scraping opcional na Shopee/Amazon para produtos com URL definida.
 *
 * Não requer credenciais de API — nenhuma variável de ambiente obrigatória.
 *
 * Gera ../dados.json relativo à localização deste script.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

// ─────────────────────────────────────────────────────────────────
// PATH SEGURO — sempre relativo ao script, não ao CWD
// ─────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// O script fica em bot/updater.js → dados.json fica na raiz do repo
const DADOS_PATH = path.resolve(__dirname, '..', 'dados.json');

// ─────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DE AFILIADO
// ─────────────────────────────────────────────────────────────────

const ML_MATT_TOOL = '35217033';
const ML_MATT_WORD = 'suplilist';

// Filtros de qualidade (aplicados durante o scraping)
const FILTROS = {
  min_vendas:     10,   // Ignora anúncios com menos de N vendas visíveis no card
  max_resultados: 10,   // Anúncios analisados por suplemento
};

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
];

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ─────────────────────────────────────────────────────────────────
// LISTA DE SUPLEMENTOS
//
// id         → bate com o `id` do database.js (string ou número — ver nota no price-loader)
// query      → termo de busca no ML (específico = melhor resultado)
// qty        → gramas do produto ideal de compra (para cálculo R$/g)
// doses      → número de doses (fallback se qty for null)
// shopeeUrl  → link direto na Shopee (opcional)
// amazonUrl  → link direto na Amazon (opcional)
// ─────────────────────────────────────────────────────────────────
const PRODUTOS = [
  { id:  1, query: 'Maca Peruana Preta em po 1kg',               qty:  1000, doses:  30 },
  { id:  2, query: 'Feno-grego em po 1kg',                       qty:  1000, doses:  40 },
  { id:  3, query: 'L-Citrulina em po 500g',                     qty:   500, doses:  13 },
  { id:  4, query: 'Ashwagandha KSM-66 extrato 100g',            qty:   100, doses:  40 },
  { id:  5, query: 'Tongkat Ali extrato po 100g',                qty:   100, doses:  50 },
  { id:  6, query: 'Boro citrato em po 50g',                     qty:    50, doses: 100 },
  { id:  7, query: 'Mucuna Pruriens extrato po 100g',            qty:   100, doses:  20 },
  { id:  8, query: 'Zinco bisglicinato em po 100g',              qty:   100, doses:  40 },
  { id:  9, query: 'Magnesio glicinato em po 200g',              qty:   200, doses:  20 },
  { id: 10, query: 'Vitamina D3 K2 MK7 capsula',                qty:  null, doses:  60 },
  { id: 11, query: 'Creatina Monohidratada 1kg',                 qty:  1000, doses: 200, amazonUrl: 'https://www.amazon.com.br/dp/B0CF71CJ2L' },
  { id: 12, query: 'Beta-Alanina em po 500g',                    qty:   500, doses:  62 },
  { id: 13, query: 'Cafeina L-Teanina 100g',                    qty:   100, doses:  50 },
  { id: 14, query: 'HMB beta-hidroxi metilbutirato 200g',        qty:   200, doses:  33 },
  { id: 15, query: 'Whey Protein Isolado 1kg',                   qty:  1000, doses:  33 },
  { id: 16, query: 'EAA aminoacidos essenciais 500g',            qty:   500, doses:  20 },
  { id: 17, query: 'Ecdisterona 20-hidroxiecdisona 100g',        qty:   100, doses:  40 },
  { id: 19, query: 'Bacopa Monnieri extrato po 100g',            qty:   100, doses:  33 },
  { id: 20, query: 'Rhodiola Rosea extrato po 100g',             qty:   100, doses:  30 },
  { id: 21, query: 'Alpha GPC em po 50g',                        qty:    50, doses:  26 },
  { id: 22, query: 'L-Teanina em po 100g',                       qty:   100, doses:  50 },
  { id: 23, query: 'Omega 3 EPA DHA 120 capsulas',               qty:  null, doses:  60 },
  { id: 24, query: 'Magnesio Treonato em po 200g',               qty:   200, doses:  80 },
  { id: 25, query: 'Coenzima Q10 Ubiquinol 60 capsulas',         qty:  null, doses:  60 },
  { id: 26, query: 'Beta Glucana cogumelos 60g',                 qty:    60, doses:  60 },
  { id: 27, query: 'Vitamina C Tamponada em po 500g',            qty:   500, doses: 100 },
  { id: 28, query: 'Quercetina 60g',                             qty:    60, doses:  60 },
  { id: 29, query: 'Catuaba extrato po 100g',                    qty:   100, doses:  20 },
  { id: 30, query: 'Muira Puama Marapuama extrato 100g',         qty:   100, doses:  20 },
  { id: 31, query: 'Saw Palmetto extrato po 100g',               qty:   100, doses:  18 },
  { id: 32, query: 'Panax Ginseng extrato po 100g',              qty:   100, doses:  46 },
  { id: 33, query: 'Taurina em po 500g',                         qty:   500, doses: 100 },
  { id: 34, query: 'Shatavari extrato 100g',                     qty:   100, doses:  60 },
  { id: 35, query: 'Probiotico multi-cepas 30 capsulas',         qty:  null, doses:  30 },
  { id: 36, query: 'Psyllium Husk em po 500g',                   qty:   500, doses:  60 },
  { id: 37, query: 'Berberina HCL 60 capsulas',                  qty:  null, doses:  60 },
  { id: 38, query: 'Cromo Picolinato 120 capsulas',              qty:  null, doses: 120 },
  { id: 39, query: 'EGCG extrato cha verde 100g',                qty:   100, doses: 100 },
  { id: 40, query: 'Colageno Verisol peptideos 500g',            qty:   500, doses:  60 },
  { id: 41, query: 'Ferro Bisglicinato 60 capsulas',             qty:  null, doses:  60 },
  { id: 42, query: 'Cranberry extrato 60 capsulas',              qty:  null, doses:  60 },
  { id: 43, query: 'Melatonina 60 capsulas',                     qty:  null, doses:  60 },
  { id: 44, query: 'Glucosamina Condroitina 120 capsulas',       qty:  null, doses:  40 },
  { id: 45, query: 'NAC N-Acetilcisteina 60 capsulas',           qty:  null, doses:  60 },
  { id: 46, query: 'Glicina em po 500g',                         qty:   500, doses:  66 },
  { id: 47, query: 'Inositol Myo D-Chiro 300g',                 qty:   300, doses:  60 },
  { id: 48, query: 'Spirulina em po 500g',                       qty:   500, doses:  80 },
  { id: 49, query: 'Calcio Citrato vitamina D3 120 capsulas',    qty:  null, doses:  60 },
  { id: 50, query: 'Valeriana extrato 100g',                     qty:   100, doses:  60 },
  { id: 51, query: 'Apigenina 60g',                              qty:    60, doses:  60 },
  { id: 52, query: 'Resveratrol Trans 60 capsulas',              qty:  null, doses:  60 },
  { id: 53, query: 'Oleo de Primula 120 capsulas',               qty:  null, doses:  60 },
  { id: 54, query: 'L-Carnitina L-Tartarato 500g',               qty:   500, doses: 100 },
  { id: 55, query: 'Tirosina em po 200g',                        qty:   200, doses: 100 },
  { id: 56, query: 'Curcumina Fitossomada 60 capsulas',          qty:  null, doses:  60 },
  { id: 57, query: 'NMN Mononucleotideo Nicotinamida 30g',       qty:    30, doses:  30 },
];

// ─────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function comRetry(fn, tentativas = 3, espera = 4000) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      return await fn();
    } catch (err) {
      console.warn(`    ⚠️  Tentativa ${i}/${tentativas}: ${err.message}`);
      if (i < tentativas) await sleep(espera);
    }
  }
  return null;
}

/** Extrai gramas do título: "1kg" → 1000, "300g" → 300 */
function extrairGramasDoTitulo(titulo) {
  const t = titulo.toLowerCase();
  const kg = t.match(/(\d+(?:[.,]\d+)?)\s*kg/);
  if (kg) return parseFloat(kg[1].replace(',', '.')) * 1000;
  const g = t.match(/(\d+(?:[.,]\d+)?)\s*g\b/);
  if (g) return parseFloat(g[1].replace(',', '.'));
  return null;
}

/** Score de custo-benefício — menor = melhor */
function calcularScore(preco, grams, doses) {
  if (grams && grams > 0) return preco / grams;  // R$/g (mais preciso)
  if (doses && doses > 0) return preco / doses;  // R$/dose (fallback)
  return preco;
}

/** Monta link de afiliado ML */
function linkAfiliado(permalink) {
  try {
    const url = new URL(permalink);
    url.searchParams.set('matt_tool', ML_MATT_TOOL);
    url.searchParams.set('matt_word', ML_MATT_WORD);
    return url.toString();
  } catch {
    return permalink;
  }
}

/** Arredonda para 2 casas decimais (evita perda de centavos) */
function arredondar(n) {
  return Math.round(n * 100) / 100;
}

/** Normaliza string de preço "R$ 89,90" → 89.90 */
function parsePrecoBR(texto) {
  if (!texto) return null;
  // Remove tudo exceto dígitos, vírgula e ponto
  // Formato BR: "89,90" ou "1.234,56"
  const limpo = texto.replace(/[^\d,.]/g, '');
  // Se tem vírgula, ela é o separador decimal
  if (limpo.includes(',')) {
    const n = parseFloat(limpo.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? null : arredondar(n);
  }
  const n = parseFloat(limpo);
  return isNaN(n) ? null : arredondar(n);
}

// ─────────────────────────────────────────────────────────────────
// MERCADO LIVRE — SCRAPING PÚBLICO
// ─────────────────────────────────────────────────────────────────

/**
 * Monta a URL de busca pública do ML.
 * Usa lista.mercadolivre.com.br para resultados em formato de lista,
 * o que facilita a extração de múltiplos cards de uma só vez.
 */
function urlBuscaML(query) {
  const slug = query
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `https://lista.mercadolivre.com.br/${slug}#D[A:${encodeURIComponent(query)}]`;
}

/**
 * Extrai os cards de produto da página de busca do ML.
 * Retorna array de { titulo, preco, vendas, permalink }
 */
async function extrairCardsML(page) {
  return page.evaluate(() => {
    const cards = [];

    // Seletores dos cards de resultado (ML usa classes geradas, mas data-* é mais estável)
    const itens = document.querySelectorAll(
      'li.ui-search-layout__item, div.ui-search-result__wrapper'
    );

    for (const item of itens) {
      try {
        // Título
        const tituloEl = item.querySelector(
          'h2.ui-search-item__title, .poly-component__title, h2[class*="title"]'
        );
        const titulo = tituloEl?.innerText?.trim();
        if (!titulo) continue;

        // Preço — pega a parte inteira + centavos separados
        const inteiroEl = item.querySelector(
          '.andes-money-amount__fraction, [class*="price-part"]:not([class*="original"]):not([class*="strike"])'
        );
        const centavosEl = item.querySelector(
          '.andes-money-amount__cents'
        );
        if (!inteiroEl) continue;

        const inteiro = inteiroEl.innerText.replace(/\D/g, '');
        const centavos = centavosEl?.innerText?.replace(/\D/g, '').padEnd(2, '0') ?? '00';
        const preco = parseFloat(`${inteiro}.${centavos.substring(0, 2)}`);
        if (isNaN(preco) || preco <= 0) continue;

        // Vendas (texto como "200 vendidos")
        const vendasEl = item.querySelector(
          '.poly-component__sold-and-reviews, [class*="sold"], .ui-search-item__group__element--sold'
        );
        const vendasTexto = vendasEl?.innerText ?? '';
        const vendasMatch = vendasTexto.match(/(\d[\d.]*)/);
        const vendas = vendasMatch
          ? parseInt(vendasMatch[1].replace(/\./g, ''), 10)
          : 0;

        // Link do produto
        const linkEl = item.querySelector('a[href*="mercadolivre.com.br"]');
        const permalink = linkEl?.href ?? '';
        if (!permalink) continue;

        cards.push({ titulo, preco, vendas, permalink });
      } catch {
        // card malformado — ignora
      }
    }

    return cards;
  });
}

async function buscarMelhorML(browser, produto) {
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);

  // Bloqueia recursos pesados para acelerar (imagens, fontes, mídia)
  await page.setRequestInterception(true);
  page.on('request', req => {
    const tipo = req.resourceType();
    if (['image', 'font', 'media', 'stylesheet'].includes(tipo)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    const url = urlBuscaML(produto.query);
    console.log(`    🔗 ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Aguarda os cards renderizarem (podem chegar via JS após o DOM inicial)
    await page.waitForSelector(
      'li.ui-search-layout__item, div.ui-search-result__wrapper',
      { timeout: 15000 }
    ).catch(() => {
      console.warn('    ⚠️  Seletor de cards não encontrado — tentando assim mesmo.');
    });

    // Pequena pausa para renderização de preços dinâmicos
    await sleep(1500);

    const cards = await extrairCardsML(page);

    if (!cards.length) {
      console.warn(`    ⚠️  Nenhum card extraído para "${produto.query}"`);
      return null;
    }

    // Filtra por vendas mínimas (pula anúncios novos/sem histórico)
    const filtrados = cards
      .slice(0, FILTROS.max_resultados)
      .filter(c => c.vendas >= FILTROS.min_vendas);

    // Se o filtro de vendas eliminar tudo, relaxa e usa os cards brutos
    const candidatos = (filtrados.length ? filtrados : cards.slice(0, FILTROS.max_resultados))
      .map(c => {
        const grams = extrairGramasDoTitulo(c.titulo) || produto.qty || null;
        const score = calcularScore(c.preco, grams, produto.doses);
        return { ...c, grams, score };
      });

    candidatos.sort((a, b) => a.score - b.score);
    const melhor = candidatos[0];
    const criterio = melhor.grams
      ? `R$${melhor.score.toFixed(4)}/g`
      : `R$${melhor.score.toFixed(2)}/dose`;

    console.log(
      `    ✅ "${melhor.titulo.substring(0, 50)}" — ` +
      `R$${melhor.preco} (${criterio}) [${melhor.vendas} vendas]`
    );

    // Limpa o permalink (remove parâmetros de rastreamento do ML antes de adicionar os nossos)
    const permalinkLimpo = melhor.permalink.split('?')[0];

    return {
      preco: arredondar(melhor.preco),
      link:  linkAfiliado(permalinkLimpo),
    };
  } finally {
    await page.close();
  }
}

// ─────────────────────────────────────────────────────────────────
// SHOPEE & AMAZON — SCRAPING
// ─────────────────────────────────────────────────────────────────

async function getPrecoShopee(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);
  const seletores = [
    '._3n5NQx', '.pqTWkA',
    '[class*="price"] [class*="current"]',
    'span[class*="price"]:not([class*="original"])',
  ];
  for (const sel of seletores) {
    try {
      const texto = await page.$eval(sel, el => el.innerText.trim());
      const n = parsePrecoBR(texto);
      if (n && n > 0) return n;
    } catch { /* tenta próximo */ }
  }
  return null;
}

async function getPrecoAmazon(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);
  const seletores = [
    '.a-price .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price-whole',
  ];
  for (const sel of seletores) {
    try {
      const texto = await page.$eval(sel, el => el.innerText.trim());
      const n = parsePrecoBR(texto);
      if (n && n > 0) return n;
    } catch { /* tenta próximo */ }
  }
  return null;
}

async function scraperPreco(browser, url, fn) {
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  await page.setRequestInterception(true);
  page.on('request', req =>
    ['image', 'font', 'media'].includes(req.resourceType())
      ? req.abort() : req.continue()
  );
  try {
    return await fn(page, url);
  } finally {
    await page.close();
  }
}

// ─────────────────────────────────────────────────────────────────
// MOTOR PRINCIPAL
// ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando atualização de preços — SupliList\n');
  console.log(`📁 dados.json será salvo em: ${DADOS_PATH}\n`);

  // Usa PUPPETEER_EXECUTABLE_PATH se disponível (GitHub Actions)
  const launchOptions = {
    headless: true,
    args: BROWSER_ARGS,
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const browser = await puppeteer.launch(launchOptions);
  const resultados = [];

  for (const produto of PRODUTOS) {
    console.log(`\n📦 [ID ${produto.id}] ${produto.query}`);

    // ML via scraping público
    console.log('  🏪 Mercado Livre...');
    const ml = await comRetry(() => buscarMelhorML(browser, produto));
    if (!ml) console.log('  ❌ ML sem resultado');

    // Shopee via scraping (só se tiver URL definida)
    let sp = null;
    if (produto.shopeeUrl) {
      console.log('  🛍️  Shopee...');
      sp = await comRetry(() => scraperPreco(browser, produto.shopeeUrl, getPrecoShopee));
      console.log(`  ${sp ? `✅ R$${sp}` : '❌ sem resultado'}`);
    }

    // Amazon via scraping (só se tiver URL definida)
    let az = null;
    if (produto.amazonUrl) {
      console.log('  📦 Amazon...');
      az = await comRetry(() => scraperPreco(browser, produto.amazonUrl, getPrecoAmazon));
      console.log(`  ${az ? `✅ R$${az}` : '❌ sem resultado'}`);
    }

    resultados.push({
      id:  produto.id,
      sp:  sp,
      mlp: ml?.preco ?? null,
      azp: az        ?? null,
      ml:  ml?.link  ?? null,
    });

    // Pausa entre produtos para reduzir risco de bloqueio por rate limit
    await sleep(3000);
  }

  await browser.close();

  const output = {
    atualizadoEm: new Date().toISOString(),
    precos: resultados,
  };

  await fs.writeFile(DADOS_PATH, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✅ dados.json salvo em: ${DADOS_PATH}`);
  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
