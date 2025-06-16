// E2E Test: Persistence & Storage. Ideal file: tests/e2e/persistence.spec.ts
import { test, expect, Page, BrowserContext } from '@playwright/test';

// Helper functions to reduce repetition
async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
}

async function openApiKeys(page: Page) {
  await page.getByRole('button', { name: 'Manage API keys' }).click();
  await expect(page.getByRole('heading', { name: 'API Key Management' })).toBeVisible();
}

async function saveAndCloseApiKeys(page: Page) {
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'API Key Management' })).not.toBeVisible();
}

async function saveAndCloseSettings(page: Page) {
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).not.toBeVisible();
}


test.describe('Persistence Recovery & Storage Scenarios', () => {

  // Clear storage before each test for a clean slate, except for multi-tab test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Ensure localStorage is cleared for test isolation
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
  });

  test('should restore API keys from localStorage after reload', async ({ page }) => {
    const googleKey = `AIza-test-key-${Date.now()}`;

    await openApiKeys(page);

    // Enter a key and enable persistence (saving does this automatically)
    await page.getByLabel('Google API Key').fill(googleKey);
    await saveAndCloseApiKeys(page);

    // Reload the page
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Thread Link' })).toBeVisible();

    // Re-open modal and verify key is present
    await openApiKeys(page);
    await expect(page.getByLabel('Google API Key')).toHaveValue(googleKey);
  });

  test('should restore advanced settings from localStorage after reload', async ({ page }) => {
    await openSettings(page);

    // Show and modify advanced settings
    await page.getByRole('button', { name: 'Advanced Settings' }).click();
    await page.getByLabel('LLM Temperature').fill('1.2');
    await page.getByLabel('Drone Density').fill('5');
    await page.getByLabel('Max Drones Limit').fill('150');

    await saveAndCloseSettings(page);
    await page.reload();

    // Re-open and verify settings
    await openSettings(page);
    await page.getByRole('button', { name: 'Advanced Settings' }).click();
    await expect(page.getByLabel('LLM Temperature')).toHaveValue('1.2');
    await expect(page.getByLabel('Drone Density')).toHaveValue('5');
    await expect(page.getByLabel('Max Drones Limit')).toHaveValue('150');
  });

  test('should load gracefully with corrupted localStorage data', async ({ page }) => {
    // Inject invalid data *before* navigating
    await page.evaluate(() => {
      // Based on storage.js, keys are prefixed. Let's corrupt one.
      localStorage.setItem('threadlink_settings', 'this-is-not-valid-json');
    });

    await page.reload();

    // The app should not crash and should be usable.
    // A good check is that the main text area is present.
    await expect(page.getByPlaceholder('Paste your AI conversation here...')).toBeVisible();

    // Check that settings fall back to default, not a broken state.
    await openSettings(page);
    await expect(page.getByLabel('Model')).toHaveValue('gemini-1.5-flash'); // Default model
  });

  test('should handle obsolete localStorage schema without crashing', async ({ page }) => {
    // Inject data with a key that is no longer used
    await page.evaluate(() => {
      const obsoleteSettings = {
        someOldSetting: 'obsolete-value',
        anotherRemovedFeature: true,
      };
      localStorage.setItem('threadlink_settings', JSON.stringify(obsoleteSettings));
    });

    await page.reload();
    await expect(page.getByPlaceholder('Paste your AI conversation here...')).toBeVisible();

    // Check if new settings have their default values
    await openSettings(page);
    await expect(page.getByLabel('Model')).toHaveValue('gemini-1.5-flash');
    await page.getByRole('button', { name: 'Advanced Settings' }).click();
    await expect(page.getByLabel('LLM Temperature')).toHaveValue('0.5'); // Default temp
  });

  test('should not crash if localStorage saving fails (e.g., quota exceeded)', async ({ page }) => {
    let uncaughtError = null;
    page.on('pageerror', (error) => {
      uncaughtError = error;
    });

    // Mock localStorage.setItem to throw an error
    await page.evaluate(() => {
      window.localStorage.setItem = () => {
        throw new Error('Simulated Quota Exceeded');
      };
    });

    // Perform an action that triggers a save
    await openApiKeys(page);
    await page.getByLabel('OpenAI API Key').fill('sk-test-key');
    await saveAndCloseApiKeys(page);

    // The app should not have a fatal crash.
    expect(uncaughtError).toBeNull();
    // A simple assertion to confirm the page is still interactive
    await expect(page.getByRole('heading', { name: 'Thread Link' })).toBeVisible();
  });

  test('should clear in-progress job state on reload', async ({ page }) => {
    // Fill with some text to enable the condense button
    await page.getByPlaceholder('Paste your AI conversation here...').fill('Some long text to process.');
    // Mock the API to ensure the loading state is visible long enough
    // This is a client-side pipeline, so we can't mock a network call easily.
    // Instead, we'll just click and immediately reload.
    
    // Start the process
    await page.getByRole('button', { name: 'Condense' }).click();
    
    // Verify the loading overlay appears
    await expect(page.getByText('Preparing drone batches')).toBeVisible();

    // Reload the page mid-process
    await page.reload({ waitUntil: 'domcontentloaded' });
    
    // Assert the UI has reset
    await expect(page.locator('.loading-overlay-container')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Processing...' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Condense' })).toBeEnabled();
    // The input text should still be there
    await expect(page.getByPlaceholder('Paste your AI conversation here...')).toHaveValue('Some long text to process.');
  });

  test('should reflect settings changes across multiple tabs', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Go to the app in both tabs
    await page1.goto('/');
    await page2.goto('/');
    
    // Clear storage in the shared context
    await page1.evaluate(() => window.localStorage.clear());
    await page1.reload();
    await page2.reload();

    // In tab 1, change a setting
    await openSettings(page1);
    await page1.getByLabel('Model').selectOption('gpt-4o');
    await saveAndCloseSettings(page1);

    // In tab 2, reload the page to pick up the storage change
    await page2.reload();

    // Verify the change is reflected in tab 2
    await openSettings(page2);
    await expect(page2.getByLabel('Model')).toHaveValue('gpt-4o');

    await context.close();
  });
});


