const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your_jwt_secret', {
    expiresIn: '30d'
  });
};

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user | ثبت‌نام کاربر جدید
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name | نام کامل کاربر
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address | آدرس ایمیل کاربر
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password | رمز عبور کاربر
 *               timezone:
 *                 type: string
 *                 description: User's preferred timezone | منطقه زمانی ترجیحی کاربر
 *               language:
 *                 type: string
 *                 enum: [en, fa]
 *                 description: User's preferred language | زبان ترجیحی کاربر
 *     responses:
 *       201:
 *         description: User registered successfully | کاربر با موفقیت ثبت‌نام شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 timezone:
 *                   type: string
 *                 language:
 *                   type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: Invalid user data | اطلاعات کاربر نامعتبر است
 *       409:
 *         description: User already exists | کاربر قبلاً وجود دارد
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password, timezone, language } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn(`Registration failed: Email already in use: ${email}`);
      console.warn(`Registration failed: Email already in use: ${email} | ثبت‌نام ناموفق: ایمیل قبلاً استفاده شده است: ${email}`);
      return res.status(409).json({
        error: {
          en: 'User with this email already exists',
          fa: 'کاربر با این ایمیل قبلاً وجود دارد'
        }
      });
    }
    
    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      timezone: timezone || 'UTC',
      language: language || 'en'
    });
    
    // Generate token
    const token = generateToken(user._id);
    
    logger.info(`New user registered: ${user.email}`);
    console.log(`New user registered: ${user.email} | کاربر جدید ثبت‌نام شد: ${user.email}`);
    
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      timezone: user.timezone,
      language: user.language,
      token
    });
  } catch (error) {
    logger.error('Error in user registration', error);
    console.error(`Error in user registration | خطا در ثبت‌نام کاربر: ${error.message}`);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          en: 'Invalid user data',
          fa: 'اطلاعات کاربر نامعتبر است',
          details: error.message
        }
      });
    }
    
    res.status(500).json({
      error: {
        en: 'Server error during registration',
        fa: 'خطای سرور در طول ثبت‌نام'
      }
    });
  }
};

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Authenticate user & get token | احراز هویت کاربر و دریافت توکن
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address | آدرس ایمیل کاربر
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password | رمز عبور کاربر
 *     responses:
 *       200:
 *         description: User authenticated successfully | احراز هویت کاربر با موفقیت انجام شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 timezone:
 *                   type: string
 *                 language:
 *                   type: string
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials | اطلاعات ورود نامعتبر
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Login failed: User not found: ${email}`);
      console.warn(`Login failed: User not found: ${email} | ورود ناموفق: کاربر یافت نشد: ${email}`);
      return res.status(401).json({
        error: {
          en: 'Invalid email or password',
          fa: 'ایمیل یا رمز عبور نامعتبر است'
        }
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(`Login failed: Incorrect password for user: ${email}`);
      console.warn(`Login failed: Incorrect password for user: ${email} | ورود ناموفق: رمز عبور نادرست برای کاربر: ${email}`);
      return res.status(401).json({
        error: {
          en: 'Invalid email or password',
          fa: 'ایمیل یا رمز عبور نامعتبر است'
        }
      });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    logger.info(`User logged in: ${user.email}`);
    console.log(`User logged in: ${user.email} | کاربر وارد شد: ${user.email}`);
    
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      timezone: user.timezone,
      language: user.language,
      token
    });
  } catch (error) {
    logger.error('Error in user login', error);
    console.error(`Error in user login | خطا در ورود کاربر: ${error.message}`);
    res.status(500).json({
      error: {
        en: 'Server error during login',
        fa: 'خطای سرور در طول ورود'
      }
    });
  }
};

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile | دریافت پروفایل کاربر
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully | پروفایل کاربر با موفقیت دریافت شد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authorized | عدم دسترسی
 */
const getUserProfile = async (req, res) => {
  try {
    // User is already in req from auth middleware
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      logger.warn(`Get profile failed: User not found: ${req.user._id}`);
      console.warn(`Get profile failed: User not found: ${req.user._id} | دریافت پروفایل ناموفق: کاربر یافت نشد: ${req.user._id}`);
      return res.status(404).json({
        error: {
          en: 'User not found',
          fa: 'کاربر یافت نشد'
        }
      });
    }
    
    logger.debug(`User profile retrieved: ${user.email}`);
    console.log(`User profile retrieved: ${user.email} | پروفایل کاربر دریافت شد: ${user.email}`);
    
    res.status(200).json(user);
  } catch (error) {
    logger.error('Error getting user profile', error);
    console.error(`Error getting user profile | خطا در دریافت پروفایل کاربر: ${error.message}`);
    res.status(500).json({
      error: {
        en: 'Server error while retrieving profile',
        fa: 'خطای سرور هنگام دریافت پروفایل'
      }
    });
  }
};

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile | بروزرسانی پروفایل کاربر
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name | نام کامل کاربر
 *               timezone:
 *                 type: string
 *                 description: User's preferred timezone | منطقه زمانی ترجیحی کاربر
 *               language:
 *                 type: string
 *                 enum: [en, fa]
 *                 description: User's preferred language | زبان ترجیحی کاربر
 *     responses:
 *       200:
 *         description: User profile updated successfully | پروفایل کاربر با موفقیت بروزرسانی شد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authorized | عدم دسترسی
 *       400:
 *         description: Invalid user data | اطلاعات کاربر نامعتبر است
 */
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      logger.warn(`Update profile failed: User not found: ${req.user._id}`);
      console.warn(`Update profile failed: User not found: ${req.user._id} | بروزرسانی پروفایل ناموفق: کاربر یافت نشد: ${req.user._id}`);
      return res.status(404).json({
        error: {
          en: 'User not found',
          fa: 'کاربر یافت نشد'
        }
      });
    }
    
    // Update fields if provided
    user.name = req.body.name || user.name;
    user.timezone = req.body.timezone || user.timezone;
    user.language = req.body.language || user.language;
    
    // Update password if provided
    if (req.body.password) {
      user.password = req.body.password;
      logger.info(`Password updated for user: ${user.email}`);
      console.log(`Password updated for user: ${user.email} | رمز عبور برای کاربر بروز شد: ${user.email}`);
    }
    
    const updatedUser = await user.save();
    
    logger.info(`User profile updated: ${user.email}`);
    console.log(`User profile updated: ${user.email} | پروفایل کاربر بروزرسانی شد: ${user.email}`);
    
    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      timezone: updatedUser.timezone,
      language: updatedUser.language
    });
  } catch (error) {
    logger.error('Error updating user profile', error);
    console.error(`Error updating user profile | خطا در بروزرسانی پروفایل کاربر: ${error.message}`);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          en: 'Invalid user data',
          fa: 'اطلاعات کاربر نامعتبر است',
          details: error.message
        }
      });
    }
    
    res.status(500).json({
      error: {
        en: 'Server error while updating profile',
        fa: 'خطای سرور هنگام بروزرسانی پروفایل'
      }
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile
}; 