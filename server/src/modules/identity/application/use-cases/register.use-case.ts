import bcrypt from 'bcrypt';
import { z } from 'zod';
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { UserIdentity } from '../../domain/user-identity.entity.js';
import { IProfileRepository } from '../../../profile/domain/repositories/profile.repository.interface.js';
import { Profile } from '../../../profile/domain/entities/profile.entity.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';
import { IEventBus } from '../../../../shared/application/event-bus/event-bus.interface.js';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event.js';
import { IdentityEmailService } from '../services/identity-email.service.js';

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
    private profileRepo: IProfileRepository,
    private uow: IUnitOfWork,
    private eventBus: IEventBus,
    private emailService: IdentityEmailService
  ) {}

  async execute(input: RegisterInput): Promise<RegisterResult> {
    // 1. Validate Input
    const validatedInput = registerInputSchema.parse(input);

    return this.uow.runInTransaction(async () => {
      // 2. Check if user already exists
      const existingUser = await this.userIdentityRepo.findByEmail(validatedInput.email);
      if (existingUser) {
        // Dispara e-mail de aviso para segurança e evitar Account Enumeration
        // Background task (não usar await no controller principal se quisermos performance, mas dentro da transação é melhor fazer fire-and-forget de forma segura)
        this.emailService.sendDuplicateRegistrationWarning(existingUser.email).catch(console.error);
        
        // Retorna sucesso simulado para evitar Account Enumeration sem tocar no banco
        return {
          userId: existingUser.id,
          email: existingUser.email,
          status: 'pending_verification',
        };
      }

      const passwordHash = await bcrypt.hash(validatedInput.password, 12);

      // 3. Create entity template (letting Mongoose pre-save handle bcrypt hash)
      const newUser: UserIdentity = {
        id: '', // Mongoose will generate _id
        email: validatedInput.email,
        emailVerified: false,
        emailVerifiedAt: null,
        passwordHash, // Hashed locally in Use Case
        providers: [],
        mfa: {
          enabled: false,
          type: null,
          totpSecret: null,
          tempSecret: null,
          backupCodes: [],
          enabledAt: null,
          lastUsedAt: null,
        },
        status: 'pending_verification',
        role: 'user', // Default role for standard registrations
        deletedAt: null,
        suspendedAt: null,
        suspendedReason: null,
        sessionsValidAfter: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 4. Persist to database (Identities)
      const savedUser = await this.userIdentityRepo.save(newUser);

      // 5. Create blank Profile (Risk Segregation) tied to Identity
      const blankProfile: Profile = {
        id: '', 
        userId: savedUser.id,
        firstName: null,
        lastName: null,
        displayName: savedUser.email.split('@')[0], // Default display name
        avatarUrl: null,
        avatarStatus: 'none',
        onboardingState: 'pending',
        goals: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 0,
      };
      
      await this.profileRepo.save(blankProfile);

      // 6. Dispatch UserRegistered event
      const event = new UserRegisteredEvent(savedUser.id, savedUser.email);
      await this.eventBus.publish(event);

      // 7. Generate OTP, save to Redis, and send email
      const crypto = await import('crypto');
      const otpCode = crypto.randomInt(100000, 999999).toString();
      
      const { redisClient } = await import('../../../../shared/infrastructure/redis/redis.client.js');
      // TTL de 15 minutos (900 segundos)
      await redisClient.set(`otp:email:${savedUser.email}`, otpCode, 'EX', 900);

      this.emailService.sendVerificationEmail(savedUser.email, otpCode).catch(console.error);

      return {
        userId: savedUser.id,
        email: savedUser.email,
        status: savedUser.status,
      };
    });
  }
}
export default RegisterUseCase;
