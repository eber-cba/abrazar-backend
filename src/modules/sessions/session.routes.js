const express = require('express');
const sessionController = require('./session.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/my', (req, res, next) => sessionController.getMySessions(req, res, next));
router.delete('/all', (req, res, next) => sessionController.revokeAll(req, res, next));
router.delete('/:id', (req, res, next) => sessionController.revokeSession(req, res, next));

module.exports = router;
