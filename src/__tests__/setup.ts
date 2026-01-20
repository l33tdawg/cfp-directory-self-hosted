/**
 * Test Setup File
 * 
 * This file runs before all tests to set up the testing environment.
 */

import { vi } from 'vitest';

// Mock environment variables for tests
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000');
vi.stubEnv('NEXTAUTH_SECRET', 'test-secret-that-is-at-least-32-characters-long');
vi.stubEnv('NODE_ENV', 'test');
vi.stubEnv('UPLOAD_DIR', './test-uploads');
vi.stubEnv('APP_NAME', 'CFP Directory Self-Hosted (Test)');
vi.stubEnv('MAX_FILE_SIZE_MB', '100');
vi.stubEnv('ALLOWED_FILE_TYPES', 'pdf,jpg,png');

// Mock Next.js navigation (for tests that need it)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));
