const request = require('supertest');
const app = require('../../src/app');
const { PrismaClient } = require('@prisma/client');
const { signToken } = require('../../src/utils/jwt');
const path = require('path');

const prisma = new PrismaClient();

// Mock Cloudinary
jest.mock('../../src/config/cloudinary', () => ({
  uploadImage: jest.fn().mockResolvedValue({
    url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/abrazar/test/image.jpg',
    publicId: 'abrazar/test/image',
    width: 800,
    height: 600,
    format: 'jpg'
  }),
  deleteImage: jest.fn().mockResolvedValue({ result: 'ok' }),
  getThumbnailUrl: jest.fn().mockReturnValue('https://res.cloudinary.com/demo/image/upload/c_fill,w_150,h_150/v1234567890/abrazar/test/image.jpg'),
    organization = await prisma.organization.create({
      data: {
        name: 'Upload Test Org',
        type: 'NGO',
      },
    });

    // Create Admin User
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@upload.test',
        password: 'password123',
        name: 'Admin User',
        role: 'ORGANIZATION_ADMIN',
        organizationId: organization.id,
        acceptedTerms: true,
      },
    });

    adminToken = signToken(adminUser.id);
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  describe('Homeless Image Upload', () => {
    test('should upload image when creating homeless record', async () => {
      // Create a dummy buffer for the image
      const buffer = Buffer.from('fake-image-content');

      const res = await request(app)
        .post('/api/homeless')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('nombre', 'Juan')
        .field('apellido', 'Perez')
        .field('lat', -31.4201)
        .field('lng', -64.1888)
        .attach('foto', buffer, 'test-image.jpg');

      expect(res.status).toBe(201);
      expect(res.body.data.homeless.fotoUrl).toBeDefined();
      expect(res.body.data.homeless.fotoUrl).toContain('cloudinary.com');
    });

    test('should update image for homeless record', async () => {
      // First create a homeless record without image
      const homeless = await prisma.homeless.create({
        data: {
          nombre: 'Pedro',
          apellido: 'Gomez',
          lat: -31.4201,
          lng: -64.1888,
          organizationId: organization.id,
          registradoPor: adminUser.id,
        },
      });

      const buffer = Buffer.from('new-image-content');

      const res = await request(app)
        .patch(`/api/homeless/${homeless.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('foto', buffer, 'new-image.jpg');

      expect(res.status).toBe(200);
      expect(res.body.data.homeless.fotoUrl).toContain('cloudinary.com');
    });
  });

  describe('User Profile Photo Upload', () => {
    test('should upload profile photo', async () => {
      const buffer = Buffer.from('profile-photo-content');

      const res = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('photo', buffer, 'profile.jpg');

      expect(res.status).toBe(200);
      expect(res.body.data.user.photoUrl).toBeDefined();
      expect(res.body.data.user.photoUrl).toContain('cloudinary.com');
    });
  });

  describe('Case Image Upload', () => {
    test('should upload image when creating case', async () => {
      const buffer = Buffer.from('case-image-content');

      const res = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('fullName', 'Caso Test')
        .field('lat', -31.4201)
        .field('lng', -64.1888)
        .field('description', 'Test case with image')
        .attach('photo', buffer, 'case.jpg');

      expect(res.status).toBe(201);
      expect(res.body.data.case.photoUrl).toBeDefined();
      expect(res.body.data.case.photoUrl).toContain('cloudinary.com');
    });
  });
});
