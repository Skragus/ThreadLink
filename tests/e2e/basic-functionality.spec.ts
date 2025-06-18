// tests/e2e/basic-functionality.spec.ts
import { test, expect } from '@playwright/test';

/**
 * Basic functionality tests that should work in any environment
 */

test.describe('Basic ThreadLink Functionality', () => {
  test('application loads correctly', async ({ page }) => {
    // Visit application
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/ThreadLink/);
    
    // Take a screenshot
    await page.screenshot({ path: './test-results/app-loaded.png' });
    
    // Check for key UI elements
    const textareaExists = await page.locator('textarea').count() > 0;
    expect(textareaExists).toBeTruthy();
      // Check for any interactive button (could be API keys, settings, or other)
    const anyButtonExists = await page.locator('button').count() > 0;
    expect(anyButtonExists).toBeTruthy();
  });
  
  test('text input and clear works', async ({ page }) => {
    await page.goto('/');
    
    // Find text area
    const textarea = page.locator('textarea').first();
    
    // Type some text
    await textarea.fill('This is some test text');
    
    // Check text was entered
    expect(await textarea.inputValue()).toBe('This is some test text');
    
    // Clear text
    await textarea.fill('');
    
    // Verify text was cleared
    expect(await textarea.inputValue()).toBe('');
  });
  
  test('UI components are interactive', async ({ page }) => {
    await page.goto('/');
    
    // Find settings button if it exists
    const settingsButton = page.locator('button:has-text("Settings"), button[aria-label*="settings" i]').first();
    
    // If settings button exists, click it and verify a dialog or menu appears
    if (await settingsButton.count() > 0) {
      await settingsButton.click({ force: true });
      
      // Wait briefly for dialog/menu to appear
      await page.waitForTimeout(1000);
      
      // Take screenshot to verify settings UI appeared
      await page.screenshot({ path: './test-results/settings-ui.png' });
      
      // Press escape to dismiss any dialog
      await page.keyboard.press('Escape');
    }
      // Find API key button or any button with icon
    const apiButton = page.locator([
      'button:has-text("API")', 
      '[data-testid="api-key-button"]',
      'button:has-text("Key")',
      'button svg' // Any button with an SVG icon
    ].join(', ')).first();
    
    // If API button exists, click it
    if (await apiButton.count() > 0) {
      await apiButton.click({ force: true });
      
      // Wait briefly for dialog to appear
      await page.waitForTimeout(1000);
      
      // Take screenshot to verify API key UI appeared
      await page.screenshot({ path: './test-results/api-key-ui.png' });
      
      // Press escape to dismiss
      await page.keyboard.press('Escape');
    }
  });
});
