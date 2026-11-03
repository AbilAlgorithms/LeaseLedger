import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robustly load environment variables from server/.env, root .env, or process.cwd()
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(5000),
    CLIENT_URL: z.string().default(process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173'),
    MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/leaseledger'),
    JWT_ACCESS_SECRET: z.string().min(16).default('leaseledger_dev_access_secret_super_secure_key_12345'),
    JWT_REFRESH_SECRET: z.string().min(16).default('leaseledger_dev_refresh_secret_super_secure_key_67890'),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL: z.string().default('7d'),
    INVITE_TTL_DAYS: z.coerce.number().default(7),
    STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
    CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
    CLOUDINARY_API_KEY: z.string().optional().default(''),
    CLOUDINARY_API_SECRET: z.string().optional().default(''),
    SMTP_HOST: z.string().optional().default(''),
    SMTP_PORT: z.coerce.number().optional().default(587),
    SMTP_USER: z.string().optional().default(''),
    SMTP_PASS: z.string().optional().default(''),
    MAIL_FROM: z.string().default('LeaseLedger <no-reply@leaseledger.app>'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      const isDefaultUri =
        !process.env.MONGODB_URI ||
        data.MONGODB_URI === 'mongodb://127.0.0.1:27017/leaseledger' ||
        data.MONGODB_URI.includes('127.0.0.1') ||
        data.MONGODB_URI.includes('localhost');

      if (isDefaultUri) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['MONGODB_URI'],
          message:
            'CRITICAL SECURITY CONFIG: MONGODB_URI must be explicitly set to a production database URI in production mode.',
        });
      }

      const isDefaultAccess =
        !process.env.JWT_ACCESS_SECRET ||
        data.JWT_ACCESS_SECRET === 'leaseledger_dev_access_secret_super_secure_key_12345';

      if (isDefaultAccess) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_ACCESS_SECRET'],
          message:
            'CRITICAL SECURITY CONFIG: JWT_ACCESS_SECRET must be securely provided via environment variables in production mode.',
        });
      }

      const isDefaultRefresh =
        !process.env.JWT_REFRESH_SECRET ||
        data.JWT_REFRESH_SECRET === 'leaseledger_dev_refresh_secret_super_secure_key_67890';

      if (isDefaultRefresh) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message:
            'CRITICAL SECURITY CONFIG: JWT_REFRESH_SECRET must be securely provided via environment variables in production mode.',
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
