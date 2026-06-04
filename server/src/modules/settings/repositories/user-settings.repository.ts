import { UserSettings } from '../domain/user-settings.entity.js';

export interface IUserSettingsRepository {
  findByUserId(userId: string): Promise<UserSettings | null>;
  save(settings: UserSettings): Promise<UserSettings>;
  deleteByUserId(userId: string): Promise<void>;
}
