# 👥 SPRINT PLAN: Social Features

**Duration:** 4 weeks  
**Timeline:** Week 7-10  
**Target:** User profiles, follow system, social feed, comments, badges  
**Total Files:** 33  
**Total Tests:** 220+  
**Lines of Code:** 2,500+

---

## 📋 Overview

Expand SupliList with social capabilities:
- Public user profiles with bios and avatars
- Follow/unfollow system
- Social feed (activities from followed users)
- Comments on reviews (threaded)
- Like/upvote system
- User badges (achievements)

---

## 🗓️ WEEK 7: User Profiles & Follow System

### Sprint Goal
Implement user profiles with customization and follow system.

### Files to Create (10)

#### Database Migration

**File: server/database/migrations/006_social_schema.sql (150 lines)**
```sql
-- User profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  avatar_url VARCHAR(2048),
  website VARCHAR(2048),
  location VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Follow relationships
CREATE TABLE user_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- User stats (cached for performance)
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  lists_count INT DEFAULT 0,
  reviews_count INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_followers_follower ON user_followers(follower_id);
CREATE INDEX idx_followers_following ON user_followers(following_id);
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
```

#### Backend Services

**File: server/src/services/user-profile.service.ts (400 lines)**
```typescript
import { db } from '../shared/config/database.config';

export class UserProfileService {
  async getUserProfile(userId: string) {
    const result = await db.query(
      `SELECT up.*, us.followers_count, us.lists_count, us.reviews_count
       FROM user_profiles up
       LEFT JOIN user_stats us ON up.user_id = us.user_id
       WHERE up.user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  async updateProfile(userId: string, updates: any) {
    const { bio, website, location, avatar_url } = updates;
    
    const result = await db.query(
      `UPDATE user_profiles
       SET bio = COALESCE($1, bio),
           website = COALESCE($2, website),
           location = COALESCE($3, location),
           avatar_url = COALESCE($4, avatar_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $5
       RETURNING *`,
      [bio, website, location, avatar_url, userId]
    );
    
    return result.rows[0];
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    // Upload to S3 or Cloudflare R2
    const url = await uploadToStorage(file);
    
    return this.updateProfile(userId, { avatar_url: url });
  }

  async getProfileStats(userId: string) {
    const result = await db.query(
      `SELECT * FROM user_stats WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  async incrementStat(userId: string, stat: 'followers_count' | 'lists_count' | 'reviews_count') {
    await db.query(
      `UPDATE user_stats SET ${stat} = ${stat} + 1 WHERE user_id = $1`,
      [userId]
    );
  }

  async decrementStat(userId: string, stat: string) {
    await db.query(
      `UPDATE user_stats SET ${stat} = GREATEST(0, ${stat} - 1) WHERE user_id = $1`,
      [userId]
    );
  }
}

export const userProfileService = new UserProfileService();
```

**File: server/src/services/follow.service.ts (250 lines)**
```typescript
export class FollowService {
  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    try {
      await db.query(
        `INSERT INTO user_followers (follower_id, following_id)
         VALUES ($1, $2)`,
        [followerId, followingId]
      );

      // Update stats
      await userProfileService.incrementStat(followingId, 'followers_count');
      await userProfileService.incrementStat(followerId, 'following_count');

      return { success: true };
    } catch (error) {
      if (error.code === '23505') { // Unique constraint
        throw new Error('Already following this user');
      }
      throw error;
    }
  }

  async unfollowUser(followerId: string, followingId: string) {
    const result = await db.query(
      `DELETE FROM user_followers
       WHERE follower_id = $1 AND following_id = $2
       RETURNING *`,
      [followerId, followingId]
    );

    if (result.rows.length > 0) {
      await userProfileService.decrementStat(followingId, 'followers_count');
      await userProfileService.decrementStat(followerId, 'following_count');
    }

    return { success: true };
  }

  async getFollowers(userId: string, limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT u.id, up.bio, up.avatar_url, u.email
       FROM user_followers uf
       JOIN users u ON uf.follower_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE uf.following_id = $1
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  async getFollowing(userId: string, limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT u.id, up.bio, up.avatar_url, u.email
       FROM user_followers uf
       JOIN users u ON uf.following_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE uf.follower_id = $1
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const result = await db.query(
      `SELECT 1 FROM user_followers
       WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
    return result.rows.length > 0;
  }
}

export const followService = new FollowService();
```

#### Backend Routes

**File: server/src/routes/profile.routes.ts (300 lines)**
```typescript
import { Router } from 'express';
import { auth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { userProfileService } from '../services/user-profile.service';
import { profileUpdateSchema } from '../validators/profile.validator';

export const profileRouter = Router();

// Get user profile (public)
profileRouter.get('/:userId', async (req, res) => {
  try {
    const profile = await userProfileService.getUserProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update own profile (authenticated)
profileRouter.put('/me', auth, validate(profileUpdateSchema), async (req, res) => {
  try {
    const updated = await userProfileService.updateProfile(req.user.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Upload avatar
profileRouter.post('/me/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const updated = await userProfileService.uploadAvatar(req.user.id, req.file);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get profile stats
profileRouter.get('/:userId/stats', async (req, res) => {
  try {
    const stats = await userProfileService.getProfileStats(req.params.userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**File: server/src/routes/follow.routes.ts (250 lines)**
```typescript
import { Router } from 'express';
import { auth } from '../middleware/auth.middleware';
import { followService } from '../services/follow.service';

export const followRouter = Router();

// Follow user
followRouter.post('/:userId', auth, async (req, res) => {
  try {
    await followService.followUser(req.user.id, req.params.userId);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Unfollow user
followRouter.delete('/:userId', auth, async (req, res) => {
  try {
    await followService.unfollowUser(req.user.id, req.params.userId);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get followers
followRouter.get('/:userId/followers', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const followers = await followService.getFollowers(req.params.userId, limit, offset);
    res.json({ data: followers, count: followers.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get following
followRouter.get('/:userId/following', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const following = await followService.getFollowing(req.params.userId, limit, offset);
    res.json({ data: following, count: following.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if following
followRouter.get('/:userId/is-following', auth, async (req, res) => {
  try {
    const isFollowing = await followService.isFollowing(req.user.id, req.params.userId);
    res.json({ isFollowing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Frontend Components

**File: frontend/src/pages/UserProfile.tsx (300 lines)**
```typescript
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, Button, Tabs } from '@/components/ui';
import { apiClient } from '@/services/api.client';

export default function UserProfile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const profileResponse = await apiClient.get(`/api/profiles/${userId}`);
      const statsResponse = await apiClient.get(`/api/profiles/${userId}/stats`);
      const followResponse = await apiClient.get(`/api/follow/${userId}/is-following`);

      setProfile(profileResponse.data);
      setStats(statsResponse.data);
      setIsFollowing(followResponse.data.isFollowing);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await apiClient.delete(`/api/follow/${userId}`);
      } else {
        await apiClient.post(`/api/follow/${userId}`);
      }
      setIsFollowing(!isFollowing);
      await loadProfile();
    } catch (error) {
      console.error('Follow action failed:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <Avatar src={profile.avatar_url} size="large" />
        <div className="profile-info">
          <h1>{profile.email.split('@')[0]}</h1>
          <p>{profile.bio}</p>
          <div className="stats">
            <div><span className="count">{stats.followers_count}</span> Followers</div>
            <div><span className="count">{stats.following_count}</span> Following</div>
            <div><span className="count">{stats.lists_count}</span> Lists</div>
            <div><span className="count">{stats.reviews_count}</span> Reviews</div>
          </div>
          <Button onClick={handleFollow}>
            {isFollowing ? 'Unfollow' : 'Follow'}
          </Button>
        </div>
      </div>

      <Tabs>
        <Tabs.Panel label="Lists">
          {/* User's lists */}
        </Tabs.Panel>
        <Tabs.Panel label="Reviews">
          {/* User's reviews */}
        </Tabs.Panel>
        <Tabs.Panel label="Following">
          {/* Users they follow */}
        </Tabs.Panel>
        <Tabs.Panel label="Followers">
          {/* Their followers */}
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
```

**File: frontend/src/components/FollowButton.tsx (80 lines)**
```typescript
interface FollowButtonProps {
  userId: string;
  onFollowChange?: () => void;
}

export function FollowButton({ userId, onFollowChange }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isFollowing) {
        await apiClient.delete(`/api/follow/${userId}`);
      } else {
        await apiClient.post(`/api/follow/${userId}`);
      }
      setIsFollowing(!isFollowing);
      onFollowChange?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={isFollowing ? 'btn-outlined' : 'btn-primary'}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
```

**File: frontend/src/components/UserCard.tsx (120 lines)**
**File: frontend/src/hooks/useUserProfile.ts (60 lines)**

#### Validators

**File: server/src/validators/profile.validator.ts (80 lines)**
```typescript
import { z } from 'zod';

export const profileUpdateSchema = z.object({
  bio: z.string().max(500).optional(),
  website: z.string().url().optional(),
  location: z.string().max(100).optional()
});
```

#### Tests

**File: e2e/social-profiles.test.ts (50+ tests)**
```typescript
describe('User Profiles & Follow System', () => {
  test('user can create profile', async () => {
    // Test profile creation
  });

  test('user can follow another user', async () => {
    // Test follow
  });

  test('user can unfollow another user', async () => {
    // Test unfollow
  });

  test('follower count updates correctly', async () => {
    // Test stats update
  });

  // 46 more tests...
});
```

### Checklist for Week 7
- [ ] Database migrations executed
- [ ] UserProfileService working
- [ ] FollowService working
- [ ] Profile routes working
- [ ] Follow routes working
- [ ] Frontend components rendering
- [ ] All 50+ tests passing
- [ ] Can follow/unfollow users

---

## 🗓️ WEEK 8: Social Feed

### Sprint Goal
Implement social feed with activities from followed users.

### Files to Create (8)

#### Database & Activity Logging

**File: server/database/migrations/007_feed_schema.sql**
```sql
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'list_created', 'review_written', 'list_shared', 'item_added'
  related_id UUID,
  related_type VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES user_activity(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_user ON user_activity(user_id);
CREATE INDEX idx_feed_user ON feed_items(user_id, created_at DESC);
```

**File: server/src/services/activity.service.ts (300 lines)**
```typescript
export class ActivityService {
  async logActivity(userId: string, actionType: string, data: any) {
    const result = await db.query(
      `INSERT INTO user_activity (user_id, action_type, related_id, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, actionType, data.relatedId, data]
    );
    return result.rows[0];
  }

  async getActivity(userId: string, limit = 50) {
    const result = await db.query(
      `SELECT * FROM user_activity
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }
}
```

**File: server/src/services/feed.service.ts (400 lines)**
```typescript
export class FeedService {
  async generateFeed(userId: string, limit = 20, offset = 0) {
    // Get activities from followed users
    const result = await db.query(
      `SELECT ua.*, u.id as author_id, up.avatar_url
       FROM user_activity ua
       JOIN users u ON ua.user_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       JOIN user_followers uf ON ua.user_id = uf.following_id
       WHERE uf.follower_id = $1
       ORDER BY ua.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  async getTrendingProducts(limit = 10) {
    // Most popular products in last 7 days
    const result = await db.query(
      `SELECT p.*, COUNT(DISTINCT ua.user_id) as mention_count
       FROM products p
       JOIN user_activity ua ON p.id = ua.related_id
       WHERE ua.created_at > NOW() - INTERVAL '7 days'
       GROUP BY p.id
       ORDER BY mention_count DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async cacheFeed(userId: string) {
    const feed = await this.generateFeed(userId);
    await redisClient.setex(`feed:${userId}`, 300, JSON.stringify(feed));
  }
}
```

#### Routes

**File: server/src/routes/feed.routes.ts (150 lines)**
```typescript
feedRouter.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    
    const feed = await feedService.generateFeed(req.user.id, limit, offset);
    res.json({ data: feed, count: feed.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

feedRouter.get('/trending', async (req, res) => {
  try {
    const trending = await feedService.getTrendingProducts();
    res.json({ data: trending });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Frontend

**File: frontend/src/pages/FeedPage.tsx (400 lines)**
- Infinite scroll
- Real-time updates
- Activity items rendering

**File: frontend/src/components/FeedItem.tsx (200 lines)**
- Display activity
- Show author info
- Link to related resource

**File: frontend/src/hooks/useFeed.ts (100 lines)**
- Fetch feed with pagination
- Real-time polling
- Cache management

#### Tests

**File: e2e/social-feed.test.ts (60+ tests)**
- Feed generation logic
- Activity logging
- Trending calculation
- Infinite scroll

### Checklist for Week 8
- [ ] Feed schema created
- [ ] Activity logging working
- [ ] Feed generation working
- [ ] Frontend feed page displaying
- [ ] Infinite scroll working
- [ ] Real-time updates working
- [ ] All 60+ tests passing

---

## 🗓️ WEEK 9: Comments & Likes

### Sprint Goal
Add commenting system with threading and like/upvote functionality.

### Files to Create (9)

#### Database

**File: server/database/migrations/008_comments_likes.sql (100 lines)**
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(comment_id, user_id)
);

CREATE TABLE review_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(review_id, user_id)
);

CREATE INDEX idx_comments_review ON comments(review_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX idx_review_likes_review ON review_likes(review_id);
```

#### Services

**File: server/src/services/comment.service.ts (350 lines)**
```typescript
export class CommentService {
  async addComment(reviewId: string, userId: string, text: string) {
    const result = await db.query(
      `INSERT INTO comments (review_id, user_id, text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [reviewId, userId, text]
    );
    return result.rows[0];
  }

  async replyToComment(parentCommentId: string, userId: string, text: string) {
    const result = await db.query(
      `INSERT INTO comments (review_id, user_id, parent_comment_id, text)
       SELECT review_id, $2, $1, $3
       FROM comments WHERE id = $1
       RETURNING *`,
      [parentCommentId, userId, text]
    );
    return result.rows[0];
  }

  async getComments(reviewId: string, limit = 50) {
    const result = await db.query(
      `WITH RECURSIVE comment_tree AS (
        SELECT id, review_id, user_id, parent_comment_id, text, likes_count, created_at, 0 as depth
        FROM comments
        WHERE review_id = $1 AND parent_comment_id IS NULL
        
        UNION ALL
        
        SELECT c.id, c.review_id, c.user_id, c.parent_comment_id, c.text, c.likes_count, c.created_at, ct.depth + 1
        FROM comments c
        JOIN comment_tree ct ON c.parent_comment_id = ct.id
      )
      SELECT * FROM comment_tree
      ORDER BY created_at DESC`,
      [reviewId]
    );
    return result.rows;
  }

  async deleteComment(commentId: string) {
    await db.query('DELETE FROM comments WHERE id = $1', [commentId]);
  }
}
```

**File: server/src/services/like.service.ts (200 lines)**
```typescript
export class LikeService {
  async likeReview(reviewId: string, userId: string) {
    try {
      await db.query(
        `INSERT INTO review_likes (review_id, user_id) VALUES ($1, $2)`,
        [reviewId, userId]
      );
      
      await db.query(
        `UPDATE reviews SET likes_count = likes_count + 1 WHERE id = $1`,
        [reviewId]
      );
    } catch (error) {
      if (error.code !== '23505') throw error; // Ignore duplicate
    }
  }

  async unlikeReview(reviewId: string, userId: string) {
    const result = await db.query(
      `DELETE FROM review_likes WHERE review_id = $1 AND user_id = $2`,
      [reviewId, userId]
    );

    if (result.rowCount > 0) {
      await db.query(
        `UPDATE reviews SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1`,
        [reviewId]
      );
    }
  }

  async likeComment(commentId: string, userId: string) {
    try {
      await db.query(
        `INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)`,
        [commentId, userId]
      );
      
      await db.query(
        `UPDATE comments SET likes_count = likes_count + 1 WHERE id = $1`,
        [commentId]
      );
    } catch (error) {
      if (error.code !== '23505') throw error;
    }
  }

  async getLikes(reviewId: string) {
    const result = await db.query(
      `SELECT user_id FROM review_likes WHERE review_id = $1`,
      [reviewId]
    );
    return result.rows.map(row => row.user_id);
  }
}
```

#### Routes

**File: server/src/routes/comment.routes.ts (250 lines)**
**File: server/src/routes/like.routes.ts (150 lines)**

#### Frontend Components

**File: frontend/src/components/CommentSection.tsx (500 lines)**
- Display comments with threading
- Add comment form
- Reply functionality
- Delete own comments

**File: frontend/src/components/LikeButton.tsx (100 lines)**
**File: frontend/src/hooks/useComments.ts (150 lines)**

#### Tests

**File: e2e/social-comments-likes.test.ts (70+ tests)**

### Checklist for Week 9
- [ ] Comments schema created
- [ ] Threading working
- [ ] Like system working
- [ ] Comments displaying correctly
- [ ] All 70+ tests passing

---

## 🗓️ WEEK 10: User Badges & Polish

### Sprint Goal
Add achievement badges and finalize social features.

### Files to Create (6)

#### Database

**File: server/database/migrations/009_badges.sql**
```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url VARCHAR(2048),
  criteria JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id),
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
```

#### Badges

**File: server/src/services/badge.service.ts (250 lines)**
```typescript
const BADGES = [
  {
    code: 'first_list',
    name: 'First List',
    description: 'Create your first list',
    criteria: { lists_count: 1 }
  },
  {
    code: 'obsessed_shopper',
    name: 'Obsessed Shopper',
    description: 'Add 50+ items to lists',
    criteria: { total_items: 50 }
  },
  {
    code: 'bargain_hunter',
    name: 'Bargain Hunter',
    description: 'Find 10 products with >15% price drop',
    criteria: { deal_count: 10 }
  },
  {
    code: 'community_leader',
    name: 'Community Leader',
    description: 'Get 50 helpful votes on reviews',
    criteria: { helpful_votes: 50 }
  },
  {
    code: 'recommendation_seeker',
    name: 'Recommendation Seeker',
    description: 'Click 10 recommendations',
    criteria: { recommendation_clicks: 10 }
  },
  {
    code: 'wishlist_master',
    name: 'Wishlist Master',
    description: 'Create 5 wishlists',
    criteria: { wishlist_count: 5 }
  },
  {
    code: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Share 10 lists',
    criteria: { shares_count: 10 }
  }
];

export class BadgeService {
  async checkAndUnlockBadges(userId: string) {
    const stats = await userProfileService.getProfileStats(userId);
    
    for (const badgeConfig of BADGES) {
      const badge = await this.getBadgeByCode(badgeConfig.code);
      
      let shouldUnlock = false;
      for (const [key, value] of Object.entries(badgeConfig.criteria)) {
        if (stats[key] >= value) {
          shouldUnlock = true;
        }
      }

      if (shouldUnlock) {
        await this.unlockBadge(userId, badge.id);
      }
    }
  }

  async unlockBadge(userId: string, badgeId: string) {
    try {
      await db.query(
        `INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)`,
        [userId, badgeId]
      );
      return true;
    } catch (error) {
      if (error.code === '23505') return false; // Already unlocked
      throw error;
    }
  }

  async getUserBadges(userId: string) {
    const result = await db.query(
      `SELECT b.* FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = $1
       ORDER BY ub.unlocked_at DESC`,
      [userId]
    );
    return result.rows;
  }
}
```

#### Routes & Frontend

**File: server/src/routes/badge.routes.ts (100 lines)**
**File: frontend/src/components/UserBadges.tsx (150 lines)**
**File: frontend/src/components/BadgeTooltip.tsx (100 lines)**

#### Tests

**File: e2e/social-badges.test.ts (30+ tests)**

### Checklist for Week 10
- [ ] Badge system working
- [ ] Auto-unlock working
- [ ] Badges displaying on profile
- [ ] All 30+ tests passing
- [ ] Social features polish complete

---

## 📊 Summary

**Total Files:** 33  
**Total Tests:** 220+  
**Total Lines:** 2,500+  
**Time:** 4 weeks

### Key Deliverables
✅ User profiles with customization  
✅ Follow/unfollow system  
✅ Social feed from followed users  
✅ Comments with threading  
✅ Like/upvote system  
✅ User badges  
✅ 220+ tests  
✅ Production ready

### Database Tables Added
- user_profiles
- user_followers
- user_stats
- user_activity
- feed_items
- comments
- comment_likes
- review_likes
- badges
- user_badges

**Next:** Move to SPRINT_PLAN_ANALYTICS.md
