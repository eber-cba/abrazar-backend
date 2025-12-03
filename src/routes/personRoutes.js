const express = require('express');
const router = express.Router();
const personController = require('../controllers/personController');

router.get('/', personController.getAll);
router.post('/', personController.create);
router.get('/:id', personController.getById);

module.exports = router;
