const request = require('supertest');
const app = require('../../src/app');

// Mock dependencies
jest.mock('../../src/middlewares/auth.middleware', () => ({
  protect: (req, res, next) => {
    req.user = { id: 'admin-user', role: 'ORGANIZATION_ADMIN', organizationId: 'org-123' };
    req.organizationId = 'org-123';
    next();
  },
}));

jest.mock('../../src/middlewares/multi-tenant.middleware', () => ({
  multiTenantMiddleware: (req, res, next) => {
    req.organizationId = 'org-123';
    next();
  },
  requireOrganization: (req, res, next) => {
    next();
  },
}));

jest.mock('../../src/middlewares/permission.middleware', () => ({
  canViewStatistics: (req, res, next) => {
    next();
  },
  requireRole: jest.fn(() => (req, res, next) => next()),
  canViewCase: (req, res, next) => next(),
  canEditCase: (req, res, next) => next(),
  canAssignCase: (req, res, next) => next(),
  canCloseCase: (req, res, next) => next(),
  canManageTeam: (req, res, next) => next(),
  canCreateSubUsers: (req, res, next) => next(),
  canManageServicePoint: (req, res, next) => next(),
  requirePermission: jest.fn(() => (req, res, next) => next()),
  requireAnyPermission: jest.fn(() => (req, res, next) => next()),
  requireAllPermissions: jest.fn(() => (req, res, next) => next()),
}));

jest.mock('../../src/middlewares/rate-limit.middleware', () => ({
  statisticsLimiter: (req, res, next) => {
    next();
  },
  generalLimiter: (req, res, next) => {
    next();
  },
}));

// Mock other routes to prevent side effects
jest.mock('../../src/modules/auth/auth.routes', () => require('express').Router());
jest.mock('../../src/modules/persons/persons.routes', () => require('express').Router());
jest.mock('../../src/modules/cases/cases.routes', () => require('express').Router());
jest.mock('../../src/modules/admin/admin.routes', () => require('express').Router());
jest.mock('../../src/modules/uploads/upload.routes', () => require('express').Router());
jest.mock('../../src/modules/organizations/organizations.routes', () => require('express').Router());
jest.mock('../../src/modules/zones/zones.routes', () => require('express').Router());
jest.mock('../../src/modules/teams/teams.routes', () => require('express').Router());
jest.mock('../../src/modules/audit/audit.routes', () => require('express').Router());
jest.mock('../../src/modules/service-points/service-points.routes', () => require('express').Router());
jest.mock('../../src/modules/realtime/realtime.routes', () => require('express').Router());
jest.mock('../../src/modules/sessions/session.routes', () => require('express').Router());
jest.mock('../../src/modules/permissions/permission.routes', () => require('express').Router());
jest.mock('../../src/modules/consents/consent.routes', () => require('express').Router());

// Mock Service
jest.mock('../../src/modules/statistics/statistics.service', () => ({
  getOverviewStats: jest.fn().mockResolvedValue({
    totalCases: 100,
    activeCases: 50,
    resolvedCases: 40,
    emergencyCases: 5,
    totalUsers: 20,
    totalTeams: 5,
    totalZones: 3,
    casesByStatus: [
      { status: 'REPORTED', count: 30 },
      { status: 'RESOLVED', count: 40 },
    ],
  }),
  getCasesByStatus: jest.fn().mockResolvedValue({
    total: 30,
    breakdown: [
      { status: 'REPORTED', count: 10, percentage: '33.33' },
    ],
  }),
  getCasesByZone: jest.fn().mockResolvedValue({
    zones: [],
    unassignedCases: 5,
  }),
  getCasesByTeam: jest.fn().mockResolvedValue({
    teams: [],
    unassignedCases: 10,
  }),
  getEmergencyStats: jest.fn().mockResolvedValue({
    totalEmergencies: 10,
    activeEmergencies: 5,
    resolvedEmergencies: 5,
    emergenciesByLevel: [],
  }),
  getUserActivityStats: jest.fn().mockResolvedValue({
    totalUsers: 1,
    userStats: [],
  }),
  getUserCountStats: jest.fn().mockResolvedValue({
    totalUsers: 20,
    usersByRole: [],
  }),
  exportStatistics: jest.fn().mockResolvedValue({
    overview: {},
    exportedAt: new Date().toISOString(),
  }),
}));

describe('Statistics Integration', () => {
  describe('GET /api/statistics/overview', () => {
    it('should return overview statistics', async () => {
      const res = await request(app)
        .get('/api/statistics/overview')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.statistics).toHaveProperty('totalCases');
      expect(res.body.data.statistics).toHaveProperty('activeCases');
    });
  });

  describe('GET /api/statistics/cases-by-status', () => {
    it('should return cases by status', async () => {
      const res = await request(app)
        .get('/api/statistics/cases-by-status')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.statistics).toHaveProperty('breakdown');
    });
  });

  describe('GET /api/statistics/export', () => {
    it('should return json export by default', async () => {
      const res = await request(app)
        .get('/api/statistics/export')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('exportedAt');
    });
  });

  describe('GET /api/statistics/zones', () => {
    it('should return cases by zone', async () => {
      const res = await request(app)
        .get('/api/statistics/zones')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.statistics).toHaveProperty('zones');
    });
  });

  describe('GET /api/statistics/teams', () => {
    it('should return cases by team', async () => {
      const res = await request(app)
        .get('/api/statistics/teams')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.statistics).toHaveProperty('teams');
    });
  });

  describe('GET /api/statistics/emergencies', () => {
    it('should return emergency statistics', async () => {
      const res = await request(app)
        .get('/api/statistics/emergencies')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.statistics).toHaveProperty('totalEmergencies');
    });
  });

  describe('GET /api/statistics/user-activity', () => {
    it('should return user activity statistics', async () => {
      const res = await request(app)
        .get('/api/statistics/user-activity')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.statistics).toHaveProperty('userStats');
    });
  });

  describe('GET /api/statistics/users', () => {
    it('should return user count statistics', async () => {
      const res = await request(app)
        .get('/api/statistics/users')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.statistics).toHaveProperty('totalUsers');
    });
  });
});
