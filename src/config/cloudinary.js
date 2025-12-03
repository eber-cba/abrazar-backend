/**
 * Cloudinary Configuration
 * Configures Cloudinary SDK for image uploads and transformations
 */

const { v2: cloudinary } = require('cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dexw5ma75',
  api_key: process.env.CLOUDINARY_API_KEY || '195138184562164',
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS
});

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Path to file or base64 string
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadImage = async (filePath, options = {}) => {
  try {
    const defaultOptions = {
      folder: 'abrazar', // Organize uploads in folder
      resource_type: 'auto',
      ...options,
    };

    const result = await cloudinary.uploader.upload(filePath, defaultOptions);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image
 * @returns {Promise<Object>} Deletion result
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Generate optimized image URL
 * @param {string} publicId - Public ID of the image
 * @param {Object} transformations - Transformation options
 * @returns {string} Optimized URL
 */
const getOptimizedUrl = (publicId, transformations = {}) => {
  const defaultTransformations = {
    fetch_format: 'auto',
    quality: 'auto',
    ...transformations,
  };

  return cloudinary.url(publicId, defaultTransformations);
};

/**
 * Generate thumbnail URL
 * @param {string} publicId - Public ID of the image
 * @param {number} size - Thumbnail size (default: 200)
 * @returns {string} Thumbnail URL
 */
const getThumbnailUrl = (publicId, size = 200) => {
  return cloudinary.url(publicId, {
    crop: 'fill',
    gravity: 'auto',
    width: size,
    height: size,
    fetch_format: 'auto',
    quality: 'auto',
  });
};

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  getOptimizedUrl,
  getThumbnailUrl,
};
