import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GetProfileUseCase } from '../../application/use-cases/get-profile.use-case.js';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case.js';

export const UpdateProfileSchema = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  displayName: z.string().optional(),
  onboardingState: z.enum(['pending', 'completed']).optional(),
  goals: z.array(z.string()).optional(),
  weight: z.number().optional(),
  biologicalSex: z.enum(['male', 'female']).optional(),
  biometrics: z.object({
    weight: z.number().min(30).max(300).optional(),
    biologicalSex: z.enum(['male', 'female']).optional(),
  }).optional(),
});

import { SyncMigrationVersionUseCase } from '../../application/use-cases/sync-migration-version.use-case.js';

export class ProfileController {
  constructor(
    private getProfileUseCase: GetProfileUseCase,
    private updateProfileUseCase: UpdateProfileUseCase,
    private syncMigrationVersionUseCase: SyncMigrationVersionUseCase
  ) {}

  async getMe(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'unauthenticated' });
      }

      const result = await this.getProfileUseCase.execute(userId);

      // Inject the version as ETag for Optimistic Concurrency
      res.setHeader('ETag', `"${result.version}"`);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      return res.status(200).json({
        success: true,
        data: result.profile,
      });
    } catch (error: any) {
      if (error.message === 'profile_not_found') {
        return res.status(404).json({ success: false, error: 'not_found' });
      }
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'unauthenticated' });
      }

      // Read If-Match header
      const ifMatch = req.headers['if-match'];
      if (!ifMatch) {
        return res.status(428).json({
          success: false,
          error: 'precondition_required',
          message: 'If-Match header is required for updates.'
        });
      }

      // Clean the ETag quotes
      const expectedVersionStr = ifMatch.replace(/"/g, '');
      const expectedVersion = parseInt(expectedVersionStr, 10);
      
      if (isNaN(expectedVersion)) {
        return res.status(400).json({ success: false, error: 'invalid_if_match_header' });
      }

      const parsedBody = UpdateProfileSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ success: false, error: 'validation_error', details: parsedBody.error.errors });
      }

      const result = await this.updateProfileUseCase.execute({
        userId,
        expectedVersion,
        data: parsedBody.data
      });

      // Inject the NEW version as ETag for subsequent updates
      res.setHeader('ETag', `"${result.version}"`);

      return res.status(200).json({
        success: true,
        data: result.profile,
      });

    } catch (error: any) {
      if (error.message === 'precondition_failed') {
        return res.status(412).json({
          success: false,
          error: 'precondition_failed',
          message: 'The profile was modified by another request. Please reload and try again.'
        });
      }
      next(error);
    }
  }

  async syncMigrationVersion(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'unauthenticated' });
      }

      const result = await this.syncMigrationVersionUseCase.execute(userId, req.body);

      // We do not set ETag here because migrationVersion is not an optimistic-concurrency field
      // for the public profile payload.
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'validation_error', details: error.errors });
      }
      if (error.message === 'profile_not_found') {
        return res.status(404).json({ success: false, error: 'not_found' });
      }
      next(error);
    }
  }
}
