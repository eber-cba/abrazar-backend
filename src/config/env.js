const dotenv = require('dotenv');
const path = require('path');
const { z } = require('zod');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  SUPERADMIN_SECRET: z.string().min(1),
  SUPERADMIN_SECRET_BACKUP: z.string().optional(),
  SUPERADMIN_JTI_ENABLED: z.string().default('true').transform((val) => val === 'true'),
  SUPERADMIN_RATE_LIMIT: z.string().default('3').transform((val) => parseInt(val, 10)),
});

const envVars = envSchema.safeParse(process.env);

if (!envVars.success) {
  console.error('❌ Invalid environment variables:', envVars.error.format());
  process.exit(1);
}

module.exports = envVars.data;
