import { ICheckinRepository } from '../../domain/repositories/checkin.repository.interface.js';
import { GetCheckinHistoryRequestDTO, CheckinHistoryResponseDTO } from '@suplilist/shared';

export class GetCheckinHistoryUseCase {
  constructor(private checkinRepository: ICheckinRepository) {}

  async execute(userId: string, query: GetCheckinHistoryRequestDTO): Promise<CheckinHistoryResponseDTO> {
    const limit = Math.min(query.limit || 20, 50); // Hard ceiling de segurança
    const cursorDate = query.before ? new Date(query.before) : new Date();

    // Busca itens estritamente anteriores ao cursor fornecido
    const items = await this.checkinRepository.findPaginated(userId, cursorDate, limit);
    
    // O próximo cursor é o checkedAt do último item retornado, ou null se a lista acabar
    const nextCursor = items.length === limit ? items[items.length - 1].checkedAt.toISOString() : null;

    return {
      items: items.map(item => ({
        id: item.id,
        supplementId: item.supplementId,
        dose: item.dose,
        checkedAt: item.checkedAt.toISOString(),
        syncedAt: item.createdAt.toISOString() // Injetado automaticamente pelo timestamp do Mongoose
      })),
      nextCursor,
      hasMore: nextCursor !== null
    };
  }
}
export default GetCheckinHistoryUseCase;
