const consentService = require('../modules/consents/consent.service');
const AppError = require('../utils/errors');

/**
 * Middleware to require a specific consent
 * @param {string} consentTypeName - The unique name of the consent type (e.g., 'terms_of_service')
 */
const requireConsent = (consentTypeName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required to check consent', 401));
      }

      const hasConsent = await consentService.hasValidConsent(req.user.id, consentTypeName);

      if (!hasConsent) {
        // 451 Unavailable For Legal Reasons
        return next(new AppError(`Consent required: ${consentTypeName}`, 451));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  requireConsent,
};
