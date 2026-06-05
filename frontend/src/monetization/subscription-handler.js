/**
 * Subscription Handler — Manages premium subscriptions
 * @module monetization/subscription-handler
 */

export class SubscriptionHandler {
  constructor() {
    this.subscriptions = new Map();
  }

  /**
   * Create subscription
   * @param {string} userId - User ID
   * @param {string} planId - Plan ID ('premium-monthly', 'premium-annual')
   * @param {Object} paymentMethod - Payment method details
   * @returns {Promise<Object>} Subscription object
   */
  async createSubscription(userId, planId, paymentMethod) {
    const subscription = {
      id: `sub_${Date.now()}`,
      userId,
      planId,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: this._calculateEndDate(planId),
      paymentMethod
    };

    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  /**
   * Cancel subscription
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Object>} Updated subscription
   */
  async cancelSubscription(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.status = 'canceled';
    subscription.canceledAt = new Date().toISOString();
    return subscription;
  }

  /**
   * Reactivate subscription
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Object>} Updated subscription
   */
  async reactivateSubscription(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.status = 'active';
    delete subscription.canceledAt;
    return subscription;
  }

  /**
   * Get subscription
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Object>} Subscription
   */
  async getSubscription(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    return subscription;
  }

  /**
   * Get user subscriptions
   * @param {string} userId - User ID
   * @returns {Promise<Object[]>} User subscriptions
   */
  async getUserSubscriptions(userId) {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.userId === userId);
  }

  /**
   * Check subscription status
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Is premium active
   */
  async isPremiumActive(userId) {
    const subs = await this.getUserSubscriptions(userId);
    return subs.some(sub => sub.status === 'active' && new Date(sub.endDate) > new Date());
  }

  /**
   * Calculate end date based on plan
   * @private
   * @param {string} planId - Plan ID
   * @returns {string} End date ISO string
   */
  _calculateEndDate(planId) {
    const now = new Date();
    if (planId === 'premium-monthly') {
      now.setMonth(now.getMonth() + 1);
    } else if (planId === 'premium-annual') {
      now.setFullYear(now.getFullYear() + 1);
    }
    return now.toISOString();
  }
}

export default new SubscriptionHandler();
