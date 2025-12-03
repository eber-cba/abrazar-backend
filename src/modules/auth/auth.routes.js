const express = require('express');
const authController = require('./auth.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { registerSchema, loginSchema, refreshTokenSchema, updateMeSchema, firebaseLoginSchema } = require('./auth.validators');
const { protect } = require('../../middlewares/auth.middleware');
const { authLimiter } = require('../../middlewares/rate-limit.middleware');

const upload = require('../../middlewares/upload.middleware');

const router = express.Router();

router.post('/register', authLimiter, validateRequest(registerSchema), authController.register);
router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);
router.post('/refresh', authLimiter, validateRequest(refreshTokenSchema), authController.refresh);

router.patch(
  '/me',
  protect,
  upload.single('photo'),
  validateRequest(updateMeSchema),
  authController.updateMe
);

router.post(
  '/firebase-login',
  authLimiter,
  validateRequest(firebaseLoginSchema),
  authController.firebaseLogin
);

router.post('/logout', protect, authController.logout);

module.exports = router;
