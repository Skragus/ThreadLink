// tests/e2e/mobile.spec.ts
import { test, expect, devices } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';

test.use({ ...devices['iPhone 12'] });

test.describe('Mobile Experience', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await setupAPIMocks(page);
  });

  test('responsive layout on mobile', async ({ page }) => {
    // Check header is visible
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Check buttons are accessible
    await expect(threadlink.apiKeyButton).toBeVisible();
    await expect(threadlink.settingsButton).toBeVisible();
    await expect(threadlink.infoButton).toBeVisible();
    
    // Text editor should be full width
    const textEditor = threadlink.textEditor;
    const box = await textEditor.boundingBox();
    expect(box?.width).toBeGreaterThan(300);
  });

  test('touch interactions', async ({ page }) => {
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    
    // Test tap to focus
    await threadlink.textEditor.tap();
    await expect(threadlink.textEditor).toBeFocused();
    
    // Test text input
    await page.keyboard.type('Mobile test input');
    await expect(threadlink.textEditor).toHaveValue('Mobile test input');
    
    // Test button taps
    await threadlink.condenseButton.tap();
    
    // Should start processing
    await expect(threadlink.cancelButton).toBeVisible();
  });

  test('modal interactions on mobile', async ({ page }) => {
    // Open settings
    await threadlink.settingsButton.tap();
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Modal should be fullscreen or near-fullscreen on mobile
    const modalBox = await modal.boundingBox();
    const viewportSize = page.viewportSize();
    
    expect(modalBox?.width).toBeGreaterThan(viewportSize!.width * 0.9);
    
    // Close with X button (not Escape on mobile)
    const closeButton = modal.locator('button[aria-label*="Close"]');
    await closeButton.tap();
    
    await expect(modal).not.toBeVisible();
  });

  test('virtual keyboard handling', async ({ page }) => {
    // Focus text area
    await threadlink.textEditor.tap();
    
    // Virtual keyboard should appear (simulated by viewport resize in some cases)
    // Type some text
    await page.keyboard.type('Testing keyboard');
    
    // Blur to hide keyboard
    await page.locator('header').tap();
    
    // Text should be preserved
    await expect(threadlink.textEditor).toHaveValue('Testing keyboard');
  });

  test('copy functionality on mobile', async ({ page: _page, context }) => {
    // Mobile clipboard API may require different permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    await threadlink.pasteText(TEST_DATA.tiny.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    // Copy button should work
    await threadlink.copyButton.tap();
    
    // Check for visual feedback
    const copyButton = threadlink.copyButton;
    await expect(copyButton).toContainText('✓');
  });
});