const consentService = require('./consent.service');
const AppError = require('../../utils/errors');

class ConsentController {
  /**
   * Grant a consent
   */
  async grantConsent(req, res, next) {
    try {
      const { consentTypeId } = req.body;
      const userId = req.user.id;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      if (!consentTypeId) {
        return next(new AppError('Consent Type ID is required', 400));
      }

      const consent = await consentService.grantConsent(
        userId,
        consentTypeId,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        status: 'success',
        data: { consent },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke a consent
   */
  async revokeConsent(req, res, next) {
    try {
      const { consentTypeId } = req.params;
      const userId = req.user.id;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      await consentService.revokeConsent(
        userId,
        consentTypeId,
        ipAddress,
        userAgent
      );

      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my consents
   */
  async getMyConsents(req, res, next) {
    try {
      const userId = req.user.id;
      const consents = await consentService.getUserConsents(userId);

      res.status(200).json({
        status: 'success',
        results: consents.length,
        data: { consents },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my consent history
   */
  async getMyConsentHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const history = await consentService.getConsentHistory(userId);

      res.status(200).json({
        status: 'success',
        results: history.length,
        data: { history },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List available consent types (Public)
   */
  async getConsentTypes(req, res, next) {
    try {
      const types = await consentService.getConsentTypes();

      res.status(200).json({
        status: 'success',
        results: types.length,
        data: { types },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConsentController();
