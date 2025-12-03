/**
 * Zones Routes
 */

const express = require('express');
const router = express.Router();
const zonesController = require('./zones.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/permission.middleware');
const { multiTenantMiddleware, requireOrganization } = require('../../middlewares/multi-tenant.middleware');

router.use(protect);
router.use(multiTenantMiddleware); // Added multiTenantMiddleware
router.use(requireOrganization);

router.post('/', requireRole('ADMIN', 'ORGANIZATION_ADMIN', 'COORDINATOR'), zonesController.createZone);
router.get('/', zonesController.listZones);
router.get('/:id', zonesController.getZone);
router.patch('/:id', requireRole('ADMIN', 'ORGANIZATION_ADMIN', 'COORDINATOR'), zonesController.updateZone);
router.delete('/:id', requireRole('ADMIN', 'ORGANIZATION_ADMIN'), zonesController.deleteZone);
router.post('/find', zonesController.findZoneByCoordinates);
router.get('/:id/statistics', zonesController.getZoneStatistics);

module.exports = router;
