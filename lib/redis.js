const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Session tracking
const setSession = async (sessionId, shopDomain, ttl = 3600) => {
  await redis.setex(`session:${sessionId}`, ttl, shopDomain);
};

const getSession = async (sessionId) => {
  return await redis.get(`session:${sessionId}`);
};

// View tracking cache (to prevent duplicate views in same session)
const hasViewedProduct = async (sessionId, productId) => {
  const key = `view:${sessionId}:${productId}`;
  const exists = await redis.exists(key);
  if (!exists) {
    await redis.setex(key, 3600, '1'); // Cache for 1 hour
  }
  return exists === 1;
};

// Active viewers count (for social proof)
const incrementActiveViewers = async (productId) => {
  const key = `viewers:${productId}`;
  await redis.incr(key);
  await redis.expire(key, 300); // 5 minute window
  return await redis.get(key);
};

const getActiveViewers = async (productId) => {
  const count = await redis.get(`viewers:${productId}`);
  return parseInt(count) || 0;
};

module.exports = {
  redis,
  setSession,
  getSession,
  hasViewedProduct,
  incrementActiveViewers,
  getActiveViewers
};
