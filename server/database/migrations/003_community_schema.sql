-- Sprint 2: Community Features Schema
-- Tables for reviews, shared lists, and product comparisons

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  text TEXT,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  unhelpful_count INTEGER NOT NULL DEFAULT 0,
  verified_purchase BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_user_product_review UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS review_helpfulness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_review_helpfulness UNIQUE (review_id, user_id)
);

CREATE TABLE IF NOT EXISTS shared_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  access_token VARCHAR(64) NOT NULL UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS list_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES shared_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(50) NOT NULL DEFAULT 'view', -- 'view', 'edit', 'admin'
  shared_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_list_user_share UNIQUE (list_id, user_id),
  CONSTRAINT valid_permission_level CHECK (permission_level IN ('view', 'edit', 'admin'))
);

CREATE TABLE IF NOT EXISTS product_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_ids UUID[] NOT NULL,
  comparison_data JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT at_least_two_products CHECK (array_length(product_ids, 1) >= 2)
);

CREATE TABLE IF NOT EXISTS community_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL UNIQUE,
  avg_rating DECIMAL(3, 2),
  review_count INTEGER NOT NULL DEFAULT 0,
  helpful_reviews_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indices for query performance
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating DESC);
CREATE INDEX idx_reviews_helpful_count ON reviews(helpful_count DESC);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_deleted_at ON reviews(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_review_helpfulness_review_id ON review_helpfulness(review_id);
CREATE INDEX idx_review_helpfulness_user_id ON review_helpfulness(user_id);
CREATE INDEX idx_review_helpfulness_helpful ON review_helpfulness(is_helpful);

CREATE INDEX idx_shared_lists_owner_id ON shared_lists(owner_id);
CREATE INDEX idx_shared_lists_token ON shared_lists(access_token);
CREATE INDEX idx_shared_lists_public ON shared_lists(is_public);

CREATE INDEX idx_list_shares_list_id ON list_shares(list_id);
CREATE INDEX idx_list_shares_user_id ON list_shares(user_id);
CREATE INDEX idx_list_shares_permission ON list_shares(permission_level);

CREATE INDEX idx_product_comparisons_user_id ON product_comparisons(user_id);
CREATE INDEX idx_product_comparisons_products ON product_comparisons USING GIN (product_ids);
CREATE INDEX idx_product_comparisons_created_at ON product_comparisons(created_at DESC);

CREATE INDEX idx_community_stats_product_id ON community_stats(product_id);
CREATE INDEX idx_community_stats_avg_rating ON community_stats(avg_rating DESC);

-- Full-text search on review text
CREATE INDEX idx_reviews_text_search ON reviews USING GIN (to_tsvector('english', text));

-- Triggers for updated_at
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_lists_updated_at
BEFORE UPDATE ON shared_lists
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_comparisons_updated_at
BEFORE UPDATE ON product_comparisons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to update community stats on review changes
CREATE OR REPLACE FUNCTION update_community_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_avg_rating DECIMAL(3, 2);
  v_review_count INTEGER;
  v_helpful_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_product_id := NEW.product_id;
  ELSE
    v_product_id := OLD.product_id;
  END IF;

  SELECT
    ROUND(AVG(rating)::DECIMAL, 2),
    COUNT(*),
    COALESCE(SUM(CASE WHEN helpful_count > 0 THEN 1 ELSE 0 END), 0)
  INTO v_avg_rating, v_review_count, v_helpful_count
  FROM reviews
  WHERE product_id = v_product_id AND deleted_at IS NULL;

  INSERT INTO community_stats (product_id, avg_rating, review_count, helpful_reviews_count, last_updated)
  VALUES (v_product_id, v_avg_rating, v_review_count, v_helpful_count, NOW())
  ON CONFLICT (product_id) DO UPDATE SET
    avg_rating = v_avg_rating,
    review_count = v_review_count,
    helpful_reviews_count = v_helpful_count,
    last_updated = NOW();

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update community stats
CREATE TRIGGER update_stats_on_review_change
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_community_stats();

-- Function to update helpful/unhelpful counts
CREATE OR REPLACE FUNCTION update_review_helpfulness_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_helpful THEN
    UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
  ELSE
    UPDATE reviews SET unhelpful_count = unhelpful_count + 1 WHERE id = NEW.review_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_helpfulness_vote
AFTER INSERT ON review_helpfulness
FOR EACH ROW
EXECUTE FUNCTION update_review_helpfulness_count();

-- View for top reviews
CREATE OR REPLACE VIEW top_product_reviews AS
SELECT
  r.id,
  r.product_id,
  r.user_id,
  r.rating,
  r.title,
  r.text,
  r.helpful_count,
  r.unhelpful_count,
  r.verified_purchase,
  r.created_at,
  u.name as reviewer_name,
  (r.helpful_count - r.unhelpful_count) as helpfulness_score
FROM reviews r
JOIN users u ON u.id = r.user_id
WHERE r.deleted_at IS NULL
ORDER BY helpfulness_score DESC, r.created_at DESC;

-- View for active shared lists
CREATE OR REPLACE VIEW active_shared_lists AS
SELECT
  sl.id,
  sl.owner_id,
  sl.name,
  sl.description,
  sl.access_token,
  sl.is_public,
  sl.view_count,
  sl.created_at,
  COUNT(ls.id) as shared_with_count,
  u.name as owner_name,
  u.email as owner_email
FROM shared_lists sl
LEFT JOIN list_shares ls ON ls.list_id = sl.id
LEFT JOIN users u ON u.id = sl.owner_id
WHERE sl.expires_at IS NULL OR sl.expires_at > NOW()
GROUP BY sl.id, sl.owner_id, u.name, u.email;
