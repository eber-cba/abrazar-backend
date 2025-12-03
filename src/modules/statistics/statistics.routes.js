/**
 * Statistics Routes
 */

const express = require('express');
const router = express.Router();
const statisticsController = require('./statistics.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { canViewStatistics } = require('../../middlewares/permission.middleware');
const { multiTenantMiddleware, requireOrganization } = require('../../middlewares/multi-tenant.middleware');
const { statisticsLimiter } = require('../../middlewares/rate-limit.middleware');

router.use(protect);
router.use(multiTenantMiddleware); // Added multiTenantMiddleware
router.use(requireOrganization);
router.use(canViewStatistics);
router.use(statisticsLimiter);

router.get('/overview', statisticsController.getOverview);
router.get('/cases-by-status', statisticsController.getCasesByStatus);
router.get('/zones', statisticsController.getCasesByZone);
router.get('/teams', statisticsController.getCasesByTeam);
router.get('/emergencies', statisticsController.getEmergencies);
router.get('/user-activity', statisticsController.getUserActivity);
router.get('/users', statisticsController.getUserCount);
router.get('/export', statisticsController.exportStatistics);

module.exports = router;
