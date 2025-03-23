const mongoose = require('mongoose');
const moment = require('moment-timezone');
const logger = require('../utils/logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       required:
 *         - title
 *         - startTime
 *         - endTime
 *         - timezone
 *         - organizer
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated event ID | شناسه رویداد (اتوماتیک ایجاد می‌شود)
 *         title:
 *           type: string
 *           description: Event title | عنوان رویداد
 *         description:
 *           type: string
 *           description: Event description | توضیحات رویداد
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: Event start time | زمان شروع رویداد
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: Event end time | زمان پایان رویداد
 *         timezone:
 *           type: string
 *           description: Event timezone | منطقه زمانی رویداد
 *           example: Asia/Tehran, Europe/London, America/New_York
 *         location:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [physical, virtual]
 *               description: Location type | نوع مکان
 *             address:
 *               type: string
 *               description: Physical address or virtual meeting link | آدرس فیزیکی یا لینک جلسه مجازی
 *           description: Event location details | جزئیات مکان رویداد
 *         organizer:
 *           type: string
 *           description: User ID of event organizer | شناسه کاربری برگزار کننده رویداد
 *         attendees:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *                 description: User ID of attendee | شناسه کاربری شرکت کننده
 *               status:
 *                 type: string
 *                 enum: [pending, accepted, declined, tentative]
 *                 description: RSVP status | وضعیت پاسخ
 *               notificationSent:
 *                 type: boolean
 *                 description: Whether reminder was sent | آیا یادآوری ارسال شده است
 *           description: List of event attendees | لیست شرکت کنندگان در رویداد
 *         reminders:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               time:
 *                 type: string
 *                 format: date-time
 *                 description: When to send reminder | زمان ارسال یادآوری
 *               sent:
 *                 type: boolean
 *                 description: Whether reminder was sent | آیا یادآوری ارسال شده است
 *           description: Scheduled reminders | یادآوری های زمانبندی شده
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Event creation date | تاریخ ایجاد رویداد
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last event update | آخرین بروزرسانی رویداد
 *       example:
 *         title: Team Meeting
 *         description: Weekly team sync-up
 *         startTime: 2023-08-15T10:00:00.000Z
 *         endTime: 2023-08-15T11:00:00.000Z
 *         timezone: Europe/London
 *         location:
 *           type: virtual
 *           address: https://meet.google.com/abc-defg-hij
 *         organizer: 60d21b4667d0d8992e610c85
 *         attendees: []
 *         reminders: []
 */

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required | عنوان الزامی است'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required | زمان شروع الزامی است']
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required | زمان پایان الزامی است'],
    validate: {
      validator: function(value) {
        return value > this.startTime;
      },
      message: 'End time must be after start time | زمان پایان باید پس از زمان شروع باشد'
    }
  },
  timezone: {
    type: String,
    required: [true, 'Timezone is required | منطقه زمانی الزامی است'],
    default: 'UTC',
    validate: {
      validator: function(value) {
        return moment.tz.names().includes(value);
      },
      message: 'Invalid timezone | منطقه زمانی نامعتبر است'
    }
  },
  location: {
    type: {
      type: String,
      enum: ['physical', 'virtual'],
      default: 'physical'
    },
    address: {
      type: String,
      trim: true
    }
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Organizer is required | برگزار کننده الزامی است']
  },
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'tentative'],
      default: 'pending'
    },
    notificationSent: {
      type: Boolean,
      default: false
    }
  }],
  reminders: [{
    time: {
      type: Date,
      required: true
    },
    sent: {
      type: Boolean,
      default: false
    }
  }]
}, { timestamps: true });

// Convert time between timezones
eventSchema.methods.getTimeInTimezone = function(date, targetTimezone) {
  try {
    return moment(date).tz(targetTimezone).format();
  } catch (error) {
    logger.error('Error converting timezone', error);
    console.error(`Error converting timezone | خطا در تبدیل منطقه زمانی: ${error.message}`);
    return date;
  }
};

// Generate ICS format for calendar
eventSchema.methods.generateICS = function() {
  // Implementation will be in a utility module
  logger.info(`Generating ICS for event: ${this._id}`);
  console.log(`Generating ICS for event: ${this._id} | ساخت فایل ICS برای رویداد: ${this._id}`);
  return null; // Placeholder
};

// Log when a new event is created
eventSchema.post('save', function(doc) {
  if (this.isNew) {
    logger.info(`New event created: ${doc.title} (${doc._id})`);
    console.log(`New event created: ${doc.title} (${doc._id}) | رویداد جدید ایجاد شد: ${doc.title} (${doc._id})`);
  }
});

// Index for efficient queries
eventSchema.index({ startTime: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ 'attendees.user': 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event; 