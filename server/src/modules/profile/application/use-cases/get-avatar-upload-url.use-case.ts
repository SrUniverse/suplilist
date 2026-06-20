import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { logger } from '../../../../shared/utils/logger.js';

export interface PresignedPostResult {
  url: string;
  fields: Record<string, string>;
}

// Instantiate S3/R2 Client
// Cloudflare R2 is fully compatible with S3 API via custom endpoint
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock',
  },
  endpoint: process.env.AWS_ENDPOINT_URL || undefined,
});

export class GetAvatarUploadUrlUseCase {
  async execute(userId: string): Promise<PresignedPostResult> {
    const bucket = process.env.AWS_BUCKET_NAME || 'suplilist-avatars';
    
    // Determine the exact, immutable file key to prevent malicious overwrites of other paths
    const fileKey = `avatars/${userId}/avatar-${Date.now()}.jpg`;

    const isMock = !process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'mock';

    if (isMock) {
      // Mock/simulated response for local development when credentials are not configured
      logger.warn('⚠️ S3/R2 credentials not set. Emitting simulated Presigned POST payload.');
      return {
        url: `http://localhost:${process.env.PORT || 5000}/api/mock-upload`,
        fields: {
          key: fileKey,
          'Content-Type': 'image/jpeg',
          policy: 'simulated_policy_development_only',
          signature: 'simulated_signature_development_only',
        }
      };
    }

    // Generate strict Post Policy signature
    // The bucket directly validates these constraints before accepting any file stream
    const result = await createPresignedPost(s3Client, {
      Bucket: bucket,
      Key: fileKey,
      Conditions: [
        // 1. Enforce payload size limit (max 5MB = 5242880 bytes) directly at the bucket edge
        ['content-length-range', 0, 5242880],
        
        // 2. Lock path starting constraint to this user's specific folder path
        ['starts-with', '$key', `avatars/${userId}/`],
        
        // 3. Enforce strict MIME type validation to accept only images
        ['starts-with', '$Content-Type', 'image/'],
      ],
      Fields: {
        'Content-Type': 'image/jpeg', // client can overwrite this with matching image/ MIME
      },
      Expires: 300, // 5 minutes TTL
    });

    return {
      url: result.url,
      fields: result.fields,
    };
  }
}
export default GetAvatarUploadUrlUseCase;
