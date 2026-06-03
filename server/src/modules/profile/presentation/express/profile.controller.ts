import { Request, Response, NextFunction } from 'express';
import { GetPublicProfileUseCase } from '../../application/use-cases/get-public-profile.use-case.js';
import { GetPrivateProfileUseCase } from '../../application/use-cases/get-private-profile.use-case.js';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case.js';
import { GetAvatarUploadUrlUseCase } from '../../application/use-cases/get-avatar-upload-url.use-case.js';
import { IUserProfileRepository } from '../../repositories/user-profile.repository.js';
import { ProfileMapper } from '../../domain/user-profile.entity.js';

export class ProfileController {
  constructor(
    private getPublicProfileUseCase: GetPublicProfileUseCase,
    private getPrivateProfileUseCase: GetPrivateProfileUseCase,
    private updateProfileUseCase: UpdateProfileUseCase,
    private getAvatarUploadUrlUseCase: GetAvatarUploadUrlUseCase,
    private profileRepo: IUserProfileRepository
  ) {}

  /**
   * GET /profile/me
   * Fetches full profile (private view) for the authenticated owner
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'unauthenticated' });
      }

      const result = await this.getPrivateProfileUseCase.execute(userId);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (error.message === 'profile_not_found') {
        return res.status(404).json({ success: false, error: 'profile_not_found', message: 'Profile not found.' });
      }
      next(error);
    }
  }

  /**
   * PATCH /profile/me
   * Updates full profile for the authenticated owner
   */
  async updateMe(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'unauthenticated' });
      }

      const result = await this.updateProfileUseCase.execute(userId, req.body);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * GET /profile/:userId
   * Fetches public profile details of another user.
   * Guaranteed to project out private fields by using ProfileMapper.toPublic.
   */
  async getPublicProfile(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { userId } = req.params;
      const result = await this.getPublicProfileUseCase.execute(userId);
      
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error.message === 'profile_not_found') {
        return res.status(404).json({ success: false, error: 'profile_not_found', message: 'Profile not found.' });
      }
      next(error);
    }
  }

  /**
   * GET /profile/avatar/upload-url
   * Generates AWS S3/Cloudflare R2 Presigned POST Policy fields for client uploads.
   */
  async getAvatarUploadUrl(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'unauthenticated' });
      }

      const result = await this.getAvatarUploadUrlUseCase.execute(userId);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * POST /profile/avatar/confirm
   * Confirms upload and sets avatar status to pending moderation.
   */
  async confirmAvatarUpload(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const { key } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'unauthenticated' });
      }
      if (!key || !key.startsWith(`avatars/${userId}/`)) {
        return res.status(400).json({
          success: false,
          error: 'invalid_key',
          message: 'Invalid upload key path. Must be placed in your own user directory.'
        });
      }

      // Fetch the full private profile
      const profile = await this.profileRepo.findPrivateByUserId(userId);
      if (!profile) {
        return res.status(404).json({ success: false, error: 'profile_not_found' });
      }

      // Determine R2/S3 public CDN base URL from env
      const cdnUrl = process.env.CDN_BASE_URL || `https://cdn.suplilist.com`;
      profile.avatarUrl = `${cdnUrl}/${key}`;
      profile.avatarStatus = 'pending_moderation';

      const saved = await this.profileRepo.save(profile);

      return res.status(200).json({
        success: true,
        data: ProfileMapper.toPrivate(saved),
      });
    } catch (error) {
      next(error);
    }
  }
}
export default ProfileController;
