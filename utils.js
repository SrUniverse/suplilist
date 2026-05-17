// ══════════════════════════════════════════════════════════════
// js/utils.js — Utilitários Puros
// Funções sem dependência de estado ou DOM pesado.
// Importado por quase todos os outros módulos.
// ══════════════════════════════════════════════════════════════

// ── Escape XSS ────────────────────────────────────────────────
const _ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };

/**
 * Escapa caracteres perigosos de uma string para injeção segura em innerHTML.
 * @param {*} str
 * @returns {string}
 */
export function escapeHTML(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, c => _ESC_MAP[c]);
}

// ── Empty State HTML ──────────────────────────────────────────
/**
 * Gera o HTML padronizado para estados vazios (Empty States).
 */
export function emptyStateHTML(ico, title, sub, btnLabel, btnFn) {
  return `<div class="empty">
    <div class="empty-ico">${ico}</div>
    <div class="empty-title">${title}</div>
    <p class="empty-sub">${sub}</p>
    ${btnLabel ? `<button class="empty-action" onclick="${btnFn}">${btnLabel}</button>` : ''}
  </div>`;
}

// ── File Download ─────────────────────────────────────────────
/**
 * Executa o download de um arquivo de forma segura e resiliente.
 * [SL-15] Implementa tratamento de exceções e limpeza de memória.
 */
export function dl(content, fileName, mimeType) {
  let url = null;
  try {
    if (content === null || content === undefined) throw new Error('Conteúdo inválido para download.');

    const blob = new Blob([content], { type: mimeType });
    url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    console.error('[Download] Erro ao gerar stream de dados:', error);
    throw error; // Propaga para o chamador tratar a UI
  } finally {
    if (url) {
      // Revoga o objeto URL após um curto delay para evitar memory leaks (SL-15)
      setTimeout(() => URL.revokeObjectURL(url), 250);
    }
  }
}

// ── Currency Formatter ────────────────────────────────────────
export function fmtR(v) { return 'R$ ' + v.toFixed(2).replace('.', ','); }

// ── Confetti ──────────────────────────────────────────────────
export function confetti(toastFn) {
  const cols = ['#4edd9a', '#4da6ff', '#a78bfa', '#f472b6', '#f5a623', '#fff'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'cf';
    el.style.cssText = `left:${Math.random() * 100}vw;background:${cols[~~(Math.random() * cols.length)]};animation-duration:${2 + Math.random() * 2}s;animation-delay:${Math.random() * .6}s;width:${6 + Math.random() * 7}px;height:${6 + Math.random() * 7}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }
  if (toastFn) toastFn('🎉', 'Lista 100% completa!', 'success', {
    title: 'Parabéns! 🏆',
    sub: 'Todos os suplementos foram comprados.',
    duration: 5000,
  });
}

// ── Toast ─────────────────────────────────────────────────────
/**
 * Exibe uma notificação toast.
 * Assinatura: toast(ico, msg, type?, opts?)
 */
export function toast(ico, msg, type, opts) {
  // Retrocompatibilidade: toast(msg, type) sem ícone
  if (typeof msg !== 'string' || (typeof msg === 'string' && typeof type !== 'string' && typeof type !== 'undefined' && typeof type !== 'object')) {
    opts  = undefined;
    type  = typeof msg === 'string' ? msg : 'info';
    msg   = typeof ico === 'string' ? ico : '';
    ico   = '';
  }
  type = type || 'info';
  opts = opts || {};
  const duration = opts.duration || 3200;

  const container = document.getElementById('toast-container');
  if (!container) return;

  const t = document.createElement('div');
  t.className = 'toast ' + type + ' in';

  let inner = '';
  if (opts.title) inner += `<div class="toast-title">${opts.title}</div>`;
  inner += `<div class="toast-body">`;
  if (ico) inner += `<span class="toast-ico">${ico}</span>`;
  inner += `<span class="toast-msg">${msg}</span>`;
  if (opts.sub) inner += `<span class="toast-sub">${opts.sub}</span>`;
  inner += `</div>`;
  if (opts.undo) {
    inner += `<button class="toast-undo" onclick="(${opts.undo.toString()})();this.closest('.toast').remove()">Desfazer</button>`;
  }
  inner += `<button class="toast-close" onclick="dismissToast(this.parentElement)" aria-label="Fechar">✕</button>`;
  if (opts.progress !== false) {
    inner += `<div class="toast-progress" style="animation-duration:${duration}ms"></div>`;
  }

  t.innerHTML = inner;
  container.appendChild(t);
  t._timer = setTimeout(() => dismissToast(t), duration);
  return t;
}

export function dismissToast(t) {
  if (!t || !t.isConnected) return;
  clearTimeout(t._timer);
  t.classList.remove('in');
  t.classList.add('out');
  setTimeout(() => t.remove(), 250);
}

/**
 * Função de asserção para testes unitários internos.
 * @param {any} actual - Valor obtido
 * @param {any} expected - Valor esperado
 * @param {string} message - Descrição do teste
 * @returns {boolean}
 */
export function assertEquals(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const passed = a === e;
  if (!passed) {
    const errorDetail = `Esperado: ${e} | Obtido: ${a}`;
    console.error(`❌ [FAIL] ${message}\n${errorDetail}`);
    _persistLog(`FAIL: ${message} (${errorDetail})`);
  } else {
    console.log(`✅ [PASS] ${message}`);
  }
  return passed;
}

const QA_LOGS_KEY = 'suplilist_qa_logs';

function _persistLog(msg) {
  try {
    const logs = JSON.parse(localStorage.getItem(QA_LOGS_KEY) || '[]');
    logs.unshift({ date: new Date().toISOString(), msg });
    if (logs.length > 30) logs.pop(); // Mantém apenas os últimos 30 erros para economizar espaço
    localStorage.setItem(QA_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {}
}

export function getPersistedLogs() {
  try {
    return JSON.parse(localStorage.getItem(QA_LOGS_KEY) || '[]');
  } catch (e) { return []; }
}

export function clearPersistedLogs() {
  localStorage.removeItem(QA_LOGS_KEY);
}

// ── Confirm Modal ─────────────────────────────────────────────

/** 
 * Flag de controle de concorrência para evitar múltiplas instâncias 
 * ou colisões durante animações de entrada/saída.
 */
let _modalLock = false;

export function confirmModal(opts) {
  // SL-07: Ignora chamadas se uma transição já estiver em curso
  if (_modalLock) return Promise.resolve(false);

  // Limpeza de segurança: remove instâncias órfãs que possam ter ficado no DOM
  const orphan = document.querySelector('.confirm-overlay');
  if (orphan) orphan.remove();

  return new Promise(resolve => {
    _modalLock = true;

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-title" style="color:${opts.danger ? 'var(--red)' : (opts.okColor || 'var(--accent)')}">${opts.title}</div>
        <div class="confirm-msg">${opts.msg}</div>
        <div class="confirm-actions">
          <button class="btn m-btn-cancel">${opts.cancelLabel || 'Cancelar'}</button>
          <button class="btn bg m-btn-ok" style="background:${opts.okColor || (opts.danger ? 'var(--red)' : 'var(--accent)')}; color:#000">${opts.okLabel || 'Confirmar'}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // Aciona transição de entrada (CSS .confirm-overlay.in)
    requestAnimationFrame(() => overlay.classList.add('in'));

    /**
     * Executa o encerramento do modal de forma resiliente.
     */
    const close = (result) => {
      // Cláusula de guarda para evitar múltiplas execuções no mesmo ciclo
      if (!overlay.classList.contains('in')) return;
      
      overlay.classList.remove('in');
      overlay.classList.add('out');

      // Aguarda o término da animação CSS antes de limpar o DOM
      setTimeout(() => {
        if (overlay && overlay.isConnected) {
          overlay.remove();
        }
        _modalLock = false;
        resolve(result);
      }, 250);
    };

    // SL-07: Uso de Scoped Selectors para evitar colisões de ID globais
    const btnOk = overlay.querySelector('.m-btn-ok');
    const btnCancel = overlay.querySelector('.m-btn-cancel');

    if (btnOk) btnOk.onclick = () => close(true);
    if (btnCancel) btnCancel.onclick = () => close(false);
  });
}

/**
 * Cria uma função debounced que adia a execução da lógica até que um
 * tempo de espera tenha passado desde a última vez que foi invocada.
 * @param {Function} fn - Callback a ser executado.
 * @param {number} wait - Tempo de espera em ms (default 150ms).
 */
export function debounce(fn, wait = 150) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}
