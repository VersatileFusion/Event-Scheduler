const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Helper to create a rate limiter with customizable options
const createRateLimiter = (options) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes by default
    max = 100,                 // 100 requests per windowMs by default
    message = {
      en: 'Too many requests, please try again later',
      fa: 'درخواست‌های بیش از حد، لطفاً بعداً دوباره امتحان کنید'
    },
    path = '',
    keyGenerator
  } = options;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in the RateLimit-* headers
    legacyHeaders: false,  // Disable the X-RateLimit-* headers
    
    // Use IP by default, or a custom key generator if provided
    keyGenerator: keyGenerator || ((req) => req.ip),
    
    // Handler for when the rate limit is exceeded
    handler: (req, res, _next) => {
      logger.warn(`Rate limit exceeded for ${req.ip} on ${req.method} ${req.originalUrl} | محدودیت نرخ برای ${req.ip} در ${req.method} ${req.originalUrl} فراتر رفته است`);
      
      return res.status(429).json({
        success: false,
        message: message
      });
    },
    
    // Skip when process.env.NODE_ENV is test
    skip: (req, _res) => process.env.NODE_ENV === 'test'
  });
};

// Authentication rate limiter - more strict
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per windowMs
  message: {
    en: 'Too many login attempts, please try again after 15 minutes',
    fa: 'تلاش‌های ورود بیش از حد مجاز، لطفاً بعد از 15 دقیقه دوباره امتحان کنید'
  },
  path: '/api/users/login'
});

// Registration rate limiter
const registrationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour
  message: {
    en: 'Too many accounts created from this IP, please try again after an hour',
    fa: 'حساب‌های کاربری بیش از حد از این IP ایجاد شده‌اند، لطفاً بعد از یک ساعت دوباره امتحان کنید'
  },
  path: '/api/users/register'
});

// Password reset rate limiter
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: {
    en: 'Too many password reset attempts, please try again after an hour',
    fa: 'تلاش‌های بازنشانی رمز عبور بیش از حد، لطفاً بعد از یک ساعت دوباره امتحان کنید'
  },
  path: '/api/users/reset-password'
});

// API rate limiter - general limiter for all API routes
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes
  message: {
    en: 'Too many requests from this IP, please try again after 15 minutes',
    fa: 'درخواست‌های بیش از حد از این IP، لطفاً بعد از 15 دقیقه دوباره امتحان کنید'
  }
});

// Event creation rate limiter
const eventCreationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 events per hour
  message: {
    en: 'You have created too many events, please try again after an hour',
    fa: 'شما رویدادهای بسیاری ایجاد کرده‌اید، لطفاً بعد از یک ساعت دوباره امتحان کنید'
  },
  path: '/api/events',
  // Use user ID for logged in users, or IP for non-logged in
  keyGenerator: (req) => req.user ? req.user.id : req.ip
});

module.exports = {
  authLimiter,
  registrationLimiter,
  passwordResetLimiter,
  apiLimiter,
  eventCreationLimiter,
  createRateLimiter
}; 