# Sprint 1: Price Monitoring & Notifications

## Overview

Sprint 1 implements a comprehensive price monitoring system with Firebase Cloud Messaging (FCM) push notifications. Users can set price alerts for products and receive real-time notifications when prices drop below their target threshold.

## Features

### 1. Price Alerts
- Create price alerts for any product with a target price
- Automatic detection of price drops (configurable threshold)
- Update or delete alerts anytime
- View all active alerts for your account
- Track price history across multiple sources

### 2. Firebase Device Management
- Register multiple devices (iOS, Android, Web)
- Automatic device token refresh
- Unregister devices anytime
- Device-specific push notifications

### 3. Price History & Analytics
- Track price changes across multiple sources
- Automatic calculation of price drop percentages
- Historical price data for trend analysis
- Latest price information for each product

## Setup

### Prerequisites

1. Firebase project setup
2. Firebase Admin SDK credentials
3. PostgreSQL database with migrations applied
4. Redis for job queue management

### Environment Variables

Add to your `.env` file:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=your-email@your-project.iam.gserviceaccount.com

# Price Monitoring
PRICE_CHECK_THRESHOLD=10  # Minimum percentage drop to trigger notification (default: 10%)
PRICE_SOURCES=source_a,source_b,source_c
```

### Database Setup

Run the migration to create required tables:

```bash
psql -U postgres -d suplilist -f server/database/migrations/002_price_alerts_schema.sql
```

This creates:
- `user_price_alerts` - Stores user's price alerts
- `price_history` - Stores historical price data
- `firebase_tokens` - Manages device tokens for notifications
- Associated indices and triggers for performance

### Start Price Monitor Worker

```bash
npm run workers:start -- price-monitor
```

Or via the scheduler (runs every 30 minutes):

```bash
# Add to your main server startup
import { startPriceMonitor } from './workers/price-monitor.worker';

await startPriceMonitor();
```

## API Endpoints

### Price Alert Management

#### Create Price Alert
```http
POST /api/price-alerts
Content-Type: application/json
Authorization: Bearer {token}

{
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "targetPrice": 79.99
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "alert-id",
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "targetPrice": 79.99,
    "active": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Get All Price Alerts
```http
GET /api/price-alerts
Authorization: Bearer {token}
```

Response (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "alert-id",
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "targetPrice": 79.99,
      "currentPrice": 89.99,
      "active": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "notificationSentAt": null
    }
  ]
}
```

#### Get Specific Alert
```http
GET /api/price-alerts/{alertId}
Authorization: Bearer {token}
```

#### Update Price Alert
```http
PATCH /api/price-alerts/{alertId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "targetPrice": 69.99,
  "active": true
}
```

#### Delete Price Alert
```http
DELETE /api/price-alerts/{alertId}
Authorization: Bearer {token}
```

Response (200):
```json
{
  "success": true,
  "message": "Price alert deleted successfully"
}
```

### Device Token Management

#### Register Device Token
```http
POST /api/price-alerts/device-tokens
Content-Type: application/json
Authorization: Bearer {token}

{
  "deviceToken": "firebase-device-token",
  "deviceName": "iPhone 14 Pro",
  "deviceType": "ios"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "tokenId": "token-id"
  }
}
```

Device types supported:
- `ios` - Apple devices
- `android` - Android devices
- `web` - Web browsers

#### Delete Device Token
```http
DELETE /api/price-alerts/device-tokens/{tokenId}
Authorization: Bearer {token}
```

### Price History

#### Get Price History
```http
GET /api/price-alerts/history/{productId}?limit=100&offset=0
Authorization: Bearer {token}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "total": 250,
    "limit": 100,
    "offset": 0,
    "history": [
      {
        "source": "source_a",
        "price": 89.99,
        "dropPercentage": 10.5,
        "checkedAt": "2024-01-15T10:30:00Z"
      },
      {
        "source": "source_b",
        "price": 85.99,
        "dropPercentage": 15.2,
        "checkedAt": "2024-01-15T10:25:00Z"
      }
    ]
  }
}
```

## Notification Format

When a price drop is detected, users receive:

### iOS Notification
```
Title: "Price Drop Alert!"
Body: "Product price dropped by 15.2%! Now at $89.99"
Sound: Default system sound
```

### Android Notification
```
Title: "Price Drop Alert!"
Body: "Product price dropped by 15.2%! Now at $89.99"
Channel: price_alerts
Priority: HIGH
```

### Web Notification
```
Title: "Price Drop Alert!"
Body: "Product price dropped by 15.2%! Now at $89.99"
Icon: [badge_url]
```

Notification payload includes:
- `productId` - Product ID
- `previousPrice` - Previous price
- `currentPrice` - Current price
- `dropPercentage` - Percentage drop
- `type` - "price_drop"

## Price Monitoring Flow

### 1. Alert Creation
```
User creates alert → Store in database → Ready to monitor
```

### 2. Price Checking (Every 30 minutes)
```
Worker fetches latest prices from 3 sources
↓
Compares with previous price
↓
Calculates drop percentage
↓
Stores in price_history
↓
Checks if drop > threshold
↓
If yes: Triggers notifications
```

### 3. Notification Dispatch
```
Get all users with active alerts for product
↓
Filter by target price
↓
Get user's device tokens
↓
Send via Firebase to all devices
↓
Log notification status
```

## Configuration

### Price Check Threshold

Default: 10% drop required to trigger notification

To change:
```typescript
const PRICE_CHECK_THRESHOLD = 15; // 15% drop
```

### Price Sources

Currently monitors 3 sources. To add more:

```typescript
const PRICE_SOURCES = [
  { name: 'source_a', url: 'https://api.source-a.com/products' },
  { name: 'source_b', url: 'https://api.source-b.com/products' },
  { name: 'source_c', url: 'https://api.source-c.com/products' },
  { name: 'source_d', url: 'https://api.source-d.com/products' }, // Add here
];
```

### Check Interval

Default: Every 30 minutes

To change, modify the cron pattern in `price-monitor.worker.ts`:

```typescript
const repeatOptions = {
  pattern: '*/15 * * * *', // Every 15 minutes instead
  tz: 'UTC',
};
```

## Monitoring & Debugging

### Get Monitor Status

```typescript
import { getPriceMonitorStats } from './workers/price-monitor.worker';

const stats = await getPriceMonitorStats();
console.log(stats);
// {
//   activeJobs: 1,
//   delayedJobs: 12,
//   failedJobs: 0,
//   completedJobs: 456
// }
```

### Manual Price Check

```typescript
import { queuePriceCheck } from './workers/price-monitor.worker';

// Check all products
await queuePriceCheck();

// Check specific product
await queuePriceCheck('product-id');
```

### View Price History

```typescript
import { priceMonitorService } from './services/price-monitor.service';

const history = await priceMonitorService.getPriceHistory('product-id', 50);
const lowestPrice = await priceMonitorService.getLowestPrice('product-id');
```

## Error Handling

### Firebase Errors

If Firebase initialization fails, check:

1. Environment variables are set correctly
2. Firebase credentials have correct permissions
3. Firebase project has Cloud Messaging enabled
4. Network connectivity to Firebase servers

### Price Check Failures

Price checks automatically retry up to 3 times with exponential backoff. Failed checks are logged for investigation.

### Invalid Device Tokens

When sending fails to a device:
- Token is marked as inactive
- Notification attempt is logged
- User can re-register token

## Testing

Run the comprehensive test suite:

```bash
npm run test -- e2e/sprint1-price-notifications.test.ts
```

Tests cover:
- Price alert CRUD operations
- Device token management
- Price history retrieval
- Firebase integration
- Error handling
- Concurrent operations
- Data validation
- Database constraints

## Performance Notes

- Price checks run every 30 minutes to minimize API calls
- Notifications batched to 500 devices per Firebase call
- Price history indexed by product_id and checked_at
- Active alerts indexed for efficient querying
- Each price check is atomic to prevent race conditions

## Security

- All endpoints require authentication
- Price alerts visible only to alert creator
- Device tokens are never exposed in API responses
- Firebase credentials stored securely in environment
- Rate limiting on alert creation

## Troubleshooting

### No notifications received

1. Check device token is registered:
   ```sql
   SELECT * FROM firebase_tokens WHERE user_id = 'user-id' AND is_active = true;
   ```

2. Verify active price alerts exist:
   ```sql
   SELECT * FROM user_price_alerts WHERE user_id = 'user-id' AND active = true;
   ```

3. Check Firebase credentials in environment variables

4. Check logs for notification dispatch errors

### Price not dropping below threshold

1. Verify price sources are returning data
2. Check PRICE_CHECK_THRESHOLD value
3. Confirm previous price is being recorded

### Worker not running

1. Verify Redis is running
2. Check worker logs for startup errors
3. Confirm queue is being created

## Next Steps

- Implement price prediction algorithms
- Add SMS notifications as fallback
- Create admin dashboard for monitoring
- Implement price comparison across sources
- Add wishlist price alert integration
