const Agenda = require('agenda');
const logger = require('../utils/logger');
const nodemailer = require('../utils/nodemailer');
const Event = require('../models/Event');
const User = require('../models/User');
const moment = require('moment-timezone');

// Create Agenda instance
const agenda = new Agenda({
  db: {
    address: process.env.MONGODB_URI || 'mongodb://localhost:27017/event-scheduler',
    collection: 'jobs',
    options: { useUnifiedTopology: true }
  },
  processEvery: '1 minute'
});

// Define Agenda jobs
agenda.define('send event reminder', async (job) => {
  try {
    const { eventId, timeFrame } = job.attrs.data;
    logger.info(`Processing reminder for event ${eventId} (${timeFrame} reminder) | در حال پردازش یادآوری برای رویداد ${eventId} (یادآوری ${timeFrame})`);

    const event = await Event.findById(eventId).populate('organizer attendees');
    
    if (!event) {
      logger.error(`Event ${eventId} not found for reminder | رویداد ${eventId} برای یادآوری یافت نشد`);
      return;
    }

    // Get all attendees including the organizer
    const allParticipants = [event.organizer, ...event.attendees];
    const uniqueParticipants = [...new Map(allParticipants.map(user => [user._id.toString(), user])).values()];
    
    // Prepare and send emails
    for (const user of uniqueParticipants) {
      // Convert event time to user's timezone if available
      const userTimezone = user.timezone || 'UTC';
      const localStartTime = moment(event.startTime).tz(userTimezone).format('YYYY-MM-DD HH:mm');
      
      const emailData = {
        to: user.email,
        subject: `${timeFrame} Reminder: ${event.title} | یادآوری ${timeFrame === 'day' ? 'روزانه' : 'ساعتی'}: ${event.title}`,
        html: `
          <div style="direction: ltr; text-align: left;">
            <h2>Reminder: ${event.title}</h2>
            <p>This is a reminder that you have an event starting at ${localStartTime} (your local time).</p>
            <h3>Event Details:</h3>
            <ul>
              <li><strong>Title:</strong> ${event.title}</li>
              <li><strong>Description:</strong> ${event.description || 'N/A'}</li>
              <li><strong>Location:</strong> ${event.location || 'N/A'}</li>
              <li><strong>Start Time:</strong> ${localStartTime}</li>
            </ul>
          </div>
          <hr />
          <div style="direction: rtl; text-align: right;">
            <h2>یادآوری: ${event.title}</h2>
            <p>این یک یادآوری است که شما یک رویداد در ساعت ${localStartTime} (به وقت محلی شما) دارید.</p>
            <h3>جزئیات رویداد:</h3>
            <ul>
              <li><strong>عنوان:</strong> ${event.title}</li>
              <li><strong>توضیحات:</strong> ${event.description || 'موجود نیست'}</li>
              <li><strong>مکان:</strong> ${event.location || 'موجود نیست'}</li>
              <li><strong>زمان شروع:</strong> ${localStartTime}</li>
            </ul>
          </div>
        `
      };
      
      await nodemailer.sendMail(emailData);
      logger.info(`Sent ${timeFrame} reminder to ${user.email} for event ${event.title} | یادآوری ${timeFrame} برای رویداد ${event.title} به ${user.email} ارسال شد`);
    }
  } catch (error) {
    logger.error('Error sending event reminder | خطا در ارسال یادآوری رویداد:', error);
  }
});

// Maintenance job to clean up expired events
agenda.define('clean expired events', async (job) => {
  try {
    const daysToKeep = parseInt(process.env.EXPIRED_EVENTS_RETENTION_DAYS || '90');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await Event.updateMany(
      { 
        endTime: { $lt: cutoffDate },
        isArchived: false 
      },
      { 
        $set: { isArchived: true } 
      }
    );
    
    logger.info(`Archived ${result.modifiedCount} expired events | ${result.modifiedCount} رویداد منقضی شده بایگانی شدند`);
  } catch (error) {
    logger.error('Error in clean expired events job | خطا در فرایند پاکسازی رویدادهای منقضی شده:', error);
  }
});

// Schedule event reminder setup
const scheduleEventReminders = async (eventId, startTime) => {
  try {
    const eventStartTime = new Date(startTime);
    
    // Schedule 1 day before reminder
    const oneDayBefore = new Date(eventStartTime);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    
    if (oneDayBefore > new Date()) {
      await agenda.schedule(oneDayBefore, 'send event reminder', {
        eventId,
        timeFrame: 'day'
      });
      logger.info(`Scheduled day reminder for event ${eventId} | یادآوری روزانه برای رویداد ${eventId} زمان‌بندی شد`);
    }
    
    // Schedule 1 hour before reminder
    const oneHourBefore = new Date(eventStartTime);
    oneHourBefore.setHours(oneHourBefore.getHours() - 1);
    
    if (oneHourBefore > new Date()) {
      await agenda.schedule(oneHourBefore, 'send event reminder', {
        eventId,
        timeFrame: 'hour'
      });
      logger.info(`Scheduled hour reminder for event ${eventId} | یادآوری ساعتی برای رویداد ${eventId} زمان‌بندی شد`);
    }
  } catch (error) {
    logger.error(`Error scheduling reminders for event ${eventId} | خطا در زمان‌بندی یادآوری‌ها برای رویداد ${eventId}:`, error);
  }
};

// Function to cancel all reminders for an event
const cancelEventReminders = async (eventId) => {
  try {
    await agenda.cancel({ 'data.eventId': eventId });
    logger.info(`Cancelled all reminders for event ${eventId} | تمام یادآوری‌ها برای رویداد ${eventId} لغو شدند`);
  } catch (error) {
    logger.error(`Error cancelling reminders for event ${eventId} | خطا در لغو یادآوری‌ها برای رویداد ${eventId}:`, error);
  }
};

// Start agenda
const startAgenda = async () => {
  try {
    await agenda.start();
    logger.info('Agenda started successfully | Agenda با موفقیت شروع به کار کرد');
    
    // Schedule recurring maintenance job - run every day at midnight
    await agenda.every('0 0 * * *', 'clean expired events');
    logger.info('Scheduled daily maintenance job | کار نگهداری روزانه زمان‌بندی شد');
  } catch (error) {
    logger.error('Error starting agenda | خطا در شروع Agenda:', error);
  }
};

module.exports = {
  agenda,
  startAgenda,
  scheduleEventReminders,
  cancelEventReminders
}; 