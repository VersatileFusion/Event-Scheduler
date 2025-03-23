const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Event Scheduler API | سیستم زمان بندی رویدادها',
      version: '1.0.0',
      description: `
# Event Scheduler with Time Zone Support

A backend API for scheduling events across time zones, sending reminders, and managing RSVPs.

## Features
- CRUD operations for events
- Time zone conversion
- Email reminders
- RSVP system with user authentication
- Calendar export (ICS file generation)

# سیستم زمان بندی رویدادها با پشتیبانی از مناطق زمانی

یک API برای زمان‌بندی رویدادها در مناطق زمانی مختلف، ارسال یادآوری‌ها و مدیریت پاسخ‌های شرکت‌کنندگان.

## ویژگی‌ها
- عملیات CRUD برای رویدادها
- تبدیل مناطق زمانی
- یادآوری‌های ایمیلی
- سیستم پاسخ شرکت‌کنندگان با احراز هویت کاربران
- قابلیت صدور تقویم (فایل ICS)
      `,
      contact: {
        name: 'API Support',
        email: 'support@eventscheduler.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/models/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs; 