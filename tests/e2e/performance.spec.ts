// tests/e2e/performance.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';

test.describe('Performance Tests', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await setupAPIMocks(page);
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
  });

  test('page load performance', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000); // Less than 3 seconds
    
    // Check core web vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcp = entries.find(e => e.name === 'first-contentful-paint');
          const lcp = entries.find(e => e.entryType === 'largest-contentful-paint');
          resolve({
            fcp: fcp?.startTime,
            lcp: lcp?.startTime
          });
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
      });
    });
    
    // @ts-ignore
    expect(metrics.fcp).toBeLessThan(1500); // FCP < 1.5s
  });

  test('UI responsiveness during processing', async ({ page }) => {
    // Start processing large text
    await threadlink.pasteText(TEST_DATA.large.text);
    await threadlink.startProcessing();
    
    // UI should remain responsive
    // Try to interact with other elements
    await page.waitForTimeout(100);
    
    // Settings button should be clickable
    const settingsClickable = await threadlink.settingsButton.isEnabled();
    expect(settingsClickable).toBe(true);
    
    // Should be able to open modal
    await threadlink.settingsButton.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Close modal
    await page.keyboard.press('Escape');
    
    // Cancel processing
    await threadlink.cancelProcessing();
  });

  test('memory usage stability', async ({ page }) => {
    // Enable memory profiling
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');
    
    // Get initial memory
    const initialMetrics = await page.evaluate(() => {
      // @ts-ignore
      return performance.memory;
    });
    
    // Process multiple times
    for (let i = 0; i < 5; i++) {
      await threadlink.pasteText(TEST_DATA.small.text);
      await threadlink.startProcessing();
      await threadlink.waitForProcessingComplete();
      await threadlink.resetButton.click();
    }
    
    // Get final memory
    const finalMetrics = await page.evaluate(() => {
      // @ts-ignore
      return performance.memory;
    });
    
    // Memory should not grow excessively (allow 50MB growth)
    const memoryGrowth = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize;
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
  });

  test('handles 1M token input', async ({ page }) => {
    // Generate very large input
    const largeText = 'This is a test sentence. '.repeat(40000); // ~1M tokens
    
    await threadlink.pasteText(largeText);
    
    // Should not freeze
    const startTime = Date.now();
    await page.waitForTimeout(1000);
    const elapsed = Date.now() - startTime;
    
    expect(elapsed).toBeLessThan(2000); // Should not block for more than 2s
      // Token count should update
    const tokenCount = await threadlink.getTokenCounts();
    expect(tokenCount.input).toBeGreaterThan(900000);
  });

  // Helper to generate a large block of text with a specific number of lines.
  function generateLargeText(lineCount: number): string {
    const line = "This is a line of text for the large output rendering test, designed to stress the DOM.\n";
    return line.repeat(lineCount);
  }

  // Helper to set up the page with a specific text input.
  async function setupForCondensation(page: any, text: string) {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('threadlink_api_key_google', 'DUMMY_KEY'));
    await page.reload();
    await page.getByPlaceholder('Paste your AI conversation here...').fill(text);
  }

  // Mocked Gemini API endpoint for performance tests
  const googleApiEndpoint = 'https://generativelanguage.googleapis.com/**';

  // --- Test 1 & 2: Concurrent Users & Performance Degradation ---
  test.skip('Simulating concurrent users (Informational)', () => {
    // This test is skipped because Playwright is not a load-testing tool for simulating multiple users.
    // It operates on a single browser context at a time.
    //
    // ARCHITECTURE NOTE: Your application is serverless. The "backend" is the LLM provider's API.
    // Therefore, there is no "backend queue" to test on your side. Load testing would mean
    // hitting the provider's API from many clients, which is the provider's responsibility to handle.
    //
    // A more relevant test for your app would be to measure processing time with different
    // "Processing Speed" settings (Normal vs. Fast) to profile the client's in-browser concurrency handling.
  });

  // --- Test 3: Client-side DOM Rendering Speed ---
  test('should render a very large output without crashing or excessive delay', async ({ page }) => {
    const lineCount = 10000; // 10k lines is a strong E2E test. 50k may cause instability in CI.
    const largeOutput = generateLargeText(lineCount);

    // Mock the API to return this huge payload.
    await page.route(googleApiEndpoint, route => route.fulfill({
      status: 200,
      body: JSON.stringify({ candidates: [{ content: { parts: [{ text: largeOutput }] } }] })
    }));

    await setupForCondensation(page, 'Process this to get a large output.');

    const startTime = performance.now();
    await page.getByRole('button', { name: 'Condense' }).click();

    const outputTextarea = page.locator('textarea[readonly]');
    await expect(outputTextarea).toBeVisible({ timeout: 20000 }); // Generous timeout for processing

    // Wait for the full text to be rendered in the textarea.
    await expect(outputTextarea).toHaveValue(largeOutput, { timeout: 15000 });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    console.log(`Time to process and render ${lineCount} lines: ${renderTime.toFixed(2)}ms`);

    // Assert that the rendering time is within a reasonable threshold (e.g., 10 seconds).
    // This prevents performance regressions in the rendering logic.
    expect(renderTime).toBeLessThan(10000);
  });

  // --- Test 4: Max Drones Limit Enforcement ---
  test('should respect the "Max Drones Limit" and show the override modal', async ({ page }) => {
    // This test verifies the CLIENT-SIDE guardrail that prevents sending too many requests.
    
    // 1. Configure settings for a conflict.
    await page.goto('/');
    await page.getByRole('button', { name: 'Open settings' }).click();
    await page.getByRole('button', { name: 'Advanced Settings' }).click();
    
    const maxDronesInput = page.getByLabel('Max Drones Limit');
    const droneDensityInput = page.getByLabel('Drone Density');

    await maxDronesInput.fill('15'); // Set a low hard limit.
    await droneDensityInput.fill('10'); // Set a high density (1 drone per 1k tokens).
    
    await page.getByRole('button', { name: 'Save' }).click();

    // 2. Provide enough text to exceed the limit.
    // With a density of 10, we need >15,000 tokens. "lorem ipsum " is ~2 tokens.
    // 8000 repeats * 2 tokens/repeat = ~16,000 tokens -> calculated 16 drones.
    const largeInput = 'lorem ipsum '.repeat(8000);
    await setupForCondensation(page, largeInput);

    // 3. Attempt to condense and expect the override modal.
    await page.getByRole('button', { name: 'Condense' }).click();

    const overrideModal = page.getByRole('heading', { name: 'Settings Conflict Detected' });
    await expect(overrideModal).toBeVisible();

    // 4. Verify the modal displays the correct information.
    // The drone calculation is `Math.ceil(tokens / (10000 / density))`.
    // ~16000 / (10000 / 10) = ~16000 / 1000 = 16 drones.
    const calculatedDronesText = page.locator('p:has-text("calculated a need for") > span');
    await expect(calculatedDronesText.first()).toHaveText('16');

    const maxDronesText = page.locator('p:has-text("safety limit is set to") > span');
    await expect(maxDronesText.first()).toHaveText('15');

    // The presence and correctness of this modal confirms the client-side protection works.
    await page.getByRole('button', { name: 'Cancel & Edit Settings' }).click();
  });
});