const express = require('express');
const router = express.Router();
const servicePointsController = require('./service-points.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { protect, optionalProtect } = require('../../middlewares/auth.middleware');
const { multiTenantMiddleware, requireOrganization } = require('../../middlewares/multi-tenant.middleware');
const { requireRole } = require('../../middlewares/permission.middleware');
const {
  createServicePointSchema,
  updateServicePointSchema,
  getServicePointsSchema,
  getNearbyServicePointsSchema,
  syncWithGoogleSchema
} = require('./service-points.validators');

// Public routes (no authentication required)
router.get(
  '/public',
  validateRequest(getServicePointsSchema),
  servicePointsController.getPublic
);

router.get(
  '/nearby',
  validateRequest(getNearbyServicePointsSchema),
  servicePointsController.getNearby
);

router.get(
  '/:id',
  optionalProtect,
  multiTenantMiddleware,
  servicePointsController.getOne
);

// All other routes require authentication and multi-tenancy context
router.use(protect);
router.use(multiTenantMiddleware);

// Get all service points
router.get(
  '/',
  validateRequest(getServicePointsSchema),
  servicePointsController.getAll
);

// Create service point
router.post(
  '/',
  requireOrganization,
  requireRole('ORGANIZATION_ADMIN', 'COORDINATOR'),
  validateRequest(createServicePointSchema),
  servicePointsController.create
);

// Sync with Google Places
router.post(
  '/sync-google',
  requireOrganization,
  requireRole('ORGANIZATION_ADMIN', 'COORDINATOR'),
  validateRequest(syncWithGoogleSchema),
  servicePointsController.syncWithGoogle
);

// Update service point
router.patch(
  '/:id',
  requireOrganization,
  requireRole('ORGANIZATION_ADMIN', 'COORDINATOR'),
  validateRequest(updateServicePointSchema),
  servicePointsController.update
);

// Delete service point
router.delete(
  '/:id',
  requireOrganization,
  requireRole('ORGANIZATION_ADMIN'),
  servicePointsController.delete
);

module.exports = router;