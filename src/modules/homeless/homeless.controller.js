/**
 * Homeless Controller
 * Handles HTTP requests for homeless management
 */

const homelessService = require('./homeless.service');

const { uploadImage, deleteImage, getThumbnailUrl } = require('../../config/cloudinary');

/**
 * Helper to convert buffer to base64
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File mimetype
 * @returns {string} Base64 string
 */
const bufferToBase64 = (buffer, mimetype) => {
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
};

class HomelessController {
  /**
   * Create a new homeless record.
   * Handles image upload if present.
   * 
   * @param {Object} req - Express request object
   * @param {Object} req.body - Homeless data
   * @param {Object} [req.file] - Uploaded photo
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   */
  async createHomeless(req, res) {
    try {
      const { organizationId, id: userId, role } = req.user;
      
      let fotoUrl = null;
      let fotoThumbnail = null;

      // Handle image upload
      if (req.file) {
        const base64Image = bufferToBase64(req.file.buffer, req.file.mimetype);
        const uploadResult = await uploadImage(base64Image, {
          folder: 'abrazar/homeless',
          transformation: [
            { width: 800, height: 800, crop: 'fill', gravity: 'face' }
          ]
        });
        
        fotoUrl = uploadResult.url;
        fotoThumbnail = getThumbnailUrl(uploadResult.publicId, 150);
      }

      const homelessData = {
        ...req.body,
        fotoUrl: fotoUrl, // Map to schema field 'fotoUrl'
      };
      
      const homeless = await homelessService.createHomeless(
        homelessData,
        userId,
        organizationId,
        role
      );

      res.status(201).json({
        status: 'success',
        data: { homeless },
      });
    } catch (error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Get all homeless records.
   * Supports filtering via query parameters.
   * 
   * @param {Object} req - Express request object
   * @param {Object} req.query - Filter parameters
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   */
  async getAllHomeless(req, res) {
    try {
      const { organizationId, role } = req.user;
      
      const homeless = await homelessService.getAllHomeless(
        req.query,
        organizationId,
        role
      );

      res.status(200).json({
        status: 'success',
        data: { homeless, count: homeless.length },
      });
    } catch (error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Get a specific homeless record by ID.
   * 
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Homeless ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   */
  async getHomelessById(req, res) {
    try {
      const { organizationId } = req.user;
      const { id } = req.params;
      
      const homeless = await homelessService.getHomelessById(id, organizationId);

      res.status(200).json({
        status: 'success',
        data: { homeless },
      });
    } catch (error) {
      res.status(404).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Update a homeless record.
   * Handles image replacement and deletion of old image.
   * 
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Homeless ID
   * @param {Object} req.body - Update data
   * @param {Object} [req.file] - New photo
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   */
  async updateHomeless(req, res) {
    try {
      const { organizationId, id: userId, role } = req.user;
      const { id } = req.params;
      
      let updateData = { ...req.body };

      // Handle image upload
      if (req.file) {
        // Get existing record to delete old image
        const existingHomeless = await homelessService.getHomelessById(id, organizationId);
        
        if (existingHomeless.fotoUrl) {
          try {
            // Extract publicId from URL (simple extraction)
            const parts = existingHomeless.fotoUrl.split('/');
            const filename = parts[parts.length - 1].split('.')[0];
            const folder = parts.slice(parts.indexOf('upload') + 2, -1).join('/');
            const publicId = `${folder}/${filename}`;
            
            await deleteImage(publicId);
          } catch (err) {
            console.error('Error deleting old image:', err);
            // Continue even if delete fails
          }
        }

        const base64Image = bufferToBase64(req.file.buffer, req.file.mimetype);
        const uploadResult = await uploadImage(base64Image, {
          folder: 'abrazar/homeless',
          transformation: [
            { width: 800, height: 800, crop: 'fill', gravity: 'face' }
          ]
        });
        
        updateData.fotoUrl = uploadResult.url;
      }
      
      const homeless = await homelessService.updateHomeless(
        id,
        updateData,
        userId,
        organizationId,
        role
      );

      res.status(200).json({
        status: 'success',
        data: { homeless },
      });
    } catch (error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Delete a homeless record.
   * 
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Homeless ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   */
  async deleteHomeless(req, res) {
    try {
      const { organizationId } = req.user;
      const { id } = req.params;
      
      await homelessService.deleteHomeless(id, organizationId);

      res.status(200).json({
        status: 'success',
        message: 'Homeless record deleted successfully',
      });
    } catch (error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Get nearby service points for a homeless person.
   * 
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Homeless ID
   * @param {string} [req.query.radius] - Search radius in km
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   */
  async getNearbyServicePoints(req, res) {
    try {
      const { organizationId } = req.user;
      const { id } = req.params;
      const { radius } = req.query;
      
      const servicePoints = await homelessService.getNearbyServicePoints(
        id,
        organizationId,
        radius ? parseFloat(radius) : 5
      );

      res.status(200).json({
        status: 'success',
        data: { servicePoints, count: servicePoints.length },
      });
    } catch (error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  }
}

module.exports = new HomelessController();
