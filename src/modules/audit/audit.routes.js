/**
 * Audit Routes
 */

const express = require('express');
const router = express.Router();
const auditController = require('./audit.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/permission.middleware');
const { requireOrganization } = require('../../middlewares/multi-tenant.middleware');

router.use(protect);
router.use(requireOrganization);

router.get('/', requireRole('ADMIN', 'ORGANIZATION_ADMIN', 'DATA_ANALYST'), auditController.getOrganizationLogs);
router.get('/user/:userId', requireRole('ADMIN', 'ORGANIZATION_ADMIN'), auditController.getUserLogs);
router.get('/case/:caseId', auditController.getCaseLogs);
router.get('/statistics', requireRole('ADMIN', 'ORGANIZATION_ADMIN', 'DATA_ANALYST'), auditController.getStatistics);

module.exports = router;
