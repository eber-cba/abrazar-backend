const personsService = require('./persons.service');

const createPerson = async (req, res, next) => {
  try {
    const person = await personsService.createPerson(req.body, req.user.id);
    res.status(201).json({
      status: 'success',
      data: { person },
    });
  } catch (err) {
    next(err);
  }
};

const getAllPersons = async (req, res, next) => {
  try {
    const persons = await personsService.getAllPersons(req.query);
    res.status(200).json({
      status: 'success',
      results: persons.length,
      data: { persons },
    });
  } catch (err) {
    next(err);
  }
};

const getPerson = async (req, res, next) => {
  try {
    const person = await personsService.getPersonById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: { person },
    });
  } catch (err) {
    next(err);
  }
};

const updatePerson = async (req, res, next) => {
  try {
    const person = await personsService.updatePerson(req.params.id, req.body, req.user.id);
    res.status(200).json({
      status: 'success',
      data: { person },
    });
  } catch (err) {
    next(err);
  }
};

const deletePerson = async (req, res, next) => {
  try {
    await personsService.deletePerson(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPerson,
  getAllPersons,
  getPerson,
  updatePerson,
  deletePerson,
};
