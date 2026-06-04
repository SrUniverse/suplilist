/**
 * Envelope de resposta padrão da API do SupliList.
 * Usado por todos os controllers do backend e consumido pelo frontend.
 *
 * Em respostas de sucesso: { success: true, data: T }
 * Em respostas de erro:     { success: false, error: string, message?: string }
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
