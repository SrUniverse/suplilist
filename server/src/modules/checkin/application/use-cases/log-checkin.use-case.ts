import { ICheckinRepository } from '../../domain/repositories/checkin.repository.interface.js';
import { LogCheckinRequestDTO, CheckinDTO } from '../../../../../shared/src/checkin.js';

export interface LogCheckinResult {
  data: CheckinDTO;
  isDuplicate: boolean;
}

export class LogCheckinUseCase {
  constructor(private checkinRepository: ICheckinRepository) {}

  async execute(userId: string, payload: LogCheckinRequestDTO): Promise<LogCheckinResult> {
    const result = await this.checkinRepository.upsertIdempotent(userId, payload);
    
    return {
      data: {
        id: result.data.id,
        supplementId: result.data.supplementId,
        dose: result.data.dose,
        checkedAt: result.data.checkedAt.toISOString(),
        syncedAt: result.data.createdAt.toISOString()
      },
      isDuplicate: result.isDuplicate
    };
  }
}
export default LogCheckinUseCase;
