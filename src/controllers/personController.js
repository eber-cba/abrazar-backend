const personService = require('../services/personService');
const { createPersonSchema } = require('../validators/personValidator');

class PersonController {
  async getAll(req, res) {
    const persons = await personService.getAllPersons();
    res.json(persons);
  }

  async getById(req, res) {
    const { id } = req.params;
    const person = await personService.getPersonById(id);
    
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }
    
    res.json(person);
  }

  async create(req, res) {
    const validation = createPersonSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
    }

    const newPerson = await personService.createPerson(validation.data);
    res.status(201).json(newPerson);
  }
}

module.exports = new PersonController();
