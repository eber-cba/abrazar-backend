const authService = require('../services/authService');
const { registerSchema, loginSchema } = require('../validators/authValidator');

class AuthController {
  async register(req, res) {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error.message === 'User already exists') {
        return res.status(409).json({ error: error.message });
      }
      throw error;
    }
  }

  async login(req, res) {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    try {
      const result = await authService.login(req.body);
      res.json(result);
    } catch (error) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ error: error.message });
      }
      throw error;
    }
  }
}

module.exports = new AuthController();
