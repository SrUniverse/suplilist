import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetaManager } from './meta-manager.js';

describe('MetaManager — Dynamic Meta Tags', () => {
  beforeEach(() => {
    // Reset document.head before each test
    document.head.innerHTML = '';
    document.title = '';
  });

  // Helper to get meta tag content by name or property
  function getMetaContent(nameOrProperty, isProperty = false) {
    const selector = isProperty
      ? `meta[property="${nameOrProperty}"]`
      : `meta[name="${nameOrProperty}"]`;
    const el = document.querySelector(selector);
    return el ? el.getAttribute('content') : null;
  }

  // Helper to get OG tag content
  function getOGContent(property) {
    return getMetaContent(property, true);
  }

  // 1. updateMeta() sets title and description for home page
  it('1. updateMeta() sets title and description for home page', () => {
    MetaManager.updateMeta('/');

    expect(document.title).toContain('SupliList');
    expect(getMetaContent('description')).toContain('Compare preços');
  });

  // 2. updateMeta() sets og:title and og:description
  it('2. updateMeta() sets og:title and og:description', () => {
    MetaManager.updateMeta('/');

    expect(getOGContent('og:title')).toContain('SupliList');
    expect(getOGContent('og:description')).toContain('Compare preços');
  });

  // 3. updateMeta() sets og:image and og:url
  it('3. updateMeta() sets og:image and og:url', () => {
    MetaManager.updateMeta('/');

    const image = getOGContent('og:image');
    expect(image).toBeTruthy();
    expect(image).toContain('og-image');

    const url = getOGContent('og:url');
    expect(url).toBe('https://suplilist.com/');
  });

  // 4. updateMeta() sets twitter card tags
  it('4. updateMeta() sets twitter card tags', () => {
    MetaManager.updateMeta('/list');

    expect(getMetaContent('twitter:card')).toBe('summary_large_image');
    expect(getMetaContent('twitter:title')).toContain('Catálogo');
    expect(getMetaContent('twitter:image')).toBeTruthy();
  });

  // 5. updateMeta() sets canonical link
  it('5. updateMeta() sets canonical link', () => {
    MetaManager.updateMeta('/profile');

    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical).toBeTruthy();
    expect(canonical.getAttribute('href')).toBe('https://suplilist.com/profile');
  });

  // 6. updateMeta() updates different pages with correct content
  it('6. updateMeta() updates different pages with correct content', () => {
    MetaManager.updateMeta('/faq');

    expect(document.title).toContain('Perguntas Frequentes');
    expect(getMetaContent('description')).toContain('dúvidas');

    MetaManager.updateMeta('/list');

    expect(document.title).toContain('Catálogo');
    expect(getMetaContent('description')).toContain('57+');
  });

  // 7. updateMeta() accepts custom context to override defaults
  it('7. updateMeta() accepts custom context to override defaults', () => {
    const customContext = {
      title: 'Custom Title',
      description: 'Custom Description',
      image: 'https://example.com/custom.png'
    };

    MetaManager.updateMeta('/home', customContext);

    expect(document.title).toBe('Custom Title');
    expect(getMetaContent('description')).toBe('Custom Description');
    expect(getOGContent('og:image')).toBe('https://example.com/custom.png');
  });

  // 8. updateMeta() sets og:type and og:site_name
  it('8. updateMeta() sets og:type and og:site_name', () => {
    MetaManager.updateMeta('/');

    expect(getOGContent('og:type')).toBe('website');
    expect(getOGContent('og:site_name')).toBe('SupliList');
  });

  // 9. updateMeta() sets locale to pt_BR
  it('9. updateMeta() sets locale to pt_BR', () => {
    MetaManager.updateMeta('/');

    expect(getOGContent('og:locale')).toBe('pt_BR');
  });

  // 10. updateMeta() handles unknown routes with default meta
  it('10. updateMeta() handles unknown routes with default meta', () => {
    MetaManager.updateMeta('/unknown-route');

    expect(document.title).toContain('SupliList');
    expect(getMetaContent('description')).toContain('Compare preços');
  });

  // 11. updateMeta() creates meta tags if they don't exist
  it('11. updateMeta() creates meta tags if they don\'t exist', () => {
    document.head.innerHTML = ''; // Clear head

    MetaManager.updateMeta('/');

    expect(document.querySelector('meta[name="description"]')).toBeTruthy();
    expect(document.querySelector('meta[property="og:title"]')).toBeTruthy();
    expect(document.querySelector('link[rel="canonical"]')).toBeTruthy();
  });

  // 12. updateMeta() updates existing meta tags
  it('12. updateMeta() updates existing meta tags', () => {
    const descEl = document.createElement('meta');
    descEl.setAttribute('name', 'description');
    descEl.setAttribute('content', 'Old description');
    document.head.appendChild(descEl);

    MetaManager.updateMeta('/');

    expect(getMetaContent('description')).not.toBe('Old description');
    expect(getMetaContent('description')).toContain('Compare preços');
  });

  // 13. updateMeta() sets og:image:width and og:image:height
  it('13. updateMeta() sets og:image:width and og:image:height', () => {
    MetaManager.updateMeta('/');

    expect(getOGContent('og:image:width')).toBe('1200');
    expect(getOGContent('og:image:height')).toBe('630');
  });

  // 14. updateMeta() sets keywords meta tag
  it('14. updateMeta() sets keywords meta tag', () => {
    MetaManager.updateMeta('/list');

    const keywords = getMetaContent('keywords');
    expect(keywords).toBeTruthy();
    expect(keywords).toContain('suplementos');
  });
});
