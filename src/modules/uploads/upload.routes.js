const express = require('express');
const uploadController = require('./upload.controller');
const { upload } = require('./upload.service');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/', upload.single('image'), uploadController.uploadImage);

module.exports = router;
