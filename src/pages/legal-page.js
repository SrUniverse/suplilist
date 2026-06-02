const TABS = [
  { key: 'termos', label: 'Termos de Uso' },
  { key: 'privacidade', label: 'Privacidade (LGPD)' },
  { key: 'medico', label: 'Aviso Médico' },
  { key: 'afiliados', label: 'Afiliados' },
];

const DOC_TO_INDEX = { termos: 0, privacidade: 1, medico: 2, afiliados: 3 };

const LAST_UPDATED = '<p class="lg-updated">Última atualização: Junho de 2026 (Sprint 23 Analytics)</p>';

const TAB_CONTENTS = [
  // 0 — Termos de Uso
  `${LAST_UPDATED}
  <h3>1. Aceitação dos Termos</h3>
  <p>Ao acessar ou utilizar o SupliList, você concorda com estes Termos de Uso. Se não concordar, não utilize o serviço.</p>

  <h3>2. Descrição do Serviço</h3>
  <p>O SupliList é uma plataforma educativa de informações sobre suplementação alimentar, comparação de preços e organização pessoal de protocolos. O serviço NÃO constitui serviço médico, farmacêutico ou nutricional.</p>

  <h3>3. Uso Adequado</h3>
  <p>Você se compromete a utilizar o SupliList exclusivamente para fins pessoais e lícitos, em conformidade com a legislação brasileira aplicável.</p>

  <h3>4. Dados do Usuário e Analytics</h3>
  <p>O SupliList utiliza um sistema de analytics on-device que coleta dados completamente anonimizados, armazenados apenas no seu navegador. Nenhum dado pessoal é transmitido para servidores externos. O sistema de analytics pode ser desabilitado a qualquer momento em Configurações → Privacidade. Você pode exportar ou deletar todos os seus dados a qualquer momento. Consulte nossa <strong>Política de Privacidade (LGPD)</strong> para detalhes completos.</p>

  <h3>5. Isenção de Responsabilidade</h3>
  <p>As informações disponibilizadas têm caráter estritamente educativo e informativo. O SupliList não se responsabiliza por quaisquer decisões de saúde tomadas com base nas informações do aplicativo. Consulte sempre um profissional de saúde habilitado antes de iniciar, alterar ou interromper qualquer suplementação ou tratamento.</p>

  <h3>6. Propriedade Intelectual</h3>
  <p>O nome SupliList, logotipo, design, conteúdo editorial e código-fonte são de propriedade exclusiva do SupliList, protegidos pela legislação de direitos autorais (Lei nº 9.610/98) e de propriedade industrial (Lei nº 9.279/96).</p>

  <h3>7. Links de Terceiros</h3>
  <p>O SupliList pode conter links para sites de terceiros (Amazon, Mercado Livre, Shopee). Não nos responsabilizamos pelo conteúdo, preços, disponibilidade ou práticas de privacidade desses sites.</p>

  <h3>8. Modificações</h3>
  <p>Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações significativas serão comunicadas na plataforma. O uso continuado após as alterações constitui aceitação dos novos termos.</p>

  <h3>9. Legislação Aplicável</h3>
  <p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca do domicílio do usuário para dirimir quaisquer controvérsias.</p>

  <h3>10. Contato</h3>
  <p>E-mail: contato@suplilist.com</p>`,

  // 1 — Privacidade (LGPD)
  `${LAST_UPDATED}
  <p class="lg-subtitle">Como tratamos (ou melhor: não tratamos) seus dados.</p>

  <h3>1. Nosso Compromisso com a Privacidade</h3>
  <p>O SupliList foi construído com o princípio de privacy-by-design. Nossa arquitetura foi deliberadamente projetada para eliminar a necessidade de coletar, transmitir ou armazenar dados pessoais em servidores.</p>

  <h3>2. Quais Dados Coletamos</h3>
  <p>Nenhum dado pessoalmente identificável (email, telefone, endereço, IP) é coletado ou transmitido. Todas as informações que você insere no SupliList (stack de suplementos, check-ins, perfil biométrico, preferências) ficam armazenadas exclusivamente no localStorage do seu navegador, no seu próprio dispositivo.</p>

  <h3>2.1. Analytics On-Device (Anônimo)</h3>
  <p>O SupliList inclui um sistema de analytics on-device que coleta dados <strong>completamente anonimizados</strong>, armazenados localmente no seu navegador. Este sistema:</p>
  <ul style="margin: 8px 0 12px 24px; color: var(--color-text-secondary);">
    <li><strong>Não armazena IDs de usuário</strong> — usa fingerprints criptográficas anônimas</li>
    <li><strong>Não transmite dados</strong> — tudo fica no seu dispositivo (IndexedDB)</li>
    <li><strong>Não coleta PII</strong> — nenhum email, telefone, ou dados pessoais</li>
    <li><strong>É totalmente transparente</strong> — você pode visualizar, exportar ou deletar dados em Configurações</li>
  </ul>
  <p><strong>O que este sistema coleta:</strong> Eventos anônimos (check-ins, visualizações, alterações no stack), métricas agregadas (usuários ativos, retenção), dispositivo/navegador (Chrome, Firefox, etc.), fuso horário e idioma. <strong>Nada disso sai do seu navegador.</strong></p>
  <p><strong>Como desabilitar:</strong> Configurações → Privacidade → Desabilitar analytics. Dados históricos podem ser deletados em Configurações → Resetar dados.</p>

  <h3>3. Base Legal (Lei nº 13.709/2018 — LGPD)</h3>
  <p>Como os dados estão no seu dispositivo e nenhum dado pessoal é transmitido para controladores externos, a LGPD, em seus aspectos relacionados ao controlador de dados, não se aplica diretamente. Você é o único controlador dos seus próprios dados. O SupliList atua como mero fornecedor de software local.</p>

  <h3>4. Cookies e Rastreamento</h3>
  <p>Não utilizamos cookies de rastreamento, pixels de marketing, ferramentas de analytics invasivas (Google Analytics, Facebook Pixel, Hotjar, etc.) ou qualquer outro mecanismo de rastreamento de comportamento externo. O sistema de analytics local é transparente e anonimizado.</p>

  <h3>5. Seus Direitos (Art. 18, LGPD)</h3>
  <p>Como seus dados estão no seu dispositivo, você já tem controle total: Acesso: visualize seus dados a qualquer momento no app. Exportação: Configurações → Exportar meus dados. Exclusão: Configurações → Resetar tudo.</p>

  <h3>6. Compartilhamento de Dados</h3>
  <p>Não compartilhamos dados com terceiros. Simplesmente não temos acesso a eles.</p>

  <h3>7. Segurança</h3>
  <p>A ausência de transmissão de dados elimina o risco de vazamento em servidores. Recomendamos proteger seu dispositivo com senha/biometria.</p>

  <h3>8. Menores de Idade</h3>
  <p>O SupliList não é direcionado a pessoas menores de 18 anos e não coleta intencionalmente dados de crianças ou adolescentes.</p>

  <h3>9. Encarregado de Dados (DPO)</h3>
  <p>Para questões relacionadas à privacidade: dpo@suplilist.com</p>`,

  // 2 — Aviso Médico
  `${LAST_UPDATED}
  <div class="lg-medical-banner">
    ⚕️ IMPORTANTE: O SupliList é uma ferramenta educativa e NÃO substitui, em nenhuma hipótese, consulta, diagnóstico ou tratamento médico, nutricional ou farmacêutico.
  </div>

  <h3>1. Finalidade Educativa</h3>
  <p>Todas as informações sobre suplementos, dosagens, evidências científicas e protocolos disponíveis no SupliList têm caráter exclusivamente educativo e informativo. O aplicativo NÃO é um serviço de saúde.</p>

  <h3>2. Consulta Profissional Obrigatória</h3>
  <p>Antes de iniciar, alterar ou interromper qualquer suplementação, consulte obrigatoriamente um médico, nutricionista ou profissional de saúde habilitado pelo respectivo conselho (CRM, CRN, CFF). Sua condição de saúde individual pode diferir significativamente das referências populacionais utilizadas na plataforma.</p>

  <h3>3. Dosagens como Referência</h3>
  <p>As dosagens exibidas são baseadas em estudos clínicos e literatura científica de referência, para fins informativos. Elas NÃO levam em conta suas condições individuais de saúde, interações medicamentosas, contraindicações específicas ou histórico clínico pessoal.</p>

  <h3>4. Ausência de Diagnóstico</h3>
  <p>O SupliList não diagnostica, trata, cura, previne ou mitiga nenhuma doença, condição de saúde ou distúrbio. Qualquer interpretação nesse sentido é incorreta.</p>

  <h3>5. Populações de Atenção Especial</h3>
  <p>Gestantes, lactantes, crianças, adolescentes, idosos e pessoas com doenças crônicas (cardiovasculares, renais, hepáticas, autoimunes, etc.) ou em uso de medicamentos devem ter atenção redobrada e NUNCA iniciar suplementação sem orientação médica especializada.</p>

  <h3>6. Reações Adversas</h3>
  <p>Em caso de qualquer reação adversa após o uso de suplementos, interrompa imediatamente o uso e procure atendimento médico. Reações graves devem ser comunicadas à ANVISA (www.gov.br/anvisa).</p>

  <h3>7. Regulação de Suplementos (ANVISA)</h3>
  <p>Suplementos alimentares no Brasil são regulados pela RDC ANVISA nº 243/2018. Eles não passam pelos mesmos critérios de eficácia e segurança exigidos para medicamentos. A Calculadora de Dosagem do SupliList é uma ferramenta de referência educativa, não uma prescrição.</p>

  <h3>8. Responsabilidade do Usuário</h3>
  <p>As decisões sobre saúde, suplementação e estilo de vida são de responsabilidade exclusiva do usuário. O SupliList e seus desenvolvedores se isentam de qualquer responsabilidade por danos, diretos ou indiretos, decorrentes do uso das informações disponibilizadas.</p>`,

  // 3 — Afiliados
  `${LAST_UPDATED}

  <h3>1. Transparência Total</h3>
  <p>O SupliList participa de programas de marketing de afiliados. Alguns links para produtos nos marketplaces parceiros são links de afiliados.</p>

  <h3>2. Como Funciona</h3>
  <p>Quando você clica em um link de afiliado e realiza uma compra, podemos receber uma pequena comissão do vendedor. Esse valor é pago pelo vendedor e NÃO representa nenhum custo adicional para você. O preço que você paga é exatamente o mesmo.</p>

  <h3>3. Programas Participantes</h3>
  <p>Participamos dos seguintes programas: Amazon Associates (Programa de Afiliados da Amazon), Mercado Livre Afiliados e Shopee Afiliados.</p>

  <h3>4. Independência Editorial</h3>
  <p>Nossa curadoria científica (evidências, dosagens, classificações) é totalmente independente das comissões. Não recomendamos produtos por pagarem comissões maiores. A seleção de suplementos é baseada exclusivamente em critérios científicos e de qualidade.</p>

  <h3>5. Por Que Isso Existe</h3>
  <p>As comissões de afiliados nos permitem manter o SupliList 100% gratuito, sem anúncios invasivos e sem cobrar dos usuários. É um modelo que alinha os interesses de todos: você economiza, nós sustentamos o projeto.</p>

  <h3>6. Sua Liberdade de Escolha</h3>
  <p>Você é completamente livre para comprar onde preferir, com ou sem nossos links. A comparação de preços entre marketplaces existe justamente para que você possa tomar a melhor decisão, independentemente de qualquer comissão.</p>

  <h3>7. Conformidade Legal</h3>
  <p>Esta divulgação está em conformidade com as diretrizes do CONAR (Conselho Nacional de Autorregulamentação Publicitária), com os Termos de Serviço dos programas de afiliados participantes e com o Código de Defesa do Consumidor (Lei nº 8.078/90).</p>`,
];

const STYLES = `
  .lg-wrap {
    max-width: 760px;
    margin: 0 auto;
    padding: 24px;
  }
  .lg-wrap h1 {
    font-size: 28px;
    font-weight: 800;
    color: var(--color-text-primary);
    margin: 0 0 8px;
  }
  .lg-tagline {
    font-size: 15px;
    color: var(--color-text-secondary);
    margin: 0 0 28px;
  }
  .lg-warning-banner {
    background: var(--color-warning-bg);
    border: 1px solid color-mix(in srgb, var(--color-warning) 40%, transparent);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
    font-size: 13px;
    color: var(--color-warning);
    font-weight: 600;
    line-height: 1.6;
  }
  .lg-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 32px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .lg-tabs::-webkit-scrollbar {
    display: none;
  }
  .lg-tab {
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    color: var(--color-text-muted);
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
    margin-bottom: -1px;
    border-radius: 0;
  }
  .lg-tab:hover {
    color: var(--color-text-secondary);
  }
  .lg-tab.active {
    background: var(--color-brand-muted);
    color: var(--color-brand);
    border-bottom-color: var(--color-brand);
    border-radius: 6px 6px 0 0;
  }
  .lg-content {
    max-width: 720px;
    line-height: 1.75;
    font-size: 15px;
  }
  .lg-updated {
    font-size: 12px;
    color: var(--color-text-muted);
    margin-bottom: 24px;
  }
  .lg-subtitle {
    font-size: 15px;
    color: var(--color-text-secondary);
    font-style: italic;
    margin-bottom: 20px;
  }
  .lg-content h3 {
    font-size: 17px;
    font-weight: 700;
    margin: 28px 0 8px;
    color: var(--color-text-primary);
  }
  .lg-content p,
  .lg-content li {
    font-size: 15px;
    color: var(--color-text-secondary);
    line-height: 1.75;
    margin-bottom: 12px;
  }
  .lg-medical-banner {
    background: var(--color-error-bg);
    border: 1px solid color-mix(in srgb, var(--color-error) 50%, transparent);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    font-weight: 700;
    color: var(--color-error);
    font-size: 15px;
    line-height: 1.6;
  }
`;

export default class LegalPage {
  constructor(container, params) {
    this.container = container;
    this.params = params || {};
    this._activeIndex = DOC_TO_INDEX[this.params.doc] ?? 0;
    this._handleTabClick = this._handleTabClick.bind(this);
  }

  mount() {
    this._injectStyles();
    this._render();
    this._bindEvents();
  }

  unmount() {
    this.container.innerHTML = '';
  }

  // --- private ---

  _injectStyles() {
    if (!document.getElementById('legal-page-styles')) {
      const style = document.createElement('style');
      style.id = 'legal-page-styles';
      style.textContent = STYLES;
      document.head.appendChild(style);
    }
  }

  _render() {
    this.container.innerHTML = `
      <div class="lg-wrap">
        <h1>Centro Legal</h1>
        <p class="lg-tagline">Termos, privacidade e informações regulatórias</p>

        <div class="lg-tabs" role="tablist">
          ${TABS.map((t, i) => `
            <button
              class="lg-tab${i === this._activeIndex ? ' active' : ''}"
              role="tab"
              data-index="${i}"
              aria-selected="${i === this._activeIndex}"
            >${t.label}</button>
          `).join('')}
        </div>

        <div class="lg-content" id="lg-tab-content">
          ${TAB_CONTENTS[this._activeIndex]}
        </div>
      </div>
    `;
  }

  _bindEvents() {
    const tabsBar = this.container.querySelector('.lg-tabs');
    if (tabsBar) {
      tabsBar.addEventListener('click', this._handleTabClick);
    }
  }

  _handleTabClick(e) {
    const btn = e.target.closest('.lg-tab');
    if (!btn) return;

    const idx = parseInt(btn.dataset.index, 10);
    if (idx === this._activeIndex) return;

    this._activeIndex = idx;

    // update tab states
    const allTabs = this.container.querySelectorAll('.lg-tab');
    allTabs.forEach((t, i) => {
      const isActive = i === idx;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });

    // update content
    const contentEl = this.container.querySelector('#lg-tab-content');
    if (contentEl) {
      contentEl.innerHTML = TAB_CONTENTS[idx];
    }
  }
}
