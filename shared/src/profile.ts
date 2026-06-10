/**
 * Contrato de wire do módulo Profile.
 *
 * Estes são os DTOs que cruzam a fronteira HTTP — datas são `string` (ISO 8601),
 * pois é o que `res.json()` serializa e o que o frontend de fato recebe.
 * As entidades de domínio (com `Date`) permanecem no backend.
 */

export type AvatarStatus = 'none' | 'synced' | 'pending_moderation' | 'approved' | 'rejected';
export type SubscriptionTier = 'free' | 'pro' | 'elite';
export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired';

/** Dados biométricos básicos, cruciais para a calculadora de dosagem. */
export interface BiometricsDTO {
  /** Peso em quilogramas (kg) */
  weight?: number;
  /** Sexo biológico ao nascer (necessário para fórmulas metabólicas/hormonais) */
  biologicalSex?: 'male' | 'female';
}

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
  onboardingState: 'pending' | 'completed';
  goals: string[];
  biometrics?: BiometricsDTO;
  createdAt: string;
  updatedAt: string;
  /**
   * Monotonic counter that the MigrationService writes after successfully
   * uploading all local IndexedDB data to the backend.
   *
   * `undefined` → migration never ran (legacy user or new user with no local data).
   * `1`         → v1 migration complete (stack + favorites + checkins uploaded).
   *
   * The frontend checks this field in `initializeSession()` to skip re-migration
   * on subsequent logins — even if the user cleared their localStorage.
   *
   * The backend accepts but never auto-increments this field; only the
   * MigrationService on the client may write it via PATCH /api/profile/me.
   */
  migrationVersion?: number;

  // Campos de assinatura SaaS — fonte única de verdade para o frontend
  tier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  /** ISO 8601 string ou null se nunca assinou */
  currentPeriodEnd: string | null;
}

/** Payload para atualizar o perfil. A versão de concorrência não viaja aqui, mas no header If-Match. */
export interface UpdateProfileRequestDTO {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string;
  onboardingState?: 'pending' | 'completed';
  goals?: string[];
  biometrics?: BiometricsDTO;
}
