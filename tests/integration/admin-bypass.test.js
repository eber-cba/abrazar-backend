const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/prismaClient');
const bcrypt = require('bcrypt');

// The secret set in .env
const SUPERADMIN_SECRET = 'secure_super_secret_key_123';

describe('Secure SuperAdmin Mode - Integration Tests', () => {
  let adminToken;
  let adminId;
  let orgId;
  let homelessId;

  beforeAll(async () => {
    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'SuperAdmin Test Org',
        type: 'NGO',
      },
    });
    orgId = org.id;

    // Create ADMIN user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
      data: {
        email: `super-admin-${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Super Admin Candidate',
        role: 'ADMIN',
        organizationId: orgId, 
      },
    });
    adminId = admin.id;

    // Login ADMIN
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'password123' });
    adminToken = loginRes.body.token;

    // Create a homeless record in the organization
    const homeless = await prisma.homeless.create({
      data: {
        lat: -31.4201,
        lng: -64.1888,
        apodo: 'Test Subject',
        organizationId: orgId,
        registradoPor: adminId,
      },
    });
    homelessId = homeless.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.homeless.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  describe('Permission Bypass Security', () => {
    test('ADMIN WITHOUT secret header should be DENIED access to restricted route', async () => {
      // DELETE /api/homeless/:id requires COORDINATOR/ORG_ADMIN. 
      // ADMIN role itself is NOT in the list.
      // Without the secret header, bypass should NOT activate.
      
      const res = await request(app)
        .delete(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Should be 403 Forbidden because ADMIN is not in the allowed roles list 
      // and bypass is not active.
      expect(res.status).toBe(403);
    });

    test('ADMIN WITH INCORRECT secret header should be DENIED access', async () => {
      const res = await request(app)
        .delete(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'wrong-secret');

      expect(res.status).toBe(403);
    });

    test('ADMIN WITH CORRECT secret header should be GRANTED access', async () => {
      const res = await request(app)
        .delete(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', SUPERADMIN_SECRET);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });

  describe('Multi-Tenancy Bypass Security', () => {
    let otherOrgId;
    let otherHomelessId;

    beforeAll(async () => {
      // Create another organization
      const otherOrg = await prisma.organization.create({
        data: { name: 'Other Org Secure', type: 'MUNICIPALITY' },
      });
      otherOrgId = otherOrg.id;

      // Create homeless in that other org
      const homeless = await prisma.homeless.create({
        data: {
          lat: -32.0000,
          lng: -65.0000,
          apodo: 'Other Org Subject Secure',
          organizationId: otherOrgId,
          registradoPor: adminId, 
        },
      });
      otherHomelessId = homeless.id;
    });

    afterAll(async () => {
      await prisma.homeless.deleteMany({ where: { organizationId: otherOrgId } });
      await prisma.organization.delete({ where: { id: otherOrgId } });
    });

    test('ADMIN WITHOUT secret header should NOT see other org data', async () => {
      const res = await request(app)
        .get('/api/homeless')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // Should NOT find the record from the other organization
      const found = res.body.data.homeless.find(h => h.id === otherHomelessId);
      expect(found).toBeUndefined();
    });

    test('ADMIN WITH CORRECT secret header SHOULD see other org data', async () => {
      const res = await request(app)
        .get('/api/homeless')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', SUPERADMIN_SECRET);

      expect(res.status).toBe(200);
      // Should find the record from the other organization
      const found = res.body.data.homeless.find(h => h.id === otherHomelessId);
      expect(found).toBeDefined();
    });
  });
});
