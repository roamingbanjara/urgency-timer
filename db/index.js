const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/urgency_timer',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Shop operations
const getShop = async (shopDomain) => {
  const result = await pool.query('SELECT * FROM shops WHERE shop_domain = $1', [shopDomain]);
  return result.rows[0];
};

const createShop = async (shopDomain, accessToken) => {
  const result = await pool.query(
    'INSERT INTO shops (shop_domain, access_token) VALUES ($1, $2) ON CONFLICT (shop_domain) DO UPDATE SET access_token = $2 RETURNING *',
    [shopDomain, accessToken]
  );
  return result.rows[0];
};

const updateShopSubscription = async (shopDomain, subscriptionId, planName, isPaid) => {
  const result = await pool.query(
    'UPDATE shops SET subscription_id = $1, plan_name = $2, is_paid = $3, updated_at = CURRENT_TIMESTAMP WHERE shop_domain = $4 RETURNING *',
    [subscriptionId, planName, isPaid, shopDomain]
  );
  return result.rows[0];
};

const incrementViews = async (shopDomain) => {
  const result = await pool.query(
    'UPDATE shops SET total_views = total_views + 1, updated_at = CURRENT_TIMESTAMP WHERE shop_domain = $1 RETURNING *',
    [shopDomain]
  );
  return result.rows[0];
};

// View tracking
const registerView = async (shopDomain, productId, sessionId) => {
  try {
    const result = await pool.query(
      'INSERT INTO product_views (shop_domain, product_id, session_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *',
      [shopDomain, productId, sessionId]
    );
    if (result.rows.length > 0) {
      await incrementViews(shopDomain);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error registering view:', error);
    return false;
  }
};

const getShopStats = async (shopDomain) => {
  const shop = await getShop(shopDomain);
  if (!shop) return null;
  
  const viewCount = await pool.query(
    'SELECT COUNT(DISTINCT session_id) as unique_sessions FROM product_views WHERE shop_domain = $1',
    [shopDomain]
  );
  
  return {
    ...shop,
    unique_sessions: parseInt(viewCount.rows[0].unique_sessions) || 0
  };
};

// Settings operations
const getShopSettings = async (shopDomain) => {
  const result = await pool.query('SELECT * FROM shop_settings WHERE shop_domain = $1', [shopDomain]);
  if (result.rows.length === 0) {
    // Create default settings
    await pool.query(
      'INSERT INTO shop_settings (shop_domain) VALUES ($1)',
      [shopDomain]
    );
    return await getShopSettings(shopDomain);
  }
  return result.rows[0];
};

const updateShopSettings = async (shopDomain, settings) => {
  const { timer_color, timer_position, timer_template, font_size } = settings;
  const result = await pool.query(
    `UPDATE shop_settings 
     SET timer_color = COALESCE($1, timer_color),
         timer_position = COALESCE($2, timer_position),
         timer_template = COALESCE($3, timer_template),
         font_size = COALESCE($4, font_size),
         updated_at = CURRENT_TIMESTAMP
     WHERE shop_domain = $5
     RETURNING *`,
    [timer_color, timer_position, timer_template, font_size, shopDomain]
  );
  return result.rows[0];
};

module.exports = {
  pool,
  getShop,
  createShop,
  updateShopSubscription,
  registerView,
  getShopStats,
  getShopSettings,
  updateShopSettings
};
