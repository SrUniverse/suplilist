import type { ConsentHistoryItemDTO } from '@suplilist/shared';
import type { UserConsent } from '../../domain/user-settings.entity.js';

/**
 * ConsentMapper — converts UserConsent domain entities to the wire DTO.
 *
 * LGPD compliance: the `timestamp` field on the domain entity is a `Date`.
 * The wire contract requires `consentedAt: string` (ISO 8601) to:
 *  1. Survive JSON serialisation without loss of precision.
 *  2. Give the field a semantically meaningful name for API consumers.
 *  3. Prevent accidental mutation of the Date object between layers.
 *
 * The `documentHash` is the server-authoritative SHA-256 of the legal document.
 * It is stored by GrantConsentUseCase / RevokeConsentUseCase from the
 * DocumentCatalogService and reflected here verbatim. The mapper does NOT
 * accept or forward any hash supplied by the caller.
 */
export class ConsentMapper {
  /**
   * Convert a single UserConsent domain entity to the wire DTO.
   * Forces `timestamp.toISOString()` — never relies on implicit Date serialisation.
   */
  static toDTO(consent: UserConsent): ConsentHistoryItemDTO {
    return {
      id: consent.id,
      type: consent.type,
      action: consent.action,
      version: consent.version,
      documentHash: consent.documentHash,
      ipAddress: consent.ipAddress,
      userAgent: consent.userAgent,
      consentedAt: consent.timestamp.toISOString(),
    };
  }

  /** Map an array of domain entities to DTOs in one call. */
  static toDTOList(consents: UserConsent[]): ConsentHistoryItemDTO[] {
    return consents.map(ConsentMapper.toDTO);
  }
}

export default ConsentMapper;
