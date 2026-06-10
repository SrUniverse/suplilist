# Retention System Metrics & KPIs

This document defines the key metrics and KPIs to measure the success of the retention system.

## Core Retention Metrics

### 1. User Retention

#### Daily Active Users (DAU)
- **Definition**: Unique users who opened the app/visited the website on a given day
- **Target**: Increase by 25% month-over-month
- **Formula**: Count of distinct users with activity on date D
- **Tracking**: Event logs, analytics

#### Weekly Active Users (WAU)
- **Definition**: Unique users with activity in a 7-day period
- **Target**: 60% of registered users
- **Formula**: Count of distinct users with activity in week W

#### Monthly Active Users (MAU)
- **Definition**: Unique users with activity in a 30-day period
- **Target**: 40% of registered users
- **Formula**: Count of distinct users with activity in month M

#### Retention Rate
- **Definition**: % of users from cohort who return after N days
- **Target**:
  - Day 1: 85%
  - Day 7: 45%
  - Day 30: 30%
- **Formula**: (Users in cohort with activity on day N / Cohort size) × 100

### 2. Churn Rate
- **Definition**: % of users who stop using the app
- **Target**: < 5% monthly churn
- **Formula**: (Users lost in period / Users at start of period) × 100

---

## Sprint 1: Price Monitoring Metrics

### Price Alert Engagement

#### Alerts Created
- **Definition**: New price alerts created
- **Target**: 5,000 alerts/month by month 3
- **Tracking**: price_alerts table INSERT events

#### Active Alerts
- **Definition**: Alerts with active = true
- **Target**: 80% of created alerts remain active after 7 days
- **Tracking**: Query user_price_alerts WHERE active = true

#### Price Drop Notifications
- **Definition**: Notifications sent when prices drop
- **Target**: 10,000 notifications/month by month 3
- **Tracking**: price_monitor_worker job logs

#### Notification Open Rate
- **Definition**: % of delivered notifications that users open
- **Target**: 40% open rate
- **Tracking**: Firebase FCM delivery metrics + frontend tracking

#### Click-Through Rate (CTR)
- **Definition**: % of opened notifications users click on
- **Target**: 30% CTR
- **Tracking**: Analytics on notification link clicks

### Device Token Metrics

#### Registered Devices
- **Definition**: Active device tokens
- **Target**: 1.5 devices per user
- **Tracking**: COUNT(*) FROM firebase_tokens WHERE is_active = true

#### Token Retention
- **Definition**: % of tokens still active after 30 days
- **Target**: 75% retention
- **Tracking**: Last used timestamp in firebase_tokens

---

## Sprint 2: Community Metrics

### Review Engagement

#### Reviews Created
- **Definition**: New reviews submitted
- **Target**: 500 reviews/month by month 3
- **Tracking**: reviews table INSERT events

#### Review Completion Rate
- **Definition**: % of users who start a review form that complete it
- **Target**: 70% completion rate
- **Tracking**: Form analytics

#### Helpful Votes
- **Definition**: Total helpful/unhelpful votes on reviews
- **Target**: 2 votes per review on average
- **Tracking**: review_helpfulness table row count

#### Average Rating
- **Definition**: Mean rating across all reviews
- **Target**: 4.2/5.0
- **Tracking**: AVG(rating) FROM reviews

### List Sharing

#### Lists Shared
- **Definition**: Number of sharing actions
- **Target**: 200 shares/month by month 3
- **Tracking**: list_shares table INSERT events

#### Share Acceptance Rate
- **Definition**: % of shared lists that are accepted/synced
- **Target**: 35% acceptance rate
- **Tracking**: Conversion tracking

#### List Views
- **Definition**: Views of shared public lists
- **Target**: 1,000 views/month by month 3
- **Tracking**: view_count in shared_lists table

### Product Comparisons

#### Comparisons Created
- **Definition**: Product comparisons made
- **Target**: 300 comparisons/month by month 3
- **Tracking**: product_comparisons table INSERT events

#### Products Compared
- **Definition**: Average products per comparison
- **Target**: 3.5 products per comparison
- **Tracking**: array_length(product_ids, 1) in comparisons

---

## Sprint 3: Personalization Metrics

### Wishlist Engagement

#### Wishlists Created
- **Definition**: New wishlists created
- **Target**: 1,000 wishlists/month by month 3
- **Tracking**: wishlists table INSERT events

#### Items Per Wishlist
- **Definition**: Average items per list
- **Target**: 8 items per list
- **Tracking**: AVG(item_count) by wishlist

#### Wishlist Updates
- **Definition**: Items added to wishlists
- **Target**: 2,000 additions/month by month 3
- **Tracking**: wishlist_items table INSERT events

#### Wishlist Return Rate
- **Definition**: % of users who return to a wishlist after creation
- **Target**: 50% within 30 days
- **Tracking**: Activity on wishlists table

### Recommendation Engagement

#### Recommendations Delivered
- **Definition**: Personalized recommendations shown to users
- **Target**: 50,000 recommendations/month by month 3
- **Tracking**: recommendations table row count

#### Recommendation Click Rate
- **Definition**: % of recommendations clicked
- **Target**: 8% click-through rate
- **Tracking**: Product view analytics

#### Recommendation Conversion Rate
- **Definition**: % of clicked recommendations leading to purchase
- **Target**: 5% conversion
- **Tracking**: Purchase history linked to recommendations

#### Recommendation Quality Score
- **Definition**: User rating of recommendation relevance
- **Target**: 4.0/5.0
- **Tracking**: User feedback on recommendations

### Purchase Tracking

#### Tracked Purchases
- **Definition**: Purchases recorded in system
- **Target**: 2,000 purchases/month by month 3
- **Tracking**: purchase_history table row count

#### Purchase Value
- **Definition**: Average value per tracked purchase
- **Target**: $45.00 USD
- **Tracking**: AVG(price_paid) FROM purchase_history

#### Repeat Purchase Rate
- **Definition**: % of users making 2+ purchases
- **Target**: 35% repeat rate within 90 days
- **Tracking**: User cohort analysis

---

## Sprint 4: Gamification Metrics

### Points System

#### Points Awarded
- **Definition**: Total points awarded across all users
- **Target**: 100,000 points/month by month 3
- **Tracking**: SUM(points) FROM point_transactions WHERE points > 0

#### Average Points Balance
- **Definition**: Mean points balance per user
- **Target**: 250 points per active user
- **Tracking**: AVG(current_balance) FROM user_points

#### Points Spending Rate
- **Definition**: % of earned points that are redeemed
- **Target**: 25% spending rate
- **Tracking**: Redemption tracking

### Achievement Engagement

#### Achievements Unlocked
- **Definition**: Total achievements earned
- **Target**: 3,000 unlocks/month by month 3
- **Tracking**: user_achievements table row count

#### Achievements Per User
- **Definition**: Average achievements per active user
- **Target**: 2.5 achievements per user
- **Tracking**: AVG(achievement_count) by user

#### Achievement Unlock Rate
- **Definition**: % of users who unlock at least one achievement
- **Target**: 70% of active users
- **Tracking**: User cohort with achievements > 0

#### Time to First Achievement
- **Definition**: Average days until first achievement unlock
- **Target**: < 7 days
- **Tracking**: Date calculations

### Reward Redemptions

#### Rewards Redeemed
- **Definition**: Reward redemption transactions
- **Target**: 500 redemptions/month by month 3
- **Tracking**: reward_redemptions table INSERT events

#### Redemption Value
- **Definition**: Average points spent per redemption
- **Target**: 400 points per reward
- **Tracking**: AVG(points_spent) FROM reward_redemptions

#### Reward Utilization Rate
- **Definition**: % of redeemed rewards that are actually used
- **Target**: 80% utilization rate
- **Tracking**: Used_at timestamp tracking

### Leaderboard Engagement

#### Leaderboard Views
- **Definition**: Page views of leaderboard
- **Target**: 500 views/month by month 3
- **Tracking**: Analytics

#### Competition Participation
- **Definition**: % of users checking their leaderboard rank
- **Target**: 25% of active users
- **Tracking**: Leaderboard query analytics

#### Ranking Changes
- **Definition**: Users who change their leaderboard position
- **Target**: 40% change monthly
- **Tracking**: Rank change tracking

---

## User Engagement Metrics

### Overall Engagement Score

#### Formula
```
Engagement Score = (
  (DAU × 0.2) +
  (Price Alerts Active × 0.15) +
  (Reviews Written × 0.15) +
  (Recommendations Clicked × 0.15) +
  (Achievements Unlocked × 0.15) +
  (Points Earned × 0.10) +
  (Lists Shared × 0.10)
) / Total Users
```

#### Target
- Month 1: 15
- Month 2: 25
- Month 3: 40
- Month 6: 65
- Month 12: 100

### Session Metrics

#### Session Duration
- **Definition**: Average time spent per session
- **Target**: 8 minutes per session
- **Tracking**: Analytics

#### Sessions Per User
- **Definition**: Average sessions per monthly user
- **Target**: 4 sessions per user per week
- **Tracking**: Session tracking

#### Bounce Rate
- **Definition**: % of single-page sessions
- **Target**: < 30%
- **Tracking**: Analytics

---

## Business Impact Metrics

### Monetization

#### User Lifetime Value (LTV)
- **Definition**: Total expected revenue per user
- **Target**: $150 per user
- **Calculation**: (Revenue from purchases + Affiliate commissions) / User count

#### Revenue from Affiliate Commissions
- **Definition**: Total affiliate earnings
- **Target**: $2,000/month by month 3
- **Tracking**: purchase_history.affiliate_commission

#### Average Order Value (AOV)
- **Definition**: Average value per purchase
- **Target**: $45
- **Tracking**: purchase_history analytics

### Acquisition & Growth

#### Organic Growth Rate
- **Definition**: New users from retention loops
- **Target**: 20% of new users from referrals
- **Tracking**: Attribution tracking

#### User Referrals
- **Definition**: Users referred by existing users
- **Target**: 300 referrals/month by month 3
- **Tracking**: Referral tracking

#### Network Effects
- **Definition**: Growth acceleration from community features
- **Target**: Exponential growth in reviews/shares
- **Tracking**: Growth rate analysis

---

## Performance Metrics

### System Performance

#### API Response Time
- **Definition**: Average response time for API calls
- **Target**: < 200ms (p95)
- **Tracking**: Prometheus metrics

#### Notification Delivery Time
- **Definition**: Time from triggering to device delivery
- **Target**: < 2 seconds
- **Tracking**: Firebase metrics + backend logs

#### Price Check Latency
- **Definition**: Time to check prices and update database
- **Target**: < 5 seconds per check
- **Tracking**: Worker job timing

#### Database Query Performance
- **Definition**: Average query execution time
- **Target**: < 100ms for 99% of queries
- **Tracking**: PostgreSQL slow query logs

### System Health

#### Error Rate
- **Definition**: % of requests returning errors
- **Target**: < 0.1%
- **Tracking**: Error logging

#### Worker Job Success Rate
- **Definition**: % of background jobs that complete successfully
- **Target**: > 99%
- **Tracking**: BullMQ metrics

#### Database Uptime
- **Definition**: Percentage of time database is available
- **Target**: 99.9%
- **Tracking**: Infrastructure monitoring

---

## Data Quality Metrics

### Price Data Quality

#### Price Check Coverage
- **Definition**: % of products checked in each cycle
- **Target**: 90% of active products
- **Tracking**: Price history table

#### Price Source Coverage
- **Definition**: % of prices coming from multiple sources
- **Target**: 80% of products from 2+ sources
- **Tracking**: price_history source tracking

#### Price Accuracy
- **Definition**: % of prices matching external sources
- **Target**: > 95% accuracy
- **Tracking**: Spot checks vs external APIs

### Review Quality

#### Spam Detection Rate
- **Definition**: % of reviews flagged as spam
- **Target**: < 2%
- **Tracking**: Moderation analytics

#### Review Authenticity
- **Definition**: % of reviews from verified purchasers
- **Target**: 60% verified
- **Tracking**: verified_purchase flag

---

## Analytics Dashboard

### Key Dashboard Views

1. **Executive Overview**
   - DAU, WAU, MAU
   - Retention rates
   - Churn rate
   - Overall engagement score

2. **Engagement Breakdown**
   - Activity by sprint (Price, Community, Personalization, Gamification)
   - Feature adoption rates
   - Feature engagement depth

3. **Business Metrics**
   - Revenue metrics
   - Growth rates
   - User lifetime value

4. **System Health**
   - API performance
   - Error rates
   - Queue health
   - Database performance

### Reporting Schedule

- **Daily**: DAU, Error rates, Alert status
- **Weekly**: Retention cohorts, Feature adoption
- **Monthly**: All metrics, Trend analysis, Forecasts
- **Quarterly**: Strategic review, ROI analysis

---

## Benchmarks & Industry Standards

### Expected Ranges

| Metric | Industry | SupliList Target |
|--------|----------|-----------------|
| Day 1 Retention | 40% | 85% |
| Day 7 Retention | 20% | 45% |
| Day 30 Retention | 5% | 30% |
| Monthly Churn | 10% | < 5% |
| Notification Open Rate | 30% | 40% |
| Review Completion Rate | 50% | 70% |
| Feature Adoption | 30% | 60% |
| Recommendation CTR | 5% | 8% |
| Points Spending Rate | 15% | 25% |

---

## Data Export & Integration

### Analytics Export

Export metrics weekly to:
- CSV files for stakeholder review
- BI tools (Metabase, Tableau)
- Email reports to team

### API Endpoints for Metrics

```
GET /api/admin/metrics/retention
GET /api/admin/metrics/engagement
GET /api/admin/metrics/business
GET /api/admin/metrics/system
GET /api/admin/metrics/dashboard
```

---

## Continuous Improvement

### Weekly Reviews
- Check key metrics
- Identify issues
- Plan optimizations

### Monthly Analysis
- Cohort analysis
- Trend identification
- Feature performance review

### Quarterly Strategy
- ROI assessment
- Roadmap adjustments
- Investment decisions

---

## Conclusion

These metrics provide comprehensive visibility into the retention system's performance across all four sprints. Regular monitoring and analysis will enable data-driven decisions to maximize user retention and engagement.
