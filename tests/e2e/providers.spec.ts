// tests/e2e/providers.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';

test.describe('Multi-Provider Testing', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await setupAPIMocks(page);
  });

  test('Google Gemini models', async ({ page: _page }) => {
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    
    for (const model of models) {
      await threadlink.selectModel(model);
      await threadlink.pasteText(TEST_DATA.tiny.text);
      await threadlink.startProcessing();
      await threadlink.waitForProcessingComplete();
      
      const output = await threadlink.getOutputText();
      expect(output).toBeTruthy();
      
      await threadlink.resetButton.click();
    }
  });

  test('OpenAI models', async ({ page: _page }) => {
    await threadlink.addApiKey('openai', TEST_KEYS.valid.openai);
    
    const models = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
    
    for (const model of models) {
      await threadlink.selectModel(model);
      await threadlink.pasteText(TEST_DATA.tiny.text);
      await threadlink.startProcessing();
      await threadlink.waitForProcessingComplete();
      
      const output = await threadlink.getOutputText();
      expect(output).toBeTruthy();
      
      await threadlink.resetButton.click();
    }
  });

  test('Anthropic models', async ({ page: _page }) => {
    await threadlink.addApiKey('anthropic', TEST_KEYS.valid.anthropic);
    
    const models = ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'];
    
    for (const model of models) {
      await threadlink.selectModel(model);
      await threadlink.pasteText(TEST_DATA.tiny.text);
      await threadlink.startProcessing();
      await threadlink.waitForProcessingComplete();
      
      const output = await threadlink.getOutputText();
      expect(output).toBeTruthy();
      
      await threadlink.resetButton.click();
    }
  });

  test('provider switching mid-session', async ({ page: _page }) => {
    // Add all keys
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    await threadlink.addApiKey('openai', TEST_KEYS.valid.openai);
    
    // Start with Google
    await threadlink.selectModel('gemini-1.5-flash');
    await threadlink.pasteText(TEST_DATA.small.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    const googleOutput = await threadlink.getOutputText();
    
    // Switch to OpenAI
    await threadlink.resetButton.click();
    await threadlink.selectModel('gpt-4o-mini');
    await threadlink.pasteText(TEST_DATA.small.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    const openaiOutput = await threadlink.getOutputText();
    
    // Both should work
    expect(googleOutput).toBeTruthy();
    expect(openaiOutput).toBeTruthy();
  });
});

test.describe('Backend Health Check (LLM Provider)', () => {
  // Define the mock API endpoint for clarity
  const googleApiEndpoint = 'https://generativelanguage.googleapis.com/**';
  // Helper function to set up the page for a condensation attempt
  async function setupForCondensation(page: any, text = 'Sample text for processing') {
    await page.goto('/');
    // Set a dummy API key in localStorage so the 'Condense' button is enabled.
    await page.evaluate(() => {
      localStorage.setItem('threadlink_api_key_google', 'DUMMY_API_KEY');
    });
    await page.reload(); // Reload for the app to pick up the key
    await page.getByPlaceholder('Paste your AI conversation here...').fill(text);
  }

  test('should display a specific error when the LLM provider is down', async ({ page }) => {
    // Mock the Google API to be completely unavailable (503 Service Unavailable)
    await page.route(googleApiEndpoint, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'The service is currently unavailable.' } }),
      });
    });

    await setupForCondensation(page);
    await page.getByRole('button', { name: 'Condense' }).click();

    // The loading overlay should appear briefly, then disappear.
    await expect(page.locator('.loading-overlay-container')).not.toBeVisible({ timeout: 15000 });

    // Based on orchestrator.js logic, an API_ERROR should be classified and displayed.
    // The UI shows errors in the `errorRef` div.
    const errorDisplay = page.locator('div[ref="errorRef"]');
    await expect(errorDisplay).toBeVisible();
    await expect(errorDisplay).toContainText(/API provider returned an error/i);
    await expect(errorDisplay).toContainText(/Status: 503/i);
  });

  test('should perform a finite number of retries before showing a permanent error', async ({ page }) => {
    let apiCallCount = 0;
    // The config.js file specifies MAX_RETRY_ATTEMPTS. We expect 1 initial call + retries.
    // Let's assume a default of 3 total attempts (1 initial + 2 retries).
    const expectedTotalAttempts = 3; 

    // Mock the API to *always* fail, and count how many times it's called.
    await page.route(googleApiEndpoint, async (route) => {
      apiCallCount++;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Internal Server Error' } }),
      });
    });

    await setupForCondensation(page);
    await page.getByRole('button', { name: 'Condense' }).click();

    // Wait for the process to fully fail.
    const errorDisplay = page.locator('div[ref="errorRef"]');
    await expect(errorDisplay).toBeVisible({ timeout: 20000 }); // Allow time for retries
    await expect(errorDisplay).toContainText(/processing failed after multiple retries/i);
    
    // The loading overlay must be gone.
    await expect(page.locator('.loading-overlay-container')).not.toBeVisible();

    // Verify the number of attempts. The pipeline's retry logic should have limited the calls.
    expect(apiCallCount).toBe(expectedTotalAttempts);
  });

  test('should recover if the provider comes back online (no page refresh needed)', async ({ page }) => {
    let apiCallCount = 0;

    // Mock the API to fail on the first attempt, but succeed on the second.
    await page.route(googleApiEndpoint, async (route) => {
      apiCallCount++;
      if (apiCallCount === 1) {
        // First attempt: Fail
        await route.fulfill({ status: 500, body: '{"error": "Service offline"}' });
      } else {
        // Subsequent attempts: Succeed
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          // A valid-looking Gemini response structure
          body: JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Successful summary after recovery.' }] } }]
          }),
        });
      }
    });

    await setupForCondensation(page);

    // --- First Attempt (should fail) ---
    await page.getByRole('button', { name: 'Condense' }).click();
    
    // Wait for the failure message to appear.
    const errorDisplay = page.locator('div[ref="errorRef"]');
    await expect(errorDisplay).toBeVisible({ timeout: 15000 });
    await expect(errorDisplay).toContainText(/API provider returned an error/i);
    await expect(page.locator('textarea[readonly]')).not.toBeVisible();

    // --- Second Attempt (should succeed) ---
    // The user clicks "Condense" again after seeing the error.
    // The app should automatically clear the old error and retry.
    await page.getByRole('button', { name: 'Condense' }).click();
    
    // The error from the previous run should immediately disappear.
    await expect(errorDisplay).not.toBeVisible();
    
    // The process should now complete successfully.
    const outputTextarea = page.locator('textarea[readonly]');
    await expect(outputTextarea).toBeVisible({ timeout: 15000 });
    await expect(outputTextarea).toHaveValue(/Successful summary after recovery/);

    // Verify the API was called twice.
    expect(apiCallCount).toBe(2);
  });
});

