/**
 * Organizations Routes
 */

const express = require('express');
const router = express.Router();
const organizationsController = require('./organizations.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/permission.middleware');
const {
  verifyOrganizationAccess,
  requireOrganization,
} = require('../../middlewares/multi-tenant.middleware');
const { canCreateSubUsers, canViewStatistics } = require('../../middlewares/permission.middleware');

// All routes require authentication
router.use(protect);

// Create organization (admin only)
router.post('/', requireRole('ADMIN'), organizationsController.createOrganization);

// List organizations (admin only)
router.get('/', requireRole('ADMIN'), organizationsController.listOrganizations);

// Get organization by ID
router.get('/:id', verifyOrganizationAccess('id'), organizationsController.getOrganization);

// Update organization
router.patch(
  '/:id',
  verifyOrganizationAccess('id'),
  requireRole('ADMIN', 'ORGANIZATION_ADMIN'),
  organizationsController.updateOrganization
);

// Delete organization (admin only)
router.delete('/:id', requireRole('ADMIN'), organizationsController.deleteOrganization);

// Get organization members
router.get('/:id/members', verifyOrganizationAccess('id'), organizationsController.getMembers);

// Add member to organization (existing user)
router.post(
  '/:id/members',
  verifyOrganizationAccess('id'),
  canCreateSubUsers,
  organizationsController.addMember
);

// Create new user for organization
router.post(
  '/:id/users',
  verifyOrganizationAccess('id'),
  canCreateSubUsers,
  organizationsController.createUser
);

// Update organization member
router.patch(
  '/:id/users/:userId',
  verifyOrganizationAccess('id'),
  requireRole('ADMIN', 'ORGANIZATION_ADMIN'),
  organizationsController.updateMember
);

// Remove member from organization
router.delete(
  '/:id/members/:userId',
  verifyOrganizationAccess('id'),
  requireRole('ADMIN', 'ORGANIZATION_ADMIN'),
  organizationsController.removeMember
);

// Get organization statistics
router.get(
  '/:id/statistics',
  verifyOrganizationAccess('id'),
  canViewStatistics,
  organizationsController.getStatistics
);

// Get organization user count
router.get(
  '/:id/user-count',
  verifyOrganizationAccess('id'),
  canViewStatistics,
  organizationsController.getUserCount
);

module.exports = router;
