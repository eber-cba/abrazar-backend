const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/prismaClient');
const { signToken } = require('../src/utils/jwt');

let userToken; 
let mockVerifyIdToken = jest.fn();

jest.mock('../src/config/firebase', () => ({
  auth: () => ({
    verifyIdToken: (...args) => mockVerifyIdToken(...args),
  }),
}));

beforeAll(async () => {
  // Comprehensive cleanup for a clean test state
  await prisma.auditLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.emergency.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.caseHistory.deleteMany();
  await prisma.caseStatusHistory.deleteMany();
  await prisma.case.deleteMany();
  await prisma.servicePoint.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Create a user for login and update tests
  const testUser = await prisma.user.create({
    data: {
      email: 'updateuser@example.com',
      password: 'password123',
      name: 'Update User',
      acceptedTerms: true,
    },
  });
  userToken = signToken(testUser.id);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Auth Module', () => {
  it('should register a new user with accepted terms', async () => {
    const res = await request(app).post('/api/auth/register').send({ // Added /api prefix
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      acceptedTerms: true,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.token).toBeDefined();
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user.acceptedTerms).toBe(true);
  });

  it('should fail to register a new user without accepted terms', async () => {
    const res = await request(app).post('/api/auth/register').send({ // Added /api prefix
      email: 'test2@example.com',
      password: 'password123',
      name: 'Test User 2',
      acceptedTerms: false,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toBe('Validation Error');
  });

  it('should login the user', async () => {
    // Wait for 1 second to ensure a new token is generated (different iat)
    await new Promise(resolve => setTimeout(resolve, 1100));

    const res = await request(app).post('/api/auth/login').send({ // Added /api prefix
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.token).toBeDefined();
  });

  it('should fail login with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ // Added /api prefix
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(res.statusCode).toBe(401);
  });

  describe('PATCH /api/auth/me', () => {
    it('should allow authenticated user to update name', async () => {
      const res = await request(app)
        .patch('/api/auth/me') // Added /api prefix
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.name).toBe('Updated Name');
    });

    it('should allow authenticated user to update email', async () => {
      const res = await request(app)
        .patch('/api/auth/me') // Added /api prefix
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'updated@example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.email).toBe('updated@example.com');
    });

    it('should return 400 if email format is invalid', async () => {
      const res = await request(app)
        .patch('/api/auth/me') // Added /api prefix
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'invalid-email' });

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
    });

    it('should return 409 if new email is already in use', async () => {
        // Create another user
        await request(app).post('/api/auth/register').send({ // Added /api prefix
            email: 'existing@example.com',
            password: 'password123',
            name: 'Existing User',
            acceptedTerms: true,
        });

        const res = await request(app)
            .patch('/api/auth/me') // Added /api prefix
            .set('Authorization', `Bearer ${userToken}`)
            .send({ email: 'existing@example.com' }); // Try to change to existing email

        expect(res.statusCode).toBe(409);
        expect(res.body.status).toBe('fail');
    });

    it('should return 400 if trying to update password directly', async () => {
      const res = await request(app)
        .patch('/api/auth/me') // Added /api prefix
        .set('Authorization', `Bearer ${userToken}`)
        .send({ password: 'newpassword123' });

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
    });

    it('should return 400 if trying to update role directly', async () => {
      const res = await request(app)
        .patch('/api/auth/me') // Added /api prefix
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'ADMIN' });

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
    });

    it('should return 401 if unauthenticated', async () => {
      const res = await request(app)
        .patch('/api/auth/me') // Added /api prefix
        .send({ name: 'Unauthorized Update' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/firebase-login', () => { // Added /api prefix
    beforeEach(() => {
        mockVerifyIdToken.mockReset(); // Reset the mock behavior
    });

    it('should register a new user via Firebase token', async () => {
      // Clear and set mock behavior for this specific test
      mockVerifyIdToken.mockReset(); 
      const idToken = 'some-valid-firebase-id-token-for-new-user';
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'firebase-new-user-uid',
        email: 'firebase.new@example.com',
        name: 'Firebase New User',
      });

      const res = await request(app)
        .post('/api/auth/firebase-login') // Added /api prefix
        .send({ idToken });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user.email).toBe('firebase.new@example.com');
      expect(res.body.data.user.acceptedTerms).toBe(true);
    });

    it('should log in an existing user via Firebase token', async () => {
      // Clear and set mock behavior for this specific test
      mockVerifyIdToken.mockReset(); 

      // First, create a user in our DB that matches a Firebase user
      await prisma.user.create({
        data: {
          email: 'firebase.existing@example.com',
          password: 'any_password', // Password not used for social login directly
          name: 'Firebase Existing User',
          acceptedTerms: true,
        },
      });

      const idToken = 'some-valid-firebase-id-token-for-existing-user';
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'firebase-existing-user-uid',
        email: 'firebase.existing@example.com',
        name: 'Firebase Existing User',
      });

      const res = await request(app)
        .post('/api/auth/firebase-login') // Added /api prefix
        .send({ idToken });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user.email).toBe('firebase.existing@example.com');
    });

    it('should return 401 for an invalid Firebase token', async () => {
      // Clear and set mock behavior for this specific test
      mockVerifyIdToken.mockReset();

      const idToken = 'some-invalid-firebase-id-token';
      mockVerifyIdToken.mockRejectedValueOnce(new Error('Firebase ID token has invalid signature.'));

      const res = await request(app)
        .post('/api/auth/firebase-login') // Added /api prefix
        .send({ idToken });

      expect(res.statusCode).toBe(401);
      expect(res.body.status).toBe('fail');
    });

    it('should return 400 if idToken is missing', async () => {
      // Clear and set mock behavior for this specific test
      mockVerifyIdToken.mockReset();
      
      const res = await request(app)
        .post('/api/auth/firebase-login') // Added /api prefix
        .send({}); // Missing idToken

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
    });
  });
});
