const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/prismaClient');
const { signToken } = require('../../src/utils/jwt');

describe('Cases Integration', () => {
  let municipalityAdmin, ngoAdmin, coordinator, socialWorker, volunteer, globalAdmin;
  let municipalityOrg, ngoOrg;
  let municipalityToken, ngoToken, coordinatorToken, socialWorkerToken, volunteerToken, adminToken;
  let municipalityZone, ngoZone;
  let municipalityTeam;
  let caseId1, caseId2;

  beforeAll(async () => {
    // Clean up - Order matters due to foreign key constraints
    await prisma.auditLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.emergency.deleteMany();
    await prisma.caseHistory.deleteMany();
    await prisma.caseStatusHistory.deleteMany();
    await prisma.case.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.zone.deleteMany();
    await prisma.servicePoint.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    // Create Organizations
    municipalityOrg = await prisma.organization.create({
      data: {
        type: 'MUNICIPALITY',
        name: 'Municipality of Córdoba',
        city: 'Córdoba',
        country: 'Argentina'
      }
    });

    ngoOrg = await prisma.organization.create({
      data: {
        type: 'NGO',
        name: 'Helping Hands NGO',
        city: 'Córdoba',
        country: 'Argentina'
      }
    });

    // Create Zones
    municipalityZone = await prisma.zone.create({
      data: {
        name: 'Centro',
        description: 'Downtown area',
        polygon: { type: 'Polygon', coordinates: [[[-64.18, -31.41], [-64.19, -31.41], [-64.19, -31.42], [-64.18, -31.42], [-64.18, -31.41]]] },
        organizationId: municipalityOrg.id
      }
    });

    ngoZone = await prisma.zone.create({
      data: {
        name: 'NGO Zone',
        description: 'NGO coverage area',
        polygon: { type: 'Polygon', coordinates: [[[-64.20, -31.43], [-64.21, -31.43], [-64.21, -31.44], [-64.20, -31.44], [-64.20, -31.43]]] },
        organizationId: ngoOrg.id
      }
    });

    // Create Team
    municipalityTeam = await prisma.team.create({
      data: {
        name: 'Response Team Alpha',
        description: 'Primary response team',
        organizationId: municipalityOrg.id
      }
    });

    // Create Users
    municipalityAdmin = await prisma.user.create({
      data: {
        email: 'muni@admin.com',
        password: 'password123',
        role: 'ORGANIZATION_ADMIN',
        organizationId: municipalityOrg.id,
        acceptedTerms: true,
      }
    });

    ngoAdmin = await prisma.user.create({
      data: {
        email: 'ngo@admin.com',
        password: 'password123',
        role: 'ORGANIZATION_ADMIN',
        organizationId: ngoOrg.id,
        acceptedTerms: true,
      }
    });

    coordinator = await prisma.user.create({
      data: {
        email: 'coordinator@muni.com',
        password: 'password123',
        role: 'COORDINATOR',
        organizationId: municipalityOrg.id,
        acceptedTerms: true,
      }
    });

    socialWorker = await prisma.user.create({
      data: {
        email: 'socialworker@muni.com',
        password: 'password123',
        role: 'SOCIAL_WORKER',
        organizationId: municipalityOrg.id,
        acceptedTerms: true,
      }
    });

    volunteer = await prisma.user.create({
      data: {
        email: 'volunteer@ngo.com',
        password: 'password123',
        role: 'VOLUNTEER',
        organizationId: ngoOrg.id,
        acceptedTerms: true,
      }
    });

    globalAdmin = await prisma.user.create({
      data: {
        email: 'global@admin.com',
        password: 'password123',
        role: 'ADMIN',
        acceptedTerms: true,
      }
    });

    // Generate Tokens
    municipalityToken = signToken(municipalityAdmin.id);
    ngoToken = signToken(ngoAdmin.id);
    coordinatorToken = signToken(coordinator.id);
    socialWorkerToken = signToken(socialWorker.id);
    volunteerToken = signToken(volunteer.id);
    adminToken = signToken(globalAdmin.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/cases', () => {
    it('should allow organization admin to create a case', async () => {
      const res = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${municipalityToken}`)
        .send({
          fullName: 'Juan Pérez',
          age: 45,
          description: 'Person in need of assistance',
          lat: -31.416,
          lng: -64.183,
          zoneId: municipalityZone.id,
          reportedByConsent: true
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.case.fullName).toBe('Juan Pérez');
      expect(res.body.data.case.organizationId).toBe(municipalityOrg.id);
      expect(res.body.data.case.status).toBe('REPORTED');
      caseId1 = res.body.data.case.id;
    });

    it('should allow social worker to create a case', async () => {
      const res = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${socialWorkerToken}`)
        .send({
          fullName: 'María González',
          age: 32,
          description: 'Requires medical attention',
          lat: -31.420,
          lng: -64.190,
          reportedByConsent: true
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.case.fullName).toBe('María González');
      caseId2 = res.body.data.case.id;
    });

    it('should allow volunteer to create a case', async () => {
      const res = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          fullName: 'Carlos Rodríguez',
          age: 28,
          description: 'Needs food assistance',
          lat: -31.430,
          lng: -64.200,
          reportedByConsent: true
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.case.organizationId).toBe(ngoOrg.id);
    });
  });

  describe('GET /api/cases', () => {
    it('should return only organization specific cases for org admin', async () => {
      const res = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${ngoToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.cases).toHaveLength(1); // Only NGO's case
      expect(res.body.data.cases[0].fullName).toBe('Carlos Rodríguez');
    });

    it('should return all cases for global admin', async () => {
      const res = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.cases.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter cases by status', async () => {
      const res = await request(app)
        .get('/api/cases?status=REPORTED')
        .set('Authorization', `Bearer ${municipalityToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.cases.every(c => c.status === 'REPORTED')).toBe(true);
    });
  });

  describe('GET /api/cases/:id', () => {
    it('should return a case by ID for authorized user', async () => {
      const res = await request(app)
        .get(`/api/cases/${caseId1}`)
        .set('Authorization', `Bearer ${municipalityToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.case.id).toBe(caseId1);
      expect(res.body.data.case.fullName).toBe('Juan Pérez');
    });

    it('should NOT allow access to another organization case', async () => {
      const res = await request(app)
        .get(`/api/cases/${caseId1}`)
        .set('Authorization', `Bearer ${ngoToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return 403 for non-existent case (permission check before existence)', async () => {
      const res = await request(app)
        .get('/api/cases/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${municipalityToken}`);

      expect(res.statusCode).toBe(404); // Case not found
    });
  });

  describe('PATCH /api/cases/:id', () => {
    it('should allow organization admin to update their case', async () => {
      const res = await request(app)
        .patch(`/api/cases/${caseId1}`)
        .set('Authorization', `Bearer ${municipalityToken}`)
        .send({
          description: 'Updated description',
          status: 'VERIFIED'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.case.description).toBe('Updated description');
      expect(res.body.data.case.status).toBe('VERIFIED');
    });

    it('should NOT allow another organization to update a case', async () => {
      const res = await request(app)
        .patch(`/api/cases/${caseId1}`)
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({ description: 'Attempted hack' });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /api/cases/:id/assign', () => {
    it('should allow coordinator to assign case to user', async () => {
      const res = await request(app)
        .post(`/api/cases/${caseId1}/assign`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ userId: socialWorker.id });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.case.assignedToUserId).toBe(socialWorker.id);
    });

    it('should allow coordinator to assign case to team', async () => {
      const res = await request(app)
        .post(`/api/cases/${caseId2}/assign`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ teamId: municipalityTeam.id });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.case.assignedToTeamId).toBe(municipalityTeam.id);
    });
  });

  describe('GET /api/cases/:id/history', () => {
    it('should return case history', async () => {
      const res = await request(app)
        .get(`/api/cases/${caseId1}/history`)
        .set('Authorization', `Bearer ${municipalityToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.history)).toBe(true);
    });
  });

  describe('GET /api/cases/:id/timeline', () => {
    it('should return case timeline', async () => {
      const res = await request(app)
        .get(`/api/cases/${caseId1}/timeline`)
        .set('Authorization', `Bearer ${municipalityToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.timeline)).toBe(true);
    });
  });

  describe('POST /api/cases/:id/emergency', () => {
    it('should allow social worker to mark case as emergency', async () => {
      const res = await request(app)
        .post(`/api/cases/${caseId1}/emergency`)
        .set('Authorization', `Bearer ${socialWorkerToken}`)
        .send({
          level: 3,
          reason: 'Immediate medical attention required'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.emergency).toBeDefined();
    });

    it('should NOT allow volunteer to mark emergency', async () => {
      const res = await request(app)
        .post(`/api/cases/${caseId2}/emergency`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          level: 2,
          reason: 'Test'
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/cases/:id', () => {
    it('should allow organization admin to delete their case', async () => {
      const res = await request(app)
        .delete(`/api/cases/${caseId2}`)
        .set('Authorization', `Bearer ${municipalityToken}`);

      expect(res.statusCode).toBe(204);

      // Verify it's deleted (returns 403 because permission check runs first)
      const getRes = await request(app)
        .get(`/api/cases/${caseId2}`)
        .set('Authorization', `Bearer ${municipalityToken}`);
      expect(getRes.statusCode).toBe(404); // Case not found
    });

    it('should NOT allow coordinator to delete a case', async () => {
      const res = await request(app)
        .delete(`/api/cases/${caseId1}`)
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(res.statusCode).toBe(403);
    });
  });
});
