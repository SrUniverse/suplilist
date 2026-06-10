# Retention System Integration Guide

This guide explains how to integrate the retention system components into your frontend application.

## Frontend Setup

### 1. Firebase Cloud Messaging Setup

#### Install Firebase SDK
```bash
npm install firebase
```

#### Initialize Firebase in your app
```typescript
// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, onMessage, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
```

#### Request notification permission
```typescript
// hooks/useNotifications.ts
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';

export function useNotifications() {
  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  useEffect(() => {
    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          });
          setDeviceToken(token);
          
          // Register token with backend
          await fetch('/api/price-alerts/device-tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceToken: token,
              deviceName: getUserDeviceName(),
              deviceType: getDeviceType(),
            }),
          });
        }
      } catch (error) {
        console.error('Failed to get notification permission:', error);
      }
    };

    requestPermission();
  }, []);

  // Handle foreground notifications
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground notification:', payload);
      
      // Handle notification based on type
      if (payload.data?.type === 'price_drop') {
        handlePriceDropNotification(payload.data);
      } else if (payload.data?.type === 'achievement_unlocked') {
        handleAchievementNotification(payload.data);
      }
    });

    return unsubscribe;
  }, []);

  return { deviceToken };
}

function getUserDeviceName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Android')) return 'Android';
  return 'Web Browser';
}

function getDeviceType(): 'ios' | 'android' | 'web' {
  const ua = navigator.userAgent;
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'ios';
  if (ua.includes('Android')) return 'android';
  return 'web';
}
```

### 2. Price Alerts UI Integration

#### Create Price Alert Component
```typescript
// components/PriceAlert/CreateAlert.tsx
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function CreatePriceAlert({ productId }: { productId: string }) {
  const [targetPrice, setTargetPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleCreateAlert = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/price-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          targetPrice: parseFloat(targetPrice),
        }),
      });

      if (!response.ok) throw new Error('Failed to create alert');
      
      const data = await response.json();
      console.log('Price alert created:', data.data);
    } catch (error) {
      console.error('Error creating price alert:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="price-alert-form">
      <input
        type="number"
        placeholder="Target price"
        value={targetPrice}
        onChange={(e) => setTargetPrice(e.target.value)}
        step="0.01"
      />
      <button
        onClick={handleCreateAlert}
        disabled={loading || !targetPrice}
      >
        {loading ? 'Creating...' : 'Set Price Alert'}
      </button>
    </div>
  );
}
```

#### Display Active Alerts
```typescript
// components/PriceAlert/ActiveAlerts.tsx
import { useEffect, useState } from 'react';

export function ActiveAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/price-alerts');
      const data = await response.json();
      setAlerts(data.data || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      await fetch(`/api/price-alerts/${alertId}`, { method: 'DELETE' });
      setAlerts(alerts.filter((a) => a.id !== alertId));
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  if (loading) return <div>Loading alerts...</div>;

  return (
    <div className="alerts-list">
      {alerts.map((alert) => (
        <div key={alert.id} className="alert-item">
          <div>Target: ${alert.targetPrice}</div>
          <div>Current: ${alert.currentPrice || 'N/A'}</div>
          <button onClick={() => deleteAlert(alert.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
```

### 3. Community Features Integration

#### Review Component
```typescript
// components/Reviews/ReviewForm.tsx
import { useState } from 'react';

export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating,
          title,
          text,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit review');
      
      // Success - clear form
      setRating(5);
      setText('');
      setTitle('');
      console.log('Review submitted successfully');
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <input
        type="text"
        placeholder="Review title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <select value={rating} onChange={(e) => setRating(parseInt(e.target.value))}>
        {[1, 2, 3, 4, 5].map((r) => (
          <option key={r} value={r}>{r} Stars</option>
        ))}
      </select>
      <textarea
        placeholder="Your review"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
```

#### Reviews Display
```typescript
// components/Reviews/ReviewsList.tsx
import { useEffect, useState } from 'react';

export function ReviewsList({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(
        `/api/products/${productId}/reviews?limit=10`
      );
      const data = await response.json();
      setReviews(data.data.reviews || []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `/api/products/${productId}/review-stats`
      );
      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch review stats:', error);
    }
  };

  const markHelpful = async (reviewId: string) => {
    try {
      await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHelpful: true }),
      });
    } catch (error) {
      console.error('Failed to mark helpful:', error);
    }
  };

  return (
    <div className="reviews-section">
      {stats && (
        <div className="review-stats">
          <div>Average Rating: {stats.averageRating}/5</div>
          <div>Total Reviews: {stats.totalReviews}</div>
          <div>Rating Breakdown: {JSON.stringify(stats.ratingBreakdown)}</div>
        </div>
      )}
      
      <div className="reviews-list">
        {reviews.map((review) => (
          <div key={review.id} className="review-item">
            <div className="review-header">
              <strong>{review.reviewer_name}</strong> - {review.rating}★
            </div>
            <div className="review-title">{review.title}</div>
            <div className="review-text">{review.text}</div>
            <button onClick={() => markHelpful(review.id)}>
              Helpful ({review.helpful_count})
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4. Recommendations Integration

#### Display Recommendations
```typescript
// components/Recommendations/RecommendedProducts.tsx
import { useEffect, useState } from 'react';

export function RecommendedProducts() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch('/api/recommendations?limit=10');
      const data = await response.json();
      setRecommendations(data.data || []);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = async (productId: string) => {
    // Track the click
    try {
      await fetch(`/api/products/${productId}/view`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  if (loading) return <div>Loading recommendations...</div>;

  return (
    <div className="recommendations-section">
      <h2>Recommended For You</h2>
      <div className="products-grid">
        {recommendations.map((product) => (
          <div
            key={product.id}
            className="product-card"
            onClick={() => handleProductClick(product.id)}
          >
            <div className="product-name">{product.name}</div>
            <div className="product-price">${product.price}</div>
            <div className="reason">{product.reason}</div>
            <div className="confidence">Match: {product.score}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 5. Gamification Integration

#### Points Display
```typescript
// components/Gamification/PointsDisplay.tsx
import { useEffect, useState } from 'react';

export function PointsDisplay() {
  const [points, setPoints] = useState(null);

  useEffect(() => {
    fetchPoints();
  }, []);

  const fetchPoints = async () => {
    try {
      const response = await fetch('/api/points/balance');
      const data = await response.json();
      setPoints(data.data);
    } catch (error) {
      console.error('Failed to fetch points:', error);
    }
  };

  if (!points) return <div>Loading points...</div>;

  return (
    <div className="points-display">
      <div className="current-balance">
        {points.currentBalance} Points
      </div>
      <div className="lifetime-stats">
        Lifetime Earned: {points.lifetimeEarned}
      </div>
    </div>
  );
}
```

#### Leaderboard
```typescript
// components/Gamification/Leaderboard.tsx
import { useEffect, useState } from 'react';

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard?limit=10');
      const data = await response.json();
      setLeaderboard(data.data || []);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  return (
    <div className="leaderboard">
      <h2>Top Players</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Points</th>
            <th>Achievements</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry) => (
            <tr key={entry.userId}>
              <td>{entry.rank}</td>
              <td>{entry.name}</td>
              <td>{entry.points}</td>
              <td>{entry.achievementCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### Achievements
```typescript
// components/Gamification/Achievements.tsx
import { useEffect, useState } from 'react';

export function Achievements() {
  const [achievements, setAchievements] = useState(null);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const response = await fetch('/api/achievements');
      const data = await response.json();
      setAchievements(data.data);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    }
  };

  if (!achievements) return <div>Loading achievements...</div>;

  return (
    <div className="achievements">
      <div className="unlocked">
        <h3>Unlocked ({achievements.unlocked.length})</h3>
        {achievements.unlocked.map((achievement) => (
          <div key={achievement.id} className="achievement unlocked">
            <img src={achievement.icon} alt={achievement.name} />
            <div>
              <div className="name">{achievement.name}</div>
              <div className="description">{achievement.description}</div>
              <div className="reward">+{achievement.pointsReward} pts</div>
            </div>
          </div>
        ))}
      </div>

      <div className="locked">
        <h3>Locked ({achievements.locked.length})</h3>
        {achievements.locked.map((achievement) => (
          <div key={achievement.id} className="achievement locked">
            <div>
              <div className="name">{achievement.name}</div>
              <div className="description">{achievement.description}</div>
              <div className="progress">
                {achievements.progress[achievement.code]?.current || 0} /
                {achievements.progress[achievement.code]?.target || 0}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 6. Environment Variables

Add to your `.env.local`:

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key

# API
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Event Tracking

Track user actions to unlock achievements:

```typescript
// hooks/useEventTracking.ts
import { useCallback } from 'react';

export function useEventTracking() {
  const trackEvent = useCallback(async (event: string, data?: any) => {
    try {
      await fetch('/api/events/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data }),
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }, []);

  return { trackEvent };
}

// Usage
const { trackEvent } = useEventTracking();
trackEvent('review_created', { productId });
trackEvent('list_shared', { listId, recipientCount });
trackEvent('reward_redeemed', { rewardId });
```

## Conclusion

This integration guide provides the foundation for connecting all retention system features to your frontend. Refer to individual component examples and adapt to your specific UI framework and design system.
