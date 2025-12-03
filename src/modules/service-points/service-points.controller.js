/**
 * Service Points Controller
 * Handles HTTP requests for service points
 */

const servicePointService = require('./service-point.service');
const AppError = require('../../utils/errors');

class ServicePointsController {
  /**
   * Create a new service point
   */
  async create(req, res, next) {
    try {
      const { organizationId } = req; // Injected by multi-tenant middleware
      const userId = req.user.id;
      
      const servicePoint = await servicePointService.createServicePoint(
        req.body,
        userId,
        organizationId
      );

      res.status(201).json({
        status: 'success',
        data: { servicePoint },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all service points (filtered)
   */
  async getAll(req, res, next) {
    try {
      const { organizationId, isGlobalAdmin } = req;
      const filters = {
        ...req.query,
        isPublic: false, // Internal view by default
      };

      const servicePoints = await servicePointService.getServicePoints(
        filters,
        organizationId,
        isGlobalAdmin
      );

      res.status(200).json({
        status: 'success',
        results: servicePoints.length,
        data: { servicePoints },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get public service points (no auth required)
   */
  async getPublic(req, res, next) {
    try {
      const filters = {
        ...req.query,
        isPublic: true, // Force public only
      };

      const servicePoints = await servicePointService.getServicePoints(
        filters,
        null, // No user organization for public view
        false // Not global admin
      );

      res.status(200).json({
        status: 'success',
        results: servicePoints.length,
        data: { servicePoints },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get service point by ID
   */
  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const servicePoint = await servicePointService.getServicePointById(id);

      if (!servicePoint) {
        throw new AppError('Service point not found', 404);
      }

      // Check access if not public (internal access control)
      if (!servicePoint.isPublic) {
        // If not public, require authentication
        if (!req.user) { // If no authenticated user, it's a public request trying to view private SP
            throw new AppError('Authentication required to view private service points', 401);
        }
        // If authenticated, check if global admin or member of the service point's organization
        // req.isGlobalAdmin comes from multiTenantMiddleware, req.organizationId is also from it.
        if (!req.isGlobalAdmin && req.organizationId !== servicePoint.organizationId) {
            throw new AppError('You do not have permission to view this service point', 403);
        }
      }

      res.status(200).json({
        status: 'success',
        data: { servicePoint },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update service point
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Ensure the service point belongs to the user's organization or user is global admin
      const existing = await servicePointService.getServicePointById(id);
      if (!existing) {
        throw new AppError('Service point not found', 404);
      }
      
      if (existing.organizationId !== req.organizationId && !req.isGlobalAdmin) {
        throw new AppError('You do not have permission to edit this service point', 403);
      }

      const servicePoint = await servicePointService.updateServicePoint(
        id,
        req.body,
        userId
      );

      res.status(200).json({
        status: 'success',
        data: { servicePoint },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete service point
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Ensure the service point belongs to the user's organization or user is global admin
      const existing = await servicePointService.getServicePointById(id);
      if (!existing) {
        throw new AppError('Service point not found', 404);
      }
      
      if (existing.organizationId !== req.organizationId && !req.isGlobalAdmin) {
        throw new AppError('You do not have permission to delete this service point', 403);
      }

      await servicePointService.deleteServicePoint(id, userId);

      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get nearby service points
   */
  async getNearby(req, res, next) {
    try {
      const { latitude, longitude, radius, type, organizationId } = req.query;

      const nearbyServicePoints = await servicePointService.getNearbyServicePoints(
        parseFloat(latitude),
        parseFloat(longitude),
        parseInt(radius, 10),
        { type, organizationId }
      );

      res.status(200).json({
        status: 'success',
        results: nearbyServicePoints.length,
        data: { servicePoints: nearbyServicePoints },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync with Google Places
   */
  async syncWithGoogle(req, res, next) {
    try {
      const { latitude, longitude, radius, type } = req.body;
      const { organizationId } = req;
      const userId = req.user.id;

      const result = await servicePointService.syncWithGoogle(
        latitude,
        longitude,
        radius,
        type,
        userId,
        organizationId
      );

      res.status(200).json({
        status: 'success',
        data: {
          count: result.count,
          points: result.points,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ServicePointsController();