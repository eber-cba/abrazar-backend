const express = require('express');
const realtimeController = require('./realtime.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/stream', protect, realtimeController.stream);

module.exports = router;
