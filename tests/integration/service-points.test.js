const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/prismaClient');
const { signToken } = require('../../src/utils/jwt'); // Use signToken for consistency

describe('Service Points Integration', () => {
  let municipalityAdmin, ngoAdmin, publicUser, globalAdmin, coordinatorUser, volunteerUser;
  let municipalityOrg, ngoOrg;
  let municipalityToken, ngoToken, publicToken, adminToken, coordinatorToken, volunteerToken;
  let muniServicePointId, ngoServicePointId, privateServicePointId; // Store created service point IDs

  const { cleanDatabase } = require('../helpers/cleanDatabase');

  beforeAll(async () => {
    // Clean up - Order matters due to foreign key constraints
    await cleanDatabase();

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
        name: 'Helping Hands',
        city: 'Córdoba',
        country: 'Argentina'
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

    coordinatorUser = await prisma.user.create({
      data: {
        email: 'coordinator@muni.com',
        password: 'password123',
        role: 'COORDINATOR',
        organizationId: municipalityOrg.id,
        acceptedTerms: true,
      }
    });

    volunteerUser = await prisma.user.create({
      data: {
        email: 'volunteer@ngo.com',
        password: 'password123',
        role: 'VOLUNTEER',
        organizationId: ngoOrg.id,
        acceptedTerms: true,
      }
    });

    publicUser = await prisma.user.create({
      data: {
        email: 'public@user.com',
        password: 'password123',
        role: 'PUBLIC',
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
    coordinatorToken = signToken(coordinatorUser.id);
    volunteerToken = signToken(volunteerUser.id);
    publicToken = signToken(publicUser.id);
    adminToken = signToken(globalAdmin.id);

    // Create initial service points for testing GET all and filtering
    const muniSpRes = await request(app)
      .post('/api/service-points')
      .set('Authorization', `Bearer ${municipalityToken}`)
      .send({
        type: 'HEALTH_CENTER',
        name: 'Central Hospital',
        address: 'Av. Colon 100',
        latitude: -31.416,
        longitude: -64.183,
        isPublic: true,
        capacity: 50,
        servicesOffered: ["Consultas", "Vacunacion"]
      });
    muniServicePointId = muniSpRes.body.data.servicePoint.id;

    const ngoSpRes = await request(app)
      .post('/api/service-points')
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({
        type: 'SOUP_KITCHEN',
        name: 'Community Kitchen',
        address: 'Calle Falsa 123',
        latitude: -31.420,
        longitude: -64.190,
        isPublic: true,
        contactPhone: "123-4567",
        email: "kitchen@example.com"
      });
    ngoServicePointId = ngoSpRes.body.data.servicePoint.id;

    // Create a private service point
    const privateSpRes = await request(app)
      .post('/api/service-points')
      .set('Authorization', `Bearer ${municipalityToken}`)
      .send({
        type: 'TEMP_SHELTER',
        name: 'Secret Shelter',
        address: 'Private St 456',
        latitude: -31.430,
        longitude: -64.200,
        isPublic: false,
      });
    privateServicePointId = privateSpRes.body.data.servicePoint.id;

  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/service-points', () => {
    it('should allow municipality admin to create a service point', async () => {
      const res = await request(app)
        .post('/api/service-points')
        .set('Authorization', `Bearer ${municipalityToken}`)
        .send({
          type: 'HEALTH_CENTER',
          name: 'New Muni Hospital',
          address: 'Av. Siempre Viva 742',
          latitude: -31.400,
          longitude: -64.100,
          isPublic: true
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.servicePoint.name).toBe('New Muni Hospital');
      expect(res.body.data.servicePoint.organizationId).toBe(municipalityOrg.id);
    });

    it('should allow a coordinator to create a service point', async () => {
      const res = await request(app)
        .post('/api/service-points')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          type: 'FOOD_POINT',
          name: 'Muni Food Bank',
          address: 'Main St 1',
          latitude: -31.410,
          longitude: -64.180,
          isPublic: true
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.servicePoint.name).toBe('Muni Food Bank');
      expect(res.body.data.servicePoint.organizationId).toBe(municipalityOrg.id);
    });

    it('should NOT allow a volunteer to create a service point', async () => {
      const res = await request(app)
        .post('/api/service-points')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          type: 'REFUGE',
          name: 'Unauthorized Refuge',
          address: 'Nowhere',
          latitude: 0,
          longitude: 0
        });

      expect(res.statusCode).toBe(403);
    });

    it('should NOT allow public user to create a service point', async () => {
      const res = await request(app)
        .post('/api/service-points')
        .set('Authorization', `Bearer ${publicToken}`)
        .send({
          type: 'REFUGE',
          name: 'Unauthorized Refuge',
          address: 'Nowhere',
          latitude: 0,
          longitude: 0
        });

      expect(res.statusCode).toBe(403);
    });

    it('should fail with invalid data (missing required fields)', async () => {
      const res = await request(app)
        .post('/api/service-points')
        .set('Authorization', `Bearer ${municipalityToken}`)
        .send({
          type: 'HEALTH_CENTER',
          name: 'Incomplete',
          latitude: -31.416,
          longitude: -64.183,
          // Missing address
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].path[1]).toBe('address');
    });
  });

  describe('GET /api/service-points (Internal View)', () => {
    it('should return only organization specific points for org admin', async () => {
      const res = await request(app)
        .get('/api/service-points')
        .set('Authorization', `Bearer ${ngoToken}`); // NGO admin

      expect(res.statusCode).toBe(200);
      expect(res.body.data.servicePoints).toHaveLength(1); // Only NGO's Kitchen
      expect(res.body.data.servicePoints[0].name).toBe('Community Kitchen');
    });

    it('should return all points for global admin', async () => {
      const res = await request(app)
        .get('/api/service-points')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.servicePoints).toHaveLength(5); // Corrected: 3 initial + 2 from POST tests = 5
    });

    it('should filter by type for org admin', async () => {
      const res = await request(app)
        .get('/api/service-points?type=HEALTH_CENTER')
        .set('Authorization', `Bearer ${municipalityToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.servicePoints).toHaveLength(2); // Central Hospital, New Muni Hospital
      expect(res.body.data.servicePoints.every(sp => sp.type === 'HEALTH_CENTER')).toBe(true);
    });
  });

  describe('GET /api/service-points/public', () => {
    it('should return all public service points regardless of organization', async () => {
      const res = await request(app)
        .get('/api/service-points/public');

      expect(res.statusCode).toBe(200);
      // Public points: Central Hospital, Community Kitchen, New Muni Hospital, Muni Food Bank (4 total public)
      expect(res.body.data.servicePoints).toHaveLength(4); // Corrected
      
      const names = res.body.data.servicePoints.map(sp => sp.name);
      expect(names).toContain('Central Hospital');
      expect(names).toContain('Community Kitchen');
      expect(names).toContain('New Muni Hospital');
      expect(names).toContain('Muni Food Bank');
    });

    it('should filter out private service points', async () => {
      const res = await request(app)
        .get('/api/service-points/public');

      const names = res.body.data.servicePoints.map(sp => sp.name);
      expect(names).not.toContain('Secret Shelter');
    });

    it('should filter public points by type', async () => {
      const res = await request(app)
        .get('/api/service-points/public?type=SOUP_KITCHEN');

      expect(res.statusCode).toBe(200);
      expect(res.body.data.servicePoints).toHaveLength(1);
      expect(res.body.data.servicePoints[0].name).toBe('Community Kitchen');
    });
  });

  describe('GET /api/service-points/:id', () => {
    it('should return a public service point by ID for any authenticated user', async () => {
      const res = await request(app)
        .get(`/api/service-points/${muniServicePointId}`)
        .set('Authorization', `Bearer ${ngoToken}`); // NGO admin trying to get Muni SP

      expect(res.statusCode).toBe(200);
      expect(res.body.data.servicePoint.id).toBe(muniServicePointId);
      expect(res.body.data.servicePoint.name).toBe('Central Hospital');
    });

    it('should return a public service point by ID for public user (unauthenticated)', async () => {
      const res = await request(app)
        .get(`/api/service-points/${muniServicePointId}`); // No Authorization header needed for public SP

      expect(res.statusCode).toBe(200);
      expect(res.body.data.servicePoint.id).toBe(muniServicePointId);
      expect(res.body.data.servicePoint.name).toBe('Central Hospital');
    });

    it('should return a private service point for its organization admin', async () => {
      const res = await request(app)
        .get(`/api/service-points/${privateServicePointId}`)
        .set('Authorization', `Bearer ${municipalityToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.servicePoint.id).toBe(privateServicePointId);
      expect(res.body.data.servicePoint.name).toBe('Secret Shelter');
      expect(res.body.data.servicePoint.isPublic).toBe(false);
    });

    it('should NOT return a private service point for another organization admin', async () => {
      const res = await request(app)
        .get(`/api/service-points/${privateServicePointId}`)
        .set('Authorization', `Bearer ${ngoToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('You do not have permission to view this service point');
    });

    it('should NOT return a private service point for a public user (unauthenticated)', async () => {
      const res = await request(app)
        .get(`/api/service-points/${privateServicePointId}`); // No Authorization header

      expect(res.statusCode).toBe(401); // Authentication required
      expect(res.body.message).toBe('Authentication required to view private service points');
    });

    it('should return 404 for a non-existent service point', async () => {
      const res = await request(app)
        .get('/api/service-points/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${municipalityToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/service-points/:id', () => {
    it('should allow organization admin to update their service point', async () => {
      const updateData = {
        name: 'Updated Hospital Name',
        capacity: 100,
        openingHours: '9am-5pm',
      };
      const res = await request(app)
        .patch(`/api/service-points/${muniServicePointId}`)
        .set('Authorization', `Bearer ${municipalityToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.servicePoint.name).toBe(updateData.name);
      expect(res.body.data.servicePoint.capacity).toBe(updateData.capacity);
    });

    it('should NOT allow another organization admin to update a service point', async () => {
      const res = await request(app)
        .patch(`/api/service-points/${muniServicePointId}`)
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({ name: 'Attempted Hack' });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('You do not have permission to edit this service point');
    });

    it('should NOT allow a volunteer to update a service point', async () => {
      const res = await request(app)
        .patch(`/api/service-points/${muniServicePointId}`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ name: 'Attempted Volunteer Edit' });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/service-points/:id', () => {
    it('should allow organization admin to delete their service point', async () => {
      const res = await request(app)
        .delete(`/api/service-points/${ngoServicePointId}`)
        .set('Authorization', `Bearer ${ngoToken}`);

      expect(res.statusCode).toBe(204);

      // Verify it's deleted
      const getRes = await request(app)
        .get(`/api/service-points/${ngoServicePointId}`)
        .set('Authorization', `Bearer ${ngoToken}`);
      expect(getRes.statusCode).toBe(404);
    });

    it('should NOT allow a coordinator to delete a service point', async () => {
      const res = await request(app)
        .delete(`/api/service-points/${muniServicePointId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should NOT allow another organization admin to delete a service point', async () => {
      // Re-create a SP for NGO to be deleted by admin
      const res = await request(app)
        .post('/api/service-points')
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({
          type: 'SOUP_KITCHEN',
          name: 'Another Community Kitchen',
          address: 'Second St 1',
          latitude: -31.425,
          longitude: -64.195,
          isPublic: true
        });
      const newNgoServicePointId = res.body.data.servicePoint.id;

      const deleteRes = await request(app)
        .delete(`/api/service-points/${newNgoServicePointId}`)
        .set('Authorization', `Bearer ${municipalityToken}`); // Muni admin trying to delete NGO SP

      expect(deleteRes.statusCode).toBe(403);
    });
  });

  describe('GET /api/service-points/nearby', () => {
    it('should return nearby public service points', async () => {
      // Search near Central Hospital (-31.416, -64.183) with a radius of 10km
      const res = await request(app)
        .get(`/api/service-points/nearby?latitude=-31.417&longitude=-64.184&radius=10`)
        .send(); // No auth needed

      expect(res.statusCode).toBe(200);
      expect(res.body.data.servicePoints.length).toBeGreaterThan(0);
      const names = res.body.data.servicePoints.map(sp => sp.name);
      expect(names).toContain('Updated Hospital Name'); // Name was updated
      expect(names).toContain('New Muni Hospital');
      expect(names).toContain('Muni Food Bank');
      expect(names).toContain('Another Community Kitchen');
      // Secret Shelter (-31.430, -64.200) is within 5km from (-31.417, -64.184) approx 2.5km
      expect(names).not.toContain('Secret Shelter'); // Private, so should not be returned
    });

    it('should filter nearby public service points by type', async () => {
      const res = await request(app)
        .get(`/api/service-points/nearby?latitude=-31.417&longitude=-64.184&radius=10&type=HEALTH_CENTER`)
        .send();

      expect(res.statusCode).toBe(200);
      expect(res.body.data.servicePoints.length).toBeGreaterThan(0);
      const names = res.body.data.servicePoints.map(sp => sp.name);
      expect(names).toContain('Updated Hospital Name'); // Name was updated
      expect(names).toContain('New Muni Hospital');
      expect(names).not.toContain('Community Kitchen'); // Kitchen is SOUP_KITCHEN, not HEALTH_CENTER
    });

    it('should return empty array if no service points are nearby', async () => {
      const res = await request(app)
        .get(`/api/service-points/nearby?latitude=0&longitude=0&radius=1`)
        .send();

      expect(res.statusCode).toBe(200);
      expect(res.body.data.servicePoints).toHaveLength(0);
    });
  });
});