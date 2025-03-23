const ics = require('ics');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Convert event to ICS format
 * @param {Object} event - Event document from MongoDB
 * @returns {Promise<{error: Error|null, value: String|null}>} - Result with error or ICS string
 */
const generateEventICS = (event) => {
  return new Promise((resolve) => {
    try {
      logger.debug(`Generating ICS for event: ${event.title}`);
      console.log(`Generating ICS for event: ${event.title} | ساخت فایل ICS برای رویداد: ${event.title}`);
      
      // Parse start and end dates
      const startDate = moment(event.startTime).tz(event.timezone);
      const endDate = moment(event.endTime).tz(event.timezone);
      
      // Format for ICS (YYYY, M, D, H, m)
      const start = [
        startDate.year(),
        startDate.month() + 1, // Moment months are 0-indexed
        startDate.date(),
        startDate.hour(),
        startDate.minute()
      ];
      
      const duration = {
        hours: endDate.diff(startDate, 'hours'),
        minutes: endDate.diff(startDate, 'minutes') % 60
      };
      
      // Build event object for ICS
      const eventData = {
        start,
        duration,
        title: event.title,
        description: event.description || '',
        location: event.location?.address || '',
        url: event.location?.type === 'virtual' ? event.location.address : undefined,
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
        organizer: { name: 'Event Organizer', email: 'no-reply@eventscheduler.com' },
        alarms: [{ action: 'display', trigger: { minutes: 15, before: true } }],
      };
      
      // Create ICS
      ics.createEvent(eventData, (error, value) => {
        if (error) {
          logger.error(`Error generating ICS file`, error);
          console.error(`Error generating ICS file | خطا در ساخت فایل ICS: ${error.message}`);
          resolve({ error, value: null });
        } else {
          logger.info(`ICS file generated successfully for event: ${event.title}`);
          console.log(`ICS file generated successfully for event: ${event.title} | فایل ICS با موفقیت برای رویداد ساخته شد: ${event.title}`);
          resolve({ error: null, value });
        }
      });
    } catch (error) {
      logger.error(`Exception generating ICS file`, error);
      console.error(`Exception generating ICS file | استثنا در ساخت فایل ICS: ${error.message}`);
      resolve({ error, value: null });
    }
  });
};

/**
 * Save ICS content to file
 * @param {String} icsString - ICS file content
 * @param {String} filename - Target filename
 * @returns {Promise<{error: Error|null, filePath: String|null}>} - Result with error or file path
 */
const saveICSFile = async (icsString, filename) => {
  try {
    // Ensure directory exists
    const dir = path.join(__dirname, '../../uploads/ics');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const filePath = path.join(dir, `${filename}.ics`);
    fs.writeFileSync(filePath, icsString);
    
    logger.info(`ICS file saved to ${filePath}`);
    console.log(`ICS file saved to ${filePath} | فایل ICS در مسیر ${filePath} ذخیره شد`);
    
    return { error: null, filePath };
  } catch (error) {
    logger.error(`Error saving ICS file`, error);
    console.error(`Error saving ICS file | خطا در ذخیره فایل ICS: ${error.message}`);
    return { error, filePath: null };
  }
};

module.exports = {
  generateEventICS,
  saveICSFile
}; 