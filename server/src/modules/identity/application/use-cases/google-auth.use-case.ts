import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { UserIdentity } from '../../domain/user-identity.entity.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';
import { IProfileRepository } from '../../../profile/domain/repositories/profile.repository.interface.js';
import { Profile } from '../../../profile/domain/entities/profile.entity.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-unsafe-change-me';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const googleAuthInputSchema = z.object({
  idToken: z.string().min(1, 'ID Token is required'),
});

export type GoogleAuthInput = z.infer<typeof googleAuthInputSchema>;

export type GoogleAuthResult = 
  | { status: 'success'; accessToken: string; refreshToken: string }
  | { status: 'mfa_required'; mfaToken: string };

export class GoogleAuthUseCase {
  constructor(
    private userIdentityRepo: IUserIdentityRepository,
    private profileRepo: IProfileRepository,
    private uow: IUnitOfWork
  ) {}

  async execute(input: GoogleAuthInput): Promise<GoogleAuthResult> {
    const validatedInput = googleAuthInputSchema.parse(input);

    return this.uow.runInTransaction(async () => {
      // 1. Validate ID Token using Google SDK
      let ticket;
      try {
        ticket = await client.verifyIdToken({
          idToken: validatedInput.idToken,
          audience: GOOGLE_CLIENT_ID,
        });
      } catch (error) {
        throw new Error('invalid_google_token');
      }

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('invalid_google_token');
      }

      // 2. Strict Verification: Google MUST have verified the email
      if (!payload.email_verified) {
        throw new Error('unverified_google_email');
      }

      if (!payload.email) {
        throw new Error('google_email_missing');
      }

      const email = payload.email.toLowerCase().trim();
      const googleId = payload.sub;

      // 3. Check for existing user by Provider ID
      let user = await this.userIdentityRepo.findByProvider('google', googleId);

      if (!user) {
        // Fallback: Check if user exists by Email (Form Registration)
        user = await this.userIdentityRepo.findByEmail(email);

        if (user) {
          // Account Linking
          if (!user.emailVerified) {
            // Destructive Overwrite: The existing account has an unverified email.
            // This is likely a pre-account takeover attempt. We take back control.
            user.passwordHash = null; // Erase attacker's password
            user.emailVerified = true;
            user.emailVerifiedAt = new Date();
          }

          // Add the Google provider to the existing account
          user.providers.push({
            provider: 'google',
            providerId: googleId,
            providerEmail: email,
            linkedAt: new Date(),
          });

          await this.userIdentityRepo.save(user);
        } else {
          // Complete New Registration via Google
          const newUser: UserIdentity = {
            id: '', 
            email,
            emailVerified: true,
            emailVerifiedAt: new Date(),
            passwordHash: null,
            providers: [{
              provider: 'google',
              providerId: googleId,
              providerEmail: email,
              linkedAt: new Date(),
            }],
            mfa: {
              enabled: false,
              type: null,
              totpSecret: null,
              tempSecret: null,
              backupCodes: [],
              enabledAt: null,
              lastUsedAt: null,
            },
            status: 'active', // Pre-verified
            role: 'user',
            deletedAt: null,
            suspendedAt: null,
            suspendedReason: null,
            sessionsValidAfter: null,
            version: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          user = await this.userIdentityRepo.save(newUser);

          // Create Profile
          const blankProfile: Profile = {
            id: '', 
            userId: user.id,
            firstName: payload.given_name || null,
            lastName: payload.family_name || null,
            displayName: payload.name || email.split('@')[0],
            avatarUrl: payload.picture || null,
            avatarStatus: payload.picture ? 'synced' : 'none',
            onboardingState: 'pending',
            goals: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 0,
          };
          
          await this.profileRepo.save(blankProfile);
        }
      }

      // 4. Check Status
      if (user.status === 'deleted' || user.status === 'suspended') {
        throw new Error(`account_${user.status}`);
      }

      // 5. Handle MFA
      if (user.mfa.enabled) {
        const preAuthJti = crypto.randomUUID();
        const mfaToken = jwt.sign(
          {
            sub: user.id,
            jti: preAuthJti,
            scope: 'pre_auth',
          },
          JWT_SECRET,
          { expiresIn: '5m' }
        );

        return {
          status: 'mfa_required',
          mfaToken,
        };
      }

      // 6. Generate Real Sessions
      const accessJti = crypto.randomUUID(); 
      const accessToken = jwt.sign(
        {
          sub: user.id,
          jti: accessJti,
          role: user.role,
          status: user.status,
        },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      const refreshJti = crypto.randomUUID();
      const refreshToken = jwt.sign(
        {
          sub: user.id,
          jti: refreshJti,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        status: 'success',
        accessToken,
        refreshToken,
      };
    });
  }
}
export default GoogleAuthUseCase;
