import bcrypt from 'bcrypt';
import { z } from 'zod';
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { UserIdentity } from '../../domain/user-identity.entity.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';
import { IEventBus } from '../../../../shared/application/event-bus/event-bus.interface.js';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event.js';

const registerInputSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export interface RegisterResult {
  userId: string;
  email: string;
  status: string;
}

export class RegisterUseCase {
  constructor(
    private userIdentityRepo: IUserIdentityRepository,
    private uow: IUnitOfWork,
    private eventBus: IEventBus
  ) {}

  async execute(input: RegisterInput): Promise<RegisterResult> {
    // 1. Validate Input
    const validatedInput = registerInputSchema.parse(input);

    return this.uow.runInTransaction(async () => {
      // 2. Check if user already exists
      const existingUser = await this.userIdentityRepo.findByEmail(validatedInput.email);
      if (existingUser) {
        throw new Error('user_already_exists');
      }

      // 3. Hash password using bcrypt (cost factor = 12)
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(validatedInput.password, salt);

      // 4. Create entity template
      const newUser: UserIdentity = {
        id: '', // Mongoose will generate _id
        email: validatedInput.email,
        emailVerified: false,
        emailVerifiedAt: null,
        passwordHash,
        providers: [],
        mfa: {
          enabled: false,
          type: null,
          totpSecret: null,
          backupCodes: [],
          enabledAt: null,
          lastUsedAt: null,
        },
        status: 'pending_verification',
        role: 'user', // Default role for standard registrations
        deletedAt: null,
        suspendedAt: null,
        suspendedReason: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 5. Persist to database
      const savedUser = await this.userIdentityRepo.save(newUser);

      // 6. Dispatch UserRegistered event
      const event = new UserRegisteredEvent(savedUser.id, savedUser.email);
      await this.eventBus.publish(event);

      return {
        userId: savedUser.id,
        email: savedUser.email,
        status: savedUser.status,
      };
    });
  }
}
export default RegisterUseCase;
