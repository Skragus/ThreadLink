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
    // Take screenshot before pasting
    await page.screenshot({ path: './test-results/before-paste.png' });
    
    // Paste text
    await threadlink.pasteText(TEST_DATA.tiny.text);
    
    // Take screenshot after pasting
    await page.screenshot({ path: './test-results/after-paste.png' });
    
    // Check token count updates
    await expectTokenCount(page, '[data-testid="token-count"], .token-count', 10, 30);
    
    // Start processing - make sure the button is enabled first
    await expect(threadlink.condenseButton).toBeEnabled({ timeout: 5000 });
    await threadlink.startProcessing();
    
    // Wait for completion
    await threadlink.waitForProcessingComplete(30000);
    
    // Check output
    const output = await threadlink.getOutputText();
    expect(output).toMatch(TEST_DATA.tiny.expectedOutputPattern);
  });

  test('handle large text input', async ({ page }) => {
    const largeText = 'This is a test sentence. '.repeat(10000);
    
    // Take screenshot before pasting large text
    await page.screenshot({ path: './test-results/before-large-paste.png' });
    
    await threadlink.pasteText(largeText);
    
    // Take screenshot after pasting large text
    await page.screenshot({ path: './test-results/after-large-paste.png' });
    
    // Should handle without freezing - check textarea has content
    const textareaValue = await threadlink.textEditor.inputValue();
    expect(textareaValue.length).toBeGreaterThan(10000);
    
    // Token count should update
    await expectTokenCount(page, '[data-testid="token-count"], .token-count', 50000, 70000);
  });

  test('handle unicode and special characters', async ({ page }) => {
    await threadlink.pasteText(TEST_DATA.unicode.text);
    
    // Start processing
    await expect(threadlink.condenseButton).toBeEnabled({ timeout: 5000 });
    await threadlink.startProcessing();
    
    await threadlink.waitForProcessingComplete(30000);
    
    // Check that unicode is preserved
    const output = await threadlink.getOutputText();
    for (const char of TEST_DATA.unicode.preserveChars) {
      expect(output).toContain(char);
    }
  });

  test('clear text button functionality', async ({ page }) => {
    await threadlink.pasteText('Some test text');
    
    // Find clear button (more robust selector)
    const clearButton = page.locator('button[aria-label="Clear text"], button:has-text("Clear")');
    
    // Take screenshot before clearing
    await page.screenshot({ path: './test-results/before-clear.png' });
    
    await expect(clearButton).toBeEnabled();
    await clearButton.click({ force: true });
    
    // Take screenshot after clearing
    await page.screenshot({ path: './test-results/after-clear.png' });
    
    // Text should be cleared
    await expect(threadlink.textEditor).toHaveValue('');
  });
});

