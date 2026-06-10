# SupliList User Retention System - Complete Overview

## Introduction

The SupliList Retention System is a comprehensive, four-sprint implementation designed to maximize user engagement and retention through price monitoring, community features, personalization, and gamification.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Vercel)                           │
├─────────────────────────────────────────────────────────────────┤
│ - React/Next.js UI                                              │
│ - Firebase Cloud Messaging Integration                          │
│ - Real-time Notifications                                       │
│ - Recommendation Display                                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │ REST API + WebSocket
┌──────────────────────▼──────────────────────────────────────────┐
│                   Backend (Render/Node.js)                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              REST API Routes                               │ │
│  │  - Price Alerts         - Community (Reviews, Lists)       │ │
│  │  - Recommendations      - Gamification (Points, Rewards)   │ │
│  │  - Wishlists           - Device Tokens                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                    │
│  ┌────────────────────────▼──────────────────────────────────┐ │
│  │              Service Layer (Business Logic)                │ │
│  │  ├─ Firebase Service (FCM)       ├─ Review Service         │ │
│  │  ├─ Price Monitor Service        ├─ Shared List Service    │ │
│  │  ├─ Recommendation Service       ├─ Comparison Service     │ │
│  │  ├─ Gamification Service         └─ Achievement Service    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                    │
│  ┌────────────────────────▼──────────────────────────────────┐ │
│  │            Background Workers (BullMQ)                     │ │
│  │  ├─ Price Monitoring (every 30 min)                       │ │
│  │  ├─ Recommendation Generation (daily 2 AM)                │ │
│  │  └─ Achievement Checking (hourly)                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                    │
└──────────────────────┬─────┴──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌────▼──────┐ ┌────▼──────┐
│ PostgreSQL   │ │  Redis    │ │ Firebase  │
│              │ │           │ │ Admin SDK │
│ - Users      │ │ - Queue   │ │           │
│ - Products   │ │ - Cache   │ │ - FCM     │
│ - Alerts     │ │ - Sessions│ │ - Auth    │
│ - Reviews    │ │           │ │           │
│ - Points     │ │           │ │           │
└──────────────┘ └───────────┘ └───────────┘
```

## Sprint Breakdown

### Sprint 1: Price Monitoring & Notifications (8 hours)

**Focus**: Real-time price tracking and Firebase push notifications

**Key Features**:
- Price alerts (create, update, delete)
- Multi-source price monitoring
- Automatic price drop detection
- Firebase device token management
- Push notifications to multiple devices
- Price history tracking and analytics

**Database Tables**:
- `user_price_alerts` - User's price monitoring subscriptions
- `price_history` - Historical price data
- `firebase_tokens` - Device token management

**API Endpoints**:
```
POST   /api/price-alerts                 - Create alert
GET    /api/price-alerts                 - List user's alerts
GET    /api/price-alerts/:alertId        - Get specific alert
PATCH  /api/price-alerts/:alertId        - Update alert
DELETE /api/price-alerts/:alertId        - Delete alert
GET    /api/price-alerts/history/:productId - Price history
POST   /api/price-alerts/device-tokens   - Register device
DELETE /api/price-alerts/device-tokens/{tokenId} - Unregister device
```

**Key Services**:
- `FirebaseService` - FCM integration
- `PriceMonitorService` - Price tracking logic
- `PriceMonitorWorker` - BullMQ background job

**Retention Impact**:
- Daily engagement through price alerts
- Timely notifications increase app opens
- Habit formation through regular checks

---

### Sprint 2: Community Features (12 hours)

**Focus**: User-generated content and social sharing

**Key Features**:
- Product reviews with ratings (1-5)
- Review helpfulness voting
- List sharing with granular permissions
- Product comparison across sources
- Community statistics and reviews aggregation

**Database Tables**:
- `reviews` - User reviews with ratings
- `review_helpfulness` - Vote tracking
- `shared_lists` - Shared list data
- `list_shares` - Share permissions
- `product_comparisons` - Saved comparisons
- `community_stats` - Aggregated statistics

**API Endpoints**:
```
POST   /api/reviews                      - Add review
GET    /api/products/:productId/reviews  - Get reviews
POST   /api/reviews/:reviewId/helpful    - Mark helpful
GET    /api/products/:productId/review-stats - Review stats
POST   /api/lists/:listId/share          - Share list
GET    /api/lists/shared-with-me         - Get shared lists
POST   /api/lists/from-share/:token      - Accept shared list
POST   /api/comparisons                  - Create comparison
GET    /api/comparisons                  - List comparisons
GET    /api/products/compare             - Quick compare
```

**Key Services**:
- `ReviewService` - Review management and stats
- `SharedListService` - List sharing logic
- `ComparisonService` - Product comparison

**Retention Impact**:
- User-generated content increases stickiness
- Social features encourage sharing
- Reviews provide trust and credibility
- Comparisons enable informed decisions

---

### Sprint 3: Personalization & Recommendations (16 hours)

**Focus**: AI-powered recommendations and personalized experience

**Key Features**:
- Personalized wishlists
- User preference management
- Collaborative filtering recommendations
- Content-based recommendations
- Trending products in user's category
- Purchase history tracking
- Product view tracking

**Database Tables**:
- `wishlists` - User's wishlist collections
- `wishlist_items` - Items in wishlists
- `user_preferences` - Personalization settings
- `purchase_history` - Tracked purchases
- `product_views` - Tracking views
- `recommendations` - Generated recommendations

**API Endpoints**:
```
POST   /api/wishlists                    - Create wishlist
GET    /api/wishlists                    - List user's wishlists
POST   /api/wishlists/:wishlistId/items  - Add item to list
DELETE /api/wishlists/:wishlistId/items/{itemId} - Remove item
POST   /api/wishlists/:wishlistId/share  - Share wishlist
GET    /api/wishlists/:token             - View shared wishlist
PUT    /api/user/preferences             - Update preferences
GET    /api/user/feed                    - Personalized feed
POST   /api/user/purchase-history        - Track purchase
GET    /api/recommendations              - Personalized
GET    /api/recommendations/trending     - Trending
GET    /api/recommendations/similar-users - Similar users
```

**Key Services**:
- `RecommendationService` - Recommendation algorithms
- `WishlistService` - Wishlist management
- `PersonalizationService` - Preference management
- `RecommendationWorker` - Daily generation

**Retention Impact**:
- Personalization increases relevance
- Recommendations increase engagement
- Wishlists create repeated visits
- Purchase tracking enables loyalty programs

---

### Sprint 4: Gamification & Loyalty (12 hours)

**Focus**: Reward system and achievement badges

**Key Features**:
- Points system with transactions
- Achievement badges (7 types)
- Leaderboard rankings
- Redeemable rewards
- Tiered reward system
- Achievement notifications

**Database Tables**:
- `user_points` - Points balance tracking
- `point_transactions` - Transaction history
- `achievements` - Achievement definitions
- `user_achievements` - User's unlocked achievements
- `rewards` - Redeemable rewards
- `reward_redemptions` - Redemption records
- `leaderboard_cache` - Leaderboard rankings

**API Endpoints**:
```
POST   /api/points/award                 - Award points (admin)
GET    /api/points/balance               - Get balance
GET    /api/points/history               - Get transactions
GET    /api/leaderboard                  - Global leaderboard
GET    /api/achievements                 - Get achievements
POST   /api/achievements/:id/claim       - Claim achievement
GET    /api/rewards                      - List rewards
POST   /api/rewards/:rewardId/redeem     - Redeem reward
GET    /api/rewards/redeemed             - Redeemed rewards
```

**Key Services**:
- `GamificationService` - Points and rewards
- `AchievementService` - Achievement logic
- `AchievementWorker` - Hourly checking

**Achievements**:
1. First Steps - Create first list (10 pts)
2. Obsessed Shopper - Add 50 items (50 pts)
3. Bargain Hunter - Find 10 deals (50 pts)
4. Community Leader - 50 helpful reviews (100 pts)
5. Recommendation Seeker - Click 10 recommendations (25 pts)
6. Wishlist Master - Create 5 wishlists (50 pts)
7. Social Butterfly - Share 10 lists (75 pts)

**Retention Impact**:
- Points motivate continued engagement
- Achievements create goals to achieve
- Leaderboard creates friendly competition
- Rewards provide tangible value

---

## Database Schema

### Core Tables (Existing)
```
- users
- products
- categories
```

### Added Tables (48 total)
```
Sprint 1 (3 tables):
- user_price_alerts
- price_history
- firebase_tokens

Sprint 2 (6 tables):
- reviews
- review_helpfulness
- shared_lists
- list_shares
- product_comparisons
- community_stats

Sprint 3 (6 tables):
- wishlists
- wishlist_items
- user_preferences
- purchase_history
- product_views
- recommendations

Sprint 4 (7 tables):
- user_points
- point_transactions
- achievements
- user_achievements
- rewards
- reward_redemptions
- leaderboard_cache
```

## Technology Stack

### Backend
- **Runtime**: Node.js 24+
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Cache/Queue**: Redis 7
- **Task Queue**: BullMQ
- **Authentication**: JWT
- **Validation**: Zod
- **Logging**: Winston
- **Monitoring**: Prometheus

### External Services
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Email**: Resend
- **Storage**: AWS S3

### Frontend Integration
- **React/Next.js**
- **Firebase Cloud Messaging SDK**
- **Real-time Updates**: WebSocket/Server-Sent Events

## API Response Format

All API endpoints follow a consistent response format:

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Product Name",
    ...
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "correlationId": "uuid"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "error details"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "correlationId": "uuid"
  }
}
```

## Authentication

- **Method**: JWT Bearer Token
- **Header**: `Authorization: Bearer {token}`
- **Expiry**: 24 hours
- **Refresh**: Automatic refresh token rotation

## Rate Limiting

- **Price Alerts**: 10 per minute per user
- **Reviews**: 5 per minute per user
- **Recommendations**: 100 per minute per user
- **API General**: 100 requests per minute per user

## Error Codes

```
400 - Bad Request (validation error)
401 - Unauthorized (invalid token)
403 - Forbidden (insufficient permissions)
404 - Not Found (resource doesn't exist)
409 - Conflict (duplicate, constraint violation)
429 - Too Many Requests (rate limit exceeded)
500 - Internal Server Error
```

## Monitoring & Metrics

### Key Metrics
- Price alerts created/active
- Notifications sent/delivered
- Review submission rate
- Share actions
- Points awarded/redeemed
- Achievement unlock rate
- Recommendation click-through rate

### Logging
- All operations logged with correlation IDs
- Error stack traces captured
- Performance metrics tracked
- User actions audit trail

## Security Considerations

1. **Data Protection**
   - All sensitive data encrypted at rest
   - HTTPS only transmission
   - PII masked in logs

2. **Access Control**
   - Row-level security for user data
   - Granular permissions for shared lists
   - Admin audit logging

3. **Rate Limiting**
   - Redis-backed rate limiting
   - Burst protection
   - Gradual backoff

4. **Input Validation**
   - Zod schema validation
   - SQL injection prevention
   - XSS protection

## Deployment

### Infrastructure
- **Backend**: Render (Node.js)
- **Frontend**: Vercel (Next.js)
- **Database**: PostgreSQL 15 (managed)
- **Cache**: Redis 7 (managed)
- **Messages**: Firebase

### Environment Variables
See `.env.example` for complete list

### Deployment Steps
1. Run migrations: `npm run migrate`
2. Seed achievements: `npm run seed:achievements`
3. Start workers: `npm run workers:start`
4. Deploy frontend: `npm run build && npm run deploy`

## Maintenance

### Regular Tasks
- Monitor worker queues daily
- Review error logs weekly
- Update recommendations monthly
- Archive old recommendations monthly

### Backup Strategy
- Automatic daily PostgreSQL backups
- 30-day retention policy
- Point-in-time recovery available

## Performance Targets

- API response time: < 200ms (p95)
- Price check latency: < 5s
- Notification delivery: < 2s
- Recommendation generation: < 30s

## Future Enhancements

1. **Machine Learning**
   - Advanced recommendation engine
   - Price prediction algorithms
   - Churn prediction

2. **Social Features**
   - User profiles and following
   - Community discussions
   - Badges and trophies

3. **Analytics**
   - User behavior analytics
   - Retention cohort analysis
   - Funnel analysis

4. **Personalization**
   - Dynamic pricing
   - Personalized rewards
   - A/B testing framework

## Support & Troubleshooting

See individual sprint documentation for detailed troubleshooting guides.

## Conclusion

The SupliList Retention System is a comprehensive approach to user engagement across four key dimensions: price value (Sprint 1), community trust (Sprint 2), personalization (Sprint 3), and gamification (Sprint 4). Together, these systems create a virtuous cycle of engagement and retention.
