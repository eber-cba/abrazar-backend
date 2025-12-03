const express = require('express');
const personsController = require('./persons.controller');
const { protect } = require('../../middlewares/auth.middleware');
const verifyRole = require('../../middlewares/verifyRole');
const validateRequest = require('../../middlewares/validateRequest');
const { createPersonSchema, updatePersonSchema, getPersonSchema } = require('./persons.validators');
const commentsRouter = require('../comments/comments.routes');

const router = express.Router();

router.use('/:id/comments', commentsRouter);

// Public routes (if any, maybe list?)
// For now, let's say listing is public but details might be restricted?
// User said "publico: Solo consulta información pública".
router.get('/', personsController.getAllPersons);
router.get('/:id', validateRequest(getPersonSchema), personsController.getPerson);

// Protected routes
router.use(protect);

router.post(
  '/',
  verifyRole('ADMIN', 'OPERATOR', 'VOLUNTEER'),
  validateRequest(createPersonSchema),
  personsController.createPerson
);

router.patch(
  '/:id',
  verifyRole('ADMIN', 'OPERATOR'),
  validateRequest(updatePersonSchema),
  personsController.updatePerson
);

router.delete(
  '/:id',
  verifyRole('ADMIN'),
  personsController.deletePerson
);

module.exports = router;
