const { createClient } = require('redis');
const logger = require('../utils/logger');

let client = null;

const connectRedis = async () => {
  try {
    client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    client.on('error', (err) => logger.error('Redis error:', err));
    client.on('connect', () => logger.info('Redis connected'));
    await client.connect();
    return client;
  } catch (err) {
    logger.warn('Redis not available, falling back to no cache:', err.message);
    return null;
  }
};

const getCache = async (key) => {
  if (!client) return null;
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

const setCache = async (key, value, ttl = 300) => {
  if (!client) return;
  try {
    await client.setEx(key, ttl, JSON.stringify(value));
  } catch { /* fail silently */ }
};

const deleteCache = async (key) => {
  if (!client) return;
  try { await client.del(key); } catch { /* fail silently */ }
};

const deleteCachePattern = async (pattern) => {
  if (!client) return;
  try {
    const keys = await client.keys(pattern);
    if (keys.length) await client.del(keys);
  } catch { /* fail silently */ }
};

module.exports = { connectRedis, getCache, setCache, deleteCache, deleteCachePattern };
