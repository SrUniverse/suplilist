# 📊 SPRINT PLAN: Analytics & Insights Dashboard

**Duration:** 3 weeks  
**Timeline:** Week 11-13  
**Target:** User spending analytics, admin dashboards, personalized insights  
**Total Files:** 23  
**Total Tests:** 130+  
**Lines of Code:** 2,000+

---

## 📋 Overview

Build comprehensive analytics capabilities:
- User spending dashboard (total, by category, by marketplace)
- Price tracking and savings calculator
- Admin cohort analysis and retention funnels
- Revenue attribution
- Personalized spending insights

---

## 🗓️ WEEK 11-12: Analytics Engine & User Dashboard

### Sprint Goal
Build analytics infrastructure and user-facing spending dashboard.

### Files to Create (15)

#### Database Schema

**File: server/database/migrations/010_analytics.sql (150 lines)**
```sql
CREATE TABLE user_spending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_spent DECIMAL(15,2) DEFAULT 0,
  total_items INT DEFAULT 0,
  last_purchase_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE price_tracking_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  marketplace VARCHAR(50),
  current_price DECIMAL(10,2),
  previous_price DECIMAL(10,2),
  user_count INT DEFAULT 0,
  tracked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE savings_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  marketplace VARCHAR(50),
  purchased_price DECIMAL(10,2),
  average_price DECIMAL(10,2),
  saved_amount DECIMAL(10,2),
  saved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_spending_by_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  category VARCHAR(255),
  total_spent DECIMAL(15,2),
  item_count INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category)
);

CREATE TABLE user_spending_by_marketplace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  marketplace VARCHAR(50),
  total_spent DECIMAL(15,2),
  item_count INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, marketplace)
);

CREATE INDEX idx_user_spending_user ON user_spending(user_id);
CREATE INDEX idx_price_tracking_product ON price_tracking_log(product_id);
CREATE INDEX idx_savings_user ON savings_log(user_id);
CREATE INDEX idx_savings_date ON savings_log(saved_date);
```

#### Backend Services

**File: server/src/services/user-analytics.service.ts (600 lines)**
```typescript
export class UserAnalyticsService {
  async getTotalSpent(userId: string): Promise<number> {
    const result = await db.query(
      `SELECT total_spent FROM user_spending WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0]?.total_spent || 0;
  }

  async getSpendingByCategory(userId: string) {
    const result = await db.query(
      `SELECT category, total_spent, item_count
       FROM user_spending_by_category
       WHERE user_id = $1
       ORDER BY total_spent DESC`,
      [userId]
    );
    return result.rows;
  }

  async getSpendingByMarketplace(userId: string) {
    const result = await db.query(
      `SELECT marketplace, total_spent, item_count
       FROM user_spending_by_marketplace
       WHERE user_id = $1
       ORDER BY total_spent DESC`,
      [userId]
    );
    return result.rows;
  }

  async getSavingsTotal(userId: string): Promise<number> {
    const result = await db.query(
      `SELECT COALESCE(SUM(saved_amount), 0) as total_savings
       FROM savings_log
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0]?.total_savings || 0;
  }

  async getPriceHistory(productId: string, days = 30) {
    const result = await db.query(
      `SELECT current_price, tracked_at, marketplace
       FROM price_tracking_log
       WHERE product_id = $1
       AND tracked_at > NOW() - INTERVAL '${days} days'
       ORDER BY tracked_at ASC`,
      [productId]
    );
    return result.rows;
  }

  async getTrendingProducts(userId: string, limit = 10) {
    const result = await db.query(
      `SELECT p.*, COUNT(sl.id) as purchase_count
       FROM savings_log sl
       JOIN products p ON sl.product_id = p.id
       WHERE sl.user_id = $1
       GROUP BY p.id
       ORDER BY purchase_count DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  async getSpendingTimeline(userId: string, days = 30) {
    const result = await db.query(
      `SELECT
        DATE(saved_date) as date,
        COUNT(*) as item_count,
        SUM(purchased_price) as total_spent
       FROM savings_log
       WHERE user_id = $1
       AND saved_date > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(saved_date)
       ORDER BY date ASC`,
      [userId]
    );
    return result.rows;
  }

  async getEstimatedMonthly(userId: string): Promise<number> {
    const result = await db.query(
      `SELECT
        AVG(total_spent) * (365 / 30) as estimated_monthly
       FROM (
         SELECT
           DATE(saved_date) as date,
           SUM(purchased_price) as total_spent
         FROM savings_log
         WHERE user_id = $1
         AND saved_date > NOW() - INTERVAL '90 days'
         GROUP BY DATE(saved_date)
       ) daily_spending`,
      [userId]
    );
    return result.rows[0]?.estimated_monthly || 0;
  }
}

export const userAnalyticsService = new UserAnalyticsService();
```

**File: server/src/services/savings-calculator.service.ts (300 lines)**
```typescript
export class SavingsCalculatorService {
  async calculateSavings(userId: string, productId: string, purchasedPrice: number, marketplace: string) {
    // Get average market price
    const result = await db.query(
      `SELECT AVG(current_price) as avg_price
       FROM price_tracking_log
       WHERE product_id = $1
       AND current_price > 0`,
      [productId]
    );

    const averagePrice = result.rows[0]?.avg_price || purchasedPrice;
    const savedAmount = averagePrice - purchasedPrice;

    // Log savings
    await db.query(
      `INSERT INTO savings_log (user_id, product_id, marketplace, purchased_price, average_price, saved_amount)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, productId, marketplace, purchasedPrice, averagePrice, Math.max(0, savedAmount)]
    );

    return {
      purchasedPrice,
      averagePrice,
      savedAmount: Math.max(0, savedAmount),
      percentage: ((savedAmount / averagePrice) * 100).toFixed(2)
    };
  }

  async estimateMonthly(userId: string) {
    return userAnalyticsService.getEstimatedMonthly(userId);
  }
}
```

**File: server/src/workers/analytics.worker.ts (200 lines)**
```typescript
import { Worker } from 'bullmq';

export const analyticsWorker = new Worker('analytics', async (job) => {
  const { type, userId } = job.data;

  switch (type) {
    case 'aggregate_spending':
      await aggregateUserSpending(userId);
      break;
    
    case 'calculate_trends':
      await calculateSpendingTrends(userId);
      break;
    
    case 'track_prices':
      await trackProductPrices();
      break;
  }
});

async function aggregateUserSpending(userId: string) {
  // Run aggregation queries
  // Runs daily at 2 AM
}

async function calculateSpendingTrends(userId: string) {
  // Calculate 7-day, 30-day trends
}

async function trackProductPrices() {
  // Update price tracking from APIs
}
```

#### Routes

**File: server/src/routes/analytics.routes.ts (300 lines)**
```typescript
import { Router } from 'express';
import { auth } from '../middleware/auth.middleware';
import { userAnalyticsService } from '../services/user-analytics.service';
import { savingsCalculatorService } from '../services/savings-calculator.service';

export const analyticsRouter = Router();

// User Analytics Endpoints
analyticsRouter.get('/overview', auth, async (req, res) => {
  try {
    const totalSpent = await userAnalyticsService.getTotalSpent(req.user.id);
    const totalSavings = await userAnalyticsService.getSavingsTotal(req.user.id);
    const estimatedMonthly = await userAnalyticsService.getEstimatedMonthly(req.user.id);

    res.json({
      totalSpent,
      totalSavings,
      estimatedMonthly,
      average_daily: (totalSpent / 30).toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/spending', auth, async (req, res) => {
  try {
    const byCategory = await userAnalyticsService.getSpendingByCategory(req.user.id);
    const byMarketplace = await userAnalyticsService.getSpendingByMarketplace(req.user.id);

    res.json({ byCategory, byMarketplace });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/savings', auth, async (req, res) => {
  try {
    const totalSavings = await userAnalyticsService.getSavingsTotal(req.user.id);
    const savingsRate = (totalSavings / (await userAnalyticsService.getTotalSpent(req.user.id)) * 100).toFixed(2);

    res.json({
      totalSavings,
      savingsRate: `${savingsRate}%`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/products', auth, async (req, res) => {
  try {
    const trending = await userAnalyticsService.getTrendingProducts(req.user.id);
    res.json({ data: trending });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/timeline', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const timeline = await userAnalyticsService.getSpendingTimeline(req.user.id, days);
    res.json({ data: timeline });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/price-history/:productId', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const history = await userAnalyticsService.getPriceHistory(req.params.productId, days);
    res.json({ data: history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Frontend Components

**File: frontend/src/pages/AnalyticsPage.tsx (600 lines)**
```typescript
import React, { useEffect, useState } from 'react';
import { LineChart, PieChart, BarChart } from 'recharts';
import { apiClient } from '@/services/api.client';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [spending, setSpending] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [overviewRes, spendingRes, timelineRes] = await Promise.all([
        apiClient.get('/api/analytics/overview'),
        apiClient.get('/api/analytics/spending'),
        apiClient.get('/api/analytics/timeline')
      ]);

      setOverview(overviewRes.data);
      setSpending(spendingRes.data);
      setTimeline(timelineRes.data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="analytics-container">
      <div className="overview-cards">
        <Card title="Total Spent" value={`R$ ${overview.totalSpent.toFixed(2)}`} />
        <Card title="Total Saved" value={`R$ ${overview.totalSavings.toFixed(2)}`} />
        <Card title="Monthly Average" value={`R$ ${overview.estimatedMonthly.toFixed(2)}`} />
      </div>

      <div className="charts">
        <div className="chart">
          <h3>Spending Over Time</h3>
          <LineChart data={timeline.data} width={400} height={300}>
            <CartesianGrid />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="total_spent" stroke="#FF6B6B" />
          </LineChart>
        </div>

        <div className="chart">
          <h3>Spending by Category</h3>
          <PieChart width={400} height={300}>
            <Pie data={spending.byCategory} dataKey="total_spent" />
            <Tooltip />
          </PieChart>
        </div>

        <div className="chart">
          <h3>Spending by Marketplace</h3>
          <BarChart data={spending.byMarketplace} width={400} height={300}>
            <CartesianGrid />
            <XAxis dataKey="marketplace" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total_spent" fill="#FF6B6B" />
          </BarChart>
        </div>
      </div>
    </div>
  );
}
```

**File: frontend/src/components/SpendingChart.tsx (200 lines)**
**File: frontend/src/components/SavingsCard.tsx (150 lines)**
**File: frontend/src/components/CategoryBreakdown.tsx (150 lines)**
**File: frontend/src/components/TimelineChart.tsx (150 lines)**
**File: frontend/src/hooks/useAnalytics.ts (100 lines)**

#### Admin Routes

**File: server/src/routes/admin/analytics-admin.routes.ts (250 lines)**
```typescript
// Admin only endpoints
adminAnalyticsRouter.get('/cohorts', adminAuth, async (req, res) => {
  // Get user cohorts by acquisition date
  // Calculate retention by cohort
});

adminAnalyticsRouter.get('/retention', adminAuth, async (req, res) => {
  // Get retention funnels
  // D1, D7, D30 retention
});

adminAnalyticsRouter.get('/revenue', adminAuth, async (req, res) => {
  // Total revenue
  // Revenue by source
  // Attribution
});
```

**File: frontend/src/pages/admin/AnalyticsAdmin.tsx (500 lines)**
- Cohort analysis
- Retention funnel
- Revenue attribution

#### Tests

**File: e2e/user-analytics.test.ts (60+ tests)**
- User spending calculation
- Savings calculation
- Timeline generation
- Category breakdown

**File: e2e/admin-analytics.test.ts (40+ tests)**
- Cohort analysis
- Retention funnel
- Revenue attribution

### Checklist for Week 11-12
- [ ] Analytics schema created
- [ ] UserAnalyticsService working
- [ ] SavingsCalculatorService working
- [ ] Analytics worker scheduled
- [ ] All endpoints working
- [ ] Frontend dashboard rendering
- [ ] Charts displaying correctly
- [ ] Admin analytics working
- [ ] All 100+ tests passing

---

## 🗓️ WEEK 13: Insights & Recommendations

### Sprint Goal
Add personalized insights and recommendations based on spending patterns.

### Files to Create (8)

**File: server/src/services/insights.service.ts (400 lines)**
```typescript
export class InsightsService {
  async generateInsights(userId: string) {
    const insights = [];

    // Insight 1: Total spending
    const totalSpent = await userAnalyticsService.getTotalSpent(userId);
    const topCategory = await this.getTopCategory(userId);
    insights.push({
      type: 'spending_summary',
      title: `You spent R$${totalSpent} on ${topCategory}`,
      importance: 'high'
    });

    // Insight 2: Best time to buy
    const bestDay = await this.getBestDayToBuy(userId);
    insights.push({
      type: 'timing_recommendation',
      title: `Best time to buy: ${bestDay} (avg -15% price)`,
      importance: 'medium'
    });

    // Insight 3: Savings potential
    const savingsPotential = await this.calculateSavingsPotential(userId);
    insights.push({
      type: 'savings_opportunity',
      title: `You could save R$${savingsPotential}/month`,
      importance: 'high'
    });

    // Insight 4: Trending in interests
    const trending = await this.getTrendingInInterests(userId);
    insights.push({
      type: 'trending_products',
      title: `Trending: ${trending.join(', ')}`,
      importance: 'low'
    });

    return insights;
  }

  private async getTopCategory(userId: string) {
    // Implementation
  }

  private async getBestDayToBuy(userId: string) {
    // Analyze price patterns by day of week
  }

  private async calculateSavingsPotential(userId: string) {
    // Calculate potential savings if bought at lowest price
  }

  private async getTrendingInInterests(userId: string) {
    // Get trending products in user's categories
  }
}
```

**File: server/src/routes/insights.routes.ts (150 lines)**
```typescript
insightsRouter.get('/personalized', auth, async (req, res) => {
  try {
    const insights = await insightsService.generateInsights(req.user.id);
    res.json({ data: insights });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**File: frontend/src/components/InsightCard.tsx (150 lines)**
**File: frontend/src/components/InsightCarousel.tsx (200 lines)**
**File: frontend/src/pages/InsightsPage.tsx (300 lines)**

**File: frontend/src/components/MonthlyReport.tsx (200 lines)**
- Generate PDF monthly report
- Export as PDF

**File: server/src/services/pdf-report.service.ts (150 lines)**
- Generate PDF reports server-side
- Email reports to users

#### Tests

**File: e2e/insights.test.ts (30+ tests)**

### Checklist for Week 13
- [ ] Insights service working
- [ ] Personalized insights generating
- [ ] Monthly reports generating
- [ ] PDF export working
- [ ] All 30+ tests passing
- [ ] Analytics feature complete

---

## 📊 Summary

**Total Files:** 23  
**Total Tests:** 130+  
**Total Lines:** 2,000+  
**Time:** 3 weeks

### Key Deliverables
✅ User spending dashboard  
✅ Savings calculator  
✅ Price history tracking  
✅ Category breakdowns  
✅ Admin cohort analysis  
✅ Retention funnels  
✅ Personalized insights  
✅ Monthly PDF reports  
✅ 130+ tests  
✅ Production ready

### Database Tables Added
- user_spending
- price_tracking_log
- savings_log
- user_spending_by_category
- user_spending_by_marketplace

**Next:** Move to SPRINT_PLAN_SEO_AND_BLOG.md
