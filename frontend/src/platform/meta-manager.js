// ============================================================
// Meta Manager — Dynamic Meta Tags for SEO
// ============================================================
// Atualiza title, description, og:*, twitter:* tags dinamicamente
// baseado na rota atual e contexto da página.
//
// Uso:
//   MetaManager.updateMeta('/');                      // Home page
//   MetaManager.updateMeta('/suplemento/creatina', {  // Product page with custom data
//     title: 'Creatina Monohidratada | SupliList',
//     description: 'Melhor creatina 100% pura com preços comparados',
//     image: 'https://example.com/creatina.jpg'
//   });

export class MetaManager {
  static DEFAULT_META = {
    title: 'SupliList | Suplementos com Evidência Científica — Compare Preços e Doses',
    description: 'Compare preços de creatina, whey protein, vitaminas e 57+ suplementos baratos na Amazon, Mercado Livre e Shopee. Calcule doses pelo seu peso. Comece grátis.',
    image: 'https://suplilist.com/og-image.png',
    url: 'https://suplilist.com'
  };

  static PAGE_META = {
    '/': {
      title: 'SupliList | Suplementos Baratos com Evidência Científica — Compare Preços e Doses',
      description: 'Compare preços de creatina, whey protein, vitaminas e 57+ suplementos baratos. Calcule doses baseadas no seu peso. Grátis, offline e sem cadastro.',
      keywords: 'suplementos, suplemento barato, suplementos para academia, creatina, whey protein, vitaminas, comparador de preços suplementos, stack de suplementos'
    },
    '/home': {
      title: 'SupliList | Suplementos Baratos com Evidência Científica — Compare Preços e Doses',
      description: 'Compare preços de creatina, whey protein, vitaminas e 57+ suplementos baratos. Calcule doses baseadas no seu peso. Grátis, offline e sem cadastro.',
      keywords: 'suplementos, suplemento barato, suplementos para academia, creatina, whey protein, vitaminas, comparador de preços suplementos, stack de suplementos'
    },
    '/list': {
      title: 'Catálogo de Suplementos Baratos com Evidência Científica | SupliList',
      description: 'Catálogo com 57+ suplementos esportivos e fitoterápicos. Compare preços na Amazon, Mercado Livre e Shopee. Classificados por Evidência Científica (Grau A, B, C).',
      keywords: 'suplemento barato, catalogo suplementos, whey protein barato, creatina monohidratada, vitamina d3, omega 3 barato, suplementos para academia, comprar suplemento'
    },
    '/my-stack': {
      title: 'Meu Stack de Suplementos | SupliList',
      description: 'Monte e gerencie seu stack personalizado de suplementos diários. Organize horários, doses e acompanhe o consumo.',
      keywords: 'stack suplementos, montar stack, suplementos diarios, rotina de suplementos academia'
    },
    '/favorites': {
      title: 'Suplementos Favoritos | SupliList',
      description: 'Seus suplementos favoritos salvos para rápido acesso, comparação de dosagem e monitoramento de preços.',
      keywords: 'favoritos suplementos, lista suplementos, salvar suplementos'
    },
    '/checkin': {
      title: 'Check-in de Suplementação Diária | SupliList',
      description: 'Registre seu consumo diário de suplementos. Monitore a consistência do seu stack ao longo do tempo.',
      keywords: 'checkin suplementos, consistencia treinos, registro suplementos diario'
    },
    '/history': {
      title: 'Histórico de Suplementação | SupliList',
      description: 'Histórico detalhado do seu consumo de suplementação diária, check-ins passados e métricas de consistência.',
      keywords: 'historico suplementos, consumo creatina, log suplementacao, aderencia'
    },
    '/dosage': {
      title: 'Calculadora de Dosagem de Suplementos por Peso | SupliList',
      description: 'Calcule a dosagem ideal de creatina, whey protein, cafeína e outros suplementos de acordo com seu peso corporal e objetivo de treino.',
      keywords: 'dosagem creatina por peso, calcular dose whey protein, quanto tomar creatina, dose suplemento por kg, calculadora suplementos'
    },
    '/profile': {
      title: 'Meu Perfil | SupliList',
      description: 'Gerencie suas informações físicas, peso e objetivos de treino para cálculo automático de dosagem ideal de suplementos.',
      keywords: 'perfil fisico, calcular dose peso corporal, dados corporais suplementos'
    },
    '/settings': {
      title: 'Configurações | SupliList',
      description: 'Ajuste preferências do app, gerencie dados locais, exporte/importe backups e customize o tema visual.',
      keywords: 'configuracoes suplilist, backup suplementos, exportar dados, privacidade'
    },
    '/faq': {
      title: 'Perguntas Frequentes sobre Suplementos | SupliList',
      description: 'Tire suas dúvidas sobre suplementos, evidências científicas, dosagens e como usar o SupliList offline.',
      keywords: 'faq suplementos, duvidas creatina, como tomar suplemento, evidencia cientifica suplementos'
    },
    '/legal': {
      title: 'Termos de Uso & Política de Privacidade | SupliList',
      description: 'Leia os termos de uso e a política de privacidade do SupliList. 100% focado em privacidade, sem coleta de dados pessoais.',
      keywords: 'termos de uso suplementos, privacidade app saude, dados pessoais'
    },
    '/onboarding': {
      title: 'Configurar Meu Perfil de Suplementação | SupliList',
      description: 'Configure seu perfil de suplementação personalizada: peso, objetivo e orçamento para recomendações precisas.',
      keywords: 'configurar suplementacao, perfil treino, iniciar suplementos'
    },
    '/suplemento': {
      title: 'Informações Detalhadas do Suplemento | SupliList',
      description: 'Veja evidências científicas, dosagem recomendada por peso e comparação de preços do suplemento.',
      keywords: 'suplemento, dose recomendada, evidencia cientifica, preco suplemento'
    }
  };

  /**
   * Atualiza meta tags baseado na rota.
   * Para rotas dinâmicas como /suplemento/:id, passa context com título e descrição do produto.
   */
  static updateMeta(path, context = {}) {
    // Tenta encontrar meta exato, ou usa default
    let meta = this.PAGE_META[path] || this.DEFAULT_META;

    // Se é uma rota com parâmetro (ex: /suplemento/creatina), tenta encontrar base da rota
    if (!this.PAGE_META[path] && path.includes('/')) {
      const segments = path.split('/');
      const basePath = '/' + segments[1]; // e.g., /suplemento ou /list
      meta = this.PAGE_META[basePath] || this.DEFAULT_META;
    }

    const title = context.title || meta.title;
    const description = context.description || meta.description;
    const keywords = context.keywords || meta.keywords;
    const image = context.image || this.DEFAULT_META.image;
    const url = `https://suplilist.com${path}`;

    // 1. Update <title>
    document.title = title;

    // 2. Update <meta name="description">
    this._updateMetaTag('description', description);

    // 3. Update <meta name="keywords">
    if (keywords) {
      this._updateMetaTag('keywords', keywords);
    }

    // 4. Update Open Graph tags
    this._updateOGTags(title, description, image, url);

    // 5. Update Twitter Card tags
    this._updateTwitterTags(title, description, image, url);

    // 6. Update Canonical URL
    this._updateCanonical(url);
  }

  static _updateMetaTag(name, content) {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  static _updateOGTags(title, description, image, url) {
    this._updateOGTag('og:title', title);
    this._updateOGTag('og:description', description);
    this._updateOGTag('og:image', image);
    this._updateOGTag('og:image:width', '1200');
    this._updateOGTag('og:image:height', '630');
    this._updateOGTag('og:url', url);
    this._updateOGTag('og:type', 'website');
    this._updateOGTag('og:site_name', 'SupliList');
    this._updateOGTag('og:locale', 'pt_BR');
  }

  static _updateOGTag(property, content) {
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  static _updateTwitterTags(title, description, image, _url) {
    this._updateMetaTag('twitter:card', 'summary_large_image');
    this._updateMetaTag('twitter:title', title);
    this._updateMetaTag('twitter:description', description);
    this._updateMetaTag('twitter:image', image);
    this._updateMetaTag('twitter:site', '@suplilist');
  }

  static _updateCanonical(url) {
    let el = document.querySelector('link[rel="canonical"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', 'canonical');
      document.head.appendChild(el);
    }
    el.setAttribute('href', url);
  }
}

export default MetaManager;
