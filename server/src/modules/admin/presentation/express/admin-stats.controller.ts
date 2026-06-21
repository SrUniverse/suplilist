/**
 * admin-stats.controller.ts — Dashboard metrics and subscriber listing.
 *
 * Read-only aggregations over the existing collections, used by the admin
 * overview page (/admin) and the subscriptions page (/admin/orders). Queries the
 * models directly (same pragmatic pattern as supplement.controller) since these
 * are reporting endpoints with no domain rules.
 */

import { Request, Response, NextFunction } from 'express';
import { UserIdentityModel } from '../../../identity/infrastructure/mongoose/user-identity.model.js';
import { SupplementDataModel } from '../../../supplements/infrastructure/mongoose/supplement-data.model.js';
import { PaymentOrderModel } from '../../../payments/infrastructure/mongoose/payment-order.model.js';
import { AdminAuditLogModel } from '../../infrastructure/mongoose/admin-audit-log.model.js';

function countByKey(rows: Array<{ _id: string | null; count: number }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r._id ?? 'unknown'] = r.count;
  return out;
}

export class AdminStatsController {
  getStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [
        totalSupplements,
        onSiteSupplements,
        totalUsers,
        usersByRole,
        usersByStatus,
        usersByTier,
        ordersByStatus,
        revenueAgg,
      ] = await Promise.all([
        SupplementDataModel.countDocuments({}),
        SupplementDataModel.countDocuments({ 'metadata.category': { $exists: true, $ne: null } }),
        UserIdentityModel.countDocuments({}),
        UserIdentityModel.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
        UserIdentityModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        UserIdentityModel.aggregate([{ $group: { _id: '$tier', count: { $sum: 1 } } }]),
        PaymentOrderModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        PaymentOrderModel.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
      ]);

      const activeSubscribers = await UserIdentityModel.countDocuments({
        tier: { $in: ['pro', 'elite'] },
        subscriptionStatus: { $in: ['active', 'trialing'] },
      });

      res.json({
        success: true,
        data: {
          supplements: { total: totalSupplements, onSite: onSiteSupplements },
          users: {
            total: totalUsers,
            byRole: countByKey(usersByRole),
            byStatus: countByKey(usersByStatus),
            byTier: countByKey(usersByTier),
            activeSubscribers,
          },
          orders: {
            byStatus: countByKey(ordersByStatus),
            revenueCompleted: revenueAgg[0]?.total ?? 0,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  listSubscribers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 50));

      // Anyone who has ever had a paid tier or a Stripe customer record.
      const filter = {
        $or: [
          { tier: { $in: ['pro', 'elite'] } },
          { stripeCustomerId: { $ne: null } },
        ],
      };

      const [rows, total] = await Promise.all([
        UserIdentityModel.find(filter)
          .select('email tier subscriptionStatus stripeCustomerId currentPeriodEnd createdAt')
          .sort({ updatedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        UserIdentityModel.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          subscribers: rows.map((u: any) => ({
            id: u._id?.toString(),
            email: u.email,
            tier: u.tier,
            subscriptionStatus: u.subscriptionStatus,
            stripeCustomerId: u.stripeCustomerId,
            currentPeriodEnd: u.currentPeriodEnd,
            createdAt: u.createdAt,
          })),
          total,
          page,
          limit,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  listAudit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = Math.min(200, Math.max(1, parseInt(req.query['limit'] as string) || 100));
      const rows = await AdminAuditLogModel.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  };
}
