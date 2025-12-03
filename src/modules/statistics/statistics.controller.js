/**
 * Statistics Controller
 */

const statisticsService = require('./statistics.service');

class StatisticsController {
  async getOverview(req, res, next) {
    try {
      const orgId = req.organizationId;
      const stats = await statisticsService.getOverviewStats(orgId);

      res.status(200).json({
        status: 'success',
        data: { statistics: stats },
      });
    } catch (error) {
      next(error);
    }
  }

  async getCasesByStatus(req, res, next) {
    try {
      const orgId = req.organizationId;
      const { startDate, endDate } = req.query;

      const stats = await statisticsService.getCasesByStatus(orgId, {
        startDate,
        endDate,
      });

      res.status(200).json({
        status: 'success',
        data: { statistics: stats },
      });
    } catch (error) {
      next(error);
    }
  }

  async getCasesByZone(req, res, next) {
    try {
      const orgId = req.organizationId;
      const stats = await statisticsService.getCasesByZone(orgId);

      res.status(200).json({
        status: 'success',
        data: { statistics: stats },
      });
    } catch (error) {
      next(error);
    }
  }

  async getCasesByTeam(req, res, next) {
    try {
      const orgId = req.organizationId;
      const stats = await statisticsService.getCasesByTeam(orgId);

      res.status(200).json({
        status: 'success',
        data: { statistics: stats },
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmergencies(req, res, next) {
    try {
      const orgId = req.organizationId;
      const stats = await statisticsService.getEmergencyStats(orgId);

      res.status(200).json({
        status: 'success',
        data: { statistics: stats },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserActivity(req, res, next) {
    try {
      const orgId = req.organizationId;
      const stats = await statisticsService.getUserActivityStats(orgId);

      res.status(200).json({
        status: 'success',
        data: { statistics: stats },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserCount(req, res, next) {
    try {
      const orgId = req.organizationId;
      const stats = await statisticsService.getUserCountStats(orgId);

      res.status(200).json({
        status: 'success',
        data: { statistics: stats },
      });
    } catch (error) {
      next(error);
    }
  }

  async exportStatistics(req, res, next) {
    try {
      const orgId = req.organizationId;
      const { format = 'json' } = req.query;

      const data = await statisticsService.exportStatistics(orgId, format);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=statistics.csv');
        return res.send(data);
      }

      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StatisticsController();
