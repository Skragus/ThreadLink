// E2E Test: Offline-First & Network Behavior. Ideal file: tests/e2e/network.spec.ts
import { test, expect, Page, Route } from '@playwright/test';

// Helper to start the condensation process for network tests
async function startCondensationProcess(page: Page, text: string = 'Some sample text') {
  await page.getByPlaceholder('Paste your AI conversation here...').fill(text);
  // An API key must be present for the "Condense" button to be enabled after network restoration.
  // We'll add a dummy one to localStorage directly.
  await page.evaluate(() => {
    localStorage.setItem('threadlink_api_key_google', 'dummy-key-for-test');
  });
  await page.reload(); // Reload to ensure key is picked up by the app state
  await page.getByPlaceholder('Paste your AI conversation here...').fill(text);
  await page.getByRole('button', { name: 'Condense' }).click();
}

test.describe('Offline-First & Network Behavior', () => {

  // This group of tests handles scenarios where the app is launched without a network connection.
  test.describe('When Launched Offline', () => {
    // Go offline BEFORE each test in this block
    test.beforeEach(async ({ context }) => {
      await context.setOffline(true);
    });

    // NOTE: This test assumes an "offline banner" feature exists.
    // If this test fails, it likely indicates a need to implement this UI feedback.
    test('should display a clear "You are offline" message', async ({ page }) => {
      await page.goto('/');
      // A good implementation would use an alert role for accessibility.
      const offlineBanner = page.getByRole('alert', { name: /You are currently offline/i });
      await expect(offlineBanner).toBeVisible();
    });

    test('should disable processing-related buttons', async ({ page }) => {
      await page.goto('/');
      await page.getByPlaceholder('Paste your AI conversation here...').fill('This text cannot be processed.');
      
      const condenseButton = page.getByRole('button', { name: 'Condense' });
      await expect(condenseButton).toBeDisabled();

      // Check for a helpful tooltip explaining why it's disabled.
      await condenseButton.hover();
      await expect(page.getByRole('tooltip', { name: /network connection required/i })).toBeVisible();
    });
    
    test('should allow opening the API key modal without network errors', async ({ page }) => {
      let pageErrorOccurred = false;
      page.on('pageerror', () => { pageErrorOccurred = true; });

      await page.goto('/');
      await page.getByRole('button', { name: 'Manage API keys' }).click();
      
      await expect(page.getByRole('heading', { name: 'API Key Management' })).toBeVisible();
      expect(pageErrorOccurred).toBe(false);
    });

    test('should not enter an infinite loading state', async ({ page }) => {
        await page.goto('/');
        // The primary indicator that the app is responsive is that the main textarea is visible and interactive.
        await expect(page.getByPlaceholder('Paste your AI conversation here...')).toBeVisible();
        // And the header is present, not a loading spinner.
        await expect(page.getByRole('heading', { name: 'ThreadLink' })).toBeVisible();
    });

    // Go back online after each test in this block
    test.afterEach(async ({ context }) => {
      await context.setOffline(false);
    });
  });

  test('should detect network restoration and re-enable functionality', async ({ page, context }) => {
    // 1. Start offline
    await context.setOffline(true);
    await page.goto('/');
    await page.getByPlaceholder('Paste your AI conversation here...').fill('Some text');
    const condenseButton = page.getByRole('button', { name: 'Condense' });
    await expect(condenseButton).toBeDisabled();
    
    // 2. Go back online
    await context.setOffline(false);

    // The app should detect this. We might need a small wait for the event listener to fire.
    // A robust app would re-check connectivity and update the UI state.
    // We also need to add an API key for the button to become enabled.
    await page.evaluate(() => localStorage.setItem('threadlink_api_key_google', 'dummy-key-for-test'));
    await page.reload(); // Reload to simulate user coming back and re-engaging.
    await page.getByPlaceholder('Paste your AI conversation here...').fill('Some text');

    // 3. Assert functionality is restored
    await expect(condenseButton).toBeEnabled();
  });

  test('should show a failure state if network drops during processing', async ({ page, context }) => {
    await page.goto('/');
    
    // Mock the API to be very slow, giving us time to disconnect.
    await page.route('**/*', (route: Route) => {
        // Target the actual API calls if known, otherwise all network calls from the pipeline
        if (route.request().postData()?.includes('SYSTEM_PROMPT')) {
            setTimeout(() => {
                route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: 'mocked success' }) });
            }, 10000); // 10 second delay
        } else {
            route.continue();
        }
    });

    // Start the process
    await startCondensationProcess(page);
    await expect(page.getByText(/Preparing drone batches|Processing/)).toBeVisible();

    // Disconnect the network while the request is "in-flight"
    await context.setOffline(true);

    // The app's retry logic should fail due to no network, and an error should be displayed.
    // Based on `ThreadLink.tsx`, errors are displayed in a specific container.
    // We look for a generic network error message.
    const errorContainer = page.locator('div[ref="errorRef"]');
    await expect(errorContainer).toBeVisible({ timeout: 15000 }); // Give it time to fail
    await expect(errorContainer).toContainText(/network error|failed to fetch|processing failed/i);

    // The loading overlay should disappear
    await expect(page.locator('.loading-overlay-container')).not.toBeVisible();
  });

  test('should eventually succeed on a flaky network with retries', async ({ page }) => {
    await page.goto('/');
    let requestCount = 0;

    // Mock the API to fail the first two times, then succeed.
    await page.route('**/*', (route: Route) => {
      // We only want to intercept the LLM calls made by our pipeline
      if (route.request().postData()?.includes('SYSTEM_PROMPT')) {
        requestCount++;
        if (requestCount <= 2) {
          // Fail with a server error that should trigger a retry
          route.abort('failed'); 
        } else {
          // Succeed on the third attempt
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              candidates: [{ content: { parts: [{ text: 'Final successful summary.' }] } }]
            }),
          });
        }
      } else {
        route.continue();
      }
    });

    // Start the process
    await startCondensationProcess(page, 'This is a long text that will be processed by one drone.');
    
    // The final output should eventually be displayed in the textarea.
    const outputTextarea = page.locator('textarea[readonly]');
    await expect(outputTextarea).toBeVisible({ timeout: 20000 }); // Allow time for retries
    await expect(outputTextarea).toHaveValue(/Final successful summary/);

    // Verify that the retry mechanism was actually used.
    expect(requestCount).toBeGreaterThan(1);
  });
});
