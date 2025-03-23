const client = require('prom-client');
const logger = require('../utils/logger');

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'event-scheduler-api'
});

// Enable collection of default metrics
client.collectDefaultMetrics({ register });

// Create custom metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [1, 5, 15, 50, 100, 200, 500, 1000, 2000, 5000]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code']
});

const eventScheduledTotal = new client.Counter({
  name: 'events_scheduled_total',
  help: 'Total number of events scheduled',
  labelNames: ['user_id']
});

const emailsSentTotal = new client.Counter({
  name: 'emails_sent_total',
  help: 'Total number of emails sent',
  labelNames: ['type'] // type can be 'reminder', 'invitation', etc.
});

const eventAttendeeCounter = new client.Counter({
  name: 'event_attendees_total',
  help: 'Total number of event attendees',
  labelNames: ['event_id', 'status'] // status can be 'accepted', 'declined', 'pending'
});

const cacheHitCounter = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['route']
});

const cacheMissCounter = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['route']
});

// Register the custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(eventScheduledTotal);
register.registerMetric(emailsSentTotal);
register.registerMetric(eventAttendeeCounter);
register.registerMetric(cacheHitCounter);
register.registerMetric(cacheMissCounter);

// Middleware to measure HTTP request duration
const metricsMiddleware = (req, res, next) => {
  // Skip metrics endpoint
  if (req.path === '/metrics') {
    return next();
  }

  // Start the timer
  const end = httpRequestDurationMicroseconds.startTimer();
  
  // Original URL is too specific for monitoring purposes, 
  // so we use route if it exists, otherwise path
  const routePath = req.route ? req.baseUrl + req.route.path : req.path;

  // Record request
  res.on('finish', () => {
    const duration = end();
    const statusCode = res.statusCode;

    // Count request
    httpRequestsTotal.inc({
      method: req.method,
      route: routePath,
      code: statusCode
    });

    logger.debug(`Metrics: ${req.method} ${routePath} ${statusCode} - ${duration.toFixed(3)}ms | متریک‌ها: ${req.method} ${routePath} ${statusCode} - ${duration.toFixed(3)}ms`);
  });

  next();
};

// Helper functions to increment custom metrics
const incrementEventScheduled = (userId) => {
  try {
    eventScheduledTotal.inc({ user_id: userId });
  } catch (error) {
    logger.error('Error incrementing event scheduled metric | خطا در افزایش متریک رویداد زمان‌بندی شده:', error);
  }
};

const incrementEmailSent = (type) => {
  try {
    emailsSentTotal.inc({ type });
  } catch (error) {
    logger.error('Error incrementing email sent metric | خطا در افزایش متریک ایمیل ارسال شده:', error);
  }
};

const incrementEventAttendee = (eventId, status) => {
  try {
    eventAttendeeCounter.inc({ event_id: eventId, status });
  } catch (error) {
    logger.error('Error incrementing event attendee metric | خطا در افزایش متریک شرکت‌کننده رویداد:', error);
  }
};

const incrementCacheHit = (route) => {
  try {
    cacheHitCounter.inc({ route });
  } catch (error) {
    logger.error('Error incrementing cache hit metric | خطا در افزایش متریک بازیابی از کش:', error);
  }
};

const incrementCacheMiss = (route) => {
  try {
    cacheMissCounter.inc({ route });
  } catch (error) {
    logger.error('Error incrementing cache miss metric | خطا در افزایش متریک عدم بازیابی از کش:', error);
  }
};

module.exports = {
  register,
  metricsMiddleware,
  incrementEventScheduled,
  incrementEmailSent,
  incrementEventAttendee,
  incrementCacheHit,
  incrementCacheMiss
}; 