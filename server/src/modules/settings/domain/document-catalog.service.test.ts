import { describe, it, expect } from 'vitest';
import { DocumentCatalogService } from './document-catalog.service.js';

describe('DocumentCatalogService.getCurrentVersion', () => {
  const catalog = new DocumentCatalogService();

  it('returns the highest SemVer version for a type with multiple versions', () => {
    expect(catalog.getCurrentVersion('privacy_policy')).toBe('2.0.0');
    expect(catalog.getCurrentVersion('terms_of_service')).toBe('2.0.0');
  });

  it('returns the only version when a type has a single version', () => {
    expect(catalog.getCurrentVersion('marketing_emails')).toBe('1.0.0');
  });

  it('resolves to a version whose hash is retrievable (round-trip)', () => {
    const type = 'privacy_policy';
    const current = catalog.getCurrentVersion(type)!;
    expect(catalog.getHashForVersion(type, current)).not.toBeNull();
  });
});
