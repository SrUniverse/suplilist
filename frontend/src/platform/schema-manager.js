// ============================================================
// Schema Manager — JSON-LD Structured Data
// ============================================================
// Gera e insere JSON-LD schemas para:
// - FAQPage (/faq)
// - WebApplication (home)
// - Product (supplement pages)
// - BreadcrumbList (navigation)
// - Organization (footer)

export class SchemaManager {
  /**
   * Insere um schema JSON-LD no <head>
   */
  static insertSchema(schema) {
    // Remove old schema do mesmo tipo se existir
    const oldScript = document.querySelector(`script[data-schema-type="${schema['@type']}-${schema.url || schema.name || ''}"]`);
    if (oldScript) {
      oldScript.remove();
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema-type', `${schema['@type']}-${schema.url || schema.name || ''}`);
    script.textContent = JSON.stringify(schema, null, 2);
    document.head.appendChild(script);
  }

  /**
   * Schema para página de FAQs
   */
  static createFAQPageSchema(faqs) {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      url: 'https://suplilist.com/faq',
      name: 'Perguntas Frequentes | SupliList',
      description: 'Dúvidas sobre suplementação, evidências científicas e como usar SupliList',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    };
  }

  /**
   * Schema para WebApplication (home page)
   */
  static createWebApplicationSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'SupliList',
      url: 'https://suplilist.com',
      description: 'Comparador inteligente de suplementos com cálculo de dosagem e evidências científicas',
      applicationCategory: 'HealthApplication',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'BRL'
      },
      operatingSystem: 'Web',
      screenshot: [
        'https://suplilist.com/screenshot-1.png',
        'https://suplilist.com/screenshot-2.png'
      ],
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '1200',
        bestRating: '5',
        worstRating: '1'
      }
    };
  }

  /**
   * Schema para página de suplemento (Product)
   */
  static createProductSchema(supplement) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: supplement.name,
      description: supplement.description || `${supplement.name} — Suplemento com evidência científica`,
      url: `https://suplilist.com/suplemento/${encodeURIComponent(supplement.name.toLowerCase().replace(/\s+/g, '-'))}`,
      image: supplement.imageUrl || 'https://suplilist.com/supplement-default.png',
      brand: {
        '@type': 'Brand',
        name: 'SupliList'
      },
      // Preços dos principais varejistas
      offers: (supplement.offers || []).map(offer => ({
        '@type': 'Offer',
        name: offer.retailer,
        url: offer.url,
        price: offer.price,
        priceCurrency: 'BRL',
        seller: {
          '@type': 'Organization',
          name: offer.retailer
        }
      })),
      // Evidência científica
      aggregateRating: supplement.evidence ? {
        '@type': 'AggregateRating',
        ratingValue: this._evidenceToRating(supplement.evidence),
        bestRating: '5',
        worstRating: '1',
        ratingExplanation: `Nível de Evidência: ${supplement.evidence}`
      } : undefined,
      // Dosagem recomendada
      recommendedIntake: supplement.dosage ? {
        '@type': 'RecommendedIntake',
        dailyValue: supplement.dosage.daily,
        recommendedIntakeMaximum: supplement.dosage.maximum,
        recommendedIntakeMinimum: supplement.dosage.minimum,
        value: supplement.dosage.value,
        unitText: supplement.dosage.unit
      } : undefined,
      // Benefícios
      benefits: supplement.benefits || []
    };
  }

  /**
   * Schema para BreadcrumbList (navegação)
   */
  static createBreadcrumbSchema(items) {
    // items: [{ name: 'Home', url: '/' }, { name: 'Catálogo', url: '/list' }, ...]
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `https://suplilist.com${item.url}`
      }))
    };
  }

  /**
   * Schema para Organization (footer/identidade)
   */
  static createOrganizationSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'SupliList',
      url: 'https://suplilist.com',
      logo: 'https://suplilist.com/logo.png',
      description: 'Plataforma 100% offline para comparação inteligente de suplementos com evidência científica',
      sameAs: [
        'https://twitter.com/suplilist',
        'https://instagram.com/suplilist'
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Support',
        email: 'support@suplilist.com'
      },
      // Certificações/credibilidade
      knowsAbout: [
        'Nutrition',
        'Sports Nutrition',
        'Supplements',
        'Health Science'
      ]
    };
  }

  /**
   * Schema para página de busca/catálogo (SearchResultsPage)
   */
  static createSearchResultsSchema(supplements, query) {
    return {
      '@context': 'https://schema.org',
      '@type': 'SearchResultsPage',
      name: `Resultados para "${query}" | SupliList`,
      url: `https://suplilist.com/list?q=${encodeURIComponent(query)}`,
      description: `${supplements.length} suplementos encontrados para "${query}"`,
      mainEntity: supplements.slice(0, 10).map(supp => ({
        '@type': 'Product',
        name: supp.name,
        url: `https://suplilist.com/suplemento/${encodeURIComponent(supp.name.toLowerCase().replace(/\s+/g, '-'))}`
      }))
    };
  }

  /**
   * Converte nível de evidência científica para rating 1-5
   */
  static _evidenceToRating(evidence) {
    const ratings = {
      'A': 5,
      'B': 4,
      'C': 3,
      'D': 2,
      'E': 1
    };
    return ratings[evidence] || 3;
  }

  /**
   * Remove todos os schemas JSON-LD
   */
  static clearSchemas() {
    document.querySelectorAll('script[type="application/ld+json"][data-schema-type]').forEach(el => el.remove());
  }
}

export default SchemaManager;
