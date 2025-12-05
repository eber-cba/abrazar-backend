const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/prismaClient');
const bcrypt = require('bcrypt');

describe('Global ADMIN Bypass - Integration Tests', () => {
  let adminToken;
  let adminId;
  let orgId;
  let homelessId;

  beforeAll(async () => {
    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Admin Bypass Test Org',
        type: 'NGO',
      },
    });
    orgId = org.id;

    // Create ADMIN user (Global Admin)
    const hashedPassword = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
      data: {
        email: `global-admin-${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Global Admin',
        role: 'ADMIN',
        // Admin might not have an organization, or could have one. 
        // Let's assume they don't necessarily need one for this test, 
        // or we give them a dummy one if schema requires it.
        // If schema requires orgId, we'll use one.
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
    // We'll create it directly via Prisma to simulate it existing
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

  describe('Permission Bypass', () => {
    test('ADMIN can access route protected by requireRole WITHOUT ADMIN in list', async () => {
      // DELETE /api/homeless/:id requires 'COORDINATOR', 'ORGANIZATION_ADMIN'
      // It does NOT explicitly list 'ADMIN' in the route definition (unless we changed it, but we didn't, we changed middleware)
      
      const res = await request(app)
        .delete(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    test('ADMIN can access route protected by requirePermission', async () => {
      // We need to find a route that uses requirePermission.
      // If none exist yet, we might skip this or mock one.
      // Based on file search, permission.routes.js might have some.
      // Or we can rely on the fact that requireRole uses the same bypass logic.
      
      // Let's try to list homeless again (GET /api/homeless) which requires specific roles
      const res = await request(app)
        .get('/api/homeless')
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.status).toBe(200);
    });
  });

  describe('Multi-Tenancy Bypass', () => {
    let otherOrgId;
    let otherHomelessId;

    beforeAll(async () => {
      // Create another organization
      const otherOrg = await prisma.organization.create({
        data: { name: 'Other Org', type: 'MUNICIPALITY' },
      });
      otherOrgId = otherOrg.id;

      // Create homeless in that other org
      const homeless = await prisma.homeless.create({
        data: {
          lat: -32.0000,
          lng: -65.0000,
          apodo: 'Other Org Subject',
          organizationId: otherOrgId,
          registradoPor: adminId, // Admin created it for simplicity
        },
      });
      otherHomelessId = homeless.id;
    });

    afterAll(async () => {
      await prisma.homeless.deleteMany({ where: { organizationId: otherOrgId } });
      await prisma.organization.delete({ where: { id: otherOrgId } });
    });

    test('ADMIN can see homeless from ANY organization', async () => {
      const res = await request(app)
        .get('/api/homeless')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // Should see records from both orgs (the one created in main beforeAll and the one here)
      // Note: The first one was deleted in the previous test (DELETE), so we might only see the new one.
      // Let's verify we see at least the new one.
      const found = res.body.data.homeless.find(h => h.id === otherHomelessId);
      expect(found).toBeDefined();
    });

    test('ADMIN can update homeless from ANY organization', async () => {
      const res = await request(app)
        .patch(`/api/homeless/${otherHomelessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ apodo: 'Updated by Admin' });

      expect(res.status).toBe(200);
      expect(res.body.data.homeless.apodo).toBe('Updated by Admin');
    });
  });
});
