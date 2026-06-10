-- Sprint 1: Price Monitoring & Notifications Schema
-- Tables for managing price alerts and price history

CREATE TABLE IF NOT EXISTS user_price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  target_price DECIMAL(10, 2) NOT NULL,
  current_price DECIMAL(10, 2),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_target_price CHECK (target_price > 0),
  CONSTRAINT unique_user_product_alert UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  source VARCHAR(50) NOT NULL,
  current_price DECIMAL(10, 2) NOT NULL,
  previous_price DECIMAL(10, 2),
  drop_percentage DECIMAL(5, 2),
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_price CHECK (current_price >= 0),
  CONSTRAINT valid_drop_percentage CHECK (drop_percentage >= -100 AND drop_percentage <= 100)
);

CREATE TABLE IF NOT EXISTS firebase_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token VARCHAR(500) NOT NULL,
  device_name VARCHAR(255),
  device_type VARCHAR(50), -- 'ios', 'android', 'web'
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_token UNIQUE (user_id, device_token)
);

-- Indices for query performance
CREATE INDEX idx_user_price_alerts_user_id ON user_price_alerts(user_id);
CREATE INDEX idx_user_price_alerts_product_id ON user_price_alerts(product_id);
CREATE INDEX idx_user_price_alerts_active ON user_price_alerts(active);
CREATE INDEX idx_price_history_product_id ON price_history(product_id);
CREATE INDEX idx_price_history_checked_at ON price_history(checked_at DESC);
CREATE INDEX idx_price_history_product_checked ON price_history(product_id, checked_at DESC);
CREATE INDEX idx_firebase_tokens_user_id ON firebase_tokens(user_id);
CREATE INDEX idx_firebase_tokens_active ON firebase_tokens(is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_price_alerts
CREATE TRIGGER update_user_price_alerts_updated_at
BEFORE UPDATE ON user_price_alerts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for firebase_tokens
CREATE TRIGGER update_firebase_tokens_updated_at
BEFORE UPDATE ON firebase_tokens
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update price_history on significant price changes
CREATE OR REPLACE FUNCTION update_price_history_on_change()
RETURNS TRIGGER AS $$
DECLARE
  drop_pct DECIMAL(5, 2);
BEGIN
  IF NEW.current_price IS NOT NULL AND NEW.previous_price IS NOT NULL THEN
    IF NEW.previous_price > 0 THEN
      drop_pct := ((NEW.previous_price - NEW.current_price) / NEW.previous_price) * 100;
      NEW.drop_percentage := drop_pct;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for price_history calculations
CREATE TRIGGER update_price_history_drop_percentage
BEFORE INSERT ON price_history
FOR EACH ROW
EXECUTE FUNCTION update_price_history_on_change();

-- View for active price alerts with recent history
CREATE OR REPLACE VIEW active_price_alerts_with_history AS
SELECT
  upa.id,
  upa.user_id,
  upa.product_id,
  upa.target_price,
  upa.current_price,
  upa.active,
  upa.created_at,
  upa.updated_at,
  upa.notification_sent_at,
  ph.source,
  ph.drop_percentage,
  ph.checked_at as last_price_check
FROM user_price_alerts upa
LEFT JOIN LATERAL (
  SELECT source, drop_percentage, checked_at
  FROM price_history
  WHERE product_id = upa.product_id
  ORDER BY checked_at DESC
  LIMIT 1
) ph ON true
WHERE upa.active = true;
