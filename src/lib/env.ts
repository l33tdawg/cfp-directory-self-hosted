/**
 * Environment configuration with validation
 * 
 * This module provides type-safe access to environment variables
 * with runtime validation to catch configuration errors early.
 */

import { z } from 'zod';

// Check if we're in a build context (missing required vars but building)
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
  (!process.env.DATABASE_URL && !process.env.NEXTAUTH_URL);

// Schema for build time (all optional with defaults)
const buildEnvSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://placeholder:placeholder@localhost:5432/placeholder'),
  NEXTAUTH_URL: z.string().default('http://localhost:3000'),
  NEXTAUTH_SECRET: z.string().default('placeholder-secret-for-build-only-32chars'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.enum(['true', 'false']).optional().default('false'),
  EMAIL_FROM: z.string().optional().default('noreply@example.com'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.string().default('100'),
  ALLOWED_FILE_TYPES: z.string().default('pdf,pptx,ppt,odp,key,doc,docx,mp4,webm,jpg,jpeg,png,gif'),
  APP_NAME: z.string().default('CFP Directory Self-Hosted'),
  APP_URL: z.string().optional(),
  FEDERATION_LICENSE_KEY: z.string().optional(),
  CFP_DIRECTORY_API_URL: z.string().default('https://cfp.directory/api/federation/v1'),
  ENCRYPT_PII_AT_REST: z.enum(['true', 'false']).optional(),
  CRON_SECRET: z.string().optional(),
  JOB_WORKER_INTERVAL_SECONDS: z.string().optional(),
  ALLOW_PUBLIC_SIGNUP: z.enum(['true', 'false']).optional().default('false'),
  SETUP_TOKEN: z.string().optional(),
  TRUST_PROXY_HEADERS: z.enum(['true', 'false']).optional().default('false'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Schema for runtime (required vars must be present)
const runtimeEnvSchema = z.object({
  // Database (postgresql:// URLs don't pass standard URL validation)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required').refine(
    (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
    'DATABASE_URL must be a valid PostgreSQL connection string'
  ),
  
  // Authentication
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  
  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.enum(['true', 'false']).optional().default('false'),
  EMAIL_FROM: z.string().optional().default('noreply@example.com'),
  
  // File Storage
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.string().default('100'),
  ALLOWED_FILE_TYPES: z.string().default('pdf,pptx,ppt,odp,key,doc,docx,mp4,webm,jpg,jpeg,png,gif'),
  
  // Application
  APP_NAME: z.string().default('CFP Directory Self-Hosted'),
  APP_URL: z.string().url().optional(),
  
  // Federation (optional)
  FEDERATION_LICENSE_KEY: z.string().optional(),
  CFP_DIRECTORY_API_URL: z.string().url().default('https://cfp.directory/api/federation/v1'),
  
  // Security
  ENCRYPT_PII_AT_REST: z.enum(['true', 'false']).optional(), // Defaults to 'true' in production
  CRON_SECRET: z.string().optional(), // Secret for authenticating cron job requests (optional with internal worker)

  // Background Jobs
  JOB_WORKER_INTERVAL_SECONDS: z.string().optional(), // Internal job worker polling interval (default: 30)
  
  // Registration/Setup Security
  ALLOW_PUBLIC_SIGNUP: z.enum(['true', 'false']).optional().default('false'), // Default: require invitations
  SETUP_TOKEN: z.string().optional(), // One-time token required for initial setup (recommended)
  TRUST_PROXY_HEADERS: z.enum(['true', 'false']).optional().default('false'), // Only trust CF/proxy headers if explicitly enabled
  
  // Development
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Parse and validate environment variables
function getEnv() {
  // Use lenient schema during build time
  const schema = isBuildTime ? buildEnvSchema : runtimeEnvSchema;
  const parsed = schema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  
  return parsed.data;
}

// Export validated environment
export const env = getEnv();

// Derived configuration
export const config = {
  // Database
  databaseUrl: env.DATABASE_URL,
  
  // Auth
  nextAuthUrl: env.NEXTAUTH_URL,
  nextAuthSecret: env.NEXTAUTH_SECRET,
  
  // Email
  email: {
    enabled: Boolean(env.SMTP_HOST),
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT, 10),
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    secure: env.SMTP_SECURE === 'true',
    from: env.EMAIL_FROM,
  },
  
  // Storage
  storage: {
    uploadDir: env.UPLOAD_DIR,
    maxFileSizeMB: parseInt(env.MAX_FILE_SIZE_MB, 10),
    maxFileSizeBytes: parseInt(env.MAX_FILE_SIZE_MB, 10) * 1024 * 1024,
    allowedTypes: env.ALLOWED_FILE_TYPES.split(',').map(t => t.trim()),
  },
  
  // Application
  app: {
    name: env.APP_NAME,
    url: env.APP_URL || env.NEXTAUTH_URL,
  },
  
  // Federation
  federation: {
    enabled: Boolean(env.FEDERATION_LICENSE_KEY),
    licenseKey: env.FEDERATION_LICENSE_KEY,
    apiUrl: env.CFP_DIRECTORY_API_URL,
  },
  
  // Security
  security: {
    // PII encryption: enabled by default in production, can be overridden
    encryptPiiAtRest: env.ENCRYPT_PII_AT_REST === 'true' || 
      (env.ENCRYPT_PII_AT_REST !== 'false' && env.NODE_ENV === 'production'),
  },
  
  // Cron
  cronSecret: env.CRON_SECRET,
  
  // Registration/Setup
  allowPublicSignup: env.ALLOW_PUBLIC_SIGNUP === 'true',
  setupToken: env.SETUP_TOKEN,
  trustProxyHeaders: env.TRUST_PROXY_HEADERS === 'true',
  
  // Environment
  nodeEnv: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
};

export type Config = typeof config;
