const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated user ID | شناسه کاربر (اتوماتیک ایجاد می‌شود)
 *         name:
 *           type: string
 *           description: User's full name | نام کامل کاربر
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address (unique) | آدرس ایمیل کاربر (منحصر به فرد)
 *         password:
 *           type: string
 *           format: password
 *           description: User's password (hashed) | رمز عبور کاربر (هش شده)
 *         timezone:
 *           type: string
 *           description: User's preferred timezone | منطقه زمانی ترجیحی کاربر
 *           example: Asia/Tehran, Europe/London, America/New_York
 *         language:
 *           type: string
 *           enum: [en, fa]
 *           description: User's preferred language | زبان ترجیحی کاربر
 *           default: en
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation date | تاریخ ایجاد حساب کاربری
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last account update | آخرین بروزرسانی حساب کاربری
 *       example:
 *         name: John Doe
 *         email: john@example.com
 *         password: securePassword123
 *         timezone: Europe/London
 *         language: en
 */

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required | نام الزامی است'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required | ایمیل الزامی است'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email | لطفا یک ایمیل معتبر وارد کنید']
  },
  password: {
    type: String,
    required: [true, 'Password is required | رمز عبور الزامی است'],
    minlength: [6, 'Password must be at least 6 characters | رمز عبور باید حداقل 6 کاراکتر باشد']
  },
  timezone: {
    type: String,
    default: 'UTC',
    trim: true
  },
  language: {
    type: String,
    enum: ['en', 'fa'],
    default: 'en'
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    logger.debug(`Password hashed for user: ${this.email}`);
    console.log(`Password hashed for user: ${this.email} | رمز عبور برای کاربر هش شد: ${this.email}`);
    next();
  } catch (error) {
    logger.error('Error hashing password', error);
    console.error(`Error hashing password | خطا در هش کردن رمز عبور: ${error.message}`);
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    logger.debug(`Password comparison for ${this.email}: ${isMatch ? 'Success' : 'Failed'}`);
    return isMatch;
  } catch (error) {
    logger.error('Error comparing password', error);
    console.error(`Error comparing password | خطا در مقایسه رمز عبور: ${error.message}`);
    throw error;
  }
};

// Log when a new user is created
userSchema.post('save', function(doc) {
  if (this.isNew) {
    logger.info(`New user created: ${doc.email}`);
    console.log(`New user created: ${doc.email} | کاربر جدید ایجاد شد: ${doc.email}`);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User; 