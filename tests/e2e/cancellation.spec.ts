
// tests/e2e/cancellation.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';

test.describe('Cancellation and State Management', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await setupAPIMocks(page);
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
  });

  test('cancel during preprocessing', async ({ page }) => {
    await threadlink.pasteText(TEST_DATA.large.text);
    await threadlink.startProcessing();
    
    // Cancel quickly during preprocessing
    // TODO: [Test Flakiness] Replace this hardcoded wait with a specific web assertion. Ex: await expect(page.locator('...')).toBeVisible();
    await threadlink.cancelProcessing();
    
    // Should show cancelled state
    const cancelMessage = page.locator('text=/cancelled|stopped/i');
    await expect(cancelMessage).toBeVisible();
    
    // Should be able to restart
    await expect(threadlink.condenseButton).toBeEnabled();
  });

  test('cancel during drone processing', async ({ page }) => {
    await threadlink.pasteText(TEST_DATA.medium.text);
    await threadlink.startProcessing();
    
    // Wait for processing phase
    await page.waitForSelector('text=/processing|drone/i');
    await threadlink.cancelProcessing();
    
    // UI should reset
    await expect(threadlink.condenseButton).toBeEnabled();
    await expect(threadlink.cancelButton).not.toBeVisible();
  });

  test('multiple rapid cancellations', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await threadlink.pasteText(TEST_DATA.small.text);
      await threadlink.startProcessing();
      // TODO: [Test Flakiness] Replace this hardcoded wait with a specific web assertion. Ex: await expect(page.locator('...')).toBeVisible();
      await threadlink.cancelProcessing();
      // TODO: [Test Flakiness] Replace this hardcoded wait with a specific web assertion. Ex: await expect(page.locator('...')).toBeVisible();
    }
    
    // Should remain stable
    await expect(threadlink.condenseButton).toBeEnabled();
    await expect(threadlink.textEditor).toBeEnabled();
  });

  test('state persists after page reload', async ({ page }) => {
    // Add some text
    const testText = 'This text should persist';
    await threadlink.pasteText(testText);
    
    // Select specific settings
    await threadlink.selectModel('gpt-4o');
    await threadlink.setCompressionLevel('aggressive');
    
    // Reload page
    await page.reload();
    
    // Check text persists
    await expect(threadlink.textEditor).toHaveValue(testText);
    
    // Check settings persist (if implemented)
    // This depends on whether the app saves draft state
  });
});