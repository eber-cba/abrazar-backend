const express = require('express');
const adminController = require('./admin.controller');
const { protect } = require('../../middlewares/auth.middleware');
const verifyRole = require('../../middlewares/verifyRole');
const validateRequest = require('../../middlewares/validateRequest');
const { z } = require('zod');

const router = express.Router();

// All routes are protected and restricted to ADMIN
router.use(protect);
router.use(verifyRole('ADMIN'));

router.get('/users', adminController.getUsers);
router.get('/audits', adminController.getAudits);

const updateRoleSchema = z.object({
  body: z.object({
    role: z.enum(['ADMIN', 'OPERATOR', 'VOLUNTEER', 'PUBLIC']),
  }),
});

router.patch('/users/:id/role', validateRequest(updateRoleSchema), adminController.updateUserRole);

module.exports = router;
