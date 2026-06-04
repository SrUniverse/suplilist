import { z } from 'zod';
import { IUserSettingsRepository } from '../../repositories/user-settings.repository.js';
import { UserSettings } from '../../domain/user-settings.entity.js';
import { runWithRetry } from '../../../../shared/application/helpers/retry.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

const updateLocaleSchema = z.object({
  locale: z.string().min(2).max(10).trim(),
  timezone: z.string().min(1).max(100).trim(),
});

export type UpdateLocaleInput = z.infer<typeof updateLocaleSchema>;

export class UpdateLocaleUseCase {
  constructor(
    private settingsRepo: IUserSettingsRepository,
    private uow: IUnitOfWork
  ) {}

  async execute(userId: string, input: UpdateLocaleInput): Promise<UserSettings> {
    const validatedInput = updateLocaleSchema.parse(input);

    return runWithRetry(async () => {
      return this.uow.runInTransaction(async () => {
        const settings = await this.settingsRepo.findByUserId(userId);
        if (!settings) {
          throw new Error('EntityNotFoundError: Configurações do usuário não encontradas.');
        }

        settings.locale = validatedInput.locale;
        settings.timezone = validatedInput.timezone;

        return this.settingsRepo.save(settings);
      });
    });
  }
}
export default UpdateLocaleUseCase;
