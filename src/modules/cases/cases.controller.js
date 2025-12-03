/**
 * Cases Controller
 * Handles HTTP requests for case management
 */

const casesService = require('./cases.service');
const emergencyService = require('../emergencies/emergency.service');
const caseHistoryService = require('./case-history.service');

const { uploadImage, deleteImage } = require('../../config/cloudinary');
const { bufferToBase64 } = require('../../utils/file.utils');

class CasesController {
  /**
   * Create a new case.
   * Handles image upload if present.
   * 
   * @param {Object} req - Express request object
   * @param {Object} req.body - Case data
   * @param {Object} [req.file] - Uploaded photo
   * @param {Object} req.user - Authenticated user
   * @param {string} req.organizationId - Organization ID from middleware
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async createCase(req, res, next) {
    try {
      let caseDataPayload = { ...req.body };

      // Handle image upload
      if (req.file) {
        const base64Image = bufferToBase64(req.file.buffer, req.file.mimetype);
        const uploadResult = await uploadImage(base64Image, {
          folder: 'abrazar/cases',
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' }
          ]
        });
        
        caseDataPayload.photoUrl = uploadResult.url;
      }

      const caseData = await casesService.createCase(
        caseDataPayload,
        req.user.id,
        req.organizationId
      );

      res.status(201).json({
        status: 'success',
        data: { case: caseData },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all cases.
   * Supports filtering via query parameters and multi-tenant access.
   * 
   * @param {Object} req - Express request object
   * @param {Object} req.query - Filter parameters
   * @param {string} req.organizationId - Organization ID
   * @param {boolean} req.isGlobalAdmin - Whether user is global admin
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAllCases(req, res, next) {
    try {
      const cases = await casesService.getAllCases(
        req.query,
        req.organizationId,
        req.isGlobalAdmin
      );

      res.status(200).json({
        status: 'success',
        results: cases.length,
        data: { cases },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific case by ID.
   * 
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Case ID
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getCase(req, res, next) {
    try {
      const { id } = req.params;
      const caseData = await casesService.getCaseById(id);

      if (!caseData) {
        return res.status(404).json({
          status: 'fail',
          message: 'Case not found',
        });
      }

      res.status(200).json({
        status: 'success',
        data: { case: caseData },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a case.
   * Handles image replacement and deletion of old image.
   * 
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Case ID
   * @param {Object} req.body - Update data
   * @param {Object} [req.file] - New photo
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async updateCase(req, res, next) {
    try {
      const { id } = req.params;
      let updateData = { ...req.body };

      // Handle image upload
      if (req.file) {
        // Get existing case to delete old image
        const existingCase = await casesService.getCaseById(id);
        
        if (existingCase && existingCase.photoUrl) {
          try {
            const parts = existingCase.photoUrl.split('/');
            const filename = parts[parts.length - 1].split('.')[0];
            const folder = parts.slice(parts.indexOf('upload') + 2, -1).join('/');
            const publicId = `${folder}/${filename}`;
            await deleteImage(publicId);
          } catch (err) {
            console.error('Error deleting old case image:', err);
          }
        }

        const base64Image = bufferToBase64(req.file.buffer, req.file.mimetype);
        const uploadResult = await uploadImage(base64Image, {
          folder: 'abrazar/cases',
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' }
          ]
        });
        
        updateData.photoUrl = uploadResult.url;
      }

      const caseData = await casesService.updateCase(id, updateData, req.user.id);

      res.status(200).json({
        status: 'success',
        data: { case: caseData },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a case.
   * 
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Case ID
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async deleteCase(req, res, next) {
    try {
      const { id } = req.params;
      await casesService.deleteCase(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign a case to a user or team.
   * 
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Case ID
   * @param {Object} req.body - Assignment data
   * @param {string} [req.body.userId] - User ID to assign to
   * @param {string} [req.body.teamId] - Team ID to assign to
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async assignCase(req, res, next) {
    try {
      const { id } = req.params;
      const { userId, teamId } = req.body;

      const caseData = await casesService.assignCase(id, req.user.id, {
        userId,
        teamId,
      });

      res.status(200).json({
        status: 'success',
        data: { case: caseData },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get history of changes for a case.
   * 
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Case ID
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getCaseHistory(req, res, next) {
    try {
      const { id } = req.params;
      const history = await caseHistoryService.getCaseHistory(id);

      res.status(200).json({
        status: 'success',
        results: history.length,
        data: { history },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get timeline of events for a case.
   * 
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Case ID
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getCaseTimeline(req, res, next) {
    try {
      const { id } = req.params;
      const timeline = await caseHistoryService.getCaseTimeline(id);

      res.status(200).json({
        status: 'success',
        results: timeline.length,
        data: { timeline },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark a case as an emergency.
   * 
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Case ID
   * @param {Object} req.body - Emergency data
   * @param {string} req.body.level - Emergency level
   * @param {string} req.body.reason - Reason for emergency
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async markEmergency(req, res, next) {
    try {
      const { id } = req.params;
      const { level, reason } = req.body;

      const result = await emergencyService.markAsEmergency(
        id,
        req.user.id,
        level,
        reason
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Escalate an existing emergency.
   * 
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Case ID
   * @param {Object} req.body - Escalation data
   * @param {string} req.body.level - New emergency level
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async escalateEmergency(req, res, next) {
    try {
      const { id } = req.params;
      const { level } = req.body;

      const result = await emergencyService.escalateEmergency(
        id,
        req.user.id,
        level
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resolve an emergency.
   * 
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Case ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async resolveEmergency(req, res, next) {
    try {
      const { id } = req.params;

      const result = await emergencyService.resolveEmergency(id, req.user.id);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CasesController();
