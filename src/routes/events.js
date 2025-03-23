const express = require('express');
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');
const { validate, eventValidationRules, searchValidationRules, paginationRules } = require('../middleware/validation');
const { eventCreationLimiter } = require('../middleware/rateLimit');
const { eventAttachments } = require('../middleware/upload');
const { cacheMiddleware, clearCache } = require('../config/redis');
const metrics = require('../config/metrics');
const { scheduleEventReminders, cancelEventReminders } = require('../config/agenda');

const router = express.Router();

// Log all requests to this router
router.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} | ${req.method} ${req.originalUrl}`);
  next();
});

// Apply metrics middleware
router.use(metrics.metricsMiddleware);

// Create event with validation and rate limiting
router.post('/',
  authMiddleware,
  eventCreationLimiter,
  eventValidationRules.create,
  validate,
  async (req, res, next) => {
    // Schedule reminders after creating the event
    const originalJsonFunction = res.json;
    res.json = function(data) {
      if (data.success && data.event) {
        // Schedule reminders for the newly created event
        scheduleEventReminders(data.event._id, data.event.startTime)
          .catch(err => logger.error('Error scheduling reminders', err));
        
        // Update metrics
        metrics.incrementEventScheduled(req.user.id);
        
        // Clear user's events cache
        clearCache(`__express__/api/events?userId=${req.user.id}*`)
          .catch(err => logger.error('Error clearing cache', err));
      }
      return originalJsonFunction.call(this, data);
    };
    next();
  },
  eventController.createEvent
);

// Get all events for user with search, filtering and pagination
router.get('/',
  authMiddleware,
  searchValidationRules,
  paginationRules,
  validate,
  cacheMiddleware(60), // Cache for 1 minute
  eventController.getEvents
);

// Get specific event by ID
router.get('/:id',
  authMiddleware,
  eventValidationRules.getById,
  validate,
  cacheMiddleware(60), // Cache for 1 minute
  eventController.getEventById
);

// Update event
router.put('/:id',
  authMiddleware,
  eventValidationRules.update,
  validate,
  async (req, res, next) => {
    // Update reminders if start time has changed
    const originalJsonFunction = res.json;
    res.json = function(data) {
      if (data.success && data.event && req.body.startTime) {
        // Cancel existing reminders and schedule new ones
        cancelEventReminders(data.event._id)
          .then(() => scheduleEventReminders(data.event._id, data.event.startTime))
          .catch(err => logger.error('Error rescheduling reminders', err));
        
        // Clear relevant caches
        clearCache(`__express__/api/events/${data.event._id}`)
          .catch(err => logger.error('Error clearing cache', err));
        clearCache(`__express__/api/events?*`)
          .catch(err => logger.error('Error clearing cache', err));
      }
      return originalJsonFunction.call(this, data);
    };
    next();
  },
  eventController.updateEvent
);

// Delete event
router.delete('/:id',
  authMiddleware,
  eventValidationRules.getById,
  validate,
  async (req, res, next) => {
    // Clean up reminders when an event is deleted
    const originalJsonFunction = res.json;
    res.json = function(data) {
      if (data.success) {
        // Cancel all reminders for this event
        cancelEventReminders(req.params.id)
          .catch(err => logger.error('Error cancelling reminders', err));
        
        // Clear relevant caches
        clearCache(`__express__/api/events/${req.params.id}`)
          .catch(err => logger.error('Error clearing cache', err));
        clearCache(`__express__/api/events?*`)
          .catch(err => logger.error('Error clearing cache', err));
      }
      return originalJsonFunction.call(this, data);
    };
    next();
  },
  eventController.deleteEvent
);

// RSVP to event
router.post('/:id/rsvp',
  authMiddleware,
  eventValidationRules.rsvp,
  validate,
  async (req, res, next) => {
    // Track RSVP responses in metrics
    const originalJsonFunction = res.json;
    res.json = function(data) {
      if (data.success) {
        // Update metrics for event attendee
        metrics.incrementEventAttendee(req.params.id, req.body.status);
        
        // Clear relevant caches
        clearCache(`__express__/api/events/${req.params.id}`)
          .catch(err => logger.error('Error clearing cache', err));
      }
      return originalJsonFunction.call(this, data);
    };
    next();
  },
  eventController.respondToInvitation
);

// Generate ICS calendar file
router.get('/:id/calendar',
  authMiddleware,
  eventValidationRules.getById,
  validate,
  eventController.generateEventCalendar
);

// Upload attachments to event
router.post('/:id/attachments',
  authMiddleware,
  eventValidationRules.getById,
  validate,
  eventAttachments,
  eventController.addEventAttachments
);

// Delete attachment from event
router.delete('/:id/attachments/:attachmentId',
  authMiddleware,
  eventController.deleteEventAttachment
);

// Get event attendees
router.get('/:id/attendees',
  authMiddleware,
  eventValidationRules.getById,
  validate,
  cacheMiddleware(60), // Cache for 1 minute
  eventController.getEventAttendees
);

// Get events by date range for calendar view
router.get('/calendar/view',
  authMiddleware,
  searchValidationRules,
  validate,
  cacheMiddleware(60), // Cache for 1 minute
  eventController.getCalendarEvents
);

module.exports = router; 