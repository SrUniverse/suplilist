import { IUserConsentRepository } from '../../repositories/user-consent.repository.js';
import { UserConsent } from '../../domain/user-settings.entity.js';

export class GetConsentHistoryUseCase {
  constructor(private consentsRepo: IUserConsentRepository) {}

  async execute(userId: string): Promise<UserConsent[]> {
    return this.consentsRepo.findHistoryByUserId(userId);
  }
}
export default GetConsentHistoryUseCase;
