/**
 * Cases Routes
 */

const express = require('express');
const router = express.Router();
const casesController = require('./cases.controller');
const { protect } = require('../../middlewares/auth.middleware');
const validateRequest = require('../../middlewares/validateRequest'); // Import validateRequest
const { createCaseSchema, updateCaseSchema } = require('./cases.validators'); // Import schemas
const {
  canViewCase,
  canEditCase,
  canAssignCase,
  canCloseCase,
  requireRole,
} = require('../../middlewares/permission.middleware');
const { multiTenantMiddleware } = require('../../middlewares/multi-tenant.middleware');
const { emergencyLimiter } = require('../../middlewares/rate-limit.middleware');

// All routes require authentication
router.use(protect);
router.use(multiTenantMiddleware);

const upload = require('../../middlewares/upload.middleware');

// CRUD operations
router.post('/', upload.single('photo'), validateRequest(createCaseSchema), casesController.createCase);
router.get('/', casesController.getAllCases);
router.get('/:id', canViewCase, casesController.getCase);
router.patch('/:id', canEditCase, upload.single('photo'), validateRequest(updateCaseSchema), casesController.updateCase);
router.delete('/:id', requireRole('ADMIN', 'ORGANIZATION_ADMIN'), casesController.deleteCase);

// Comments routes
router.use('/:id/comments', require('../comments/comments.routes'));

// Assignment
router.post('/:id/assign', canAssignCase, casesController.assignCase);

// History & Timeline
router.get('/:id/history', canViewCase, casesController.getCaseHistory);
router.get('/:id/timeline', canViewCase, casesController.getCaseTimeline);

// Emergency management
router.post(
  '/:id/emergency',
  emergencyLimiter,
  requireRole('ADMIN', 'ORGANIZATION_ADMIN', 'COORDINATOR', 'SOCIAL_WORKER'),
  casesController.markEmergency
);
router.patch(
  '/:id/emergency/escalate',
  emergencyLimiter,
  requireRole('ADMIN', 'ORGANIZATION_ADMIN', 'COORDINATOR'),
  casesController.escalateEmergency
);
router.patch(
  '/:id/emergency/resolve',
  emergencyLimiter,
  requireRole('ADMIN', 'ORGANIZATION_ADMIN', 'COORDINATOR', 'SOCIAL_WORKER'),
  casesController.resolveEmergency
);

module.exports = router;
