/**
 * Contrato de wire do módulo Profile.
 *
 * Estes são os DTOs que cruzam a fronteira HTTP — datas são `string` (ISO 8601),
 * pois é o que `res.json()` serializa e o que o frontend de fato recebe.
 * As entidades de domínio (com `Date`) permanecem no backend.
 */

export type AvatarStatus = 'none' | 'pending_moderation' | 'approved' | 'rejected';

/** Perfil público — projeção segura, sem dados privados. */
export interface PublicProfileDTO {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  avatarStatus: AvatarStatus;
}

/** Perfil privado — visível apenas para o próprio dono autenticado. */
export interface PrivateProfileDTO extends PublicProfileDTO {
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  updatedAt: string;
}
