-- Sprint 3: Personalization & Recommendations Schema

CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  target_price DECIMAL(10, 2),
  priority INTEGER DEFAULT 0, -- 0=normal, 1=high, -1=low
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  price_alert_active BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  preferred_categories TEXT[],
  preferred_brands TEXT[],
  price_range_min DECIMAL(10, 2),
  price_range_max DECIMAL(10, 2),
  preferred_sources TEXT[],
  notification_frequency VARCHAR(50) DEFAULT 'daily', -- 'immediate', 'daily', 'weekly'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  source VARCHAR(100),
  price_paid DECIMAL(10, 2),
  quantity INTEGER NOT NULL DEFAULT 1,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  affiliate_commission DECIMAL(10, 2)
);

CREATE TABLE IF NOT EXISTS product_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_product_view_day UNIQUE (user_id, product_id, DATE(viewed_at))
);

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  score DECIMAL(5, 3) NOT NULL, -- 0-100 confidence score
  reason VARCHAR(255), -- 'collaborative_filtering', 'content_based', 'trending', 'personalized'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_score CHECK (score >= 0 AND score <= 100)
);

-- Indices
CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX idx_wishlists_public ON wishlists(is_public);

CREATE INDEX idx_wishlist_items_wishlist_id ON wishlist_items(wishlist_id);
CREATE INDEX idx_wishlist_items_product_id ON wishlist_items(product_id);
CREATE INDEX idx_wishlist_items_priority ON wishlist_items(priority DESC);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_categories ON user_preferences USING GIN (preferred_categories);

CREATE INDEX idx_purchase_history_user_id ON purchase_history(user_id);
CREATE INDEX idx_purchase_history_product_id ON purchase_history(product_id);
CREATE INDEX idx_purchase_history_purchased_at ON purchase_history(purchased_at DESC);

CREATE INDEX idx_product_views_user_id ON product_views(user_id);
CREATE INDEX idx_product_views_product_id ON product_views(product_id);
CREATE INDEX idx_product_views_viewed_at ON product_views(viewed_at DESC);

CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_recommendations_score ON recommendations(score DESC);
CREATE INDEX idx_recommendations_created_at ON recommendations(created_at DESC);

-- Triggers
CREATE TRIGGER update_wishlists_updated_at
BEFORE UPDATE ON wishlists
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- View for user recommendations
CREATE OR REPLACE VIEW user_recommendations_view AS
SELECT
  r.id,
  r.user_id,
  r.product_id,
  r.score,
  r.reason,
  r.created_at,
  p.name as product_name,
  p.price,
  cs.avg_rating
FROM recommendations r
JOIN products p ON p.id = r.product_id
LEFT JOIN community_stats cs ON cs.product_id = p.id
ORDER BY r.score DESC;

-- View for user profile data
CREATE OR REPLACE VIEW user_profile_data AS
SELECT
  u.id as user_id,
  u.name,
  u.email,
  COUNT(DISTINCT wl.id) as wishlist_count,
  COUNT(DISTINCT wi.id) as wishlist_item_count,
  COUNT(DISTINCT ph.id) as purchase_count,
  COUNT(DISTINCT pv.id) as products_viewed,
  COUNT(DISTINCT r.id) as recommendation_count
FROM users u
LEFT JOIN wishlists wl ON wl.user_id = u.id
LEFT JOIN wishlist_items wi ON wi.wishlist_id = wl.id
LEFT JOIN purchase_history ph ON ph.user_id = u.id
LEFT JOIN product_views pv ON pv.user_id = u.id
LEFT JOIN recommendations r ON r.user_id = u.id
GROUP BY u.id, u.name, u.email;
