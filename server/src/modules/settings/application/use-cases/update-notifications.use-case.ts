import { z } from 'zod';
import { IUserSettingsRepository } from '../../repositories/user-settings.repository.js';
import { UserSettings } from '../../domain/user-settings.entity.js';
import { runWithRetry } from '../../../../shared/application/helpers/retry.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

const updateNotificationsSchema = z.object({
  email: z.object({
    marketing: z.boolean(),
    productUpdates: z.boolean(),
  }),
  push: z.object({
    enabled: z.boolean(),
    marketing: z.boolean(),
    reminders: z.boolean(),
  }),
});

export type UpdateNotificationsInput = z.infer<typeof updateNotificationsSchema>;

export class UpdateNotificationsUseCase {
  constructor(
    private settingsRepo: IUserSettingsRepository,
    private uow: IUnitOfWork
  ) {}

  async execute(userId: string, input: UpdateNotificationsInput): Promise<UserSettings> {
    const validatedInput = updateNotificationsSchema.parse(input);

    return runWithRetry(async () => {
      return this.uow.runInTransaction(async () => {
        const settings = await this.settingsRepo.findByUserId(userId);
        if (!settings) {
          throw new Error('EntityNotFoundError: Configurações do usuário não encontradas.');
        }

        // Merge and protect transactional & security flags as immutable
        settings.notifications = {
          email: {
            transactional: true,
            security: true,
            marketing: validatedInput.email.marketing,
            productUpdates: validatedInput.email.productUpdates,
          },
          push: {
            enabled: validatedInput.push.enabled,
            marketing: validatedInput.push.marketing,
            reminders: validatedInput.push.reminders,
          },
        };

        return this.settingsRepo.save(settings);
      });
    });
  }
}
export default UpdateNotificationsUseCase;
