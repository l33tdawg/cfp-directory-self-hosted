/**
 * Environment configuration with validation
 * 
 * This module provides type-safe access to environment variables
 * with runtime validation to catch configuration errors early.
 */

import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),
  
  // Authentication
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  
  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.enum(['true', 'false']).optional().default('false'),
  EMAIL_FROM: z.string().email().optional().default('noreply@example.com'),
  
  // File Storage
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.string().default('100'),
  ALLOWED_FILE_TYPES: z.string().default('pdf,pptx,ppt,odp,key,doc,docx,mp4,webm,jpg,jpeg,png,gif'),
  
  // Application
  APP_NAME: z.string().default('CFP System'),
  APP_URL: z.string().url().optional(),
  
  // Federation (optional)
  FEDERATION_LICENSE_KEY: z.string().optional(),
  CFP_DIRECTORY_API_URL: z.string().url().default('https://cfp.directory/api/federation/v1'),
  
  // Development
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Parse and validate environment variables
function getEnv() {
  const parsed = envSchema.safeParse(process.env);
  
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
  
  // Environment
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
};

export type Config = typeof config;
