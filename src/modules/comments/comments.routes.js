const express = require('express');
const commentsController = require('./comments.controller');
const { protect } = require('../../middlewares/auth.middleware');
const validateRequest = require('../../middlewares/validateRequest');
const { createCommentSchema, getCommentsSchema } = require('./comments.validators');
const { z } = require('zod');

const router = express.Router({ mergeParams: true });

// All routes here should be protected
router.use(protect);

router.post(
    '/', 
    validateRequest(createCommentSchema), 
    commentsController.postComment
);

router.get(
    '/',
    validateRequest(getCommentsSchema),
    commentsController.getComments
);

module.exports = router;
