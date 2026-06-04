import { ConsentType } from './user-settings.entity.js';

export class DocumentCatalogService {
  // White-list of legal versions and their corresponding SHA-256 hashes
  private readonly catalog: Record<ConsentType, Record<string, string>> = {
    privacy_policy: {
      '1.0.0': '8f4e2b6a2c3f8c5d1e7b9a0c3f5d2e1b8a4f9c6d3e8b0a7c5d2e1b4f9a0c3f5d',
      '2.0.0': '3f5d2e1b8a4f9c6d3e8b0a7c5d2e1b4f9a0c3f5d8f4e2b6a2c3f8c5d1e7b9a0c',
    },
    terms_of_service: {
      '1.0.0': '1e7b9a0c3f5d2e1b8a4f9c6d3e8b0a7c5d2e1b4f9a0c3f5d8f4e2b6a2c3f8c5d',
      '2.0.0': 'a4f9c6d3e8b0a7c5d2e1b4f9a0c3f5d8f4e2b6a2c3f8c5d1e7b9a0c3f5d2e1b',
    },
    marketing_emails: {
      '1.0.0': '3e8b0a7c5d2e1b4f9a0c3f5d8f4e2b6a2c3f8c5d1e7b9a0c3f5d2e1b8a4f9c6d',
    },
  };

  /**
   * Retrieves the official SHA-256 hash for a given document type and version.
   * Returns null if the version is not registered in the catalog.
   */
  getHashForVersion(type: ConsentType, version: string): string | null {
    const versions = this.catalog[type];
    if (!versions) return null;
    return versions[version] || null;
  }
}
export default DocumentCatalogService;
