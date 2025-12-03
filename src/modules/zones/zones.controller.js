/**
 * Zones Controller
 */

const zoneService = require('./zone.service');
const { logZoneAction } = require('../audit/audit.service');

class ZonesController {
  async createZone(req, res, next) {
    try {
      const { name, polygon, description } = req.body;
      const orgId = req.organizationId;

      const zone = await zoneService.createZone(orgId, name, polygon, description);

      await logZoneAction(req.user.id, 'create_zone', zone.id, { name }, req.ip);

      res.status(201).json({
        status: 'success',
        data: { zone },
      });
    } catch (error) {
      next(error);
    }
  }

  async listZones(req, res, next) {
    try {
      const orgId = req.organizationId;
      const zones = await zoneService.getZonesByOrganization(orgId);

      res.status(200).json({
        status: 'success',
        results: zones.length,
        data: { zones },
      });
    } catch (error) {
      next(error);
    }
  }

  async getZone(req, res, next) {
    try {
      const { id } = req.params;
      const zone = await zoneService.getZoneById(id);

      if (!zone) {
        return res.status(404).json({
          status: 'fail',
          message: 'Zone not found',
        });
      }

      res.status(200).json({
        status: 'success',
        data: { zone },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateZone(req, res, next) {
    try {
      const { id } = req.params;
      const zone = await zoneService.updateZone(id, req.body);

      await logZoneAction(req.user.id, 'update_zone', id, req.body, req.ip);

      res.status(200).json({
        status: 'success',
        data: { zone },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteZone(req, res, next) {
    try {
      const { id } = req.params;
      await zoneService.deleteZone(id);

      await logZoneAction(req.user.id, 'delete_zone', id, null, req.ip);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async findZoneByCoordinates(req, res, next) {
    try {
      const { lat, lng } = req.body;
      const orgId = req.organizationId;

      const zone = await zoneService.findZoneByCoordinates(lat, lng, orgId);

      res.status(200).json({
        status: 'success',
        data: { zone },
      });
    } catch (error) {
      next(error);
    }
  }

  async getZoneStatistics(req, res, next) {
    try {
      const { id } = req.params;
      const statistics = await zoneService.getZoneStatistics(id);

      res.status(200).json({
        status: 'success',
        data: { statistics },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ZonesController();
