const winston = require('winston');

// Define log format
const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ],
});

// Helper functions for different log levels
const info = (message) => {
  logger.info(message);
  console.log(message); // Also log to console for immediate visibility
};

const error = (message, err) => {
  const logMessage = err ? `${message}: ${err.message || err}` : message;
  logger.error(logMessage);
  console.error(logMessage); // Also log to console for immediate visibility
};

const debug = (message) => {
  logger.debug(message);
  if (process.env.NODE_ENV === 'development') {
    console.debug(message); // Only show in development mode
  }
};

const warn = (message) => {
  logger.warn(message);
  console.warn(message); // Also log to console for immediate visibility
};

module.exports = {
  info,
  error,
  debug,
  warn,
  logger // Export the full logger for advanced usage
}; 