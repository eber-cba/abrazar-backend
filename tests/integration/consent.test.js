const request = require('supertest');
const app = require('../../src/app');

// Mock Redis and Auth
jest.mock('../../src/config/redis', () => ({
  redisClient: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    disconnect: jest.fn(),
    on: jest.fn(),
  },
  redisSubscriber: {
    on: jest.fn(),
    subscribe: jest.fn(),
  },
}));

jest.mock('../../src/middlewares/auth.middleware', () => ({
  protect: (req, res, next) => {
    req.user = { id: 'test-user', role: 'VOLUNTEER' };
    next();
  },
  optionalProtect: (req, res, next) => {
    // Optional auth - just continue without setting user
    next();
  },
}));

// Mock Consent Service
jest.mock('../../src/modules/consents/consent.service', () => ({
  getConsentTypes: jest.fn().mockResolvedValue([
    { id: 'type-1', name: 'terms', required: true }
  ]),
  getUserConsents: jest.fn().mockResolvedValue([]),
  grantConsent: jest.fn().mockResolvedValue({ id: 'consent-1', granted: true }),
  revokeConsent: jest.fn().mockResolvedValue({ id: 'consent-1', granted: false }),
  getConsentHistory: jest.fn().mockResolvedValue([]),
}));

describe('Consent Integration', () => {
  describe('GET /api/consents/types', () => {
    it('should return consent types', async () => {
      const res = await request(app).get('/api/consents/types');
      
      expect(res.status).toBe(200);
      expect(res.body.data.types).toHaveLength(1);
    });
  });

  describe('POST /api/consents', () => {
    it('should grant consent', async () => {
      const res = await request(app)
        .post('/api/consents')
        .send({ consentTypeId: 'type-1' });

      expect(res.status).toBe(200);
      expect(res.body.data.consent.granted).toBe(true);
    });
  });
});
