const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/prismaClient');
const { signToken } = require('../src/utils/jwt');
let token;
let user;
let caseData; // Renamed from 'person' to 'caseData'

const { cleanDatabase } = require('./helpers/cleanDatabase');

beforeAll(async () => {
    // Clean database - Order matters due to foreign key constraints
    await cleanDatabase();

    const organization = await prisma.organization.create({
        data: {
            type: 'NGO',
            name: 'Test NGO',
            city: 'Test City',
        },
    });

    user = await prisma.user.create({
        data: {
            email: 'comment-test@example.com',
            password: 'password123',
            name: 'Comment Test User',
            role: 'VOLUNTEER',
            acceptedTerms: true,
            organizationId: organization.id, // Assign user to the organization
        },
    });

    token = signToken(user.id);

    // Create a Case (formerly Person) and assign to the same organization
    caseData = await prisma.case.create({
        data: {
            fullName: 'Case With Comments',
            lat: 0,
            lng: 0,
            createdBy: user.id,
            reportedByConsent: true,
            organizationId: organization.id, // Assign case to the same organization
        }
    });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Comments API', () => {
    it('should not allow an unauthenticated user to post a comment', async () => {
        const res = await request(app)
            .post(`/api/cases/${caseData.id}/comments`) // Corrected URL
            .send({ content: 'A comment from unauthenticated user' });
        
        expect(res.statusCode).toBe(401);
    });

    it('should allow an authenticated user to post a comment', async () => {
        const res = await request(app)
            .post(`/api/cases/${caseData.id}/comments`) // Corrected URL
            .set('Authorization', `Bearer ${token}`)
            .send({ content: 'This is a test comment.' });

        expect(res.statusCode).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data.comment.content).toBe('This is a test comment.');
        expect(res.body.data.comment.authorId).toBe(user.id);
        expect(res.body.data.comment.caseId).toBe(caseData.id); // Corrected property name
    });

    it('should not allow an empty comment', async () => {
        const res = await request(app)
            .post(`/api/cases/${caseData.id}/comments`) // Corrected URL
            .set('Authorization', `Bearer ${token}`)
            .send({ content: '' });

        expect(res.statusCode).toBe(400);
    });

    it('should get all comments for a case', async () => {
        const res = await request(app)
            .get(`/api/cases/${caseData.id}/comments`) // Corrected URL
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.results).toBe(1);
        expect(res.body.data.comments[0].content).toBe('This is a test comment.');
        expect(res.body.data.comments[0].author.name).toBe(user.name);
    });

    it('should sort comments by createdAt ascending', async () => {
        await prisma.comment.deleteMany({ where: { caseId: caseData.id }}); // Corrected property name

        await prisma.comment.create({
            data: {
                content: 'Second comment',
                authorId: user.id,
                caseId: caseData.id, // Corrected property name
                createdAt: new Date('2023-01-01T11:00:00.000Z')
            }
        });
        await prisma.comment.create({
            data: {
                content: 'First comment',
                authorId: user.id,
                caseId: caseData.id, // Corrected property name
                createdAt: new Date('2023-01-01T10:00:00.000Z')
            }
        });

        const res = await request(app)
            .get(`/api/cases/${caseData.id}/comments?sortBy=createdAt&sortOrder=asc`) // Corrected URL
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.results).toBe(2); 
        expect(res.body.data.comments[0].content).toBe('First comment');
        expect(res.body.data.comments[1].content).toBe('Second comment');
    });
});
