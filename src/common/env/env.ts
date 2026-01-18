import { z } from 'zod';

export const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(1),
  JWT_TTL: z.string().default('1d'),
  JWT_TOKEN_AUDIENCE: z.string(),
  JWT_TOKEN_ISSUER: z.string(),

  // AWS / Storage (Optional if not always used, but kept required if critical)
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  IMAGE_BUCKET: z.string().optional(),

  // Server
  PORT: z.string().transform(Number).default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;
