// tests/e2e/setup.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { expectNoConsoleErrors } from './helpers/assertions';

test.describe('Setup and Initial Load', () => {
  test('application loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/ThreadLink/);
    
    // Check main elements are visible
    const threadlink = new ThreadLinkPage(page);
    await expect(threadlink.textEditor).toBeVisible();
    await expect(threadlink.apiKeyButton).toBeVisible();
    await expect(threadlink.settingsButton).toBeVisible();
    
    // Add some text to make the condense button visible
    await threadlink.pasteText("Test text for making the button visible");
    await expect(threadlink.condenseButton).toBeVisible();
    
    // No console errors
    await expectNoConsoleErrors(page);
  });

  test('responsive design breakpoints', async ({ page }) => {
    const threadlink = new ThreadLinkPage(page);
    await page.goto('/');
    
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(threadlink.textEditor).toBeVisible();
    
    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(threadlink.textEditor).toBeVisible();
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(threadlink.textEditor).toBeVisible();
    
    // Check mobile-specific adjustments  
    await expect(threadlink.apiKeyButton).toBeVisible();
  });
});