const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');
const { validate, userValidationRules } = require('../middleware/validation');
const { 
  authLimiter, 
  registrationLimiter, 
  passwordResetLimiter 
} = require('../middleware/rateLimit');
const passport = require('../config/passport');
const { profilePicture } = require('../middleware/upload');
const { cacheMiddleware } = require('../config/redis');

const router = express.Router();

// Log all requests to this router
router.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} | ${req.method} ${req.originalUrl}`);
  next();
});

// Authentication routes
router.post('/register', 
  registrationLimiter, 
  userValidationRules.register, 
  validate, 
  userController.register
);

router.post('/login', 
  authLimiter, 
  userValidationRules.login, 
  validate, 
  userController.login
);

router.post('/refresh-token', 
  userController.refreshToken
);

router.post('/verify-email/:token', 
  userController.verifyEmail
);

router.post('/resend-verification', 
  authMiddleware, 
  userController.resendVerificationEmail
);

router.post('/reset-password-request', 
  passwordResetLimiter, 
  userValidationRules.resetPasswordRequest, 
  validate, 
  userController.resetPasswordRequest
);

router.post('/reset-password', 
  userValidationRules.resetPassword, 
  validate, 
  userController.resetPassword
);

router.post('/logout', 
  authMiddleware, 
  userController.logout
);

// OAuth routes
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  userController.oauthCallback
);

router.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

router.get('/auth/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login' }),
  userController.oauthCallback
);

// Protected user routes
router.get('/me', 
  authMiddleware, 
  userController.getCurrentUser
);

router.put('/me', 
  authMiddleware, 
  userValidationRules.update, 
  validate, 
  userController.updateUser
);

router.post('/change-password', 
  authMiddleware, 
  userValidationRules.changePassword, 
  validate, 
  userController.changePassword
);

router.post('/profile-picture', 
  authMiddleware, 
  profilePicture, 
  userController.uploadProfilePicture
);

router.delete('/profile-picture', 
  authMiddleware, 
  userController.deleteProfilePicture
);

// Notification preferences
router.put('/notification-preferences', 
  authMiddleware, 
  userController.updateNotificationPreferences
);

// Admin only routes
router.get('/',
  authMiddleware,
  authMiddleware.restrictTo('admin'),
  cacheMiddleware(300), // Cache for 5 minutes
  userController.getAllUsers
);

router.get('/:id',
  authMiddleware,
  authMiddleware.restrictTo('admin'),
  userController.getUserById
);

router.delete('/:id',
  authMiddleware,
  authMiddleware.restrictTo('admin'),
  userController.deleteUser
);

module.exports = router; 