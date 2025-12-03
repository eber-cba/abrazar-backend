/**
 * Multi-Tenant Isolation Integration Tests
 * Ensures complete data isolation between organizations
 */

const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/prismaClient');
const { signToken } = require('../../src/utils/jwt');

describe('Multi-Tenant Isolation', () => {
  let org1, org2;
  let org1Admin, org2Admin;
  let org1Token, org2Token;
  let org1Case, org2Case;
  let org1Team, org2Team;
  let org1Zone, org2Zone;

  beforeAll(async () => {
    // Clean database - Order matters due to foreign key constraints
    await prisma.auditLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.emergency.deleteMany();
    await prisma.caseHistory.deleteMany();
    await prisma.caseStatusHistory.deleteMany();
    await prisma.case.deleteMany();
    await prisma.servicePoint.deleteMany(); // Added
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.zone.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    // Create two organizations
    org1 = await prisma.organization.create({
      data: {
        type: 'MUNICIPALITY',
        name: 'Municipality of Córdoba',
        city: 'Córdoba',
        province: 'Córdoba',
      },
    });

    org2 = await prisma.organization.create({
      data: {
        type: 'MUNICIPALITY',
        name: 'Municipality of Buenos Aires',
        city: 'Buenos Aires',
        province: 'Buenos Aires',
      },
    });

    // Create organization admins
    org1Admin = await prisma.user.create({
      data: {
        email: 'admin@cordoba.gov.ar',
        password: 'password123',
        name: 'Córdoba Admin',
        role: 'ORGANIZATION_ADMIN',
        organizationId: org1.id,
        acceptedTerms: true,
      },
    });

    org2Admin = await prisma.user.create({
      data: {
        email: 'admin@buenosaires.gov.ar',
        password: 'password123',
        name: 'Buenos Aires Admin',
        role: 'ORGANIZATION_ADMIN',
        organizationId: org2.id,
        acceptedTerms: true,
      },
    });

    // Generate tokens
    org1Token = signToken(org1Admin.id);
    org2Token = signToken(org2Admin.id);

    // Create cases for each organization
    org1Case = await prisma.case.create({
      data: {
        fullName: 'Juan Pérez',
        lat: -31.4201,
        lng: -64.1888,
        createdBy: org1Admin.id,
        organizationId: org1.id,
        reportedByConsent: true,
      },
    });

    org2Case = await prisma.case.create({
      data: {
        fullName: 'María García',
        lat: -34.6037,
        lng: -58.3816,
        createdBy: org2Admin.id,
        organizationId: org2.id,
        reportedByConsent: true,
      },
    });

    // Create teams for each organization
    org1Team = await prisma.team.create({
      data: {
        name: 'Córdoba Field Team',
        organizationId: org1.id,
      },
    });

    org2Team = await prisma.team.create({
      data: {
        name: 'Buenos Aires Field Team',
        organizationId: org2.id,
      },
    });

    // Create zones for each organization
    org1Zone = await prisma.zone.create({
      data: {
        name: 'Córdoba Centro',
        polygon: {
          type: 'Polygon',
          coordinates: [
            [
              [-64.1, -31.4],
              [-64.2, -31.4],
              [-64.2, -31.5],
              [-64.1, -31.5],
              [-64.1, -31.4],
            ],
          ],
        },
        organizationId: org1.id,
      },
    });

    org2Zone = await prisma.zone.create({
      data: {
        name: 'Buenos Aires Centro',
        polygon: {
          type: 'Polygon',
          coordinates: [
            [
              [-58.3, -34.6],
              [-58.4, -34.6],
              [-58.4, -34.7],
              [-58.3, -34.7],
              [-58.3, -34.6],
            ],
          ],
        },
        organizationId: org2.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Case Access Isolation', () => {
    it('org1 admin should only see org1 cases', async () => {
      const res = await request(app)
        .get('/api/cases') // Added /api prefix
        .set('Authorization', `Bearer ${org1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.cases).toHaveLength(1);
      expect(res.body.data.cases[0].id).toBe(org1Case.id);
    });

    it('org2 admin should only see org2 cases', async () => {
      const res = await request(app)
        .get('/api/cases') // Added /api prefix
        .set('Authorization', `Bearer ${org2Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.cases).toHaveLength(1);
      expect(res.body.data.cases[0].id).toBe(org2Case.id);
    });

    it('org1 admin should not access org2 case', async () => {
      const res = await request(app)
        .get(`/api/cases/${org2Case.id}`) // Added /api prefix
        .set('Authorization', `Bearer ${org1Token}`);

      expect(res.statusCode).toBe(403);
    });

    it('org2 admin should not access org1 case', async () => {
      const res = await request(app)
        .get(`/api/cases/${org1Case.id}`) // Added /api prefix
        .set('Authorization', `Bearer ${org2Token}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Organization Resource Isolation', () => {
    it('should prevent cross-organization access to members', async () => {
      const res = await request(app)
        .get(`/api/organizations/${org2.id}/members`) // Added /api prefix
        .set('Authorization', `Bearer ${org1Token}`);

      expect(res.statusCode).toBe(403);
    });

    it('should allow access to own organization members', async () => {
      const res = await request(app)
        .get(`/api/organizations/${org1.id}/members`) // Added /api prefix
        .set('Authorization', `Bearer ${org1Token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('Statistics Isolation', () => {
    it('org1 should only see org1 statistics', async () => {
      const res = await request(app)
        .get('/api/statistics/overview') // Added /api prefix
        .set('Authorization', `Bearer ${org1Token}`); // Added Authorization

      expect(res.statusCode).toBe(200);
      expect(res.body.data.statistics.totalCases).toBe(1);
    });

    it('org2 should only see org2 statistics', async () => {
      const res = await request(app)
        .get('/api/statistics/overview') // Added /api prefix
        .set('Authorization', `Bearer ${org2Token}`); // Added Authorization

      expect(res.statusCode).toBe(200);
      expect(res.body.data.statistics.totalCases).toBe(1);
    });
  });

  describe('Team Isolation', () => {
    it('org1 should only see org1 teams', async () => {
      const res = await request(app)
        .get('/api/teams') // Added /api prefix
        .set('Authorization', `Bearer ${org1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.teams).toHaveLength(1);
      expect(res.body.data.teams[0].id).toBe(org1Team.id);
    });

    it('org2 should only see org2 teams', async () => {
      const res = await request(app)
        .get('/api/teams') // Added /api prefix
        .set('Authorization', `Bearer ${org2Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.teams).toHaveLength(1);
      expect(res.body.data.teams[0].id).toBe(org2Team.id);
    });
  });

  describe('Zone Isolation', () => {
    it('org1 should only see org1 zones', async () => {
      const res = await request(app)
        .get('/api/zones') // Added /api prefix
        .set('Authorization', `Bearer ${org1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.zones).toHaveLength(1);
      expect(res.body.data.zones[0].id).toBe(org1Zone.id);
    });

    it('org2 should only see org2 zones', async () => {
      const res = await request(app)
        .get('/api/zones') // Added /api prefix
        .set('Authorization', `Bearer ${org2Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.zones).toHaveLength(1);
      expect(res.body.data.zones[0].id).toBe(org2Zone.id);
    });
  });
});
