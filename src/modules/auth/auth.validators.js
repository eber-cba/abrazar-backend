const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().optional(),
    role: z.enum(['ADMIN', 'OPERATOR', 'VOLUNTEER', 'PUBLIC']).optional(), // Optional for now, maybe restrict who can set role
    acceptedTerms: z.boolean({ required_error: "You must accept the terms and conditions" }).refine(val => val === true, {
        message: "You must accept the terms and conditions"
    }),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

const updateMeSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
  }).strict(),
});

const firebaseLoginSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, 'Firebase ID Token is required'),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateMeSchema,
  firebaseLoginSchema,
};
