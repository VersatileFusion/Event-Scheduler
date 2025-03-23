const { createClient } = require('redis');
const logger = require('../utils/logger');

// Create Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Handle Redis connection events
redisClient.on('connect', () => {
  logger.info('Connected to Redis | اتصال به Redis برقرار شد');
});

redisClient.on('error', (err) => {
  logger.error('Redis error | خطا در Redis:', err);
});

// Connect to Redis
(async () => {
  await redisClient.connect().catch(err => 
    logger.error('Failed to connect to Redis | خطا در اتصال به Redis:', err)
  );
})();

// Cache middleware
const cacheMiddleware = (duration) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `__express__${req.originalUrl || req.url}`;
    
    try {
      const cachedData = await redisClient.get(key);
      
      if (cachedData) {
        const data = JSON.parse(cachedData);
        logger.debug(`Cache hit for ${key} | بازیابی از کش برای ${key}`);
        return res.status(200).json(data);
      }
      
      // Override res.json to store response in cache
      const originalJson = res.json;
      res.json = function(data) {
        try {
          redisClient.setEx(key, duration, JSON.stringify(data));
          logger.debug(`Cached ${key} for ${duration} seconds | ذخیره ${key} در کش برای ${duration} ثانیه`);
        } catch (err) {
          logger.error('Cache storage error | خطا در ذخیره‌سازی کش:', err);
        }
        return originalJson.call(this, data);
      };
      
      next();
    } catch (err) {
      logger.error('Cache middleware error | خطا در میان‌افزار کش:', err);
      next();
    }
  };
};

// Clear cache by pattern
const clearCache = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Cleared cache for pattern: ${pattern} | پاک‌سازی کش برای الگوی: ${pattern}`);
    }
  } catch (err) {
    logger.error('Clear cache error | خطا در پاک‌سازی کش:', err);
  }
};

module.exports = {
  redisClient,
  cacheMiddleware,
  clearCache
}; 