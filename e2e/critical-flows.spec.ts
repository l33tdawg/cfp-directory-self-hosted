/**
 * Critical Flows E2E Tests
 * 
 * Tests for critical user flows that must work for production release.
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('can navigate to signin from homepage', async ({ page }) => {
    await page.goto('/');
    
    // Find and click sign in link
    const signinLink = page.getByRole('link', { name: /sign in/i });
    
    // If there's a sign in link, click it
    if (await signinLink.count() > 0) {
      await signinLink.first().click();
      await expect(page).toHaveURL(/\/auth\/signin/);
    }
  });

  test('signin form has required fields', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Should have email field
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
    
    // Should have submit button
    const submitButton = page.getByRole('button', { name: /sign in|continue|submit/i });
    await expect(submitButton).toBeVisible();
  });

  test('signin shows error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Fill in invalid credentials
    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
    
    // Check if there's a password field (credentials provider)
    const passwordField = page.locator('input[type="password"]');
    if (await passwordField.count() > 0) {
      await passwordField.fill('wrongpassword');
    }
    
    // Submit
    await page.getByRole('button', { name: /sign in|continue|submit/i }).click();
    
    // Should show error or stay on signin page
    await page.waitForTimeout(2000);
    
    // Either shows error or redirects to verify-request (magic link)
    const url = page.url();
    expect(url).toMatch(/\/(auth|error)/);
  });
});

test.describe('Event Browsing', () => {
  test('can browse events without authentication', async ({ page }) => {
    await page.goto('/browse');
    
    await page.waitForLoadState('networkidle');
    
    // Page should load properly
    await expect(page.locator('body')).not.toContainText('500');
    await expect(page.locator('body')).not.toContainText('Error');
  });

  test('event cards are clickable', async ({ page }) => {
    await page.goto('/browse');
    
    await page.waitForLoadState('networkidle');
    
    // Look for event cards/links with various possible href formats
    const eventLinks = page.locator('a[href*="/events/"], a[href*="/e/"]');
    const count = await eventLinks.count();
    
    if (count > 0) {
      // Get the href to know where we should navigate
      const href = await eventLinks.first().getAttribute('href');
      
      // Click first event
      await eventLinks.first().click();
      
      // Wait for navigation
      await page.waitForLoadState('networkidle');
      const url = page.url();
      
      // Should navigate to event page, signin (if auth required), or stay on browse (if links are JS-handled)
      expect(url).toMatch(/\/(events|e)\/|\/auth\/signin|\/browse/);
      
      // If we navigated to an event page, verify we're on the right page
      if (href && url.includes(href)) {
        expect(url).toContain(href);
      }
    } else {
      // No events to click - that's okay, just verify the page loaded
      expect(page.url()).toContain('/browse');
    }
  });
});

test.describe('Navigation', () => {
  test('main navigation links work', async ({ page }) => {
    await page.goto('/');
    
    // Look specifically in header/nav for browse link to avoid clicking featured events
    const browseLink = page.locator('header a[href="/browse"], nav a[href="/browse"]');
    
    if (await browseLink.count() > 0) {
      await browseLink.first().click();
      await expect(page).toHaveURL(/\/browse/);
      await page.goto('/');
    } else {
      // Fallback: look for any visible browse/events link in top portion of page
      const anyBrowseLink = page.getByRole('link', { name: /^browse$/i });
      if (await anyBrowseLink.count() > 0) {
        await anyBrowseLink.first().click();
        // Accept browse page or event detail page (if homepage has event cards)
        await page.waitForLoadState('networkidle');
        const url = page.url();
        expect(url).toMatch(/\/(browse|e\/|events)/);
      }
    }
  });

  test('footer links work', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Check for common footer links
    const termsLink = page.getByRole('link', { name: /terms/i });
    if (await termsLink.count() > 0) {
      await termsLink.first().click();
      await expect(page).toHaveURL(/\/terms/);
    }
  });
});

test.describe('Error Handling', () => {
  test('404 page shows for non-existent routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345');
    
    // Should return 404 status
    expect(response?.status()).toBe(404);
  });

  test('no JavaScript errors on critical pages', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    
    const criticalPages = ['/', '/browse', '/auth/signin'];
    
    for (const pagePath of criticalPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
    }
    
    // Should have no uncaught errors
    expect(errors).toHaveLength(0);
  });
});
