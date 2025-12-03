const { z } = require('zod');

const createPersonSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.number().int().positive().optional(),
  description: z.string().optional(),
  gender: z.string().optional(),
  status: z.enum(['MISSING', 'FOUND', 'SIGHTED', 'DECEASED']).default('MISSING'),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  }).optional(),
});

module.exports = { createPersonSchema };
