const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/prismaClient');
const { signToken } = require('../../src/utils/jwt');
const { cleanDatabase } = require('../helpers/cleanDatabase');

describe('Organization User Management', () => {
  let org;
  let orgAdmin;
  let orgAdminToken;
  let createdUserId;

  beforeAll(async () => {
    // Clean database - Order matters due to foreign key constraints
    await cleanDatabase();

    // Create organization
    org = await prisma.organization.create({
      data: {
        type: 'NGO',
        name: 'Test NGO',
        city: 'Test City',
        province: 'Test Province',
      },
    });

    // Create organization admin
    orgAdmin = await prisma.user.create({
      data: {
        email: 'admin@testngo.org',
        password: 'password123',
        name: 'NGO Admin',
        role: 'ORGANIZATION_ADMIN',
        organizationId: org.id,
        acceptedTerms: true,
      },
    });

    orgAdminToken = signToken(orgAdmin.id);
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  describe('POST /api/organizations/:id/users', () => {
    it('should allow organization admin to create a new user', async () => {
      const res = await request(app)
        .post(`/api/organizations/${org.id}/users`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({
          email: 'volunteer@testngo.org',
          password: 'password123',
          name: 'Volunteer User',
          role: 'VOLUNTEER',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('volunteer@testngo.org');
      expect(res.body.data.user.role).toBe('VOLUNTEER');
      expect(res.body.data.user.organizationId).toBe(org.id);

      createdUserId = res.body.data.user.id;
    });

    it('should fail if email already exists', async () => {
      const res = await request(app)
        .post(`/api/organizations/${org.id}/users`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({
          email: 'volunteer@testngo.org', // Same email
          password: 'password123',
          name: 'Duplicate User',
          role: 'VOLUNTEER',
        });

      expect(res.statusCode).toBe(409);
    });
  });

  describe('GET /api/organizations/:id/members', () => {
    it('should list organization members including the new user', async () => {
      const res = await request(app)
        .get(`/api/organizations/${org.id}/members`)
        .set('Authorization', `Bearer ${orgAdminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.members).toHaveLength(2); // Admin + Volunteer
      
      const volunteer = res.body.data.members.find(m => m.email === 'volunteer@testngo.org');
      expect(volunteer).toBeDefined();
    });
  });

  describe('PATCH /api/organizations/:id/users/:userId', () => {
    it('should allow organization admin to update user role', async () => {
      const res = await request(app)
        .patch(`/api/organizations/${org.id}/users/${createdUserId}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({
          role: 'COORDINATOR',
          name: 'Updated Volunteer Name',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.role).toBe('COORDINATOR');
      expect(res.body.data.user.name).toBe('Updated Volunteer Name');
    });
  });

  describe('DELETE /api/organizations/:id/members/:userId', () => {
    it('should allow organization admin to remove a user', async () => {
      const res = await request(app)
        .delete(`/api/organizations/${org.id}/members/${createdUserId}`)
        .set('Authorization', `Bearer ${orgAdminToken}`);

      expect(res.statusCode).toBe(204);

      // Verify user is removed from org
      const user = await prisma.user.findUnique({ where: { id: createdUserId } });
      expect(user.organizationId).toBeNull();
      expect(user.role).toBe('PUBLIC');
    });
  });
});
