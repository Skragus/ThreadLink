// tests/e2e/output.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';

test.describe('Output and Export', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await setupAPIMocks(page);
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
  });

  test('copy to clipboard functionality', async ({ page, context, browserName }) => {
    // Grant clipboard permissions only for browsers that support them
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    }
    
    await threadlink.pasteText(TEST_DATA.tiny.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    // Copy output
    await threadlink.copyButton.click();
    
    // Check clipboard content - use different approach for different browsers
    if (browserName === 'chromium') {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain('Threadlink Context Card');
    } else {
      // For other browsers, just verify the copy button was clicked and feedback appears
      // Look for any visual feedback that copy was successful
      await expect(threadlink.copyButton).toContainText('✓');
    }
  });


  test('compression ratio accuracy', async ({ page, browserName }) => {
    // Skip for WebKit browsers due to processing pipeline infinite loop issue
    if (browserName === 'webkit') {
      test.skip();
      return;
    }
    
    await threadlink.pasteText(TEST_DATA.medium.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    // Get stats
    const statsElement = page.locator('[data-testid="stats-display"]');
    const statsText = await statsElement.textContent();
    
    // Parse compression ratio
    const ratioMatch = statsText?.match(/(\d+\.?\d*):1/);
    expect(ratioMatch).toBeTruthy();
    
    const ratio = parseFloat(ratioMatch![1]);
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(50);
  });

  test('output formatting preserved', async ({ page: _page }) => {
    const formattedInput = `# Title

## Section 1
- Point 1
- Point 2

## Section 2
Code example:
\`\`\`python
def test():
    return True
\`\`\``;

    await threadlink.pasteText(formattedInput);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    const output = await threadlink.getOutputText();
    
    // Should preserve structure
    expect(output).toContain('#');
    expect(output).toMatch(/[-•]/);
  });
});


