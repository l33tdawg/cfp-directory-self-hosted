/**
 * Admin Routes E2E Tests
 * 
 * Tests to verify admin routes exist and behave correctly.
 * These tests check route existence and basic functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Route Existence', () => {
  // These tests verify routes exist (no 404)
  // They should redirect to signin, not show 404
  
  test('admin users page route exists', async ({ page }) => {
    const response = await page.goto('/admin/users');
    
    // Should redirect to signin (302) not 404
    expect(response?.status()).not.toBe(404);
    
    // Should redirect to auth
    await page.waitForURL(/\/auth\/signin/);
  });

  test('admin users invite page route exists', async ({ page }) => {
    // This was the bug we fixed - this route was missing
    const response = await page.goto('/admin/users/invite');
    
    // Should redirect to signin (302) not 404
    expect(response?.status()).not.toBe(404);
    
    // Should redirect to auth
    await page.waitForURL(/\/auth\/signin/);
  });

  test('admin analytics page route exists', async ({ page }) => {
    const response = await page.goto('/admin/analytics');
    
    expect(response?.status()).not.toBe(404);
    await page.waitForURL(/\/auth\/signin/);
  });

  test('admin email templates page route exists', async ({ page }) => {
    const response = await page.goto('/admin/email-templates');
    
    expect(response?.status()).not.toBe(404);
    await page.waitForURL(/\/auth\/signin/);
  });

  test('admin topics page route exists', async ({ page }) => {
    const response = await page.goto('/admin/topics');
    
    expect(response?.status()).not.toBe(404);
    await page.waitForURL(/\/auth\/signin/);
  });

  test('admin reviewers page route exists', async ({ page }) => {
    const response = await page.goto('/admin/reviewers');
    
    expect(response?.status()).not.toBe(404);
    await page.waitForURL(/\/auth\/signin/);
  });

  test('settings page route exists', async ({ page }) => {
    const response = await page.goto('/settings');
    
    expect(response?.status()).not.toBe(404);
    await page.waitForURL(/\/auth\/signin/);
  });
});

test.describe('API Routes', () => {
  test('SMTP settings API returns 401 when not authenticated', async ({ request }) => {
    // This was the bug we fixed - it was returning 500 due to redirect()
    const response = await request.post('/api/settings/smtp', {
      data: { action: 'test-connection' },
    });
    
    // Should be 401 Unauthorized, not 500
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    // API may return "Unauthorized" or "Authentication required"
    expect(data.error).toMatch(/Unauthorized|Authentication required/i);
  });

  test('Admin invite API returns 401 when not authenticated', async ({ request }) => {
    const response = await request.post('/api/admin/users/invite', {
      data: { email: 'test@example.com', role: 'USER' },
    });
    
    expect(response.status()).toBe(401);
  });

  test('Admin users API returns 401 when not authenticated', async ({ request }) => {
    const response = await request.get('/api/admin/users');
    
    expect(response.status()).toBe(401);
  });

  test('Health check API is accessible', async ({ request }) => {
    const response = await request.get('/api/health');
    
    // Health check should be public
    expect(response.status()).toBe(200);
  });
});
