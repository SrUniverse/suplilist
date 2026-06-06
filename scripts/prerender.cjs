const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '../frontend/dist');
const INDEX_PATH = path.join(DOCS_DIR, 'index.html');
const SITEMAP_PATH = path.join(DOCS_DIR, 'sitemap.xml'); // no build, fica em dist/

if (!fs.existsSync(INDEX_PATH)) {
  console.error('Erro: dist/index.html não encontrado! Certifique-se de rodar "npm run build" primeiro.');
  process.exit(1);
}

// ─── EXTRAIR DADOS DINAMICAMENTE DO MOTOR DE IA ─────────────────────────────────
console.log('Carregando banco de dados de suplementos da IA...');
const supplementsData = fs.readFileSync(path.join(__dirname, '../frontend/public/data/supplements-db.json'), 'utf-8');
const supplements = JSON.parse(supplementsData);

console.log(`✓ Encontrados ${supplements.length} suplementos cadastrados.`);

// ─── METADADOS DAS PÁGINAS ESTÁTICAS PADRÃO ────────────────────────────────────
const PAGE_METADATA = {
  '/onboarding': {
    title: 'Bem-vindo | SupliList',
    description: 'Faça o seu onboarding no SupliList e configure seu perfil de suplementação personalizada.',
    keywords: 'onboarding, cadastro, configurar suplementos'
  },
  '/list': {
    title: 'Catálogo de Suplementos | SupliList',
    description: 'Veja o catálogo completo com 57+ suplementos esportivos e fitoterápicos. Classificados por Nível de Evidência Científica (Grau A, B, C) e comparação de preços.',
    keywords: 'catalogo de suplementos, whey protein barato, creatina pura, comprar suplementos'
  },
  '/my-stack': {
    title: 'Meu Stack | SupliList',
    description: 'Gerencie seu stack personalizado de suplementos diários. Organize horários, doses e acompanhe seu consumo.',
    keywords: 'stack de suplementos, suplementos diarios, rotina de suplementos'
  },
  '/favorites': {
    title: 'Favoritos | SupliList',
    description: 'Seus suplementos favoritos salvos para rápido acesso, comparação de dosagem e monitoramento de preços.',
    keywords: 'favoritos, suplementos salvos, comparar suplementos'
  },
  '/checkin': {
    title: 'Check-in Diário | SupliList',
    description: 'Registre o seu consumo diário de suplementação. Monitore a consistência do seu stack ao longo do tempo.',
    keywords: 'checkin, consistência treinos, registro diario suplementos'
  },
  '/history': {
    title: 'Histórico | SupliList',
    description: 'Histórico detalhado do seu consumo de suplementação diária, check-ins passados e consistência.',
    keywords: 'historico de suplementos, consumo de creatina, logs de suplementacao'
  },
  '/dosage': {
    title: 'Calculadora de Dosagem | SupliList',
    description: 'Calcule a dosagem diária ideal de creatina, whey protein, cafeína e outros suplementos de acordo com seu peso corporal e nível de treino.',
    keywords: 'dosagem creatina, dose por peso, calcular whey protein, creatina gramas'
  },
  '/profile': {
    title: 'Meu Perfil | SupliList',
    description: 'Gerencie suas informações físicas, peso e preferências de treino para o cálculo automático de dosagem.',
    keywords: 'perfil fisico, calcular dose peso, dados corporais'
  },
  '/settings': {
    title: 'Configurações | SupliList',
    description: 'Ajuste preferências do aplicativo, gerencie dados locais, exporte/importe backups e selecione o tema visual.',
    keywords: 'configuracoes, backup suplementos, exportar dados'
  },
  '/faq': {
    title: 'Perguntas Frequentes | SupliList',
    description: 'Tire suas dúvidas sobre o funcionamento do SupliList, evidências científicas, dosagens e como usá-lo offline.',
    keywords: 'faq suplementos, duvidas creatina, como usar suplilist'
  },
  '/legal': {
    title: 'Termos & Privacidade | SupliList',
    description: 'Leia os termos de uso e a política de privacidade do SupliList. 100% focado em privacidade, sem coleta de dados.',
    keywords: 'termos de uso, privacidade, seguranca dos dados'
  }
};

let htmlContent = fs.readFileSync(INDEX_PATH, 'utf-8');

console.log('Iniciando a Pré-renderização Estática para o GitHub Pages...');

// Lista de URLs geradas para atualizar o sitemap
const generatedUrls = [
  'https://suplilist.com/',
  'https://suplilist.com/onboarding',
  'https://suplilist.com/list',
  'https://suplilist.com/my-stack',
  'https://suplilist.com/favorites',
  'https://suplilist.com/checkin',
  'https://suplilist.com/history',
  'https://suplilist.com/dosage',
  'https://suplilist.com/profile',
  'https://suplilist.com/settings',
  'https://suplilist.com/faq',
  'https://suplilist.com/legal'
];

// Helper para modificar metadados comuns do HTML
function replaceMetadata(html, route, meta) {
  let newHtml = html;
  
  // Substituir Title
  newHtml = newHtml.replace(/<title>[^<]+<\/title>/g, `<title>${meta.title}</title>`);

  // Substituir Description
  newHtml = newHtml.replace(
    /<meta name="description" content="[^"]+"/g,
    `<meta name="description" content="${meta.description}"`
  );

  // Substituir Keywords
  newHtml = newHtml.replace(
    /<meta name="keywords" content="[^"]+"/g,
    `<meta name="keywords" content="${meta.keywords}"`
  );

  // Substituir Canonical
  newHtml = newHtml.replace(
    /<link rel="canonical" href="https:\/\/suplilist\.com\/"/g,
    `<link rel="canonical" href="https://suplilist.com${route}"`
  );

  // Substituir OpenGraph og:title
  newHtml = newHtml.replace(
    /<meta property="og:title" content="[^"]+"/g,
    `<meta property="og:title" content="${meta.title}"`
  );

  // Substituir OpenGraph og:description
  newHtml = newHtml.replace(
    /<meta property="og:description" content="[^"]+"/g,
    `<meta property="og:description" content="${meta.description}"`
  );

  // Substituir OpenGraph og:url
  newHtml = newHtml.replace(
    /property="og:url" content="https:\/\/suplilist\.com\/"/g,
    `property="og:url" content="https://suplilist.com${route}"`
  );

  // Substituir Twitter Title
  newHtml = newHtml.replace(
    /<meta name="twitter:title" content="[^"]+"/g,
    `<meta name="twitter:title" content="${meta.title}"`
  );

  // Substituir Twitter Description
  newHtml = newHtml.replace(
    /<meta name="twitter:description" content="[^"]+"/g,
    `<meta name="twitter:description" content="${meta.description}"`
  );

  return newHtml;
}

// ─── 1. GERAR AS PÁGINAS ESTÁTICAS PADRÃO ───────────────────────────────────────
Object.entries(PAGE_METADATA).forEach(([route, meta]) => {
  const dirName = route.replace(/^\//, '');
  const targetDir = path.join(DOCS_DIR, dirName);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const newHtml = replaceMetadata(htmlContent, route, meta);
  const outputPath = path.join(targetDir, 'index.html');
  fs.writeFileSync(outputPath, newHtml, 'utf-8');
  console.log(`✓ Pré-renderizado: /${dirName}`);
});

// ─── 2. GERAR PÁGINAS DE PROGRAMMATIC SEO PARA CADA SUPLEMENTO ─────────────────
console.log('Iniciando geração de páginas de Programmatic SEO para suplementos...');

supplements.forEach((supp) => {
  const route = `/suplemento/${supp.id}`;
  const targetDir = path.join(DOCS_DIR, `suplemento/${supp.id}`);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  generatedUrls.push(`https://suplilist.com${route}`);

  const meta = {
    title: `${supp.name} | Dosagem, Benefícios e Evidência Científica — SupliList`,
    description: `Tudo sobre ${supp.name}: dosagem clínica sugerida de ${supp.dosage.maintenance}${supp.dosage.unit}, ${supp.benefits.slice(0, 2).join(', ')}. Nível de Evidência Científica Grau ${supp.evidenceLevel}.`,
    keywords: `${supp.name.toLowerCase()}, dosagem ${supp.name.toLowerCase()}, beneficios ${supp.name.toLowerCase()}, comprar ${supp.name.toLowerCase()} barato`
  };

  let newHtml = replaceMetadata(htmlContent, route, meta);

  // ─── INJETAR TEXTO SEMÂNTICO DE ALTO VALOR DE SEO NO CORPO ──────────────────
  const articleHtml = `
  <main id="router-outlet" role="main" aria-live="polite" aria-label="Conteúdo principal">
    <article style="max-width: 800px; margin: 40px auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #F2F2F2; background: #0F0F0F; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px;">
      <h1 style="color: #7C3AED; font-size: 2.5rem; margin-top: 0; margin-bottom: 10px; font-weight: 800;">${supp.name}</h1>
      <p style="font-size: 1.1rem; color: #9A9A9A; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.07); padding-bottom: 16px;">
        Categoria: <strong>${supp.category}</strong> | 
        Nível de Evidência Científica: <strong style="color: #22C55E; background: rgba(34, 197, 94, 0.10); padding: 4px 10px; border-radius: 6px;">Grau ${supp.evidenceLevel}</strong>
      </p>
      
      <section style="margin-bottom: 24px;">
        <h2 style="color: #F2F2F2; font-size: 1.5rem; margin-bottom: 12px; font-weight: 700;">Benefícios Comprovados Clinicamente</h2>
        <ul style="margin-left: 20px; padding: 0;">
          ${supp.benefits.map(b => `<li style="margin-bottom: 8px; color: #9A9A9A;">${b}</li>`).join('')}
        </ul>
      </section>

      ${supp.warnings && supp.warnings.length > 0 ? `
      <section style="margin-bottom: 24px; background: rgba(239, 68, 68, 0.05); border-left: 4px solid #EF4444; padding: 16px; border-radius: 8px;">
        <h2 style="color: #EF4444; font-size: 1.3rem; margin-top: 0; margin-bottom: 10px; font-weight: 700;">Avisos e Cuidados Importantes</h2>
        <ul style="margin-left: 20px; padding: 0; margin-bottom: 0;">
          ${supp.warnings.map(w => `<li style="margin-bottom: 8px; color: #F2F2F2;">${w}</li>`).join('')}
        </ul>
      </section>
      ` : ''}

      ${supp.sideEffects && supp.sideEffects.length > 0 ? `
      <section style="margin-bottom: 24px;">
        <h2 style="color: #F2F2F2; font-size: 1.3rem; margin-bottom: 12px; font-weight: 700;">Efeitos Colaterais Potenciais</h2>
        <ul style="margin-left: 20px; padding: 0;">
          ${supp.sideEffects.map(s => `<li style="margin-bottom: 8px; color: #9A9A9A;">${s}</li>`).join('')}
        </ul>
      </section>
      ` : ''}

      <section style="margin-bottom: 24px; background: rgba(124, 58, 237, 0.06); border: 1px solid rgba(124, 58, 237, 0.15); padding: 18px; border-radius: 12px;">
        <h2 style="color: #7C3AED; font-size: 1.4rem; margin-top: 0; margin-bottom: 12px; font-weight: 700;">Dosagem Clínica e Protocolo</h2>
        <p style="margin-bottom: 8px; color: #F2F2F2;"><strong>Dosagem padrão de manutenção:</strong> ${supp.dosage.maintenance}${supp.dosage.unit} ao dia.</p>
        <p style="margin-bottom: 8px; color: #F2F2F2;"><strong>Limite máximo de segurança diário:</strong> ${supp.dosage.upperLimit || 'N/A'}${supp.dosage.unit}.</p>
        <p style="margin-bottom: 0; color: #F2F2F2;"><strong>Momento do consumo (Timing):</strong> ${supp.dosage.timing || 'A qualquer momento do dia'}.</p>
      </section>

      <div style="margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.07); padding-top: 24px; text-align: center;">
        <p style="color: #9A9A9A; margin-bottom: 16px;">Compare preços deste suplemento na Amazon, Mercado Livre e Shopee e calcule sua dose ideal no app.</p>
        <a href="https://suplilist.com/list?id=${supp.id}" style="display: inline-block; background: #7C3AED; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; transition: background 0.2s;">
          Acessar Comparador de Preços e Calculadora
        </a>
      </div>
    </article>
  </main>
  `;

  // Substituir a tag do router outlet principal pelo nosso artigo de SEO pré-renderizado
  newHtml = newHtml.replace(
    /<main id="router-outlet"[^>]*><\/main>/,
    articleHtml
  );

  // ─── HACK DO ROTEADOR: SE FOR USUÁRIO REAL COM JS, REDIRECIONA PARA A LISTA ────
  const redirectScript = `
  <script>
    // Se o JS da SPA inicializar, redireciona o usuário para abrir o catálogo focado neste item
    sessionStorage.setItem('spa-redirect', 'list?id=${supp.id}');
  </script>
  </head>
  `;
  newHtml = newHtml.replace('</head>', redirectScript);

  const outputPath = path.join(targetDir, 'index.html');
  fs.writeFileSync(outputPath, newHtml, 'utf-8');
  console.log(`✓ Programmatic SEO: /suplemento/${supp.id}`);
});

// ─── 3. REGERAR O SITEMAP.XML DINAMICAMENTE ─────────────────────────────────────
console.log('Regerando o sitemap.xml com as novas rotas de Programmatic SEO...');

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${generatedUrls.map(url => `  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${url.includes('/suplemento/') ? 'weekly' : 'monthly'}</changefreq>
    <priority>${url === 'https://suplilist.com/' ? '1.0' : url.includes('/suplemento/') ? '0.8' : '0.6'}</priority>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(SITEMAP_PATH, sitemapXml, 'utf-8');
console.log(`✓ sitemap.xml updated with ${generatedUrls.length} URLs!`);

console.log('Pré-renderização e Programmatic SEO concluídos com sucesso! 🚀🏆');
