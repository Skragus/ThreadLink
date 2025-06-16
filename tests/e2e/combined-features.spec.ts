// tests/e2e/combined-features.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';

test.describe('Combined Feature Interactions', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
  });

  test('custom prompt with drone failures shows both features', async ({ page }) => {
    // Enable custom prompt
    await threadlink.settingsButton.click();
    await page.locator('button.getByRole('button', { name: 'Advanced Settings' })').click();
    await page.locator('[data-testid="custom-prompt-toggle"]').click();
    
    const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
    await editor.clear();
    await editor.fill('Extract key points. Max {TARGET_TOKENS} tokens.');
    await page.locator('button.getByRole('button', { name: 'Apply & Close' })').click();
    
    // Mock mixed success/failure
    let callCount = 0;
    await page.route('**/v1beta/models/*/generateContent', async (route) => {
      callCount++;
      if (callCount === 2) {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            candidates: [{
              content: {
                parts: [{ text: 'Key point extracted' }]
              }
            }]
          })
        });
      }
    });
    
    await threadlink.pasteText(TEST_DATA.medium.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    const output = await threadlink.getOutputText();
    
    // Should have both custom prompt results and failure marker
    expect(output).toContain('Key point extracted');
    expect(output).toMatch(/\[⚠ Drone \d+ failed/);
  });

  test('failure markers respect compression levels', async ({ page }) => {
    // Mock to always fail
    await page.route('**/v1beta/models/*/generateContent', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'All drones fail' })
      });
    });
    
    // Test with aggressive compression
    await threadlink.setCompressionLevel('aggressive');
    await threadlink.pasteText(TEST_DATA.small.text);
    await threadlink.startProcessing();
    
    await page.waitForSelector('text=/failed/i', { timeout: 30000 });
    
    const output = await threadlink.getOutputText();
    
    // Even with aggressive compression, failure markers should appear
    const markers = output.match(/\[⚠ Drone \d+ failed/g);
    expect(markers).toBeTruthy();
    expect(markers!.length).toBeGreaterThan(0);
  });
});