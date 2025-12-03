/**
 * Homeless Routes
 * Defines API endpoints for homeless management
 */

const express = require('express');
const router = express.Router();
const homelessController = require('./homeless.controller');
const { protect: authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/permission.middleware');
const {
  validate,
  createHomelessSchema,
  updateHomelessSchema,
  getHomelessByIdSchema,
  getNearbyServicesSchema,
  listHomelessSchema,
} = require('./homeless.validator');

const upload = require('../../middlewares/upload.middleware');

/**
 * @route   POST /api/homeless
 * @desc    Create a new homeless record
 * @access  COORDINATOR, VOLUNTEER
 */
router.post(
  '/',
  authenticate,
  requireRole('COORDINATOR', 'SOCIAL_WORKER', 'VOLUNTEER', 'ORGANIZATION_ADMIN'),
  upload.single('foto'),
  validate(createHomelessSchema),
  homelessController.createHomeless
);

/**
 * @route   GET /api/homeless
 * @desc    Get all homeless records (filtered by organization)
 * @access  COORDINATOR, VOLUNTEER
 */
router.get(
  '/',
  authenticate,
  requireRole('COORDINATOR', 'SOCIAL_WORKER', 'VOLUNTEER', 'ORGANIZATION_ADMIN', 'DATA_ANALYST'),
  validate(listHomelessSchema),
  homelessController.getAllHomeless
);

/**
 * @route   GET /api/homeless/:id
 * @desc    Get homeless by ID
 * @access  COORDINATOR, VOLUNTEER
 */
router.get(
  '/:id',
  authenticate,
  requireRole('COORDINATOR', 'SOCIAL_WORKER', 'VOLUNTEER', 'ORGANIZATION_ADMIN', 'DATA_ANALYST'),
  validate(getHomelessByIdSchema),
  homelessController.getHomelessById
);

/**
 * @route   PATCH /api/homeless/:id
 * @desc    Update homeless record
 * @access  COORDINATOR, SOCIAL_WORKER, ORGANIZATION_ADMIN
 */
router.patch(
  '/:id',
  authenticate,
  requireRole('COORDINATOR', 'SOCIAL_WORKER', 'ORGANIZATION_ADMIN'),
  upload.single('foto'),
  validate(updateHomelessSchema),
  homelessController.updateHomeless
);

/**
 * @route   DELETE /api/homeless/:id
 * @desc    Delete homeless record
 * @access  COORDINATOR, ORGANIZATION_ADMIN
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('COORDINATOR', 'ORGANIZATION_ADMIN'),
  validate(getHomelessByIdSchema),
  homelessController.deleteHomeless
);

/**
 * @route   GET /api/homeless/:id/nearby-services
 * @desc    Get nearby service points
 * @access  COORDINATOR, VOLUNTEER
 */
router.get(
  '/:id/nearby-services',
  authenticate,
  requireRole('COORDINATOR', 'SOCIAL_WORKER', 'VOLUNTEER', 'ORGANIZATION_ADMIN'),
  validate(getNearbyServicesSchema),
  homelessController.getNearbyServicePoints
);

module.exports = router;
