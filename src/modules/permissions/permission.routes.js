const express = require('express');
const permissionController = require('./permission.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/permission.middleware');

const router = express.Router();

// All permission routes require authentication and ADMIN role
router.use(protect);
router.use(requireRole('ADMIN'));

// Permission management
router.get('/', permissionController.getAllPermissions);
router.post('/', permissionController.createPermission);

// Role permissions
router.get('/roles/:role', permissionController.getRolePermissions);
router.post('/roles/:role', permissionController.assignRolePermission);
router.delete('/roles/:role/:permission', permissionController.revokeRolePermission);

// User permissions
router.get('/users/:userId', permissionController.getUserPermissions);
router.post('/users/:userId', permissionController.assignUserPermission);
router.delete('/users/:userId/:permission', permissionController.revokeUserPermission);

module.exports = router;
