/**
 * price-loader.js
 *
 * Cole este arquivo na pasta js/ do seu projeto.
 *
 * Busca o dados.json gerado pelo updater.js e sobrescreve
 * os campos pm, mlp e azp de cada suplemento no array global
 * antes do site renderizar qualquer coisa.
 *
 * COMO USAR:
 * No seu main.js (ou onde o site inicializa), chame:
 *
 *   import { aplicarPrecos } from './price-loader.js';
 *   await aplicarPrecos(SUPPLEMENTS); // passe o seu array de suplementos
 *
 * A função modifica o array in-place. Depois disso, renderize normalmente.
 *
 * IMPORTANTE — tipo do campo `id`:
 * O Map usa o id como chave. O updater.js salva ids como números (1, 2, 3...).
 * Se o seu database.js também usa números, tudo certo.
 * Se usa strings ('1', '2', '3'), o lookup vai falhar silenciosamente.
 * A função aplicarPrecos() normaliza os dois para string automaticamente.
 */

const CACHE_KEY = 'suplilist_precos_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hora em ms

/**
 * Tenta carregar o dados.json.
 * Usa cache no localStorage para não bater no servidor a cada visita.
 */
async function carregarPrecos() {
  // Verifica cache válido
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        console.log('[SupliList] Preços carregados do cache local.');
        return data;
      }
    }
  } catch {
    // Cache corrompido ou ausente — segue para busca no servidor
  }

  // Busca do servidor
  try {
    const res = await fetch('./dados.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // FIX: envolve o setItem em try/catch separado para não perder `data`
    // caso o localStorage esteja cheio (QuotaExceededError)
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), data })
      );
    } catch (storageErr) {
      console.warn('[SupliList] Não foi possível salvar cache:', storageErr.message);
      // Continua normalmente — os preços ainda serão aplicados nesta sessão
    }

    console.log('[SupliList] Preços atualizados do servidor:', data.atualizadoEm);
    return data;
  } catch (err) {
    console.warn('[SupliList] Não foi possível carregar dados.json:', err.message);
    return null;
  }
}

/**
 * Aplica os preços do dados.json no array de suplementos.
 * Só sobrescreve campos que vieram com valor (não nulos).
 * Se o fetch falhar, os preços hardcoded do database.js continuam valendo.
 *
 * @param {Array} suplementos - O array de suplementos do database.js
 */
export async function aplicarPrecos(suplementos) {
  const dados = await carregarPrecos();
  if (!dados?.precos) return; // Sem dados = mantém os hardcoded

  // FIX: normaliza o id para string nos dois lados para garantir o lookup,
  // independente de o database.js e o updater.js usarem número ou string.
  const mapa = new Map(dados.precos.map(p => [String(p.id), p]));

  let atualizados = 0;

  for (const sup of suplementos) {
    const novo = mapa.get(String(sup.id));
    if (!novo) continue;

    if (novo.sp != null) sup.pm = novo.sp;   // Shopee → preço base
    if (novo.mlp != null) sup.mlp = novo.mlp;  // Mercado Livre preço
    if (novo.azp != null) sup.azp = novo.azp;  // Amazon preço
    if (novo.ml != null) sup.ml = novo.ml;   // ML link atualizado (melhor produto + afiliado)
    if (novo.shopee != null) sup.shopee = novo.shopee; // Shopee link atualizado (busca/afiliado)
    if (novo.az != null) sup.az = novo.az;   // Amazon link atualizado (busca/afiliado)

    atualizados++;
  }

  console.log(`[SupliList] ${atualizados} suplemento(s) com preço atualizado.`);
}

/**
 * Limpa o cache manualmente (útil para debug ou botão "atualizar").
 */
export function limparCachePrecos() {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('[SupliList] Cache de preços limpo.');
  } catch {
    // localStorage pode não estar disponível em alguns contextos (SSR, etc.)
  }
}
