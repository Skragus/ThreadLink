
// tests/e2e/text-processing.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';
import { expectTokenCount } from './helpers/assertions';

test.describe('Text Input and Processing', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await setupAPIMocks(page);
    
    // Add valid API key
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
  });

  test('paste and process tiny text', async ({ page }) => {
    // Paste text
    await threadlink.pasteText(TEST_DATA.tiny.text);
    
    // Check token count updates
    await expectTokenCount(page, '.token-count', 10, 30);
    
    // Start processing
    await threadlink.startProcessing();
    
    // Wait for completion
    await threadlink.waitForProcessingComplete();
    
    // Check output
    const output = await threadlink.getOutputText();
    expect(output).toMatch(TEST_DATA.tiny.expectedOutputPattern);
  });

  test('handle large text input', async ({ page }) => {
    const largeText = 'This is a test sentence. '.repeat(10000);
    
    await threadlink.pasteText(largeText);
    
    // Should handle without freezing
    await expect(threadlink.textEditor).toHaveValue(largeText);
    
    // Token count should update
    await expectTokenCount(page, '.token-count', 50000, 70000);
  });  test('handle unicode and special characters', async ({ page }) => {
    await page.goto('/');
    const threadlink = new ThreadLinkPage(page);
    
    await threadlink.pasteText(TEST_DATA.unicode.text);
    
    // Start processing
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    // Check that unicode is preserved
    const output = await threadlink.getOutputText();
    for (const char of TEST_DATA.unicode.preserveChars) {
      expect(output).toContain(char);
    }
  });

  test('clear text button functionality', async ({ page }) => {
    await threadlink.pasteText('Some test text');
    
    // Find clear button
    const clearButton = page.locator('button[aria-label="Clear text"]');
    await clearButton.click();
    
    // Text should be cleared
    await expect(threadlink.textEditor).toHaveValue('');
  });
});