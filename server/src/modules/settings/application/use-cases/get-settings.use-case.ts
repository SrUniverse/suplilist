import { IUserSettingsRepository } from '../../repositories/user-settings.repository.js';
import { UserSettings } from '../../domain/user-settings.entity.js';

export class GetSettingsUseCase {
  constructor(private settingsRepo: IUserSettingsRepository) {}

  async execute(userId: string): Promise<UserSettings> {
    const settings = await this.settingsRepo.findByUserId(userId);
    if (!settings) {
      throw new Error('EntityNotFoundError: Configurações do usuário não encontradas.');
    }
    return settings;
  }
}
export default GetSettingsUseCase;
