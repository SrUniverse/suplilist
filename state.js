// ══════════════════════════════════════════════════════════════
// state.js — Camada de Estado e Persistência (SRP)
// Responsabilidade: Definição de S, persistência em localStorage,
//                   sincronização e migrações de schema.
//
// ⚠️  DEPENDÊNCIAS (devem ser carregados ANTES no HTML):
//       1. database.js  →  APP_VERSION, IT
//
// Expõe globalmente: S, STORAGE_KEY, save, syncNow, load, runMigrations
// ══════════════════════════════════════════════════════════════


import { APP_VERSION, IT } from './database.js';
import { t } from './lang.js';

// ─────────────── CHAVE DE ARMAZENAMENTO ───────────────
// Constante usada em todo o sistema para ler/escrever no localStorage.
// Definida aqui (e não em database.js) porque pertence à camada de
// persistência, não à camada de dados de domínio.
export const STORAGE_KEY = 'suplilist_v3';


// ─────────────── ESTADO GLOBAL (S) ───────────────
// Única fonte de verdade do estado de runtime da aplicação.
// Nunca inicializar com valores derivados de IT ou STUDIES aqui;
// a população inicial com dados demo é feita em scripts.js (DOMContentLoaded).
let _S = {
  version:   null,
  demoMode:  false,
  lang:      'pt-BR',
  ui:        { seenTooltips: {} },

  // Coleções do utilizador
  checked:   {},
  open:      {},
  notes:     {},
  wishlist:  {},
  stack:     {},
  stackA:    [],
  stackB:    [],

  // Filtros e navegação
  tab:         'lista',
  cat:         'Todos',
  goal:        '',
  showDone:    true,
  showExtra:   true,
  goalFilter:  '',
  priceFilter: '',

  // Seleções e histórico
  cmpSel:      [],
  quickCmpSel: [], // [FIX] Garantido no estado padrão para evitar crash em togQuickCmp
  rSel:       [],
  history:    [],
  cycleStart: {},
  cycleNote:  {},
  cyclePause: {},

  // Configurações do utilizador
  cfg: {
    isAdmin:        false,
    showStars:      true,
    showPdose:      true,
    showTooltips:   true,
    confetti:       true,
    theme:          'theme-dark',
    delay:          280,
    alertInteractions: true,
    alertCycles:    true,
    toasts:         true,
    autoHistory:    true,
    expandOnClick:  true,
    confirmUncheck: false,
    autoSync:       true,
    defaultSort:    'priority',
  },

  lastSave: null,
};

/**
 * Proxy de Estado para garantir que toda mutação dispare persistência
 * e que leituras retornem clones, impedindo mutação direta via referência.
 */
export const S = new Proxy(_S, {
  get(target, prop) {
    const val = target[prop];
    if (typeof val === 'object' && val !== null) {
      return Array.isArray(val) ? [...val] : { ...val };
    }
    return val;
  },
  set(target, prop, value) {
    target[prop] = value;
    if (target.cfg?.autoSync) save();
    return true;
  }
});


// ─────────────── VARIÁVEIS INTERNAS DE RUNTIME ───────────────
// Prefixo "_" indica uso interno desta camada apenas.
let _syncDebounceTimer = null;
let _syncStatus        = 'idle';

// Variáveis de UI/interação que não pertencem ao estado persistido.
// Ficam aqui por serem inicializadas junto com o módulo de estado.
let _confDone    = false;
let _stickyItem  = null;

// Instância do motor de busca fuzzy (inicializada em scripts.js após load()).
let fuse = null;


// ══════════════════════════════════════════════════════════════
// SISTEMA DE SINCRONIZAÇÃO
// ══════════════════════════════════════════════════════════════

/**
 * Atualiza os indicadores visuais de sincronização no DOM.
 * @param {'idle'|'pending'|'syncing'|'done'|'error'} status
 * @param {string} msg - Texto a exibir nos elementos de último salvamento.
 */
function _setSyncUI(status, msg) {
  _syncStatus = status;

  // Elementos simples de texto
  [
    document.getElementById('ls'),
    document.getElementById('last-save'),
  ]
    .filter(Boolean)
    .forEach(el => { el.textContent = msg; });

  // Elemento composto (ls2 tem <span> filho)
  const ls2 = document.getElementById('ls2');
  if (ls2) {
    const txt = ls2.querySelector('span:last-child');
    if (txt) txt.textContent = msg;
  }

  // Indicador de ponto de status
  const indicator = document.getElementById('sync-indicator');
  if (indicator) {
    indicator.className = 'sync-dot';
    if (status === 'syncing') indicator.classList.add('syncing');
    else if (status === 'done')    indicator.classList.add('done');
    else if (status === 'error')   indicator.classList.add('error');
    else if (status === 'pending') indicator.classList.add('pending');
  }
}

/**
 * Executa a escrita imediata no localStorage.
 * Chamada internamente pelo debounce de save() e diretamente por syncNow().
 * @returns {boolean} True se persistido com sucesso, False em caso de erro.
 */
function _doSave() {
  _setSyncUI('syncing', t('STATUS_SAVING'));
  S.lastSave = new Date().toISOString();
  S.version  = APP_VERSION; // Persiste a versão para validação de migração futura

  try {
    // SL-24: Serialização segura para evitar travamentos em estados corrompidos
    const data = JSON.stringify(S);
    
    localStorage.setItem(STORAGE_KEY, data);
    
    const msg = t('STATUS_SAVED') + ' ' + new Date(S.lastSave).toLocaleTimeString('pt-BR');
    _setSyncUI('done', msg);
    return true;

  } catch (e) {
    // SL-04: Detecção robusta de QuotaExceededError para resiliência cross-browser
    const isQuotaExceeded = (
      e instanceof DOMException && (
        e.code === 22 || // Chrome, Safari, Opera
        e.code === 1014 || // Firefox legado
        e.name === 'QuotaExceededError' || // Padrão W3C
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' // Firefox
      )
    );

    if (isQuotaExceeded) {
      console.error(`[Storage] Limite de cota excedido para "${STORAGE_KEY}". O estado atual não pôde ser persistido.`, e);
      _setSyncUI('error', t('ERROR_SAVE_FULL'));
      setTimeout(() => _setSyncUI('idle', t('STATUS_SAVED')), 5000); // Auto-reset do erro após 5s
      // GANCHO PARA UI: Notifica o usuário sobre o problema específico de espaço
      if (typeof toast === 'function') {
        toast('💾', 'Memória cheia! Tente apagar o histórico ou notas para continuar salvando.', 'error', { duration: 7000 });
      }
    } else {
      console.error('[Storage] Erro inesperado ao acessar localStorage:', e);
      _setSyncUI('error', 'Erro ao salvar localmente');
      if (typeof toast === 'function') {
        toast('⚠️', t('ERROR_SAVE_FULL'), 'error', { duration: 4000 });
      }
    }
    return false;
  }
}

/**
 * Agenda um salvamento com debounce de 600ms.
 * Usar em alterações frequentes (checkboxes, notas, filtros).
 */
export function save() {
  _setSyncUI('pending', 'Aguardando salvamento…');
  clearTimeout(_syncDebounceTimer);
  _syncDebounceTimer = setTimeout(_doSave, 600);
}

/**
 * Força salvamento imediato, ignorando o debounce.
 * Usar em ações explícitas do utilizador (botão "Sincronizar agora").
 * @returns {boolean} Status da operação de escrita.
 */
export function syncNow() {
  clearTimeout(_syncDebounceTimer);
  const success = _doSave();
  if (success) {
    console.info(`[Sync] Sincronização manual executada na versão ${APP_VERSION}`);
    if (typeof toast === 'function') toast('Copiado com sucesso! ✅', 'success');
  }
  return success;
}


// ══════════════════════════════════════════════════════════════
// MIGRAÇÕES DE SCHEMA
// ══════════════════════════════════════════════════════════════

/**
 * Transforma dados de schemas antigos para o schema atual.
 * Adicionar cases aqui a cada breaking change de estrutura de S.
 *
 * @param {Object} d      - Dados brutos vindos do localStorage.
 * @param {string} oldV   - Versão salva em disco.
 * @param {string} newV   - APP_VERSION atual (definida em database.js).
 * @returns {Object|null} - Dados migrados, ou null para forçar reset total.
 *
 * @example
 * // Exemplo de migração futura:
 * // if (oldV === '14.0') { d.novaColecao = {}; }
 * // if (oldV === '15.0') { delete d.campoObsoleto; }
 */
export function runMigrations(d, oldV, newV) {
  // Por padrão mantém os dados — evita resets em atualizações menores.
  // Adicionar lógica condicional aqui quando o schema de S mudar.
  return d;
}

// ══════════════════════════════════════════════════════════════
// VALIDAÇÃO DE INTEGRIDADE (TYPE GUARDS)
// ══════════════════════════════════════════════════════════════

/**
 * Valida a integridade dos tipos e estrutura básica do objeto de dados.
 * [SL-26] Previne quebras em tempo de execução causadas por dados corrompidos.
 * @param {any} data - Dados brutos vindos do JSON.parse.
 * @returns {boolean} True se o schema for válido.
 */
function _isSchemaValid(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

  // Definição dos tipos esperados para propriedades críticas
  const expectedObjects = ['checked', 'open', 'notes', 'wishlist', 'stack', 'cfg', 'ui', 'cycleStart', 'cycleNote', 'cyclePause'];
  const expectedArrays = ['cmpSel', 'quickCmpSel', 'rSel', 'history'];

  // Validação de Objetos
  for (const key of expectedObjects) {
    if (data[key] !== undefined && (typeof data[key] !== 'object' || data[key] === null || Array.isArray(data[key]))) {
      console.warn(`[Storage] Schema corrompido: "${key}" deve ser Object.`);
      return false;
    }
  }

  // Validação de Arrays
  for (const key of expectedArrays) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      console.warn(`[Storage] Schema corrompido: "${key}" deve ser Array.`);
      return false;
    }
  }

  return true;
}


// ══════════════════════════════════════════════════════════════
// CARREGAMENTO E MERGE DO ESTADO
// ══════════════════════════════════════════════════════════════

/**
 * Lê o estado do localStorage, executa migrações se necessário,
 * e faz merge seguro em S (preservando defaults para campos ausentes).
 * Deve ser chamada UMA vez, no DOMContentLoaded de scripts.js.
 */
export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return; // Primeira visita — S mantém os defaults definidos acima

    const d = JSON.parse(raw);

    // [SL-26] Validação de integridade antes do processamento
    if (!_isSchemaValid(d)) {
      console.error('[Storage] Falha crítica de integridade no localStorage. Utilizando fallback (estado limpo).');
      if (typeof toast === 'function') toast('⚠️', 'Dados corrompidos detectados. O sistema foi restaurado para o padrão.', 'warn', { duration: 6000 });
      return; // Interrompe o carregamento e mantém S com os defaults definidos no topo do arquivo.
    }

    // Validação de integridade: detectar IDs duplicados no banco
    if (d.version === APP_VERSION) {
      const ids       = IT.map(i => i.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        console.error('🚨 [Data] IDs duplicados detectados no banco de dados!');
      }
    }

    // Migração de schema se a versão salva divergir da atual
    const savedVersion = d.version || '0';
    const dataToLoad   = (savedVersion !== APP_VERSION)
      ? runMigrations(d, savedVersion, APP_VERSION)
      : d;

    if (dataToLoad) {
      // Merge seguro: percorre as chaves de S para preservar a estrutura
      // e apenas substitui o que existir em dataToLoad com valor não-nulo.
      Object.keys(S).forEach(key => {
        if (dataToLoad[key] !== undefined && dataToLoad[key] !== null) {
          if (typeof S[key] === 'object' && !Array.isArray(S[key])) {
            // Merge profundo para objetos (cfg, ui, cycleStart, etc.)
            S[key] = { ...S[key], ...dataToLoad[key] };
          } else {
            S[key] = dataToLoad[key];
          }
        }
      });

      // Guardas de tipo para coleções críticas (defesa contra corrupção)
      if (!S.stack   || typeof S.stack   !== 'object') S.stack   = {};
      if (!S.checked || typeof S.checked !== 'object') S.checked = {};
      if (!S.ui.seenTooltips)                          S.ui.seenTooltips = {};
    }

  } catch(e) {
    console.error('[Storage] Erro ao carregar estado:', e);
  }

  // Garantias pós-load: campos adicionados em versões mais novas
  // que podem estar ausentes em estados antigos
  if (!S.cycleStart)    S.cycleStart    = {};
  if (!S.cycleNote)     S.cycleNote     = {};
  if (!S.cyclePause)    S.cyclePause    = {};
  if (!S.rSel)          S.rSel          = [];
  if (!S.cmpSel)        S.cmpSel        = [];
  if (!S.history)       S.history       = [];
  if (!S.stackA)        S.stackA        = [];
  if (!S.stackB)        S.stackB        = [];
  if (!S._customCycles) S._customCycles = [];
}


// ══════════════════════════════════════════════════════════════
// API DE MUTAÇÃO DE ESTADO (State Mutation API)
//
// Todas as alterações às coleções de itens do utilizador devem passar
// por estas funções. Benefícios:
//   • Ponto único de mutação → rastreamento de bugs trivial.
//   • save() garantido após cada alteração → sem risco de esquecer.
//   • scripts.js lê S mas nunca escreve diretamente nas coleções abaixo.
//
// Coleções geridas aqui: checked, open, notes, wishlist.
// Coleções NÃO geridas aqui (lógica complexa permanece em scripts.js):
//   stack, history, cmpSel, rSel, cycleStart, cyclePause, cycleNote,
//   _customCycles — estas têm operações específicas (delete, push,
//   filter, splice) que ficam melhor encapsuladas nas suas próprias
//   funções de domínio em scripts.js.
// ══════════════════════════════════════════════════════════════

/**
 * Alterna o estado de "comprado" de um item.
 * @param {number} id - ID do suplemento.
 * @returns {boolean} Novo valor de checked para o id.
 */
export function toggleItemCheck(id) {
  const current = S.checked;
  current[id] = !current[id];
  S.checked = current; // Dispara o Proxy.set para persistência
  return !!S.checked[id];
}

/**
 * Define o estado de "comprado" de um item explicitamente.
 * Útil para operações em lote (checkAll, importJSON).
 * @param {number} id    - ID do suplemento.
 * @param {boolean} val  - true = comprado, false = pendente.
 */
export function setItemCheck(id, val) {
  const current = S.checked;
  current[id] = !!val;
  S.checked = current;
}

/**
 * Substitui todo o objeto checked de uma vez (undo/redo em lote).
 * @param {Object} snapshot - Cópia prévia de S.checked.
 */
export function setCheckedAll(snapshot) {
  S.checked = snapshot;
  save();
}

/**
 * Marca todos os itens como comprados.
 * Retorna snapshot anterior para possível undo.
 * @returns {Object} Snapshot de S.checked antes da operação.
 */
export function checkAllItems() {
  const prev = { ...S.checked };
  const next = {};
  IT.forEach(i => { next[i.id] = true; });
  S.checked = next;
  return prev;
}

/**
 * Desmarca todos os itens (reseta checklist).
 * Retorna snapshot anterior para possível undo.
 * @returns {Object} Snapshot de S.checked antes da operação.
 */
export function uncheckAllItems() {
  const prev = { ...S.checked };
  S.checked = {};
  save();
  return prev;
}

/**
 * Alterna o estado de expansão (accordion) de um card de item.
 * @param {number} id - ID do suplemento.
 * @returns {boolean} Novo valor de open para o id.
 */
export function toggleItemOpen(id) {
  const current = S.open;
  current[id] = !current[id];
  S.open = current; // Garante que a mutação seja detectada pelo Proxy
  return !!S.open[id];
}

/**
 * Atualiza a nota de um item sem forçar save imediato.
 * Usar em handlers de input (oninput) — o save é gerido pelo autoSync.
 * Quando autoSync está ativo, agenda o debounce de save().
 * @param {number|string} id    - ID do suplemento.
 * @param {string}        text  - Conteúdo da nota.
 */
export function setItemNote(id, text) {
  const current = S.notes;
  current[id] = text;
  S.notes = current;
}

/**
 * Persiste a nota de um item imediatamente (ex: botão 💾 ou blur).
 * @param {number|string} id    - ID do suplemento.
 * @param {string}        text  - Conteúdo final da nota.
 */
export function saveItemNote(id, text) {
  const current = S.notes;
  current[id] = text;
  S.notes = current;
}

/**
 * Alterna o estado de favorito (wishlist) de um item.
 * @param {number} id - ID do suplemento.
 * @returns {boolean} Novo valor de wishlist para o id.
 */
export function toggleItemWishlist(id) {
  const current = S.wishlist;
  current[id] = !current[id];
  S.wishlist = current;
  return !!S.wishlist[id];
}

/**
 * Substitui todo o objeto wishlist de uma vez (undo/redo em lote).
 * @param {Object} snapshot - Cópia prévia de S.wishlist.
 */
export function setWishlistAll(snapshot) {
  S.wishlist = snapshot;
  save();
}
