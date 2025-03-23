const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const logger = require('./utils/logger');

// Import routes
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());

// HTTP request logging
app.use(morgan('dev'));
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      logger.info(message.trim());
    }
  }
}));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { background-color: #007bff; }',
  customSiteTitle: 'Event Scheduler API Documentation',
  customfavIcon: '/favicon.ico',
  explorer: true
}));

// Bilingual welcome message
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Event Scheduler API | به API سیستم زمان‌بندی رویدادها خوش آمدید',
    documentation: '/api-docs',
    version: '1.0.0'
  });
});

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/event-scheduler', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    logger.info('Connected to MongoDB | اتصال به پایگاه داده MongoDB برقرار شد');
    console.log('Connected to MongoDB | اتصال به پایگاه داده MongoDB برقرار شد');
  })
  .catch((err) => {
    logger.error('Error connecting to MongoDB', err);
    console.error('Error connecting to MongoDB | خطا در اتصال به پایگاه داده MongoDB:', err.message);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error', err);
  console.error('Server error | خطای سرور:', err.message);
  res.status(500).json({
    error: {
      en: 'Internal server error',
      fa: 'خطای داخلی سرور'
    }
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Server running on port ${PORT} | سرور در پورت ${PORT} در حال اجراست`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
});

module.exports = app; // For testing purposes 