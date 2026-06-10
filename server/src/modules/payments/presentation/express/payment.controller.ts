import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PaymentOrderModel } from '../../infrastructure/mongoose/payment-order.model.js';

// Fields the client is NEVER allowed to set or update:
//   - userId  → always sourced from req.user.id (JWT)
//   - status  → managed server-side only; any client-supplied value is stripped
const createOrderSchema = z.object({
  items: z.array(z.object({
    supplementId: z.string().trim().min(1),
    quantity: z.number().int().positive(),
    priceAtPurchase: z.number().nonnegative(),
  })).min(1, 'Order must contain at least one item'),
  currency: z.string().length(3).default('BRL'),
});

export class PaymentController {
  /**
   * POST /api/payments
   * Create a new order. userId is always sourced from the JWT — clients cannot
   * supply it. The `status` field is intentionally absent from the schema so any
   * client attempt to inject it is silently stripped by Zod.
   */
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthenticated' });
        return;
      }

      const validation = createOrderSchema.safeParse(req.body);
      if (!validation.success) {
        const message = validation.error.errors[0]?.message || 'Invalid request body';
        res.status(400).json({ success: false, error: 'invalid_body', message });
        return;
      }

      const { items, currency } = validation.data;
      const totalAmount = items.reduce(
        (sum, item) => sum + item.priceAtPurchase * item.quantity,
        0
      );

      const order = await PaymentOrderModel.create({
        userId,        // from JWT — never from body
        status: 'pending', // server-enforced initial state
        items,
        totalAmount,
        currency,
      });

      res.status(201).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments
   * List the authenticated user's orders.
   * The `userId` filter is always derived from req.user.id — the client cannot
   * query another user's orders by passing a different ID.
   */
  async getMyOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthenticated' });
        return;
      }

      const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 20));

      const [orders, total] = await Promise.all([
        PaymentOrderModel
          .find({ userId })   // ownership enforced here — always the JWT subject
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        PaymentOrderModel.countDocuments({ userId }),
      ]);

      res.json({
        success: true,
        data: orders,
        meta: { total, page, limit },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/:orderId
   * Fetch a single order — only if it belongs to the authenticated user.
   */
  async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthenticated' });
        return;
      }

      const { orderId } = req.params;
      const order = await PaymentOrderModel.findOne({
        _id: orderId,
        userId, // ownership check — cannot fetch another user's order by guessing ID
      }).lean();

      if (!order) {
        res.status(404).json({ success: false, error: 'not_found' });
        return;
      }

      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }
}
