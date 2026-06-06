import * as otplibPkg from 'otplib';
const authenticator = (otplibPkg as any).authenticator || (otplibPkg as any).default?.authenticator;
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

export interface SetupMfaInput {
  userId: string;
}

export interface SetupMfaResult {
  secret: string;
  qrCodeUrl: string; // The otpauth:// URI to generate the QR Code on the client
}

export class SetupMfaUseCase {
  constructor(
    private userIdentityRepo: IUserIdentityRepository,
    private uow: IUnitOfWork
  ) {}

  async execute(input: SetupMfaInput): Promise<SetupMfaResult> {
    return this.uow.runInTransaction(async () => {
      const user = await this.userIdentityRepo.findById(input.userId);
      if (!user || user.status === 'deleted' || user.status === 'suspended') {
        throw new Error('user_inactive');
      }

      if (user.mfa.enabled) {
        throw new Error('mfa_already_enabled');
      }

      // 1. Generate new Temp Secret
      const tempSecret = authenticator.generateSecret();

      // 2. Generate otpauth URI for QR code
      const email = user.email;
      const appName = 'SupliList';
      const otpauthUrl = authenticator.keyuri(email, appName, tempSecret);

      // 3. Save Temp Secret to DB (Handshake init)
      user.mfa.tempSecret = tempSecret;
      await this.userIdentityRepo.save(user);

      return {
        secret: tempSecret, // Might be displayed as plain text for manual entry
        qrCodeUrl: otpauthUrl,
      };
    });
  }
}
export default SetupMfaUseCase;
