import { Request, Response, NextFunction } from 'express';
import { GetProfileUseCase } from '../../application/use-cases/get-profile.use-case.js';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case.js';

export class ProfileController {
  constructor(
    private getProfileUseCase: GetProfileUseCase,
    private updateProfileUseCase: UpdateProfileUseCase
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

      const result = await this.updateProfileUseCase.execute({
        userId,
        expectedVersion,
        data: req.body
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
}
