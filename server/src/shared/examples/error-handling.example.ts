/**
 * Error Handling Examples
 *
 * This file demonstrates best practices for using the error handling system
 * in different scenarios throughout the SupliList API.
 */

import { Router, Request, Response } from 'express';
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  ForbiddenError,
  ConflictError,
  ExternalServiceError,
  BadRequestError,
  InternalServerError,
  RateLimitError,
} from '../errors/app-error.js';
import { asyncHandler } from '../../middleware/error-handler.middleware.js';

/**
 * Example 1: Basic Validation
 *
 * Throwing ValidationError when input doesn't meet requirements
 */
export function example1_basicValidation(req: Request): void {
  const { email, password } = req.body;

  if (!email || !email.includes('@')) {
    throw new ValidationError('Invalid email format', {
      field: 'email',
      value: email,
      expectedFormat: 'user@example.com',
    });
  }

  if (!password || password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters', {
      field: 'password',
      minLength: 8,
      currentLength: password?.length || 0,
    });
  }
}

/**
 * Example 2: Resource Not Found
 *
 * Throwing NotFoundError when requested resource doesn't exist
 */
export async function example2_resourceNotFound(userId: string): Promise<void> {
  const user = await findUserInDatabase(userId);

  if (!user) {
    throw new NotFoundError('User not found', {
      userId,
      searchMethod: 'database_query',
    });
  }
}

/**
 * Example 3: Conflict/Duplicate
 *
 * Throwing ConflictError when resource already exists
 */
export async function example3_duplicateResource(email: string): Promise<void> {
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new ConflictError('User with this email already exists', {
      email,
      existingUserId: existingUser.id,
    });
  }
}

/**
 * Example 4: Authentication Failure
 *
 * Throwing AuthenticationError when credentials are invalid
 */
export async function example4_authenticationFailure(
  username: string,
  password: string,
): Promise<void> {
  const user = await findUserByUsername(username);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new AuthenticationError('Invalid username or password', {
      username,
      reason: 'invalid_credentials',
    });
  }
}

/**
 * Example 5: Authorization/Forbidden
 *
 * Throwing ForbiddenError when user lacks permissions
 */
export function example5_forbidden(req: Request): void {
  const userId = (req as any).user?.id;
  const resourceOwnerId = req.params.userId;

  if (userId !== resourceOwnerId) {
    throw new ForbiddenError('You do not have permission to access this resource', {
      userId,
      resourceOwnerId,
      requiredPermission: 'owner',
    });
  }
}

/**
 * Example 6: External Service Error
 *
 * Throwing ExternalServiceError when external API fails
 */
export async function example6_externalServiceError(): Promise<void> {
  try {
    // Call external payment service
    const result = await callStripeAPI('/charges', 'POST', {
      amount: 10000,
      currency: 'usd',
    });

    return result;
  } catch (error) {
    throw new ExternalServiceError(
      'Payment processing failed',
      'stripe',
      {
        originalError: error instanceof Error ? error.message : String(error),
        httpStatus: (error as any)?.statusCode,
        requestPath: '/charges',
      },
    );
  }
}

/**
 * Example 7: Bad Request / Invalid Input
 *
 * Throwing BadRequestError for malformed requests
 */
export function example7_badRequest(data: unknown): void {
  if (typeof data !== 'object' || data === null) {
    throw new BadRequestError('Request body must be a JSON object', {
      receivedType: typeof data,
      receivedValue: String(data),
    });
  }

  const obj = data as Record<string, unknown>;
  if (typeof obj.amount !== 'number') {
    throw new BadRequestError('Amount must be a number', {
      field: 'amount',
      receivedType: typeof obj.amount,
    });
  }
}

/**
 * Example 8: Database Error
 *
 * Wrapping database errors with DatabaseError for consistency
 */
export async function example8_databaseError(userId: string): Promise<void> {
  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      throw new NotFoundError('User not found', { userId });
    }
  } catch (error) {
    // Re-throw if already an AppError
    if (error instanceof Error && error.name === 'AppError') {
      throw error;
    }

    // Wrap database errors
    const dbError = error instanceof Error ? error.message : String(error);
    throw new InternalServerError('Database operation failed', {
      operation: 'deleteUser',
      userId,
      originalError: dbError,
    });
  }
}

/**
 * Example 9: Rate Limiting
 *
 * Throwing RateLimitError when rate limit exceeded
 */
export async function example9_rateLimit(clientIp: string): Promise<void> {
  const requests = await getClientRequestCount(clientIp);
  const limit = 100;

  if (requests > limit) {
    const resetTime = await getClientResetTime(clientIp);
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    throw new RateLimitError('Too many requests from this IP', retryAfter, {
      clientIp,
      limit,
      current: requests,
      resetTime: new Date(resetTime).toISOString(),
    });
  }
}

/**
 * Example 10: Express Route Handler
 *
 * Complete example of using error handling in route handlers
 */
export function createExampleRouter(): Router {
  const router = Router();

  /**
   * POST /users
   * Create a new user
   */
  router.post(
    '/users',
    asyncHandler(async (req: Request, res: Response) => {
      const { email, password, name } = req.body;

      // Validation
      if (!email) {
        throw new ValidationError('Email is required', { field: 'email' });
      }

      if (!password || password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters', {
          field: 'password',
        });
      }

      // Check for duplicates
      const existing = await findUserByEmail(email);
      if (existing) {
        throw new ConflictError('User with this email already exists', { email });
      }

      // Create user
      const user = await User.create({
        email,
        password: hashPassword(password),
        name,
      });

      res.status(201).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }),
  );

  /**
   * GET /users/:id
   * Get user by ID
   */
  router.get(
    '/users/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;

      const user = await findUserInDatabase(id);
      if (!user) {
        throw new NotFoundError('User not found', { userId: id });
      }

      // Check authorization (only own profile or admin)
      const requesterId = (req as any).user?.id;
      const isAdmin = (req as any).user?.role === 'admin';

      if (id !== requesterId && !isAdmin) {
        throw new ForbiddenError('You do not have permission to access this user', {
          userId: id,
          requesterId,
        });
      }

      res.json({
        success: true,
        data: user,
      });
    }),
  );

  /**
   * PUT /users/:id
   * Update user
   */
  router.put(
    '/users/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { email, name } = req.body;

      // Find user
      const user = await findUserInDatabase(id);
      if (!user) {
        throw new NotFoundError('User not found', { userId: id });
      }

      // Authorization
      const requesterId = (req as any).user?.id;
      if (id !== requesterId) {
        throw new ForbiddenError('Cannot update other users', {
          userId: id,
          requesterId,
        });
      }

      // Validate new email
      if (email && email !== user.email) {
        const emailExists = await findUserByEmail(email);
        if (emailExists) {
          throw new ConflictError('This email is already in use', { email });
        }
      }

      // Update user
      const updated = await User.findByIdAndUpdate(
        id,
        { email: email || user.email, name: name || user.name },
        { new: true },
      );

      res.json({
        success: true,
        data: updated,
      });
    }),
  );

  /**
   * POST /payments
   * Process payment
   */
  router.post(
    '/payments',
    asyncHandler(async (req: Request, res: Response) => {
      const { amount, currency } = req.body;

      // Validation
      if (!amount || amount <= 0) {
        throw new ValidationError('Amount must be greater than 0', {
          field: 'amount',
          value: amount,
        });
      }

      if (!currency || !['usd', 'eur'].includes(currency)) {
        throw new ValidationError('Invalid currency', {
          field: 'currency',
          value: currency,
          allowed: ['usd', 'eur'],
        });
      }

      // Process payment
      try {
        const payment = await processPaymentWithStripe(amount, currency);

        res.status(201).json({
          success: true,
          data: payment,
        });
      } catch (error) {
        throw new ExternalServiceError(
          'Payment processing failed',
          'stripe',
          {
            amount,
            currency,
            originalError: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }),
  );

  return router;
}

/**
 * Example 11: Service Layer with Error Handling
 *
 * Proper error handling in business logic layer
 */
export class UserService {
  async createUser(userData: { email: string; password: string; name: string }) {
    // Validate input
    if (!userData.email || !userData.email.includes('@')) {
      throw new ValidationError('Invalid email format', {
        field: 'email',
        value: userData.email,
      });
    }

    // Check for duplicates
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      throw new ConflictError('User with this email already exists', {
        email: userData.email,
      });
    }

    // Create user
    try {
      const user = await User.create({
        email: userData.email,
        password: hashPassword(userData.password),
        name: userData.name,
      });

      return user;
    } catch (error) {
      // Re-throw AppErrors
      if (error instanceof Error && error.name === 'AppError') {
        throw error;
      }

      // Wrap unexpected errors
      throw new InternalServerError('Failed to create user', {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getUserById(id: string) {
    try {
      const user = await User.findById(id);

      if (!user) {
        throw new NotFoundError('User not found', { userId: id });
      }

      return user;
    } catch (error) {
      // Re-throw AppErrors
      if (error instanceof Error && error.name === 'AppError') {
        throw error;
      }

      // Wrap database errors
      throw new InternalServerError('Failed to retrieve user', {
        userId: id,
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async updateUser(id: string, updates: Record<string, unknown>) {
    const user = await this.getUserById(id);

    if (!user) {
      throw new NotFoundError('User not found', { userId: id });
    }

    try {
      const updated = await User.findByIdAndUpdate(id, updates, { new: true });
      return updated;
    } catch (error) {
      if (error instanceof Error && error.name === 'AppError') {
        throw error;
      }

      throw new InternalServerError('Failed to update user', {
        userId: id,
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Example 12: Middleware with Error Handling
 *
 * Using error handling in custom middleware
 */
export function createAuthMiddleware() {
  return asyncHandler(async (req: Request, _res: Response, next: Function) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedError('Authorization header is missing', {
        header: 'authorization',
      });
    }

    try {
      const decoded = await verifyJWT(token);
      (req as any).user = decoded;
      next();
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token', {
        reason: 'jwt_verification_failed',
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

// Dummy functions for examples
async function findUserInDatabase(id: string): Promise<any> {
  return null;
}
async function findUserByEmail(email: string): Promise<any> {
  return null;
}
async function findUserByUsername(username: string): Promise<any> {
  return null;
}
async function getClientRequestCount(ip: string): Promise<number> {
  return 0;
}
async function getClientResetTime(ip: string): Promise<number> {
  return 0;
}
async function callStripeAPI(path: string, method: string, data: any): Promise<any> {
  return null;
}
async function processPaymentWithStripe(amount: number, currency: string): Promise<any> {
  return null;
}
async function verifyJWT(token: string): Promise<any> {
  return null;
}
function hashPassword(password: string): string {
  return '';
}
function verifyPassword(password: string, hash: string): boolean {
  return false;
}

class User {
  static async findOne(query: any): Promise<any> {
    return null;
  }
  static async findById(id: string): Promise<any> {
    return null;
  }
  static async findByIdAndUpdate(id: string, updates: any, options: any): Promise<any> {
    return null;
  }
  static async findByIdAndDelete(id: string): Promise<any> {
    return null;
  }
  static async create(data: any): Promise<any> {
    return null;
  }
}

export default createExampleRouter;
