-- SupliList PHASE 1 - Initial Seed Data
-- Version: 1.0.0

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED USERS (Test/Demo Accounts)
-- ══════════════════════════════════════════════════════════════════════════════

-- Password hashes (bcrypt 10 rounds):
-- suplilist123 -> $2b$10$K1zN2L9mM1F.9QvP5xL2qO5vB4cN3xL9m2K5pQ8rT1uV2wX3yZ4a
-- testuser123 -> $2b$10$Y9xN2L9mM1F.9QvP5xL2qO5vB4cN3xL9m2K5pQ8rT1uV2wX3yZ4a

INSERT INTO users (
  email, password_hash, first_name, last_name,
  is_verified, is_active, created_at
) VALUES (
  'admin@suplilist.local',
  '$2b$10$K1zN2L9mM1F.9QvP5xL2qO5vB4cN3xL9m2K5pQ8rT1uV2wX3yZ4a',
  'Admin',
  'User',
  TRUE,
  TRUE,
  NOW()
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
  email, password_hash, first_name, last_name,
  is_verified, is_active, created_at
) VALUES (
  'test@suplilist.local',
  '$2b$10$Y9xN2L9mM1F.9QvP5xL2qO5vB4cN3xL9m2K5pQ8rT1uV2wX3yZ4a',
  'Test',
  'User',
  TRUE,
  TRUE,
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED PROFILES
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO profiles (user_id, bio, locale)
SELECT id, 'Administrator account for development', 'pt-BR'
FROM users WHERE email = 'admin@suplilist.local'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO profiles (user_id, bio, locale)
SELECT id, 'Test account for QA and development', 'pt-BR'
FROM users WHERE email = 'test@suplilist.local'
ON CONFLICT (user_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED USER SETTINGS
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO user_settings (
  user_id, notifications_enabled, email_summary_enabled,
  email_summary_frequency, theme, currency, created_at
)
SELECT
  id,
  TRUE,
  TRUE,
  'daily',
  'light',
  'BRL',
  NOW()
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED CONSENTS (GDPR/Privacy)
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO user_consents (user_id, consent_type, is_granted, granted_at, created_at)
SELECT id, 'terms_of_service', TRUE, NOW(), NOW()
FROM users
ON CONFLICT (user_id, consent_type) DO NOTHING;

INSERT INTO user_consents (user_id, consent_type, is_granted, granted_at, created_at)
SELECT id, 'privacy_policy', TRUE, NOW(), NOW()
FROM users
ON CONFLICT (user_id, consent_type) DO NOTHING;

INSERT INTO user_consents (user_id, consent_type, is_granted, granted_at, created_at)
SELECT id, 'marketing_emails', FALSE, NULL, NOW()
FROM users
ON CONFLICT (user_id, consent_type) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED SAMPLE PRODUCTS (Mercado Livre Data)
-- ══════════════════════════════════════════════════════════════════════════════

-- Note: These are sample products with realistic data structures
-- In production, these would be synced from Mercado Livre API

INSERT INTO products (
  ml_id, title, description, category_id, category_name,
  price, original_price, stock_available,
  rating, reviews_count, is_meli_plus, is_official_store,
  created_at
) VALUES (
  1234567890,
  'Notebooks Gamer 15.6 16GB RAM SSD 512GB',
  'Notebook de alta performance com processador Intel i7, 16GB RAM DDR4, SSD 512GB NVMe, Tela FHD 144Hz, Placa de Vídeo NVIDIA RTX 3060',
  1001,
  'Electrônicos > Computadores',
  3999.99,
  4999.99,
  15,
  4.8,
  324,
  TRUE,
  TRUE,
  NOW()
) ON CONFLICT (ml_id) DO NOTHING;

INSERT INTO products (
  ml_id, title, description, category_id, category_name,
  price, original_price, stock_available,
  rating, reviews_count, is_meli_plus, is_official_store,
  created_at
) VALUES (
  1234567891,
  'Monitor Curvo 27 144Hz 1ms',
  'Monitor gamer 27 polegadas com painel VA 1440p, taxa de atualização 144Hz, tempo de resposta 1ms, entrada DisplayPort e HDMI',
  1002,
  'Electrônicos > Periféricos',
  1299.90,
  1799.90,
  8,
  4.7,
  156,
  TRUE,
  FALSE,
  NOW()
) ON CONFLICT (ml_id) DO NOTHING;

INSERT INTO products (
  ml_id, title, description, category_id, category_name,
  price, original_price, stock_available,
  rating, reviews_count, is_meli_plus, is_official_store,
  created_at
) VALUES (
  1234567892,
  'Teclado Mecânico RGB 104 Teclas',
  'Teclado mecânico com switches lineares, iluminação RGB programável, construção em alumínio, anti-ghosting, conector USB-C',
  1003,
  'Electrônicos > Periféricos',
  389.90,
  549.90,
  32,
  4.6,
  87,
  FALSE,
  FALSE,
  NOW()
) ON CONFLICT (ml_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED SAMPLE LISTS
-- ══════════════════════════════════════════════════════════════════════════════

-- Create list for admin user
INSERT INTO lists (user_id, name, description, is_shared, created_at)
SELECT
  u.id,
  'Setup para Home Office',
  'Itens necessários para montar um home office confortável',
  FALSE,
  NOW()
FROM users u
WHERE u.email = 'admin@suplilist.local';

-- Create shared list for test user
INSERT INTO lists (
  user_id, name, description, is_shared,
  shared_token, shared_expires_at, created_at
)
SELECT
  u.id,
  'Lista de Compras Familiar',
  'Compras semanais da família',
  TRUE,
  'share_' || gen_random_uuid()::text,
  NOW() + INTERVAL '30 days',
  NOW()
FROM users u
WHERE u.email = 'test@suplilist.local';

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED LIST ITEMS
-- ══════════════════════════════════════════════════════════════════════════════

-- Add items to admin's list
INSERT INTO list_items (list_id, product_id, quantity, unit_price, priority, created_at)
SELECT
  l.id,
  p.id,
  1,
  3999.99,
  'high',
  NOW()
FROM lists l
CROSS JOIN products p
WHERE l.user_id = (SELECT id FROM users WHERE email = 'admin@suplilist.local')
  AND p.ml_id = 1234567890;

INSERT INTO list_items (list_id, product_id, quantity, unit_price, priority, created_at)
SELECT
  l.id,
  p.id,
  1,
  1299.90,
  'high',
  NOW()
FROM lists l
CROSS JOIN products p
WHERE l.user_id = (SELECT id FROM users WHERE email = 'admin@suplilist.local')
  AND p.ml_id = 1234567891;

INSERT INTO list_items (list_id, product_id, quantity, unit_price, priority, created_at)
SELECT
  l.id,
  p.id,
  1,
  389.90,
  'medium',
  NOW()
FROM lists l
CROSS JOIN products p
WHERE l.user_id = (SELECT id FROM users WHERE email = 'admin@suplilist.local')
  AND p.ml_id = 1234567892;

-- Add custom items without product reference
INSERT INTO list_items (list_id, custom_name, quantity, unit, priority, created_at)
SELECT
  l.id,
  'Cadeira Gamer Ergonômica',
  1,
  'un',
  'high',
  NOW()
FROM lists l
WHERE l.user_id = (SELECT id FROM users WHERE email = 'admin@suplilist.local');

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED FAVORITES
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO favorites (user_id, product_id, created_at)
SELECT
  u.id,
  p.id,
  NOW()
FROM users u
CROSS JOIN products p
WHERE u.email = 'test@suplilist.local'
  AND p.ml_id IN (1234567890, 1234567891)
ON CONFLICT (user_id, product_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ══════════════════════════════════════════════════════════════════════════════

-- Count total records
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'User Settings', COUNT(*) FROM user_settings
UNION ALL
SELECT 'User Consents', COUNT(*) FROM user_consents
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Lists', COUNT(*) FROM lists
UNION ALL
SELECT 'List Items', COUNT(*) FROM list_items
UNION ALL
SELECT 'Favorites', COUNT(*) FROM favorites
UNION ALL
SELECT 'Refresh Tokens', COUNT(*) FROM refresh_tokens
UNION ALL
SELECT 'Audit Logs', COUNT(*) FROM audit_logs;
