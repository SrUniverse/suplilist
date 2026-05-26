export function createLandingPage(container) {
  const root = typeof container === 'string' ? document.querySelector(container) : container;
  if (!root) return { destroy: () => {} };

  root.innerHTML = `
    <style>
      /* Styles locais para garantir o escopo Obsidian da Landing Page */
      .landing-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 40px;
        background: rgba(5, 5, 5, 0.8);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10000;
        box-sizing: border-box;
      }
      .landing-logo {
        font-family: var(--font-headline);
        font-size: 20px;
        font-weight: 850;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 8px;
        letter-spacing: -0.02em;
      }
      .landing-logo-s {
        background: var(--brand-primary);
        width: 26px;
        height: 26px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 900;
        color: #050505;
      }
      .landing-nav a {
        color: var(--t2);
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;
        transition: color 0.2s;
        margin: 0 12px;
      }
      .landing-nav a:hover {
        color: #fff;
      }
      .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(167, 139, 250, 0.1);
        border: 1px solid rgba(167, 139, 250, 0.2);
        border-radius: 9999px;
        padding: 6px 14px;
        font-size: 11px;
        font-weight: 700;
        color: var(--brand-primary);
        margin-bottom: 24px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .hero-title-obsidian {
        font-family: var(--font-headline);
        font-size: clamp(36px, 5vw, 68px);
        font-weight: 900;
        line-height: 1.05;
        color: #fff;
        margin: 0 0 20px 0;
        text-transform: uppercase;
        letter-spacing: -0.03em;
      }
      .hero-title-italic {
        font-style: italic;
        background: linear-gradient(135deg, #a855f7, #c084fc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        display: block;
      }
      .mockup-window {
        background: #0d0d12;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8), 0 0 32px rgba(168, 85, 247, 0.08);
        width: 100%;
        max-width: 460px;
        overflow: hidden;
      }
      .mockup-item {
        background: #131315;
        border: 1px solid rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        padding: 10px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: border-color 0.2s;
      }
      .mockup-item:hover {
        border-color: rgba(168, 85, 247, 0.2);
      }
      .features-grid-bento {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
        width: 100%;
        margin-top: 40px;
      }
      .feature-card-bento {
        background: #131315;
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 16px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        transition: transform 0.2s, border-color 0.2s;
        position: relative;
        overflow: hidden;
      }
      .feature-card-bento:hover {
        transform: translateY(-4px);
        border-color: var(--brand-primary);
      }
      .bento-icon {
        font-size: 20px;
        color: var(--brand-primary);
        background: rgba(168, 85, 247, 0.1);
        width: 40px;
        height: 40px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .bento-bar {
        height: 6px;
        background: #27272a;
        border-radius: 9999px;
        width: 100%;
        overflow: hidden;
        margin-top: auto;
      }
      .bento-bar-fill {
        height: 100%;
        background: var(--brand-primary);
        border-radius: 9999px;
      }
      .objectives-grid-obsidian {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        width: 100%;
        margin-top: 40px;
      }
      .objective-card-obsidian {
        background: #131315;
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        text-decoration: none;
        color: #fff;
        transition: all 0.2s;
      }
      .objective-card-obsidian:hover {
        border-color: var(--brand-primary);
        transform: translateY(-2px);
      }
      .objective-card-obsidian.highlighted {
        background: rgba(168, 85, 247, 0.1);
        border-color: var(--brand-primary);
      }
      .objective-card-obsidian.highlighted:hover {
        box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
      }

      /* Responsividade */
      @media (max-width: 1024px) {
        .landing-header { padding: 16px 20px; }
        .landing-nav { display: none; }
        .features-grid-bento { grid-template-columns: repeat(2, 1fr); }
        .objectives-grid-obsidian { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 640px) {
        .features-grid-bento { grid-template-columns: 1fr; }
        .objectives-grid-obsidian { grid-template-columns: 1fr; }
      }
    </style>

    <!-- 1. HEADER DA LANDING -->
    <header class="landing-header">
      <div class="landing-logo">
        <div class="landing-logo-s">S</div>
        SUPLILIST
      </div>
      <nav class="landing-nav">
        <a href="#/">Início</a>
        <a href="#/list">Lista</a>
        <a href="#/my-stack">Minha Stack</a>
      </nav>
      <div style="display: flex; gap: 16px; align-items: center;">
        <a href="mailto:support@suplilist.com" style="color: var(--t3); text-decoration: none; font-size: 13px; font-weight: 600; display: none; md:block;">Falar com Apoio</a>
        <a href="#/list" class="btn-primary" style="text-decoration: none; font-size: 12px; font-weight: 700; padding: 10px 20px; border-radius: 9999px; letter-spacing: 0.02em;">ENTRAR NO APP</a>
      </div>
    </header>

    <!-- 2. HERO SECTION -->
    <section class="hero-section" style="padding-top: 140px; padding-bottom: 80px;">
      <div class="hero-left">
        <div class="hero-badge">
          <span>🔬</span> Dosagens Calculadas por Peso
        </div>
        <h1 class="hero-title-obsidian">
          SUPLEMENTAÇÃO<br>
          <span class="hero-title-italic">BASEADA EM EVIDÊNCIAS.</span>
        </h1>
        <p class="hero-subtitle" style="font-size: 15px; line-height: 1.6; max-width: 520px; color: var(--t2); margin-bottom: 32px;">
          Compare preços, doses e eficácia científica em Shopee, Mercado Livre e Amazon — tudo em um só lugar. Sem cadastro.
        </p>
        
        <div class="hero-actions" style="display: flex; gap: 12px; margin-bottom: 48px; flex-wrap: wrap;">
          <a href="#/list" class="btn-primary btn-lg cta-btn" style="border-radius: 9999px; padding: 14px 28px; font-size: 13px; font-weight: 800;">MONTAR MINHA LISTA AGORA</a>
          <a href="#/dosage" class="btn-outline btn-lg cta-btn" style="border-radius: 9999px; padding: 14px 28px; font-size: 13px; font-weight: 850; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #fff;">📋 CALCULAR DOSAGEM</a>
        </div>
        
        <div class="hero-stats-row" style="display: flex; gap: 32px; flex-wrap: wrap; margin-top: 24px;">
          <div>
            <div style="font-size: 28px; font-weight: 900; color: #fff; line-height: 1;">57+</div>
            <div style="font-size: 10px; font-weight: 700; color: var(--brand-primary); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">Suplementos</div>
          </div>
          <div>
            <div style="font-size: 28px; font-weight: 900; color: #fff; line-height: 1;">3</div>
            <div style="font-size: 10px; font-weight: 700; color: var(--brand-primary); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">Marketplaces</div>
          </div>
          <div>
            <div style="font-size: 28px; font-weight: 900; color: #fff; line-height: 1;">500+</div>
            <div style="font-size: 10px; font-weight: 700; color: var(--brand-primary); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">Estudos</div>
          </div>
          <div>
            <div style="font-size: 28px; font-weight: 900; color: #fff; line-height: 1;">R$0</div>
            <div style="font-size: 10px; font-weight: 700; color: var(--brand-primary); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">Cadastro</div>
          </div>
        </div>
      </div>
      
      <div class="hero-right" style="display: flex; justify-content: center; align-items: center;">
        <div class="mockup-window">
          <!-- Title bar -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); background: #131315;">
            <div style="display: flex; gap: 6px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444; display: inline-block;"></span>
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b; display: inline-block;"></span>
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
            </div>
            <span style="font-size: 10px; font-weight: 700; color: var(--t3); letter-spacing: 0.05em;">suplilist.app/my-stack</span>
            <div style="width: 32px;"></div>
          </div>
          
          <!-- Content -->
          <div style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; flex-direction: column; gap: 10px;">
              
              <!-- Item 1 -->
              <div class="mockup-item">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-size: 12px; font-weight: 700; color: #fff;">L-Teanina em Pó</span>
                  <span style="font-size: 9px; color: var(--success); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">● Em Estoque</span>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 13px; font-weight: 800; color: var(--brand-primary);">R$ 45,00</span>
                  <div style="font-size: 9px; color: var(--t3); font-weight: 600;">R$ 0,80 / DOSE</div>
                </div>
              </div>

              <!-- Item 2 -->
              <div class="mockup-item">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-size: 12px; font-weight: 700; color: #fff;">Creatina Monohidratada</span>
                  <span style="font-size: 9px; color: var(--success); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">● Em Estoque</span>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 13px; font-weight: 800; color: var(--brand-primary);">R$ 86,00</span>
                  <div style="font-size: 9px; color: var(--t3); font-weight: 600;">R$ 1,20 / DOSE</div>
                </div>
              </div>

              <!-- Item 3 -->
              <div class="mockup-item">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-size: 12px; font-weight: 700; color: #fff;">Maca Peruana Preta</span>
                  <span style="font-size: 9px; color: var(--warning); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">⚠️ Acabando (5 dias)</span>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 13px; font-weight: 800; color: var(--brand-primary);">R$ 76,00</span>
                  <div style="font-size: 9px; color: var(--t3); font-weight: 600;">R$ 2,50 / DOSE</div>
                </div>
              </div>

            </div>

            <!-- Average cost indicator -->
            <div style="background: rgba(167, 139, 250, 0.05); border: 1px solid rgba(167, 139, 250, 0.15); border-radius: 12px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 9px; color: var(--t2); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Custo Diário Estimado</span>
                <span style="font-size: 18px; font-weight: 850; color: #fff;">R$ 4,50 <span style="font-size: 11px; font-weight: 600; color: var(--t3);">/ dia</span></span>
              </div>
              <div style="text-align: right; background: var(--brand-primary); border-radius: 8px; padding: 6px 12px; color: #050505; font-size: 11px; font-weight: 800; letter-spacing: 0.05em;">
                OTIMIZADO
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. TICKER MARQUEE -->
    <div class="ticker-marquee-container" style="border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 16px 0;">
      <div class="ticker-marquee">
        <div class="ticker-track">
          <span>Maca Peruana</span> <span class="arrow">→</span>
          <span>Ashwagandha</span> <span class="arrow">→</span>
          <span>Creatina</span> <span class="arrow">→</span>
          <span>Whey Protein</span> <span class="arrow">→</span>
          <span>Rhodiola Rosea</span> <span class="arrow">→</span>
          <span>Melatonina</span> <span class="arrow">→</span>
          <span>Ômega 3</span> <span class="arrow">→</span>
          <span>Magnésio</span> <span class="arrow">→</span>
          <span>Maca Peruana</span> <span class="arrow">→</span>
          <span>Ashwagandha</span> <span class="arrow">→</span>
          <span>Creatina</span> <span class="arrow">→</span>
          <span>Whey Protein</span> <span class="arrow">→</span>
          <span>Rhodiola Rosea</span> <span class="arrow">→</span>
          <span>Melatonina</span> <span class="arrow">→</span>
          <span>Ômega 3</span> <span class="arrow">→</span>
          <span>Magnésio</span> <span class="arrow">→</span>
        </div>
      </div>
    </div>

    <!-- 4. FEATURES (Bento Grid Obsidian) -->
    <section class="landing-section fade-up" style="padding: 100px 0;">
      <div class="section-header" style="text-align: center; margin-bottom: 48px;">
        <span style="font-size: 11px; font-weight: 700; color: var(--brand-primary); text-transform: uppercase; letter-spacing: 0.08em;">FUNCIONALIDADES</span>
        <h2 style="font-family: var(--font-headline); font-size: clamp(28px, 4vw, 40px); font-weight: 850; color: #fff; margin-top: 10px;">TUDO QUE VOCÊ PRECISA. JUNTO.</h2>
        <p style="max-width: 600px; margin: 12px auto 0; color: var(--t2); font-size: 14px; line-height: 1.6;">Do planejamento à compra com ciência real. Sem abas abertas, sem frustração, sem crises.</p>
      </div>
      
      <div class="features-grid-bento">
        <div class="feature-card-bento">
          <div class="bento-icon">⭐</div>
          <h3 style="font-family: var(--font-headline); font-size: 18px; font-weight: 800; color: #fff; margin: 0;">Comparação de Preços</h3>
          <p style="color: var(--t2); font-size: 12px; line-height: 1.6; margin: 0;">Shopee, Mercado Livre e Amazon tudo junto nos maiores marketplaces do Brasil. Encontre o menor preço e economize.</p>
          <div class="bento-bar"><div class="bento-bar-fill" style="width: 100%;"></div></div>
        </div>
        
        <div class="feature-card-bento">
          <div class="bento-icon">📊</div>
          <h3 style="font-family: var(--font-headline); font-size: 18px; font-weight: 800; color: #fff; margin: 0;">Dosagens Científicas</h3>
          <p style="color: var(--t2); font-size: 12px; line-height: 1.6; margin: 0;">Baseadas em estudos calibrados e calculadas especificamente de acordo com seu peso corporal e nível de treino diário.</p>
          <div class="bento-bar"><div class="bento-bar-fill" style="width: 80%;"></div></div>
        </div>
        
        <div class="feature-card-bento">
          <div class="bento-icon">💜</div>
          <h3 style="font-family: var(--font-headline); font-size: 18px; font-weight: 800; color: #fff; margin: 0;">Stack Personalizado</h3>
          <p style="color: var(--t2); font-size: 12px; line-height: 1.6; margin: 0;">Monte e gerencie seu próprio protocolo ativo. Monitore o estoque do seu armário e preveja compras futuras facilmente.</p>
          <div class="bento-bar"><div class="bento-bar-fill" style="width: 95%;"></div></div>
        </div>
      </div>
    </section>

    <!-- 5. HOW IT WORKS -->
    <section class="landing-section fade-up" style="padding: 100px 0; border-top: 1px solid rgba(255,255,255,0.03);">
      <div style="display: grid; grid-template-columns: 1fr; gap: 48px; align-items: center;" class="how-it-works-layout">
        <div class="how-it-works-left">
          <div class="section-header" style="margin-bottom: 32px;">
            <span style="font-size: 11px; font-weight: 700; color: var(--brand-primary); text-transform: uppercase; letter-spacing: 0.08em;">COMO FUNCIONA</span>
            <h2 style="font-family: var(--font-headline); font-size: clamp(28px, 4vw, 40px); font-weight: 850; color: #fff; margin-top: 10px; line-height: 1.1;">3 PASSOS PARA COMPRAR CERTO.</h2>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <div style="display: flex; gap: 16px;">
              <div style="background: rgba(167, 139, 250, 0.1); width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--brand-primary); font-weight: 800; flex-shrink: 0; font-size: 14px;">1</div>
              <div>
                <h4 style="font-size: 14px; font-weight: 700; color: #fff; margin: 0 0 4px 0;">Defina seus Objetivos</h4>
                <p style="color: var(--t2); font-size: 12px; line-height: 1.6; margin: 0;">Escolha seus objetivos e tipo de treino para encontrar os compostos exatos recomendados com evidências médicas reais.</p>
              </div>
            </div>

            <div style="display: flex; gap: 16px;">
              <div style="background: rgba(167, 139, 250, 0.1); width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--brand-primary); font-weight: 800; flex-shrink: 0; font-size: 14px;">2</div>
              <div>
                <h4 style="font-size: 14px; font-weight: 700; color: #fff; margin: 0 0 4px 0;">Compare Preços e Doses</h4>
                <p style="color: var(--t2); font-size: 12px; line-height: 1.6; margin: 0;">Analisamos o mercado automaticamente para apontar qual marca e tamanho oferecem o menor preço real por dose ativa.</p>
              </div>
            </div>

            <div style="display: flex; gap: 16px;">
              <div style="background: rgba(167, 139, 250, 0.1); width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--brand-primary); font-weight: 800; flex-shrink: 0; font-size: 14px;">3</div>
              <div>
                <h4 style="font-size: 14px; font-weight: 700; color: #fff; margin: 0 0 4px 0;">Monte e Compre</h4>
                <p style="color: var(--t2); font-size: 12px; line-height: 1.6; margin: 0;">Monte sua stack e compre nos maiores marketplaces do Brasil com o melhor custo-benefício, sem taxas extras.</p>
              </div>
            </div>
          </div>
          
          <a href="#/list" class="btn-primary" style="text-decoration: none; font-size: 13px; font-weight: 800; padding: 14px 28px; border-radius: 9999px; display: inline-block; margin-top: 36px;">COMEÇAR AGORA</a>
        </div>

        <div class="how-it-works-right" style="display: flex; justify-content: center;">
          <div class="mockup-window" style="max-width: 420px;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); background: #131315;">
              <div style="display: flex; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #555; display: inline-block;"></span>
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #555; display: inline-block;"></span>
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #555; display: inline-block;"></span>
              </div>
              <span style="font-size: 9px; font-weight: 700; color: var(--t3); letter-spacing: 0.05em;">checkout-optimizer.html</span>
              <div style="width: 24px;"></div>
            </div>
            <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--success); text-transform: uppercase;">🛒 Melhor rota de compra encontrada</span>
              
              <div style="border-left: 2px solid var(--brand-primary); padding-left: 12px; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                  <span style="color: var(--t2);">1. Creatina Monohidratada</span>
                  <span style="font-weight: 700; color: #fff;">Amazon</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                  <span style="color: var(--t2);">2. L-Teanina 100g</span>
                  <span style="font-weight: 700; color: #fff;">Shopee</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                  <span style="color: var(--t2);">3. Melatonina 0.21mg</span>
                  <span style="font-weight: 700; color: #fff;">Shopee</span>
                </div>
              </div>

              <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--t3);">ECONOMIA DE ATÉ</span>
                <span style="font-size: 16px; font-weight: 850; color: var(--success);">R$ 42,00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 6. FILTRADO POR COMO VOCÊ TREINA (Grade de Objetivos) -->
    <section class="landing-section fade-up" style="padding: 100px 0; border-top: 1px solid rgba(255,255,255,0.03);">
      <div class="section-header" style="text-align: center; margin-bottom: 40px;">
        <span style="font-size: 11px; font-weight: 700; color: var(--brand-primary); text-transform: uppercase; letter-spacing: 0.08em;">OBJETIVOS</span>
        <h2 style="font-family: var(--font-headline); font-size: clamp(28px, 4vw, 40px); font-weight: 850; color: #fff; margin-top: 10px;">FILTRADO POR COMO VOCÊ TREINA.</h2>
      </div>

      <div class="objectives-grid-obsidian">
        <a href="#/list" class="objective-card-obsidian">
          <span style="font-size: 18px;">🏋️</span>
          <h4 style="font-size: 14px; font-weight: 700; margin: 0;">Hipertrofia</h4>
          <span style="font-size: 10px; color: var(--t3);">Evidências Clínicas</span>
        </a>
        <a href="#/list" class="objective-card-obsidian">
          <span style="font-size: 18px;">🔥</span>
          <h4 style="font-size: 14px; font-weight: 700; margin: 0;">Queima de Gordura</h4>
          <span style="font-size: 10px; color: var(--t3);">Termogênicos Reais</span>
        </a>
        <a href="#/list" class="objective-card-obsidian">
          <span style="font-size: 18px;">⚡</span>
          <h4 style="font-size: 14px; font-weight: 700; margin: 0;">Energia & Foco</h4>
          <span style="font-size: 10px; color: var(--t3);">Nootrópicos Ativos</span>
        </a>
        <a href="#/list" class="objective-card-obsidian">
          <span style="font-size: 18px;">🌿</span>
          <h4 style="font-size: 14px; font-weight: 700; margin: 0;">Saúde Geral</h4>
          <span style="font-size: 10px; color: var(--t3);">Longevidade & Saúde</span>
        </a>
        <a href="#/list" class="objective-card-obsidian">
          <span style="font-size: 18px;">⚔️</span>
          <h4 style="font-size: 14px; font-weight: 700; margin: 0;">Libido & Testo</h4>
          <span style="font-size: 10px; color: var(--t3);">Fitoterápicos Seguros</span>
        </a>
        <a href="#/list" class="objective-card-obsidian">
          <span style="font-size: 18px;">🌙</span>
          <h4 style="font-size: 14px; font-weight: 700; margin: 0;">Sono</h4>
          <span style="font-size: 10px; color: var(--t3);">Ciclo Circadiano</span>
        </a>
        <a href="#/list" class="objective-card-obsidian">
          <span style="font-size: 18px;">🌸</span>
          <h4 style="font-size: 14px; font-weight: 700; margin: 0;">Mulher</h4>
          <span style="font-size: 10px; color: var(--t3);">Equilíbrio Hormonal</span>
        </a>
        <a href="#/list" class="objective-card-obsidian highlighted">
          <span style="font-size: 18px;">⚙️</span>
          <h4 style="font-size: 14px; font-weight: 800; color: var(--brand-primary); margin: 0;">Ver Todos</h4>
          <span style="font-size: 10px; color: var(--brand-primary); font-weight: 600;">57+ Suplementos ➔</span>
        </a>
      </div>
    </section>

    <!-- 7. MARKETPLACES -->
    <section class="landing-section fade-up" style="padding: 100px 0; border-top: 1px solid rgba(255,255,255,0.03);">
      <div class="section-header" style="text-align: center; margin-bottom: 48px;">
        <span style="font-size: 11px; font-weight: 700; color: var(--brand-primary); text-transform: uppercase; letter-spacing: 0.08em;">OS MAIORES MARKETPLACES DO BRASIL</span>
        <h2 style="font-family: var(--font-headline); font-size: clamp(28px, 4vw, 40px); font-weight: 850; color: #fff; margin-top: 10px;">INTEGRAÇÃO DIRETA & COMPATIBILIDADE</h2>
      </div>
      
      <div class="marketplaces-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; width: 100%;">
        <div class="marketplace-card" style="background: #131315; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 14px;">
          <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin: 0;">Shopee</h3>
          <span style="font-size: 11px; color: var(--success); font-weight: 700;">ATIVADO & INTEGRADO</span>
          <div class="bento-bar"><div class="bento-bar-fill" style="width: 100%;"></div></div>
        </div>
        
        <div class="marketplace-card" style="background: #131315; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 14px;">
          <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin: 0;">Mercado Livre</h3>
          <span style="font-size: 11px; color: var(--t3); font-weight: 700;">EM BREVE (FALTA API)</span>
          <div class="bento-bar"><div class="bento-bar-fill" style="width: 15%; background: var(--t3);"></div></div>
        </div>

        <div class="marketplace-card" style="background: #131315; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 14px;">
          <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin: 0;">Amazon</h3>
          <span style="font-size: 11px; color: var(--success); font-weight: 700;">ATIVADO & INTEGRADO</span>
          <div class="bento-bar"><div class="bento-bar-fill" style="width: 100%;"></div></div>
        </div>
      </div>
    </section>

    <!-- 8. CTA FINAL (Obsidian Banner) -->
    <section class="landing-section fade-up" style="padding: 100px 0 140px 0; border-top: 1px solid rgba(255,255,255,0.03);">
      <div class="cta-final-wrapper" style="background: linear-gradient(135deg, #131315, #1a0b2e); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 24px; padding: 60px 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px; box-shadow: 0 0 32px rgba(168, 85, 247, 0.05);">
        <span style="font-size: 11px; font-weight: 700; color: var(--brand-primary); text-transform: uppercase; letter-spacing: 0.08em;">ESTUDOS CLÍNICOS</span>
        <h2 style="font-family: var(--font-headline); font-size: clamp(32px, 5vw, 56px); font-weight: 900; line-height: 1.1; color: #fff; text-transform: uppercase;">
          PARE DE ADIVINHAR.<br>
          <span style="font-style: italic; background: linear-gradient(135deg, #a855f7, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">COMECE A SUPLEMENTAR<br>COM CIÊNCIA REAL.</span>
        </h2>
        <p style="max-width: 600px; color: var(--t2); font-size: 14px; line-height: 1.6; margin: 10px 0 20px 0;">Milhares de pessoas ainda compram suplemento errado, na dose errada, no lugar mais caro. Você não precisa ser uma delas.</p>
        <div style="display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;">
          <a href="#/list" class="btn-primary" style="text-decoration: none; font-size: 13px; font-weight: 800; padding: 14px 28px; border-radius: 9999px;">Montar Minha Lista Agora</a>
          <a href="#/dosage" class="btn-outline" style="text-decoration: none; font-size: 13px; font-weight: 800; padding: 14px 28px; border-radius: 9999px; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #fff;">Ver Guia de Uso</a>
        </div>
      </div>
    </section>
  `;

  // Quando na landing page (SPA router mode), ocultamos a Sidebar e Topbar global temporariamente
  const sidebar = document.getElementById('sidebar');
  const topbar = document.getElementById('top-bar');
  if (sidebar) sidebar.style.display = 'none';
  if (topbar) topbar.style.display = 'none';

  document.body.classList.add('landing-body');

  // Inicializa o IntersectionObserver para animações de rolagem
  const fadeElements = root.querySelectorAll('.fade-up');
  const fadeObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -50px 0px', threshold: 0.1 });

  fadeElements.forEach(el => fadeObserver.observe(el));

  return {
    destroy: () => {
      fadeObserver.disconnect();
      document.body.classList.remove('landing-body');
      // Ao sair da landing page, restaura sidebar e topbar globais
      if (sidebar) sidebar.style.display = '';
      if (topbar) topbar.style.display = '';
    }
  };
}
