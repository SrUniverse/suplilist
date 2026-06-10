-- SupliList PHASE 1 - Initial PostgreSQL Schema
-- Version: 1.0.0
-- Description: Complete schema with extensions, tables, indexes, and triggers

-- ══════════════════════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;         -- Full-text search
CREATE EXTENSION IF NOT EXISTS btree_gin;       -- GIN indexes
CREATE EXTENSION IF NOT EXISTS btree_gist;      -- GIST indexes

-- ══════════════════════════════════════════════════════════════════════════════
-- USERS TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(50),
  verification_code_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT email_valid CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes on users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_deleted_at ON users(deleted_at DESC) WHERE is_deleted = TRUE;
CREATE INDEX idx_users_verification_code ON users(verification_code) WHERE is_verified = FALSE;

-- ══════════════════════════════════════════════════════════════════════════════
-- PROFILES TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  avatar_url VARCHAR(500),
  bio TEXT,
  phone VARCHAR(20),
  locale VARCHAR(10) DEFAULT 'pt-BR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- PRODUCTS TABLE (Mercado Livre Products)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ml_id BIGINT UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id BIGINT,
  category_name VARCHAR(255),
  price DECIMAL(10, 2),
  original_price DECIMAL(10, 2),
  image_url VARCHAR(500),
  url VARCHAR(500),
  affiliate_url VARCHAR(500),
  stock_available INTEGER,
  rating DECIMAL(3, 2),
  reviews_count INTEGER,
  ml_vendor_id BIGINT,
  ml_seller_reputation VARCHAR(50),
  is_meli_plus BOOLEAN DEFAULT FALSE,
  is_official_store BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes on products for full-text search
CREATE INDEX idx_products_title_trgm ON products USING GIN(title gin_trgm_ops);
CREATE INDEX idx_products_description_trgm ON products USING GIN(description gin_trgm_ops);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_ml_id ON products(ml_id);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_rating ON products(rating);
CREATE INDEX idx_products_is_meli_plus ON products(is_meli_plus);

-- ══════════════════════════════════════════════════════════════════════════════
-- LISTS TABLE (Shopping Lists)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_shared BOOLEAN DEFAULT FALSE,
  shared_token VARCHAR(50) UNIQUE,
  shared_expires_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lists_user_id ON lists(user_id);
CREATE INDEX idx_lists_shared_token ON lists(shared_token) WHERE is_shared = TRUE;
CREATE INDEX idx_lists_created_at ON lists(created_at DESC);
CREATE INDEX idx_lists_deleted ON lists(deleted_at) WHERE is_deleted = TRUE;

-- ══════════════════════════════════════════════════════════════════════════════
-- LIST_ITEMS TABLE (Items in Lists)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  custom_name VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  unit VARCHAR(20),
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(10, 2),
  price_override DECIMAL(10, 2),
  is_checked BOOLEAN DEFAULT FALSE,
  checked_at TIMESTAMPTZ,
  priority VARCHAR(20) DEFAULT 'normal',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_list_items_list_id ON list_items(list_id);
CREATE INDEX idx_list_items_product_id ON list_items(product_id);
CREATE INDEX idx_list_items_is_checked ON list_items(is_checked);
CREATE INDEX idx_list_items_priority ON list_items(priority);

-- ══════════════════════════════════════════════════════════════════════════════
-- FAVORITES TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_product_id ON favorites(product_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- USER_SETTINGS TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_summary_enabled BOOLEAN DEFAULT TRUE,
  email_summary_frequency VARCHAR(20) DEFAULT 'daily',
  theme VARCHAR(20) DEFAULT 'light',
  currency VARCHAR(3) DEFAULT 'BRL',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- USER_CONSENTS TABLE (GDPR/Privacy)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(100) NOT NULL,
  is_granted BOOLEAN DEFAULT FALSE,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, consent_type)
);

CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type);

-- ══════════════════════════════════════════════════════════════════════════════
-- REFRESH_TOKENS TABLE (Sessions)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT token_not_expired CHECK (expires_at > created_at)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_active ON refresh_tokens(expires_at DESC) WHERE revoked_at IS NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- AUDIT_LOGS TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- OUTBOX TABLE (Event Sourcing)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outbox_events_aggregate ON outbox_events(aggregate_type, aggregate_id);
CREATE INDEX idx_outbox_events_published ON outbox_events(published_at) WHERE published_at IS NULL;
CREATE INDEX idx_outbox_events_created_at ON outbox_events(created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════════

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to search products
CREATE OR REPLACE FUNCTION search_products(query TEXT, limit_count INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  ml_id BIGINT,
  title VARCHAR(255),
  price DECIMAL,
  rating DECIMAL,
  image_url VARCHAR(500),
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      p.id,
      p.ml_id,
      p.title,
      p.price,
      p.rating,
      p.image_url,
      similarity(p.title, query) AS sim
    FROM products p
    WHERE p.title % query OR p.description % query
    ORDER BY sim DESC, p.rating DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER lists_updated_at
  BEFORE UPDATE ON lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER list_items_updated_at
  BEFORE UPDATE ON list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_consents_updated_at
  BEFORE UPDATE ON user_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- PERMISSIONS & GRANTS (optional - for production)
-- ══════════════════════════════════════════════════════════════════════════════

-- Grant permissions to application user (uncomment in production)
-- GRANT CONNECT ON DATABASE suplilist TO suplilist;
-- GRANT USAGE ON SCHEMA public TO suplilist;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO suplilist;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO suplilist;

-- ══════════════════════════════════════════════════════════════════════════════
-- FINAL CHECKS
-- ══════════════════════════════════════════════════════════════════════════════

-- Verify extensions are loaded
SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm', 'btree_gin', 'btree_gist');
