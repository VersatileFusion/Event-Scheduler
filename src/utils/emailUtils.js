const nodemailer = require('nodemailer');
const moment = require('moment-timezone');
const logger = require('./logger');

// Create transporter for sending emails (configuration)
let transporter;

/**
 * Initialize email transporter with configuration
 */
const initializeTransporter = () => {
  try {
    // This is for development, in production you would use actual SMTP credentials
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: process.env.SMTP_PORT || 2525,
      auth: {
        user: process.env.SMTP_USER || 'your-mailtrap-user',
        pass: process.env.SMTP_PASS || 'your-mailtrap-password'
      }
    });
    
    logger.info('Email transporter initialized');
    console.log('Email transporter initialized | سیستم ارسال ایمیل راه‌اندازی شد');
  } catch (error) {
    logger.error('Error initializing email transporter', error);
    console.error(`Error initializing email transporter | خطا در راه‌اندازی سیستم ارسال ایمیل: ${error.message}`);
  }
};

/**
 * Send event invitation email
 * @param {Object} event - Event document
 * @param {Object} user - User document (invitee)
 * @param {Object} organizer - Organizer user document
 * @returns {Promise<boolean>} - Success indicator
 */
const sendEventInvitation = async (event, user, organizer) => {
  try {
    if (!transporter) {
      initializeTransporter();
    }
    
    // Format dates in user's timezone
    const userTimezone = user.timezone || 'UTC';
    const formattedStart = moment(event.startTime)
      .tz(userTimezone)
      .format('dddd, MMMM D, YYYY [at] h:mm A z');
    
    const formattedEnd = moment(event.endTime)
      .tz(userTimezone)
      .format('h:mm A z');
    
    // Build email content with both English and Persian text
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Event Scheduler" <events@eventscheduler.com>',
      to: user.email,
      subject: `Invitation: ${event.title} | دعوت: ${event.title}`,
      html: `
        <div style="direction: ltr; text-align: left; font-family: Arial, sans-serif;">
          <h2>Event Invitation</h2>
          <p>You've been invited to the following event:</p>
          <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #007bff; background-color: #f8f9fa;">
            <h3>${event.title}</h3>
            <p><strong>When:</strong> ${formattedStart} to ${formattedEnd}</p>
            <p><strong>Organizer:</strong> ${organizer.name}</p>
            ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
            ${event.location?.address ? `<p><strong>Location:</strong> ${event.location.address}</p>` : ''}
          </div>
          <p>Please respond to this invitation to let the organizer know if you can attend.</p>
          <div style="margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event._id}/rsvp?response=accepted&user=${user._id}" 
               style="background-color: #28a745; color: white; padding: 10px 15px; text-decoration: none; margin-right: 10px; border-radius: 4px;">
              Accept
            </a>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event._id}/rsvp?response=tentative&user=${user._id}" 
               style="background-color: #ffc107; color: white; padding: 10px 15px; text-decoration: none; margin-right: 10px; border-radius: 4px;">
              Maybe
            </a>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event._id}/rsvp?response=declined&user=${user._id}" 
               style="background-color: #dc3545; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">
              Decline
            </a>
          </div>
        </div>
        
        <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eee;" />
        
        <div style="direction: rtl; text-align: right; font-family: Tahoma, Arial, sans-serif;">
          <h2>دعوت به رویداد</h2>
          <p>شما به رویداد زیر دعوت شده‌اید:</p>
          <div style="margin: 20px 0; padding: 15px; border-right: 4px solid #007bff; background-color: #f8f9fa;">
            <h3>${event.title}</h3>
            <p><strong>زمان:</strong> ${formattedStart} تا ${formattedEnd}</p>
            <p><strong>برگزارکننده:</strong> ${organizer.name}</p>
            ${event.description ? `<p><strong>توضیحات:</strong> ${event.description}</p>` : ''}
            ${event.location?.address ? `<p><strong>مکان:</strong> ${event.location.address}</p>` : ''}
          </div>
          <p>لطفاً به این دعوت پاسخ دهید تا برگزارکننده از حضور شما مطلع شود.</p>
          <div style="margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event._id}/rsvp?response=accepted&user=${user._id}" 
               style="background-color: #28a745; color: white; padding: 10px 15px; text-decoration: none; margin-left: 10px; border-radius: 4px;">
              پذیرفتن
            </a>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event._id}/rsvp?response=tentative&user=${user._id}" 
               style="background-color: #ffc107; color: white; padding: 10px 15px; text-decoration: none; margin-left: 10px; border-radius: 4px;">
              شاید
            </a>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event._id}/rsvp?response=declined&user=${user._id}" 
               style="background-color: #dc3545; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">
              نپذیرفتن
            </a>
          </div>
        </div>
      `
    };
    
    logger.debug(`Sending invitation email to ${user.email} for event: ${event.title}`);
    console.log(`Sending invitation email to ${user.email} for event: ${event.title} | ارسال ایمیل دعوت به ${user.email} برای رویداد: ${event.title}`);
    
    const info = await transporter.sendMail(mailOptions);
    
    logger.info(`Invitation email sent: ${info.messageId}`);
    console.log(`Invitation email sent: ${info.messageId} | ایمیل دعوت ارسال شد: ${info.messageId}`);
    
    return true;
  } catch (error) {
    logger.error(`Error sending invitation email to ${user.email}`, error);
    console.error(`Error sending invitation email to ${user.email} | خطا در ارسال ایمیل دعوت به ${user.email}: ${error.message}`);
    return false;
  }
};

/**
 * Send event reminder email
 * @param {Object} event - Event document
 * @param {Object} user - User document (attendee)
 * @returns {Promise<boolean>} - Success indicator
 */
const sendEventReminder = async (event, user) => {
  try {
    if (!transporter) {
      initializeTransporter();
    }
    
    // Format dates in user's timezone
    const userTimezone = user.timezone || 'UTC';
    const formattedStart = moment(event.startTime)
      .tz(userTimezone)
      .format('dddd, MMMM D, YYYY [at] h:mm A z');
    
    // Build email content with both English and Persian text
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Event Scheduler" <reminders@eventscheduler.com>',
      to: user.email,
      subject: `Reminder: ${event.title} | یادآوری: ${event.title}`,
      html: `
        <div style="direction: ltr; text-align: left; font-family: Arial, sans-serif;">
          <h2>Event Reminder</h2>
          <p>This is a reminder for your upcoming event:</p>
          <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #ffc107; background-color: #f8f9fa;">
            <h3>${event.title}</h3>
            <p><strong>When:</strong> ${formattedStart}</p>
            ${event.location?.address ? `<p><strong>Location:</strong> ${event.location.address}</p>` : ''}
          </div>
        </div>
        
        <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eee;" />
        
        <div style="direction: rtl; text-align: right; font-family: Tahoma, Arial, sans-serif;">
          <h2>یادآوری رویداد</h2>
          <p>این یک یادآوری برای رویداد پیش روی شماست:</p>
          <div style="margin: 20px 0; padding: 15px; border-right: 4px solid #ffc107; background-color: #f8f9fa;">
            <h3>${event.title}</h3>
            <p><strong>زمان:</strong> ${formattedStart}</p>
            ${event.location?.address ? `<p><strong>مکان:</strong> ${event.location.address}</p>` : ''}
          </div>
        </div>
      `
    };
    
    logger.debug(`Sending reminder email to ${user.email} for event: ${event.title}`);
    console.log(`Sending reminder email to ${user.email} for event: ${event.title} | ارسال ایمیل یادآوری به ${user.email} برای رویداد: ${event.title}`);
    
    const info = await transporter.sendMail(mailOptions);
    
    logger.info(`Reminder email sent: ${info.messageId}`);
    console.log(`Reminder email sent: ${info.messageId} | ایمیل یادآوری ارسال شد: ${info.messageId}`);
    
    return true;
  } catch (error) {
    logger.error(`Error sending reminder email to ${user.email}`, error);
    console.error(`Error sending reminder email to ${user.email} | خطا در ارسال ایمیل یادآوری به ${user.email}: ${error.message}`);
    return false;
  }
};

module.exports = {
  initializeTransporter,
  sendEventInvitation,
  sendEventReminder
}; 