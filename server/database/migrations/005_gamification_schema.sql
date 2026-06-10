-- Sprint 4: Gamification & Loyalty Schema

CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT non_negative_balance CHECK (current_balance >= 0)
);

CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason VARCHAR(255) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT non_zero_points CHECK (points != 0)
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  points_reward INTEGER NOT NULL DEFAULT 0,
  condition_type VARCHAR(100), -- 'action_count', 'threshold', 'milestone'
  condition_value INTEGER,
  category VARCHAR(50), -- 'actions', 'social', 'engagement', 'purchases'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id),
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  reward_type VARCHAR(100), -- 'discount', 'free_product', 'exclusive_access'
  reward_value VARCHAR(500),
  quantity_available INTEGER, -- NULL = unlimited
  quantity_claimed INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT sufficient_points CHECK (points_cost > 0)
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id),
  points_spent INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'expired', 'used'
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank INTEGER,
  points INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_leaderboard UNIQUE (user_id)
);

-- Indices
CREATE INDEX idx_user_points_user_id ON user_points(user_id);
CREATE INDEX idx_user_points_current_balance ON user_points(current_balance DESC);
CREATE INDEX idx_user_points_lifetime_earned ON user_points(lifetime_earned DESC);

CREATE INDEX idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX idx_point_transactions_created_at ON point_transactions(created_at DESC);
CREATE INDEX idx_point_transactions_reason ON point_transactions(reason);

CREATE INDEX idx_achievements_code ON achievements(code);
CREATE INDEX idx_achievements_category ON achievements(category);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);

CREATE INDEX idx_rewards_code ON rewards(code);
CREATE INDEX idx_rewards_points_cost ON rewards(points_cost);
CREATE INDEX idx_rewards_active ON rewards(is_active);
CREATE INDEX idx_rewards_type ON rewards(reward_type);

CREATE INDEX idx_reward_redemptions_user_id ON reward_redemptions(user_id);
CREATE INDEX idx_reward_redemptions_reward_id ON reward_redemptions(reward_id);
CREATE INDEX idx_reward_redemptions_status ON reward_redemptions(status);
CREATE INDEX idx_reward_redemptions_redeemed_at ON reward_redemptions(redeemed_at DESC);

CREATE INDEX idx_leaderboard_cache_rank ON leaderboard_cache(rank);
CREATE INDEX idx_leaderboard_cache_points ON leaderboard_cache(points DESC);

-- Triggers
CREATE TRIGGER update_leaderboard_timestamp
BEFORE UPDATE ON leaderboard_cache
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to add points to user
CREATE OR REPLACE FUNCTION add_user_points(p_user_id UUID, p_points INTEGER, p_reason VARCHAR)
RETURNS TABLE(new_balance INTEGER, transaction_id UUID) AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Insert transaction
  INSERT INTO point_transactions (user_id, points, reason)
  VALUES (p_user_id, p_points, p_reason)
  RETURNING id INTO v_transaction_id;

  -- Update user points
  INSERT INTO user_points (user_id, current_balance, lifetime_earned)
  VALUES (p_user_id, p_points, CASE WHEN p_points > 0 THEN p_points ELSE 0 END)
  ON CONFLICT (user_id) DO UPDATE SET
    current_balance = user_points.current_balance + p_points,
    lifetime_earned = CASE
      WHEN p_points > 0 THEN user_points.lifetime_earned + p_points
      ELSE user_points.lifetime_earned
    END,
    lifetime_spent = CASE
      WHEN p_points < 0 THEN user_points.lifetime_spent + ABS(p_points)
      ELSE user_points.lifetime_spent
    END,
    last_updated = NOW()
  RETURNING current_balance, v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check for new achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS TABLE(achievement_id UUID, achievement_name VARCHAR) AS $$
DECLARE
  v_achievement RECORD;
  v_condition_met BOOLEAN;
  v_action_count INTEGER;
  v_review_count INTEGER;
  v_list_count INTEGER;
BEGIN
  -- Iterate through all achievements
  FOR v_achievement IN SELECT id, code, condition_type, condition_value FROM achievements LOOP
    v_condition_met := false;

    -- Check if user already has this achievement
    IF EXISTS(SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = v_achievement.id) THEN
      CONTINUE;
    END IF;

    -- Check conditions based on type
    IF v_achievement.code = 'first_list' THEN
      v_condition_met := EXISTS(
        SELECT 1 FROM wishlists WHERE user_id = p_user_id LIMIT 1
      );
    ELSIF v_achievement.code = 'obsessed_shopper' THEN
      SELECT COUNT(*) INTO v_action_count FROM wishlist_items wi
      JOIN wishlists w ON w.id = wi.wishlist_id WHERE w.user_id = p_user_id;
      v_condition_met := v_action_count >= 50;
    ELSIF v_achievement.code = 'bargain_hunter' THEN
      SELECT COUNT(*) INTO v_action_count FROM user_price_alerts WHERE user_id = p_user_id;
      v_condition_met := v_action_count >= 10;
    ELSIF v_achievement.code = 'community_leader' THEN
      SELECT SUM(helpful_count) INTO v_review_count FROM reviews WHERE user_id = p_user_id;
      v_condition_met := COALESCE(v_review_count, 0) >= 50;
    ELSIF v_achievement.code = 'wishlist_master' THEN
      SELECT COUNT(*) INTO v_list_count FROM wishlists WHERE user_id = p_user_id;
      v_condition_met := v_list_count >= 5;
    ELSIF v_achievement.code = 'social_butterfly' THEN
      SELECT COUNT(DISTINCT list_id) INTO v_action_count FROM list_shares WHERE shared_by_user_id = p_user_id;
      v_condition_met := v_action_count >= 10;
    END IF;

    IF v_condition_met THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (p_user_id, v_achievement.id);
      RETURN QUERY SELECT v_achievement.id, a.name FROM achievements a WHERE a.id = v_achievement.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- View for user leaderboard ranking
CREATE OR REPLACE VIEW user_leaderboard AS
SELECT
  ROW_NUMBER() OVER (ORDER BY up.current_balance DESC) as rank,
  u.id as user_id,
  u.name,
  up.current_balance as points,
  up.lifetime_earned,
  COUNT(DISTINCT ua.id) as achievement_count
FROM user_points up
JOIN users u ON u.id = up.user_id
LEFT JOIN user_achievements ua ON ua.user_id = u.id
WHERE up.current_balance > 0
GROUP BY u.id, u.name, up.current_balance, up.lifetime_earned
ORDER BY up.current_balance DESC;

-- View for user rewards eligibility
CREATE OR REPLACE VIEW user_eligible_rewards AS
SELECT
  r.id,
  r.code,
  r.name,
  r.description,
  r.points_cost,
  r.reward_type,
  up.current_balance,
  (up.current_balance >= r.points_cost) as is_eligible,
  (r.quantity_available IS NULL OR (r.quantity_available - r.quantity_claimed) > 0) as is_available
FROM rewards r
LEFT JOIN user_points up ON 1=1
WHERE r.is_active = true
AND (r.expires_at IS NULL OR r.expires_at > NOW())
ORDER BY r.points_cost;
