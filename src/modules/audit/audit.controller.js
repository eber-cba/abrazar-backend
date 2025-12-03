/**
 * Audit Controller
 */

const {
  getAuditLogsByOrganization,
  getAuditLogsByUser,
  getAuditLogsByCase,
  getAuditStatistics,
} = require('./audit.service');

class AuditController {
  async getOrganizationLogs(req, res, next) {
    try {
      const orgId = req.organizationId;
      const { action, targetType, userId, startDate, endDate, limit } = req.query;

      const logs = await getAuditLogsByOrganization(orgId, {
        action,
        targetType,
        userId,
        startDate,
        endDate,
        limit: limit ? parseInt(limit) : undefined,
      });

      res.status(200).json({
        status: 'success',
        results: logs.length,
        data: { logs },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserLogs(req, res, next) {
    try {
      const { userId } = req.params;
      const { action, targetType, startDate, endDate, limit } = req.query;

      const logs = await getAuditLogsByUser(userId, {
        action,
        targetType,
        startDate,
        endDate,
        limit: limit ? parseInt(limit) : undefined,
      });

      res.status(200).json({
        status: 'success',
        results: logs.length,
        data: { logs },
      });
    } catch (error) {
      next(error);
    }
  }

  async getCaseLogs(req, res, next) {
    try {
      const { caseId } = req.params;
      const logs = await getAuditLogsByCase(caseId);

      res.status(200).json({
        status: 'success',
        results: logs.length,
        data: { logs },
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req, res, next) {
    try {
      const orgId = req.organizationId;
      const statistics = await getAuditStatistics(orgId);

      res.status(200).json({
        status: 'success',
        data: { statistics },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuditController();
