import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Check if we should skip starting a dev server (e.g., when using Docker)
const SKIP_WEBSERVER = process.env.PLAYWRIGHT_SKIP_WEBSERVER === 'true';

/**
 * Playwright E2E Test Configuration
 * 
 * Run tests with: npm run test:e2e
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  
  /* Global timeout for each test */
  timeout: 30000,
  
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    // Main test project - Chromium only for speed during development
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },

    // Uncomment these for full cross-browser testing in CI
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    //   dependencies: ['setup'],
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    //   dependencies: ['setup'],
    // },
  ],

  /* Run your local dev server before starting the tests */
  /* Set PLAYWRIGHT_SKIP_WEBSERVER=true when server is already running (e.g., Docker) */
  webServer: SKIP_WEBSERVER ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000, // 2 minutes to start server
  },
});
