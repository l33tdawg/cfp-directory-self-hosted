/**
 * Public Pages E2E Tests
 * 
 * Tests for pages that don't require authentication.
 */

import { test, expect } from '@playwright/test';

test.describe('Public Pages', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Should have a title
    await expect(page).toHaveTitle(/CFP/i);
    
    // Should load without JavaScript errors
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('signin page loads', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Should show sign in form
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test('signup page loads', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // Should show signup form or redirect if disabled
    await page.waitForLoadState('networkidle');
    
    // Either signup form or signin page (if signup disabled)
    const url = page.url();
    expect(url).toMatch(/\/(auth\/(signup|signin)|setup)/);
  });

  test('browse events page loads', async ({ page }) => {
    await page.goto('/browse');
    
    // Should show events listing
    await page.waitForLoadState('networkidle');
    
    // Page should load without 404
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('404');
  });
});

test.describe('Authentication Redirects', () => {
  test('dashboard redirects to signin when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to signin
    await page.waitForURL(/\/auth\/signin/);
    expect(page.url()).toContain('/auth/signin');
  });

  test('admin pages redirect to signin when not authenticated', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Should redirect to signin
    await page.waitForURL(/\/auth\/signin/);
    expect(page.url()).toContain('/auth/signin');
  });

  test('settings page redirects to signin when not authenticated', async ({ page }) => {
    await page.goto('/settings');
    
    // Should redirect to signin
    await page.waitForURL(/\/auth\/signin/);
    expect(page.url()).toContain('/auth/signin');
  });
});
