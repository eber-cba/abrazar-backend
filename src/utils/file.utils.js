/**
 * File Utilities
 */

/**
 * Convert buffer to base64 string with mimetype
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File mimetype (e.g., 'image/jpeg')
 * @returns {string} Base64 string ready for Cloudinary
 */
const bufferToBase64 = (buffer, mimetype) => {
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
};

module.exports = {
  bufferToBase64,
};
