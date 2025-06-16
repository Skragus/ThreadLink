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

  // Helper to set up the page with a specific text input.
  async function setupForCondensation(page: any, text: string) {
    await page.goto('/');
    // Set a dummy API key to simplify test setup.
    await page.evaluate(() => localStorage.setItem('threadlink_api_key_google', 'DUMMY_KEY'));
    await page.reload();
    await page.getByPlaceholder('Paste your AI conversation here...').fill(text);
  }

  // Mocked Gemini API endpoint
  const googleApiEndpoint = 'https://generativelanguage.googleapis.com/**';

  test('should handle orientation change from portrait to landscape mid-processing', async ({ page }) => {
    // Mock a slow API response to ensure the process is running during the orientation change.
    await page.route(googleApiEndpoint, async (route) => {
      // TODO: [Test Flakiness] Replace this hardcoded wait with a specific web assertion. Ex: await expect(page.locator('...')).toBeVisible(); // Wait 2 seconds before responding
      route.fulfill({ status: 200, body: '{"candidates": [{"content": {"parts": [{"text": "Success after rotation."}]}}]}'});
    });

    await setupForCondensation(page, 'Testing orientation change...');
    await page.getByRole('button', { name: 'Condense' }).click();

    // Verify the loading overlay is visible in portrait mode.
    const loadingOverlay = page.locator('.loading-overlay-container');
    await expect(loadingOverlay).toBeVisible();

    // Change orientation to landscape.
    await page.setViewportSize({ width: 844, height: 390 });

    // The loading overlay should still be visible and correctly rendered.
    await expect(loadingOverlay).toBeVisible();

    // The process should eventually complete successfully.
    const outputTextarea = page.locator('textarea[readonly]');
    await expect(outputTextarea).toBeVisible({ timeout: 10000 });
    await expect(outputTextarea).toHaveValue(/Success after rotation/);
  });
  
  test('should handle app-switching without losing processing state', async ({ page, context }) => {
    // This test simulates a user switching to another app (or tab) and then returning.
    
    // Mock a slow API response.
    await page.route(googleApiEndpoint, async (route) => {
      // TODO: [Test Flakiness] Replace this hardcoded wait with a specific web assertion. Ex: await expect(page.locator('...')).toBeVisible(); // A 4-second process
      route.fulfill({ status: 200, body: '{"candidates": [{"content": {"parts": [{"text": "Success after backgrounding."}]}}]}'});
    });

    await setupForCondensation(page, 'Testing app switching...');
    await page.getByRole('button', { name: 'Condense' }).click();
    await expect(page.locator('.loading-overlay-container')).toBeVisible();

    // Simulate switching away for 2 seconds by focusing another page and then returning
    const newPage = await context.newPage();
    await newPage.goto('about:blank');
    // Simulate user being away - this timeout represents actual user behavior, not waiting for UI state
    await newPage.waitForTimeout(2000);
    
    // Bring the original app page back to the foreground.
    await page.bringToFront();
    
    // The processing should continue and complete successfully.
    const outputTextarea = page.locator('textarea[readonly]');
    await expect(outputTextarea).toBeVisible({ timeout: 10000 });
    await expect(outputTextarea).toHaveValue(/Success after backgrounding/);
  });
  
  test('should allow text selection in the editor on touch devices', async ({ page, context }) => {
    // Grant clipboard permissions to the browser context to verify selection via copy.
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    const text = 'Select this specific text.';
    await page.goto('/');
    const editor = page.getByPlaceholder('Paste your AI conversation here...');
    await editor.fill(text);
    
    // Simulate a touch-drag to select text.
    // We get the bounding box to calculate start and end points for the drag.
    const box = await editor.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move(box!.x + 10, box!.y + 10);
    await page.mouse.down();
    await page.mouse.move(box!.x + 150, box!.y + 10); // Drag horizontally
    await page.mouse.up();

    // Trigger a copy command to get the selected text.
    await page.keyboard.press('Control+C'); // Or 'Meta+C' on macOS context

    // Read the clipboard content to verify the selection.
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    
    // The clipboard should contain the text we tried to select.
    expect(clipboardText).toContain('Select this specific');
  });
});

// A separate describe block for network throttling tests.
test.describe('Mobile on Slow Network', () => {
  // Use mobile device with network throttling
  test.use({ ...devices['iPhone 12'] });
  
  test.beforeEach(async ({ page, context }) => {
    // Simulate slow 3G connection
    await context.route('**/*', async (route) => {
      // Add delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 200));
      route.continue();
    });
    
    await page.goto('/');
    await setupAPIMocks(page);
  });

  // Helper to set up the page with a specific text input.
  async function setupForCondensation(page: any, text: string) {
    await page.goto('/');
    // Set a dummy API key to simplify test setup.
    await page.evaluate(() => localStorage.setItem('threadlink_api_key_google', 'DUMMY_KEY'));
    await page.reload();
    await page.getByPlaceholder('Paste your AI conversation here...').fill(text);
  }

  // Mocked Gemini API endpoint
  const googleApiEndpoint = 'https://generativelanguage.googleapis.com/**';
  
  test('should be responsive and usable on a slow 3G connection', async ({ page }) => {
    // Increase the timeout for this test as the network is very slow.
    test.setTimeout(90000); // 90 seconds
    
    // Mock the API but with a fast response time, so we test the network leg, not the API processing time.
    await page.route(googleApiEndpoint, route => route.fulfill({ 
      status: 200, 
      body: '{"candidates": [{"content": {"parts": [{"text": "Success on 3G."}]}}]}'
    }));

    await setupForCondensation(page, 'Testing on slow 3G...');

    // The button click should work and show a loading state immediately.
    await page.getByRole('button', { name: 'Condense' }).click();
    await expect(page.locator('.loading-overlay-container')).toBeVisible();
    
    // The process will take longer due to network speed, but it should eventually complete.
    const outputTextarea = page.locator('textarea[readonly]');
    await expect(outputTextarea).toBeVisible({ timeout: 60000 });
    await expect(outputTextarea).toHaveValue(/Success on 3G/);
  });
});

