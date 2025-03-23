const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate and authorize users
 */
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: No token provided');
      console.warn('Authentication failed: No token provided | احراز هویت ناموفق: توکن ارائه نشده است');
      return res.status(401).json({
        error: {
          en: 'Authentication failed. Please provide a valid token.',
          fa: 'احراز هویت ناموفق. لطفا یک توکن معتبر ارائه دهید.'
        }
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      logger.warn(`Authentication failed: User not found for token ID ${decoded.id}`);
      console.warn(`Authentication failed: User not found for token ID ${decoded.id} | احراز هویت ناموفق: کاربر با شناسه ${decoded.id} یافت نشد`);
      return res.status(401).json({
        error: {
          en: 'Authentication failed. User not found.',
          fa: 'احراز هویت ناموفق. کاربر یافت نشد.'
        }
      });
    }
    
    // Set user in request
    req.user = user;
    
    logger.debug(`User authenticated: ${user.email}`);
    next();
  } catch (error) {
    logger.error('Authentication error', error);
    console.error(`Authentication error | خطای احراز هویت: ${error.message}`);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          en: 'Authentication token has expired. Please login again.',
          fa: 'توکن احراز هویت منقضی شده است. لطفا دوباره وارد شوید.'
        }
      });
    }
    
    return res.status(401).json({
      error: {
        en: 'Authentication failed. Invalid token.',
        fa: 'احراز هویت ناموفق. توکن نامعتبر است.'
      }
    });
  }
};

module.exports = auth; 