import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaManager } from './schema-manager.js';

describe('SchemaManager — JSON-LD Structured Data', () => {
  beforeEach(() => {
    // Clear all schemas before each test
    SchemaManager.clearSchemas();
    document.head.innerHTML = '';
  });

  // Helper to get last inserted script
  function _getLastSchema() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    return scripts.length > 0 ? JSON.parse(scripts[scripts.length - 1].textContent) : null;
  }

  // 1. createFAQPageSchema() returns valid FAQPage structure
  it('1. createFAQPageSchema() returns valid FAQPage structure', () => {
    const faqs = [
      { question: 'O que é creatina?', answer: 'Creatina é um amino ácido...' },
      { question: 'É segura?', answer: 'Sim, é segura quando usada...' }
    ];

    const schema = SchemaManager.createFAQPageSchema(faqs);

    expect(schema['@type']).toBe('FAQPage');
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0]['@type']).toBe('Question');
    expect(schema.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
  });

  // 2. createWebApplicationSchema() returns WebApplication with correct properties
  it('2. createWebApplicationSchema() returns WebApplication with correct properties', () => {
    const schema = SchemaManager.createWebApplicationSchema();

    expect(schema['@type']).toBe('WebApplication');
    expect(schema.name).toBe('SupliList');
    expect(schema.url).toBe('https://suplilist.com');
    expect(schema.applicationCategory).toBe('HealthApplication');
    expect(schema.operatingSystem).toBe('Web');
    expect(schema.offers.price).toBe('0'); // Free app
  });

  // 3. createProductSchema() generates product with offers
  it('3. createProductSchema() generates product with offers', () => {
    const supplement = {
      name: 'Creatina Monohidratada',
      description: 'Pura e de qualidade',
      offers: [
        { retailer: 'Amazon', url: 'https://amazon.com.br/...', price: '29.90' },
        { retailer: 'Mercado Livre', url: 'https://mercadolivre.com.br/...', price: '32.00' }
      ]
    };

    const schema = SchemaManager.createProductSchema(supplement);

    expect(schema['@type']).toBe('Product');
    expect(schema.name).toBe('Creatina Monohidratada');
    expect(schema.offers).toHaveLength(2);
    expect(schema.offers[0].seller.name).toBe('Amazon');
  });

  // 4. createProductSchema() includes evidence rating
  it('4. createProductSchema() includes evidence rating', () => {
    const supplement = {
      name: 'Whey Protein',
      evidence: 'A',
      offers: []
    };

    const schema = SchemaManager.createProductSchema(supplement);

    expect(schema.aggregateRating).toBeTruthy();
    expect(schema.aggregateRating.ratingValue).toBe(5); // A = 5 stars
    expect(schema.aggregateRating.ratingExplanation).toContain('Nível de Evidência: A');
  });

  // 5. createBreadcrumbSchema() generates correct list structure
  it('5. createBreadcrumbSchema() generates correct list structure', () => {
    const items = [
      { name: 'Home', url: '/' },
      { name: 'Catálogo', url: '/list' },
      { name: 'Creatina', url: '/suplemento/creatina' }
    ];

    const schema = SchemaManager.createBreadcrumbSchema(items);

    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(3);
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[1].item).toBe('https://suplilist.com/list');
  });

  // 6. createOrganizationSchema() includes contactPoint
  it('6. createOrganizationSchema() includes contactPoint', () => {
    const schema = SchemaManager.createOrganizationSchema();

    expect(schema['@type']).toBe('Organization');
    expect(schema.name).toBe('SupliList');
    expect(schema.contactPoint['@type']).toBe('ContactPoint');
    expect(schema.contactPoint.email).toBe('support@suplilist.com');
  });

  // 7. insertSchema() creates script tag with JSON-LD
  it('7. insertSchema() creates script tag with JSON-LD', () => {
    const schema = { '@type': 'FAQPage', url: 'https://suplilist.com/faq' };
    SchemaManager.insertSchema(schema);

    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
    expect(script.textContent).toContain('FAQPage');
  });

  // 8. insertSchema() removes old schema of same type
  it('8. insertSchema() removes old schema of same type', () => {
    const schema = { '@type': 'FAQPage', url: 'https://suplilist.com/faq' };

    SchemaManager.insertSchema(schema);
    let scripts = document.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);

    // Insert same type again
    SchemaManager.insertSchema(schema);
    scripts = document.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1); // Should still be 1, not 2
  });

  // 9. insertSchema() allows multiple different schemas
  it('9. insertSchema() allows multiple different schemas', () => {
    const faqSchema = { '@type': 'FAQPage', url: 'https://suplilist.com/faq' };
    const orgSchema = { '@type': 'Organization', name: 'SupliList' };

    SchemaManager.insertSchema(faqSchema);
    SchemaManager.insertSchema(orgSchema);

    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(2);
  });

  // 10. createSearchResultsSchema() generates correct structure
  it('10. createSearchResultsSchema() generates correct structure', () => {
    const supplements = [
      { name: 'Creatina' },
      { name: 'Whey Protein' },
      { name: 'Cafeína' }
    ];

    const schema = SchemaManager.createSearchResultsSchema(supplements, 'energia');

    expect(schema['@type']).toBe('SearchResultsPage');
    expect(schema.mainEntity).toBeDefined();
    expect(schema.url).toContain('q=energia');
  });

  // 11. clearSchemas() removes all JSON-LD scripts
  it('11. clearSchemas() removes all JSON-LD scripts', () => {
    SchemaManager.insertSchema({ '@type': 'FAQPage', url: 'https://suplilist.com/faq' });
    SchemaManager.insertSchema({ '@type': 'Organization', name: 'SupliList' });

    let scripts = document.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(2);

    SchemaManager.clearSchemas();
    scripts = document.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(0);
  });

  // 12. createProductSchema() includes dosage information
  it('12. createProductSchema() includes dosage information', () => {
    const supplement = {
      name: 'Creatina',
      dosage: {
        daily: '5g',
        minimum: '3g',
        maximum: '10g',
        value: '5',
        unit: 'g'
      },
      offers: []
    };

    const schema = SchemaManager.createProductSchema(supplement);

    expect(schema.recommendedIntake).toBeTruthy();
    expect(schema.recommendedIntake.dailyValue).toBe('5g');
  });

  // 13. Evidence rating mapping works correctly
  it('13. Evidence rating mapping works correctly', () => {
    const ratings = [
      { evidence: 'A', expected: 5 },
      { evidence: 'B', expected: 4 },
      { evidence: 'C', expected: 3 },
      { evidence: 'D', expected: 2 },
      { evidence: 'E', expected: 1 }
    ];

    ratings.forEach(({ evidence, expected }) => {
      const supplement = { name: 'Test', evidence, offers: [] };
      const schema = SchemaManager.createProductSchema(supplement);
      expect(schema.aggregateRating.ratingValue).toBe(expected);
    });
  });

  // 14. WebApplicationSchema includes aggregateRating
  it('14. WebApplicationSchema includes aggregateRating', () => {
    const schema = SchemaManager.createWebApplicationSchema();

    expect(schema.aggregateRating).toBeTruthy();
    expect(schema.aggregateRating['@type']).toBe('AggregateRating');
    expect(schema.aggregateRating.ratingValue).toBe('4.8');
    expect(schema.aggregateRating.ratingCount).toBe('1200');
  });
});
