const FAQ_DATA = [
  {
    category: 'Geral',
    items: [
      {
        q: 'O SupliList é gratuito?',
        a: 'Sim, 100% gratuito. Sem plano pago, sem assinatura oculta, sem anúncios no app. As comissões de afiliados (opcionais) ajudam a manter o projeto.',
      },
      {
        q: 'Preciso criar uma conta?',
        a: 'Não. O SupliList não tem sistema de login. Tudo funciona localmente no seu dispositivo, sem nenhum cadastro.',
      },
      {
        q: 'Funciona sem internet?',
        a: 'Sim. É um PWA (Progressive Web App). Após o primeiro acesso, funciona completamente offline. Você pode instalá-lo na tela inicial do celular como um app nativo.',
      },
    ],
  },
  {
    category: 'Suplementos & Dosagens',
    items: [
      {
        q: 'As dosagens são recomendações médicas?',
        aHtml:
          'NÃO. As dosagens exibidas são baseadas em literatura científica e têm caráter exclusivamente educativo e informativo. Elas não constituem prescrição ou aconselhamento médico. Sempre consulte um médico ou nutricionista antes de iniciar, alterar ou interromper qualquer suplementação. Acesse nosso <a class="faq-link" data-href="#/legal?doc=medico">Aviso Médico</a> completo.',
      },
      {
        q: 'De onde vêm as informações dos suplementos?',
        a: 'De estudos clínicos, revisões sistemáticas e meta-análises publicadas em bases científicas. Cada suplemento possui um Nível de Evidência (A, B ou C) que reflete a robustez das evidências disponíveis.',
      },
      {
        q: 'O que significam os níveis de evidência?',
        a: 'Grau A: evidência forte, múltiplos estudos de alta qualidade confirmam o efeito. Grau B: evidência moderada, estudos sugerem efeito mas com limitações. Grau C: evidência preliminar ou limitada, mais pesquisas necessárias.',
      },
    ],
  },
  {
    category: 'Preços & Compras',
    items: [
      {
        q: 'Os preços são atualizados em tempo real?',
        a: 'Os preços exibidos são referências e podem não refletir o valor atual. Sempre confirme o preço final diretamente no site do vendedor (Amazon, Mercado Livre ou Shopee) antes de comprar.',
      },
      {
        q: 'Vocês ganham comissão nas compras?',
        aHtml:
          'Sim, alguns links são de programas de afiliados (Amazon Associates, ML Afiliados, Shopee Afiliados). Ao comprar por esses links, podemos receber uma pequena comissão, sem nenhum custo adicional para você. Isso ajuda a manter o SupliList gratuito. Veja nossa política completa de <a class="faq-link" data-href="#/legal?doc=afiliados">afiliados</a>.',
      },
    ],
  },
  {
    category: 'Privacidade & Dados',
    items: [
      {
        q: 'Meus dados são seguros?',
        aHtml:
          'Sim. Toda a sua informação (stack, check-ins, perfil) fica armazenada exclusivamente no localStorage do seu navegador. Não possuímos servidores, não coletamos dados pessoais e não temos acesso a nenhuma informação sua. Consulte nossa <a class="faq-link" data-href="#/legal?doc=privacidade">Política de Privacidade</a>.',
      },
      {
        q: 'Como faço backup dos meus dados?',
        aHtml:
          'Acesse <a class="faq-link" data-href="#/settings">Configurações</a> → Dados &amp; Privacidade → Exportar meus dados. Um arquivo JSON com todos os seus dados será baixado para o seu dispositivo.',
      },
      {
        q: 'Como apago tudo?',
        a: 'Acesse Configurações → Dados & Privacidade → Resetar tudo. Atenção: esta ação é irreversível.',
      },
    ],
  },
];

const STYLES = `
.faq-page {
  padding: 24px;
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.faq-header h1 {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
  margin: 0 0 8px;
}

.faq-header p {
  font-size: 15px;
  color: var(--color-text-secondary);
  margin: 0;
}

.faq-search {
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--color-surface-primary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s ease;
}

.faq-search:focus {
  border-color: var(--color-border-strong);
}

.faq-search::placeholder {
  color: var(--color-text-muted);
}

.faq-categories {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.faq-category {
  display: flex;
  flex-direction: column;
}

.faq-category-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin: 24px 0 12px;
}

.faq-item {
  margin-bottom: 8px;
}

.faq-item-btn {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: none;
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
  gap: 12px;
}

.faq-item-btn:hover {
  background: var(--color-surface-primary);
}

.faq-item-icon {
  color: var(--color-brand);
  font-size: 20px;
  font-weight: 400;
  line-height: 1;
  flex-shrink: 0;
}

.faq-item-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.25s ease;
}

.faq-item-body-inner {
  padding: 0 16px 16px;
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.faq-link {
  cursor: pointer;
  color: var(--color-brand);
  font-weight: 600;
  text-decoration: underline;
}

.faq-footer {
  font-size: 13px;
  color: var(--color-text-muted);
  padding-top: 8px;
}

.faq-footer p {
  margin: 0;
}

.faq-footer-link {
  cursor: pointer;
  color: var(--color-brand);
  font-weight: 600;
  text-decoration: underline;
}
`;

export default class FaqPage {
  constructor(container, params) {
    this.container = container;
    this.params = params || {};
    this._onLinkClick = this._onLinkClick.bind(this);
    this._onSearch = this._onSearch.bind(this);
  }

  mount() {
    this._injectStyles();
    this.container.innerHTML = this._render();
    this._bindEvents();
  }

  unmount() {
    this.container.innerHTML = '';
  }

  _injectStyles() {
    if (!document.getElementById('faq-page-styles')) {
      const style = document.createElement('style');
      style.id = 'faq-page-styles';
      style.textContent = STYLES;
      document.head.appendChild(style);
    }
  }

  _render() {
    return `
      <div class="faq-page">
        <div class="faq-header">
          <h1>Perguntas Frequentes</h1>
          <p>Tudo que você precisa saber sobre o SupliList</p>
        </div>

        <input
          type="text"
          class="faq-search"
          placeholder="Buscar pergunta..."
          aria-label="Buscar pergunta"
        />

        <div class="faq-categories">
          ${FAQ_DATA.map((cat, ci) => this._renderCategory(cat, ci)).join('')}
        </div>

        <div class="faq-footer">
          <p>Não encontrou sua resposta? <a class="faq-footer-link" data-href="#/legal">Consulte os Termos de Uso</a></p>
        </div>
      </div>
    `;
  }

  _renderCategory(cat, ci) {
    return `
      <div class="faq-category" data-category-index="${ci}">
        <h2 class="faq-category-label">${this._escapeHtml(cat.category)}</h2>
        ${cat.items.map((item, ii) => this._renderItem(item, ci, ii)).join('')}
      </div>
    `;
  }

  _renderItem(item, ci, ii) {
    const bodyContent = item.aHtml
      ? item.aHtml
      : this._escapeHtml(item.a || '');

    return `
      <div class="faq-item" data-category="${ci}" data-item="${ii}">
        <button
          class="faq-item-btn"
          aria-expanded="false"
          data-ci="${ci}"
          data-ii="${ii}"
        >
          <span class="faq-item-question">${this._escapeHtml(item.q)}</span>
          <span class="faq-item-icon" aria-hidden="true">+</span>
        </button>
        <div class="faq-item-body" id="faq-body-${ci}-${ii}">
          <div class="faq-item-body-inner">${bodyContent}</div>
        </div>
      </div>
    `;
  }

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _bindEvents() {
    const page = this.container.querySelector('.faq-page');

    page.querySelectorAll('.faq-item-btn').forEach(btn => {
      btn.addEventListener('click', () => this._toggleItem(btn));
    });

    page.addEventListener('click', this._onLinkClick);

    const searchInput = page.querySelector('.faq-search');
    searchInput.addEventListener('input', this._onSearch);
  }

  _toggleItem(btn) {
    const ci = btn.dataset.ci;
    const ii = btn.dataset.ii;
    const body = this.container.querySelector(`#faq-body-${ci}-${ii}`);
    const icon = btn.querySelector('.faq-item-icon');
    const isOpen = btn.getAttribute('aria-expanded') === 'true';

    if (isOpen) {
      body.style.maxHeight = '0';
      btn.setAttribute('aria-expanded', 'false');
      icon.textContent = '+';
    } else {
      body.style.maxHeight = body.scrollHeight + 'px';
      btn.setAttribute('aria-expanded', 'true');
      icon.textContent = '−';
    }
  }

  _onLinkClick(e) {
    const link = e.target.closest('.faq-link, .faq-footer-link');
    if (!link) return;
    e.preventDefault();
    const href = link.dataset.href;
    if (href) {
      window.location.hash = href;
    }
  }

  _onSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    const categories = this.container.querySelectorAll('.faq-category');

    categories.forEach(catEl => {
      const items = catEl.querySelectorAll('.faq-item');
      let visibleCount = 0;

      items.forEach(itemEl => {
        const question = itemEl.querySelector('.faq-item-question').textContent.toLowerCase();
        const bodyInner = itemEl.querySelector('.faq-item-body-inner');
        const answer = bodyInner ? bodyInner.textContent.toLowerCase() : '';
        const matches = !query || question.includes(query) || answer.includes(query);

        itemEl.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });

      catEl.style.display = visibleCount > 0 ? '' : 'none';
    });
  }
}
