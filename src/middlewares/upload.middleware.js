/**
 * Upload Middleware
 * Handles file uploads using Multer
 */

const multer = require('multer');
const AppError = require('../utils/errors');

// Configure storage (memory storage to handle file as buffer)
const storage = multer.memoryStorage();

// File filter (allow only images)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

// Configure upload limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

module.exports = upload;
