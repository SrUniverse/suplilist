import { z } from 'zod';

export const createPriceAlertSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  targetPrice: z.number().positive('Target price must be greater than 0'),
});

export const updatePriceAlertSchema = z.object({
  targetPrice: z.number().positive('Target price must be greater than 0').optional(),
  active: z.boolean().optional(),
});

export const priceHistoryQuerySchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  limit: z.number().int().positive().default(100).optional(),
  offset: z.number().int().min(0).default(0).optional(),
});

export const registerDeviceTokenSchema = z.object({
  deviceToken: z.string().min(10, 'Invalid device token'),
  deviceName: z.string().optional(),
  deviceType: z.enum(['ios', 'android', 'web']).optional(),
});

export type CreatePriceAlertRequest = z.infer<typeof createPriceAlertSchema>;
export type UpdatePriceAlertRequest = z.infer<typeof updatePriceAlertSchema>;
export type PriceHistoryQuery = z.infer<typeof priceHistoryQuerySchema>;
export type RegisterDeviceTokenRequest = z.infer<typeof registerDeviceTokenSchema>;
