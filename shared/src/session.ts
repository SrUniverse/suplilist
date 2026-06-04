/**
 * Contrato de wire para sessões ativas (módulo Identity).
 * Datas como `string` (ISO 8601) — formato de wire após serialização JSON.
 */
export interface ActiveSessionDTO {
  id: string;
  deviceLabel: string | null;
  userAgent: string;
  ipAddress: string;
  issuedAt: string;
  expiresAt: string;
}
