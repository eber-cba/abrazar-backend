const { z } = require('zod');

const createPersonSchema = z.object({
  body: z.object({
    fullName: z.string().min(1, 'Full name is required'),
    age: z.number().int().optional(),
    description: z.string().optional(),
    photoUrl: z.string().url().optional(),
    lat: z.number({ required_error: 'Latitude is required' }),
    lng: z.number({ required_error: 'Longitude is required' }),
    status: z.enum(['REPORTED', 'VERIFIED', 'ASSISTING', 'FOLLOW_UP', 'RESOLVED']).optional(),
  }),
});

const updatePersonSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    fullName: z.string().min(1).optional(),
    age: z.number().int().optional(),
    description: z.string().optional(),
    photoUrl: z.string().url().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    status: z.enum(['REPORTED', 'VERIFIED', 'ASSISTING', 'FOLLOW_UP', 'RESOLVED']).optional(),
  }),
});

const getPersonSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

module.exports = {
  createPersonSchema,
  updatePersonSchema,
  getPersonSchema,
};
