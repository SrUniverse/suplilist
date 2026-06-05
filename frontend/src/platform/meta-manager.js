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
    title: 'SupliList | Suplementos com Evidência Científica',
    description: 'Compare preços de 57+ suplementos na Amazon, Mercado Livre e Shopee. Calcule doses personalizadas. 100% offline e gratuito.',
    image: 'https://suplilist.com/og-image.png',
    url: 'https://suplilist.com'
  };

  static PAGE_META = {
    '/': {
      title: 'SupliList | Suplementos com Evidência Científica — Compare Preços e Doses',
      description: 'Compare preços de creatina, whey protein, vitaminas e 57+ suplementos. Calcule doses baseadas no seu peso. 100% offline e gratuito.',
      keywords: 'suplementos, creatina, whey protein, vitaminas, comparador de preços'
    },
    '/home': {
      title: 'SupliList | Suplementos com Evidência Científica — Compare Preços e Doses',
      description: 'Compare preços de creatina, whey protein, vitaminas e 57+ suplementos. Calcule doses baseadas no seu peso. 100% offline e gratuito.',
      keywords: 'suplementos, creatina, whey protein, vitaminas, comparador de preços'
    },
    '/list': {
      title: 'Catálogo de Suplementos | SupliList',
      description: 'Veja o catálogo completo com 57+ suplementos esportivos e fitoterápicos. Classificados por Nível de Evidência Científica (Grau A, B, C).',
      keywords: 'catálogo suplementos, whey protein barato, creatina pura'
    },
    '/my-stack': {
      title: 'Meu Stack | SupliList',
      description: 'Gerencie seu stack personalizado de suplementos diários. Organize horários e doses.',
      keywords: 'stack suplementos, suplementos diários, rotina'
    },
    '/favorites': {
      title: 'Favoritos | SupliList',
      description: 'Seus suplementos favoritos salvos para rápido acesso e comparação.',
      keywords: 'favoritos, suplementos salvos'
    },
    '/checkin': {
      title: 'Check-in Diário | SupliList',
      description: 'Registre seu consumo diário de suplementação. Monitore a consistência ao longo do tempo.',
      keywords: 'checkin, registro suplementos'
    },
    '/history': {
      title: 'Histórico | SupliList',
      description: 'Histórico detalhado do seu consumo de suplementação diária e check-ins.',
      keywords: 'histórico suplementos, consumo'
    },
    '/dosage': {
      title: 'Calculadora de Dosagem | SupliList',
      description: 'Calcule a dosagem ideal de creatina, whey protein, cafeína e outros suplementos de acordo com seu peso.',
      keywords: 'dosagem creatina, calcular whey protein'
    },
    '/profile': {
      title: 'Meu Perfil | SupliList',
      description: 'Gerencie suas informações físicas e preferências para cálculo automático de dosagem.',
      keywords: 'perfil, dados corporais'
    },
    '/settings': {
      title: 'Configurações | SupliList',
      description: 'Ajuste preferências, gerencie dados locais e exporte/importe backups.',
      keywords: 'configurações, backup, dados'
    },
    '/faq': {
      title: 'Perguntas Frequentes | SupliList',
      description: 'Tire suas dúvidas sobre o SupliList, evidências científicas e dosagens.',
      keywords: 'FAQ, dúvidas, perguntas frequentes'
    },
    '/legal': {
      title: 'Termos & Privacidade | SupliList',
      description: 'Leia os termos de uso e política de privacidade. 100% focado em privacidade.',
      keywords: 'termos, privacidade'
    },
    '/onboarding': {
      title: 'Bem-vindo | SupliList',
      description: 'Faça o onboarding e configure seu perfil de suplementação personalizada.',
      keywords: 'onboarding, cadastro'
    },
    '/suplemento': {
      title: 'Detalhe do Suplemento | SupliList',
      description: 'Veja informações completas, evidências científicas e preços do suplemento.',
      keywords: 'suplemento, preços, evidências científicas'
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
