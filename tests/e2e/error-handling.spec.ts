
// tests/e2e/error-handling.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_KEYS } from './helpers/test-data';
import { interceptAPICall } from './helpers/network';

test.describe('Error Handling', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
  });

  test('handle invalid API key error', async ({ page }) => {
    // Add invalid key
    await threadlink.addApiKey('google', TEST_KEYS.invalid.google);
    
    // Set up error response
    await interceptAPICall(page, 'google', 
      { error: { message: 'Invalid API key' } }, 
      403
    );
    
    await threadlink.pasteText('Test text');
    await threadlink.startProcessing();
    
    // Should show error message
    const errorMessage = page.locator('text=/Invalid API key|Authentication failed/i');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('handle network timeout', async ({ page }) => {
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    
    // Simulate network failure
    await page.route('**/*', async (route) => {
      // TODO: [Test Flakiness] Replace this hardcoded wait with a specific web assertion. Ex: await expect(page.locator('...')).toBeVisible(); // Longer than timeout
      await route.abort();
    });
    
    await threadlink.pasteText('Test text');
    await threadlink.startProcessing();
    
    // Should show timeout error
    const errorMessage = page.locator('text=/timeout|network|failed/i');
    await expect(errorMessage).toBeVisible({ timeout: 40000 });
  });

  test('handle rate limit gracefully', async ({ page }) => {
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    
    // Mock rate limit response
    await interceptAPICall(page, 'google', 
      { error: { message: 'Rate limit exceeded' } }, 
      429
    );
    
    await threadlink.pasteText('Test text');
    await threadlink.startProcessing();
    
    // Should show rate limit message and retry
    const rateLimitMessage = page.locator('text=/rate limit|too many requests/i');
    await expect(rateLimitMessage).toBeVisible();
  });

  test('validate empty input', async ({ page }) => {
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    
    // Try to process without text
    await threadlink.startProcessing();
    
    // Should show validation error
    const errorMessage = page.locator('text=/Please enter|empty|no text/i');
    await expect(errorMessage).toBeVisible();
    
    // Condense button should remain enabled
    await expect(threadlink.condenseButton).toBeEnabled();
  });

  test('recover from processing failure', async ({ page }) => {
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    
    // First attempt fails
    let callCount = 0;
    await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({ status: 500, body: 'Server Error' });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Success after retry' }] } }]
          })
        });
      }
    });
    
    await threadlink.pasteText('Test text');
    await threadlink.startProcessing();
    
    // Should eventually succeed
    await threadlink.waitForProcessingComplete();
    const output = await threadlink.getOutputText();
    expect(output).toContain('Success after retry');
  });
});