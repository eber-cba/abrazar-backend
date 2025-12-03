const { z } = require('zod');

const createCaseSchema = z.object({
  body: z.object({
    fullName: z.string({
      required_error: 'Full name is required',
    }),
    age: z.coerce.number().int().positive().optional(),
    description: z.string().optional(),
    photoUrl: z.string().url().optional(),
    lat: z.coerce.number({
        required_error: 'Latitude is required',
    }),
    lng: z.coerce.number({
        required_error: 'Longitude is required',
    }),
    status: z.enum(['REPORTED', 'VERIFIED', 'ASSISTING', 'FOLLOW_UP', 'RESOLVED']).optional(),
    isEmergency: z.string().transform(val => val === 'true').or(z.boolean()).optional(),
    emergencyLevel: z.coerce.number().int().min(1).max(5).optional(),
    reportedByConsent: z.string().transform(val => val === 'true').or(z.boolean()).optional(),
    organizationId: z.string().uuid().optional(),
    zoneId: z.string().uuid().optional(),
    assignedToUserId: z.string().uuid().optional(),
    assignedToTeamId: z.string().uuid().optional(),
  }),
});

const updateCaseSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    fullName: z.string().optional(),
    age: z.coerce.number().int().positive().optional(),
    description: z.string().optional(),
    photoUrl: z.string().url().optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    status: z.enum(['REPORTED', 'VERIFIED', 'ASSISTING', 'FOLLOW_UP', 'RESOLVED']).optional(),
    isEmergency: z.string().transform(val => val === 'true').or(z.boolean()).optional(),
    emergencyLevel: z.coerce.number().int().min(1).max(5).optional(),
    reportedByConsent: z.string().transform(val => val === 'true').or(z.boolean()).optional(),
    organizationId: z.string().uuid().optional(),
    zoneId: z.string().uuid().optional(),
    assignedToUserId: z.string().uuid().optional(),
    assignedToTeamId: z.string().uuid().optional(),
  }).partial(), // All body fields are optional for update
});

module.exports = {
  createCaseSchema,
  updateCaseSchema,
};
