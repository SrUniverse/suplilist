/**
 * @fileoverview Legal Page (Termos de Uso e FAQ)
 */

export function createLegalPage(container) {
  container.innerHTML = `
    <div class="flex flex-col gap-8 animate-fade-in max-w-3xl mx-auto w-full">
      <div class="text-center">
        <h1 class="h2 text-brand-primary">Legal & Ajuda</h1>
        <p class="text-body mt-2">Termos de uso, avisos médicos e perguntas frequentes.</p>
      </div>

      <!-- Termos e Avisos Médicos -->
      <div class="card flex flex-col gap-4 border-l-4 border-amber-500">
        <h2 class="text-xl font-bold text-amber-500 flex items-center gap-2">
          <span>⚠️</span> Aviso Médico Importante (Disclaimer)
        </h2>
        <div class="text-sm text-zinc-300 space-y-3 leading-relaxed">
          <p>O <strong>SupliList</strong> é uma ferramenta de caráter estritamente educacional e informativo. O conteúdo aqui disponibilizado, incluindo algoritmos de dosagem e pontuações de nível de evidência (Nível A, B, C), é baseado em literatura científica pública e <strong>não substitui, sob nenhuma circunstância, a consulta, diagnóstico ou prescrição de um médico, nutricionista ou profissional de saúde qualificado.</strong></p>
          <p>Os suplementos listados podem apresentar contraindicações e interações medicamentosas. O uso de qualquer substância deve ser validado pelo seu profissional de saúde.</p>
          <p>Ao utilizar o SupliList, você declara estar ciente de que é o único responsável pelas decisões relacionadas à sua suplementação.</p>
        </div>
      </div>

      <!-- FAQ Accordion -->
      <div class="flex flex-col gap-4 mt-4">
        <h2 class="text-xl font-bold text-white mb-2">Perguntas Frequentes (FAQ)</h2>
        
        <div class="faq-item border border-zinc-800 rounded-xl overflow-hidden bg-bg-dark transition-colors">
          <button class="faq-btn w-full flex items-center justify-between p-4 bg-transparent text-left focus:outline-none">
            <span class="font-bold text-zinc-200">Como o Nível de Evidência é calculado?</span>
            <span class="faq-icon text-zinc-500 transition-transform duration-300">▼</span>
          </button>
          <div class="faq-content hidden px-4 pb-4 text-sm text-zinc-400 leading-relaxed">
            Nós utilizamos o sistema de classificação global. <strong>Nível A:</strong> Múltiplos ensaios clínicos randomizados e meta-análises comprovam a eficácia e segurança (ex: Creatina). <strong>Nível B:</strong> Alguns estudos clínicos confirmam eficácia, mas faltam meta-análises contundentes. <strong>Nível C:</strong> Evidência primária baseada em estudos in-vitro, modelos animais ou conhecimento tradicional.
          </div>
        </div>

        <div class="faq-item border border-zinc-800 rounded-xl overflow-hidden bg-bg-dark transition-colors">
          <button class="faq-btn w-full flex items-center justify-between p-4 bg-transparent text-left focus:outline-none">
            <span class="font-bold text-zinc-200">Meus dados estão seguros?</span>
            <span class="faq-icon text-zinc-500 transition-transform duration-300">▼</span>
          </button>
          <div class="faq-content hidden px-4 pb-4 text-sm text-zinc-400 leading-relaxed">
            Sim! O SupliList v3.0 é construído com arquitetura <em>Local-First</em>. Todos os dados do seu Protocolo (Meu Stack), favoritos e configurações ficam salvos <strong>apenas no seu navegador (localStorage)</strong>. Nós não possuímos banco de dados centralizado que colete suas informações pessoais. Para trocar de dispositivo, basta exportar o arquivo JSON na página de Configurações.
          </div>
        </div>

        <div class="faq-item border border-zinc-800 rounded-xl overflow-hidden bg-bg-dark transition-colors">
          <button class="faq-btn w-full flex items-center justify-between p-4 bg-transparent text-left focus:outline-none">
            <span class="font-bold text-zinc-200">Como a Calculadora de Dosagem funciona?</span>
            <span class="faq-icon text-zinc-500 transition-transform duration-300">▼</span>
          </button>
          <div class="faq-content hidden px-4 pb-4 text-sm text-zinc-400 leading-relaxed">
            A calculadora utiliza as variáveis antropométricas inseridas (Peso e % de Gordura) para inferir a Massa Livre de Gordura (LBM). A partir disso, aplicamos os multiplicadores baseados na literatura médica recomendada para cada substância (ex: Creatina usa 0.03g/kg a 0.05g/kg de peso total).
          </div>
        </div>
      </div>
    </div>
  `;

  // Accordion Logic
  const faqBtns = container.querySelectorAll('.faq-btn');
  faqBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector('.faq-icon');
      const isHidden = content.classList.contains('hidden');

      // Fechar todos
      container.querySelectorAll('.faq-content').forEach(c => c.classList.add('hidden'));
      container.querySelectorAll('.faq-icon').forEach(i => i.style.transform = 'rotate(0deg)');

      if (isHidden) {
        content.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
      }
    });
  });

  return {
    destroy: () => {
      // Cleanup event listeners implícito ao limpar container
    }
  };
}
