const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info(`Created uploads directory at ${uploadDir} | دایرکتوری آپلود در ${uploadDir} ایجاد شد`);
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create event-specific folder if needed
    let destPath = uploadDir;
    
    if (req.params.id) {
      destPath = path.join(uploadDir, `event_${req.params.id}`);
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
    }
    
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = {
    'image': ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'],
    'document': ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'],
    'calendar': ['.ics', '.ical'],
    'other': ['.zip', '.rar', '.7z']
  };
  
  // Get the file extension
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Check if extension is in the allowed list
  const allAllowedExtensions = Object.values(allowedTypes).flat();
  
  if (allAllowedExtensions.includes(ext)) {
    // Set file type based on extension
    for (const [type, extensions] of Object.entries(allowedTypes)) {
      if (extensions.includes(ext)) {
        file.fileType = type;
        break;
      }
    }
    
    logger.debug(`Accepting file upload: ${file.originalname} (${file.fileType}) | پذیرش آپلود فایل: ${file.originalname} (${file.fileType})`);
    cb(null, true);
  } else {
    logger.warn(`Rejected file upload: ${file.originalname} - invalid type | فایل رد شد: ${file.originalname} - نوع نامعتبر`);
    cb(new Error(`File type not allowed. Allowed types: ${allAllowedExtensions.join(', ')} | نوع فایل مجاز نیست. انواع مجاز: ${allAllowedExtensions.join(', ')}`), false);
  }
};

// Size limits for different file types in bytes
const sizeLimits = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  calendar: 1 * 1024 * 1024, // 1MB
  other: 50 * 1024 * 1024, // 50MB
  default: 5 * 1024 * 1024 // 5MB default
};

// Create the multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // Max file size (50MB) - will be further restricted by file type
  }
});

// Middleware to handle event attachments (multiple files)
const eventAttachments = (req, res, next) => {
  // Use multer's .array() for multiple file uploads
  upload.array('attachments', 5)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // Multer error handling
        if (err.code === 'LIMIT_FILE_SIZE') {
          logger.warn(`File upload too large: ${err.message} | آپلود فایل بسیار بزرگ است: ${err.message}`);
          return res.status(400).json({
            success: false,
            message: {
              en: 'File too large, maximum size is 50MB',
              fa: 'حجم فایل بسیار زیاد است، حداکثر حجم مجاز 50 مگابایت است'
            }
          });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          logger.warn(`Too many files uploaded: ${err.message} | تعداد فایل‌های آپلود شده بیش از حد مجاز: ${err.message}`);
          return res.status(400).json({
            success: false,
            message: {
              en: 'Too many files, maximum is 5 files per upload',
              fa: 'تعداد فایل‌ها بیش از حد مجاز است، حداکثر 5 فایل برای هر آپلود'
            }
          });
        }
        
        logger.error(`Multer error: ${err.message} | خطای Multer: ${err.message}`);
        return res.status(400).json({
          success: false,
          message: {
            en: 'File upload error',
            fa: 'خطا در آپلود فایل'
          }
        });
      }
      
      // Custom error from fileFilter
      logger.error(`File upload error: ${err.message} | خطای آپلود فایل: ${err.message}`);
      return res.status(400).json({
        success: false,
        message: {
          en: err.message.includes('|') ? err.message.split('|')[0].trim() : err.message,
          fa: err.message.includes('|') ? err.message.split('|')[1].trim() : err.message
        }
      });
    }
    
    // Add user ID to each file
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        file.uploadedBy = req.user.id;
        file.uploadedAt = new Date();
        logger.debug(`File uploaded: ${file.originalname} (${file.size} bytes) | فایل آپلود شد: ${file.originalname} (${file.size} بایت)`);
      });
    }
    
    next();
  });
};

// Middleware to handle profile picture upload (single file)
const profilePicture = (req, res, next) => {
  // Use multer's .single() for single file upload
  upload.single('profilePicture')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: {
              en: 'Image too large, maximum size is 5MB',
              fa: 'تصویر بسیار بزرگ است، حداکثر حجم مجاز 5 مگابایت است'
            }
          });
        }
        
        return res.status(400).json({
          success: false,
          message: {
            en: 'File upload error',
            fa: 'خطا در آپلود فایل'
          }
        });
      }
      
      return res.status(400).json({
        success: false,
        message: {
          en: err.message.includes('|') ? err.message.split('|')[0].trim() : err.message,
          fa: err.message.includes('|') ? err.message.split('|')[1].trim() : err.message
        }
      });
    }
    
    if (req.file) {
      logger.debug(`Profile picture uploaded: ${req.file.originalname} | تصویر پروفایل آپلود شد: ${req.file.originalname}`);
      
      // Check if file is an image
      if (!req.file.fileType || req.file.fileType !== 'image') {
        fs.unlinkSync(req.file.path); // Remove the file
        return res.status(400).json({
          success: false,
          message: {
            en: 'Only image files are allowed for profile pictures',
            fa: 'فقط فایل‌های تصویر برای عکس پروفایل مجاز هستند'
          }
        });
      }
    }
    
    next();
  });
};

// Function to delete files
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.debug(`File deleted: ${filePath} | فایل حذف شد: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error deleting file ${filePath} | خطا در حذف فایل ${filePath}:`, error);
    return false;
  }
};

module.exports = {
  eventAttachments,
  profilePicture,
  deleteFile,
  uploadDir
}; 