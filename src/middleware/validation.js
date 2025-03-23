const { body, param, query, validationResult } = require('express-validator');
const moment = require('moment-timezone');
const logger = require('../utils/logger');

// Handle validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn(`Validation error in ${req.originalUrl} | خطای اعتبارسنجی در ${req.originalUrl}`, {
      errors: errors.array(),
      body: req.body
    });
    
    // Prepare error message in both languages
    const errorMessages = errors.array().map(error => ({
      en: error.msg.includes('|') ? error.msg.split('|')[0].trim() : error.msg,
      fa: error.msg.includes('|') ? error.msg.split('|')[1].trim() : error.msg
    }));
    
    return res.status(400).json({
      success: false,
      errors: errorMessages
    });
  }
  
  next();
};

// User validation rules
const userValidationRules = {
  register: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required | نام الزامی است')
      .isLength({ max: 50 }).withMessage('Name cannot be more than 50 characters | نام نمی‌تواند بیش از 50 کاراکتر باشد'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required | ایمیل الزامی است')
      .isEmail().withMessage('Invalid email format | فرمت ایمیل نامعتبر است')
      .normalizeEmail(),
    
    body('password')
      .notEmpty().withMessage('Password is required | رمز عبور الزامی است')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters | رمز عبور باید حداقل 6 کاراکتر باشد'),
    
    body('timezone')
      .optional()
      .custom((value) => {
        if (value && !moment.tz.names().includes(value)) {
          throw new Error('Invalid timezone | منطقه زمانی نامعتبر است');
        }
        return true;
      }),
    
    body('language')
      .optional()
      .isIn(['en', 'fa']).withMessage('Language must be either "en" or "fa" | زبان باید "en" یا "fa" باشد')
  ],
  
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required | ایمیل الزامی است')
      .isEmail().withMessage('Invalid email format | فرمت ایمیل نامعتبر است')
      .normalizeEmail(),
    
    body('password')
      .notEmpty().withMessage('Password is required | رمز عبور الزامی است')
  ],
  
  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Name cannot be more than 50 characters | نام نمی‌تواند بیش از 50 کاراکتر باشد'),
    
    body('timezone')
      .optional()
      .custom((value) => {
        if (value && !moment.tz.names().includes(value)) {
          throw new Error('Invalid timezone | منطقه زمانی نامعتبر است');
        }
        return true;
      }),
    
    body('language')
      .optional()
      .isIn(['en', 'fa']).withMessage('Language must be either "en" or "fa" | زبان باید "en" یا "fa" باشد'),
    
    body('bio')
      .optional()
      .isLength({ max: 500 }).withMessage('Bio cannot be more than 500 characters | بیوگرافی نمی‌تواند بیش از 500 کاراکتر باشد'),
    
    body('phoneNumber')
      .optional()
      .isMobilePhone().withMessage('Invalid phone number format | فرمت شماره تلفن نامعتبر است'),
    
    body('organization')
      .optional()
      .trim()
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty().withMessage('Current password is required | رمز عبور فعلی الزامی است'),
    
    body('newPassword')
      .notEmpty().withMessage('New password is required | رمز عبور جدید الزامی است')
      .isLength({ min: 6 }).withMessage('New password must be at least 6 characters | رمز عبور جدید باید حداقل 6 کاراکتر باشد')
      .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
          throw new Error('New password must be different from the current password | رمز عبور جدید باید با رمز عبور فعلی متفاوت باشد');
        }
        return true;
      })
  ],
  
  resetPasswordRequest: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required | ایمیل الزامی است')
      .isEmail().withMessage('Invalid email format | فرمت ایمیل نامعتبر است')
      .normalizeEmail()
  ],
  
  resetPassword: [
    body('token')
      .notEmpty().withMessage('Token is required | توکن الزامی است'),
    
    body('password')
      .notEmpty().withMessage('Password is required | رمز عبور الزامی است')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters | رمز عبور باید حداقل 6 کاراکتر باشد')
  ]
};

// Event validation rules
const eventValidationRules = {
  create: [
    body('title')
      .trim()
      .notEmpty().withMessage('Event title is required | عنوان رویداد الزامی است')
      .isLength({ max: 200 }).withMessage('Title cannot be more than 200 characters | عنوان نمی‌تواند بیش از 200 کاراکتر باشد'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 }).withMessage('Description cannot be more than 2000 characters | توضیحات نمی‌تواند بیش از 2000 کاراکتر باشد'),
    
    body('startTime')
      .notEmpty().withMessage('Start time is required | زمان شروع الزامی است')
      .custom((value) => {
        if (!moment(value).isValid()) {
          throw new Error('Invalid start time format | فرمت زمان شروع نامعتبر است');
        }
        return true;
      }),
    
    body('endTime')
      .notEmpty().withMessage('End time is required | زمان پایان الزامی است')
      .custom((value, { req }) => {
        if (!moment(value).isValid()) {
          throw new Error('Invalid end time format | فرمت زمان پایان نامعتبر است');
        }
        
        if (moment(value).isBefore(moment(req.body.startTime))) {
          throw new Error('End time must be after start time | زمان پایان باید پس از زمان شروع باشد');
        }
        
        return true;
      }),
    
    body('timezone')
      .optional()
      .custom((value) => {
        if (value && !moment.tz.names().includes(value)) {
          throw new Error('Invalid timezone | منطقه زمانی نامعتبر است');
        }
        return true;
      }),
    
    body('location')
      .optional(),
    
    body('location.name')
      .optional()
      .trim(),
    
    body('location.address')
      .optional()
      .trim(),
    
    body('location.coordinates')
      .optional()
      .isArray().withMessage('Coordinates must be an array [longitude, latitude] | مختصات باید یک آرایه [طول جغرافیایی, عرض جغرافیایی] باشد')
      .custom((value) => {
        if (value.length !== 2 || 
            !Number.isFinite(parseFloat(value[0])) || 
            !Number.isFinite(parseFloat(value[1]))) {
          throw new Error('Coordinates must be an array of two numbers [longitude, latitude] | مختصات باید یک آرایه از دو عدد [طول جغرافیایی, عرض جغرافیایی] باشد');
        }
        return true;
      }),
    
    body('location.virtual')
      .optional()
      .isBoolean().withMessage('Virtual must be a boolean | مجازی باید یک مقدار بولی باشد'),
    
    body('location.meetingUrl')
      .optional()
      .trim()
      .isURL().withMessage('Meeting URL must be a valid URL | آدرس جلسه باید یک URL معتبر باشد'),
    
    body('category')
      .optional()
      .isIn(['meeting', 'conference', 'workshop', 'social', 'holiday', 'other'])
      .withMessage('Invalid category | دسته‌بندی نامعتبر است'),
    
    body('isPrivate')
      .optional()
      .isBoolean().withMessage('isPrivate must be a boolean | خصوصی باید یک مقدار بولی باشد'),
    
    body('isRecurring')
      .optional()
      .isBoolean().withMessage('isRecurring must be a boolean | تکرار باید یک مقدار بولی باشد'),
    
    body('recurringPattern')
      .optional()
      .custom((value, { req }) => {
        if (req.body.isRecurring && !value) {
          throw new Error('Recurring pattern is required for recurring events | الگوی تکرار برای رویدادهای تکراری الزامی است');
        }
        return true;
      }),
    
    body('recurringPattern.frequency')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'yearly'])
      .withMessage('Invalid recurring frequency | فرکانس تکرار نامعتبر است'),
    
    body('recurringPattern.interval')
      .optional()
      .isInt({ min: 1 }).withMessage('Interval must be a positive integer | فاصله باید یک عدد صحیح مثبت باشد'),
    
    body('reminders')
      .optional()
      .isArray().withMessage('Reminders must be an array | یادآوری‌ها باید یک آرایه باشند'),
    
    body('reminders.*.time')
      .optional()
      .isInt({ min: 0 }).withMessage('Reminder time must be a non-negative integer (minutes before event) | زمان یادآوری باید یک عدد صحیح غیر منفی باشد (دقیقه قبل از رویداد)'),
    
    body('reminders.*.type')
      .optional()
      .isIn(['email', 'push', 'both'])
      .withMessage('Invalid reminder type | نوع یادآوری نامعتبر است'),
    
    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex color code | رنگ باید یک کد رنگ هگز معتبر باشد')
  ],
  
  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Title cannot be more than 200 characters | عنوان نمی‌تواند بیش از 200 کاراکتر باشد'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 }).withMessage('Description cannot be more than 2000 characters | توضیحات نمی‌تواند بیش از 2000 کاراکتر باشد'),
    
    body('startTime')
      .optional()
      .custom((value) => {
        if (!moment(value).isValid()) {
          throw new Error('Invalid start time format | فرمت زمان شروع نامعتبر است');
        }
        return true;
      }),
    
    body('endTime')
      .optional()
      .custom((value, { req }) => {
        if (!moment(value).isValid()) {
          throw new Error('Invalid end time format | فرمت زمان پایان نامعتبر است');
        }
        
        if (req.body.startTime && moment(value).isBefore(moment(req.body.startTime))) {
          throw new Error('End time must be after start time | زمان پایان باید پس از زمان شروع باشد');
        }
        
        return true;
      }),
    
    // Include the rest of the validation rules from create but make them optional
    body('timezone')
      .optional()
      .custom((value) => {
        if (value && !moment.tz.names().includes(value)) {
          throw new Error('Invalid timezone | منطقه زمانی نامعتبر است');
        }
        return true;
      }),
    
    body('status')
      .optional()
      .isIn(['scheduled', 'cancelled', 'completed', 'draft'])
      .withMessage('Invalid status | وضعیت نامعتبر است')
  ],
  
  rsvp: [
    body('status')
      .notEmpty().withMessage('Status is required | وضعیت الزامی است')
      .isIn(['accepted', 'declined', 'tentative'])
      .withMessage('Invalid status, must be one of: accepted, declined, tentative | وضعیت نامعتبر، باید یکی از موارد زیر باشد: پذیرفته، رد شده، احتمالی'),
    
    body('responseMessage')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Response message cannot be more than 500 characters | پیام پاسخ نمی‌تواند بیش از 500 کاراکتر باشد')
  ],
  
  getById: [
    param('id')
      .notEmpty().withMessage('Event ID is required | شناسه رویداد الزامی است')
      .isMongoId().withMessage('Invalid event ID format | فرمت شناسه رویداد نامعتبر است')
  ]
};

// Search & filter validation rules
const searchValidationRules = [
  query('search')
    .optional()
    .trim(),
  
  query('from')
    .optional()
    .custom((value) => {
      if (!moment(value).isValid()) {
        throw new Error('Invalid from date format | فرمت تاریخ شروع نامعتبر است');
      }
      return true;
    }),
  
  query('to')
    .optional()
    .custom((value, { req }) => {
      if (!moment(value).isValid()) {
        throw new Error('Invalid to date format | فرمت تاریخ پایان نامعتبر است');
      }
      
      if (req.query.from && moment(value).isBefore(moment(req.query.from))) {
        throw new Error('To date must be after from date | تاریخ پایان باید پس از تاریخ شروع باشد');
      }
      
      return true;
    }),
  
  query('category')
    .optional()
    .isIn(['meeting', 'conference', 'workshop', 'social', 'holiday', 'other', 'all'])
    .withMessage('Invalid category | دسته‌بندی نامعتبر است'),
  
  query('status')
    .optional()
    .isIn(['scheduled', 'cancelled', 'completed', 'draft', 'all'])
    .withMessage('Invalid status | وضعیت نامعتبر است'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer | صفحه باید یک عدد صحیح مثبت باشد'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100 | محدود باید بین 1 و 100 باشد'),
  
  query('sortBy')
    .optional()
    .isIn(['startTime', 'endTime', 'createdAt', 'updatedAt', 'title'])
    .withMessage('Invalid sort field | فیلد مرتب‌سازی نامعتبر است'),
  
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid sort order | ترتیب مرتب‌سازی نامعتبر است')
];

// Pagination validation rules
const paginationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer | صفحه باید یک عدد صحیح مثبت باشد')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100 | محدود باید بین 1 و 100 باشد')
    .toInt()
];

module.exports = {
  validate,
  userValidationRules,
  eventValidationRules,
  searchValidationRules,
  paginationRules
}; 