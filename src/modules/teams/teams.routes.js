/**
 * Teams Routes
 */

const express = require('express');
const router = express.Router();
const teamsController = require('./teams.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { requireRole, canManageTeam } = require('../../middlewares/permission.middleware');
const { multiTenantMiddleware, requireOrganization } = require('../../middlewares/multi-tenant.middleware');

router.use(protect);
router.use(multiTenantMiddleware); // Added multiTenantMiddleware
router.use(requireOrganization);

router.post('/', requireRole('ADMIN', 'ORGANIZATION_ADMIN'), teamsController.createTeam);
router.get('/', teamsController.listTeams);
router.get('/:id', teamsController.getTeam);
router.patch('/:id', canManageTeam, teamsController.updateTeam);
router.delete('/:id', requireRole('ADMIN', 'ORGANIZATION_ADMIN'), teamsController.deleteTeam);
router.post('/:id/members', canManageTeam, teamsController.addMember);
router.delete('/:id/members/:userId', canManageTeam, teamsController.removeMember);
router.patch('/:id/members/:userId', canManageTeam, teamsController.updateMemberRole);
router.get('/:id/members', teamsController.getMembers);
router.get('/:id/statistics', teamsController.getStatistics);

module.exports = router;
