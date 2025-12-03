const express = require('express');
const consentController = require('./consent.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Public routes
router.get('/types', (req, res, next) => consentController.getConsentTypes(req, res, next));

// Protected routes
router.use(protect);

router.post('/', (req, res, next) => consentController.grantConsent(req, res, next));
router.get('/my', (req, res, next) => consentController.getMyConsents(req, res, next));
router.get('/history', (req, res, next) => consentController.getMyConsentHistory(req, res, next));
router.delete('/:consentTypeId', (req, res, next) => consentController.revokeConsent(req, res, next));

module.exports = router;
