-- Database schema for Urgency Timer App

-- Shops table
CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT,
  is_paid BOOLEAN DEFAULT FALSE,
  subscription_id VARCHAR(255),
  plan_name VARCHAR(50),
  total_views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- View tracking table
CREATE TABLE IF NOT EXISTS product_views (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_domain, product_id, session_id)
);

-- Shop settings table
CREATE TABLE IF NOT EXISTS shop_settings (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) UNIQUE NOT NULL,
  timer_color VARCHAR(7) DEFAULT '#FF0000',
  timer_position VARCHAR(20) DEFAULT 'top',
  timer_template INTEGER DEFAULT 1,
  font_size INTEGER DEFAULT 16,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shops_domain ON shops(shop_domain);
CREATE INDEX IF NOT EXISTS idx_views_shop ON product_views(shop_domain);
CREATE INDEX IF NOT EXISTS idx_views_session ON product_views(session_id);
CREATE INDEX IF NOT EXISTS idx_settings_shop ON shop_settings(shop_domain);
