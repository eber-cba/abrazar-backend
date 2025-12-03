const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/prismaClient');
const bcrypt = require('bcrypt');

describe('Homeless Module - Integration Tests', () => {
  let orgId;
  let coordinatorToken;
  let volunteerToken;
  let coordinatorId;
  let volunteerId;
  let homelessId;
  let servicePointId;

  beforeAll(async () => {
    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Homeless Test Org',
        type: 'NGO',
      },
    });
    orgId = org.id;

    // Create coordinator user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const coordinator = await prisma.user.create({
      data: {
        email: `homeless-coord-${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Homeless Coordinator',
        role: 'COORDINATOR',
        organizationId: orgId,
      },
    });
    coordinatorId = coordinator.id;

    // Create volunteer user
    const volunteer = await prisma.user.create({
      data: {
        email: `homeless-vol-${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Homeless Volunteer',
        role: 'VOLUNTEER',
        organizationId: orgId,
      },
    });
    volunteerId = volunteer.id;

    // Login coordinator
    const coordRes = await request(app)
      .post('/api/auth/login')
      .send({ email: coordinator.email, password: 'password123' });
    coordinatorToken = coordRes.body.token;

    // Login volunteer
    const volRes = await request(app)
      .post('/api/auth/login')
      .send({ email: volunteer.email, password: 'password123' });
    volunteerToken = volRes.body.token;

    // Create a service point for geolocation tests
    const servicePoint = await prisma.servicePoint.create({
      data: {
        type: 'HEALTH_CENTER',
        name: 'Test Health Center',
        address: 'Test Address',
        latitude: -31.4201, // Córdoba
        longitude: -64.1888,
        organizationId: orgId,
      },
    });
    servicePointId = servicePoint.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.homeless.deleteMany({ where: { organizationId: orgId } });
    await prisma.servicePoint.deleteMany({ where: { organizationId: orgId } });
    await prisma.auditLog.deleteMany({ where: { user: { organizationId: orgId } } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  describe('POST /api/homeless', () => {
    test('COORDINATOR can create homeless with full data', async () => {
      const res = await request(app)
        .post('/api/homeless')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          lat: -31.4201,
          lng: -64.1888,
          nombre: 'Juan',
          apellido: 'Pérez',
          apodo: 'Juancho',
          edad: 45,
          estadoFisico: 'Regular',
          adicciones: 'Alcohol',
          estadoMental: 'Estable',
          atencionMedicaUrgente: false,
          consentimientoVerbal: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.homeless).toHaveProperty('id');
      expect(res.body.data.homeless.nombre).toBe('Juan');
      expect(res.body.data.homeless.apellido).toBe('Pérez');
      
      homelessId = res.body.data.homeless.id;
    });

    test('VOLUNTEER can only create with basic fields', async () => {
      const res = await request(app)
        .post('/api/homeless')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          lat: -31.4201,
          lng: -64.1888,
          apodo: 'El Flaco',
          fotoUrl: 'https://example.com/photo.jpg',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.homeless.apodo).toBe('El Flaco');
      expect(res.body.data.homeless.nombre).toBeNull();
      expect(res.body.data.homeless.apellido).toBeNull();
    });

    test('should reject invalid coordinates', async () => {
      const res = await request(app)
        .post('/api/homeless')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          lat: 91, // Invalid
          lng: -64.1888,
          apodo: 'Test',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/homeless', () => {
    test('should list all homeless for organization', async () => {
      const res = await request(app)
        .get('/api/homeless')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.homeless).toBeInstanceOf(Array);
      expect(res.body.data.count).toBeGreaterThan(0);
    });

    test('should filter by atencionMedicaUrgente', async () => {
      const res = await request(app)
        .get('/api/homeless?atencionMedicaUrgente=true')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/homeless/:id', () => {
    test('should get homeless by ID', async () => {
      const res = await request(app)
        .get(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.homeless.id).toBe(homelessId);
    });

    test('should return 404 for non-existent ID', async () => {
      const res = await request(app)
        .get('/api/homeless/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/homeless/:id', () => {
    test('COORDINATOR can update homeless', async () => {
      const res = await request(app)
        .patch(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          edad: 46,
          estadoFisico: 'Bueno',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.homeless.edad).toBe(46);
      expect(res.body.data.homeless.estadoFisico).toBe('Bueno');
    });

    test('VOLUNTEER cannot update homeless', async () => {
      const res = await request(app)
        .patch(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          edad: 47,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/homeless/:id/nearby-services', () => {
    test('should find nearby service points', async () => {
      const res = await request(app)
        .get(`/api/homeless/${homelessId}/nearby-services?radius=10`)
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.servicePoints).toBeInstanceOf(Array);
      expect(res.body.data.count).toBeGreaterThan(0);
      
      // Verify distance is calculated
      if (res.body.data.servicePoints.length > 0) {
        expect(res.body.data.servicePoints[0]).toHaveProperty('distance');
      }
    });

    test('should respect radius parameter', async () => {
      const res = await request(app)
        .get(`/api/homeless/${homelessId}/nearby-services?radius=0.1`)
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(res.status).toBe(200);
      // Should find 0 or very few within 100m
    });
  });

  describe('Multi-Tenancy', () => {
    test('should not see homeless from other organizations', async () => {
      // Create another organization
      const org2 = await prisma.organization.create({
        data: { name: 'Other Org', type: 'NGO' },
      });

      const hashedPassword = await bcrypt.hash('password123', 10);
      const user2 = await prisma.user.create({
        data: {
          email: `other-${Date.now()}@example.com`,
          password: hashedPassword,
          name: 'Other User',
          role: 'COORDINATOR',
          organizationId: org2.id,
        },
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user2.email, password: 'password123' });

      const res = await request(app)
        .get('/api/homeless')
        .set('Authorization', `Bearer ${loginRes.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(0);

      // Cleanup
      await prisma.user.delete({ where: { id: user2.id } });
      await prisma.organization.delete({ where: { id: org2.id } });
    });
  });

  describe('DELETE /api/homeless/:id', () => {
    test('COORDINATOR can delete homeless', async () => {
      const res = await request(app)
        .delete(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    test('VOLUNTEER cannot delete homeless', async () => {
      // Create a homeless first
      const createRes = await request(app)
        .post('/api/homeless')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          lat: -31.4201,
          lng: -64.1888,
          apodo: 'To Delete',
        });

      const deleteRes = await request(app)
        .delete(`/api/homeless/${createRes.body.data.homeless.id}`)
        .set('Authorization', `Bearer ${volunteerToken}`);

      expect(deleteRes.status).toBe(403);
    });
  });
});
