// E2E Test: Processing Pipeline & Resilience. Ideal file: tests/e2e/pipeline-resilience.spec.ts
import { test, expect, Page, Route } from '@playwright/test';

// Helper to set up the page for a condensation attempt with a specified model and text
async function setupForCondensation(page: Page, { model = 'gemini-1.5-flash', text = 'Sample text' }) {
  await page.goto('/');
  // Set API key and model choice via localStorage for efficiency
  await page.evaluate(({ model, key }) => {
    localStorage.setItem('threadlink_api_key_google', key);
    localStorage.setItem('threadlink_settings', JSON.stringify({ model }));
  }, { model, key: 'DUMMY_API_KEY' });
  
  await page.reload();
  await page.getByPlaceholder('Paste your AI conversation here...').fill(text);
}

// Mocked Gemini API endpoint
const googleApiEndpoint = 'https://generativelanguage.googleapis.com/**';

test.describe('Processing Pipeline & Resilience', () => {

  test('should increase delay between retries (exponential backoff)', async ({ page }) => {
    let apiCallTimes: number[] = [];
    
    await page.route(googleApiEndpoint, async (route: Route) => {
      apiCallTimes.push(Date.now());
      // Fail with a retryable error
      route.fulfill({ status: 500, body: '{"error": "server error"}' });
    });

    await setupForCondensation(page, { text: 'Test exponential backoff' });
    await page.getByRole('button', { name: 'Condense' }).click();

    // Wait for the process to fail after all retries
    await expect(page.locator('div[ref="errorRef"]')).toBeVisible({ timeout: 20000 });

    // We expect at least 3 calls (1 initial + 2 retries)
    expect(apiCallTimes.length).toBeGreaterThanOrEqual(3);
    
    const delay1 = apiCallTimes[1] - apiCallTimes[0];
    const delay2 = apiCallTimes[2] - apiCallTimes[1];

    // The second delay should be significantly longer than the first
    expect(delay2).toBeGreaterThan(delay1);
    console.log(`Retry delays: ${delay1}ms, ${delay2}ms. Confirmed backoff.`);
  });

  test('should display "Retrying..." message in the UI', async ({ page }) => {
    let callCount = 0;
    await page.route(googleApiEndpoint, async (route: Route) => {
      callCount++;
      if (callCount === 1) {
        // Delay the first response to give us time to check the UI
        setTimeout(() => route.fulfill({ status: 500, body: '{"error": "transient error"}' }), 500);
      } else {
        route.fulfill({ status: 200, body: '{"candidates": [{"content": {"parts": [{"text": "Success!"}]}}]}'});
      }
    });

    await setupForCondensation(page, { text: 'Test retry UI message' });
    await page.getByRole('button', { name: 'Condense' }).click();

    // After the first failure, the UI should update. The total number of retries is likely 3 (1 initial + 2 retries).
    await expect(page.getByText(/Retrying \(1 of 2\)/i)).toBeVisible({ timeout: 10000 });

    // The process should eventually succeed.
    await expect(page.locator('textarea[readonly]')).toHaveValue(/Success!/, { timeout: 15000 });
  });

  test('should handle a drone returning a non-JSON response', async ({ page }) => {
    // This text will be split into multiple drones.
    const longText = 'Part 1. '.repeat(500) + 'Part 2. '.repeat(500) + 'Part 3. '.repeat(500);
    let droneCallCount = 0;

    await page.route(googleApiEndpoint, async (route: Route) => {
      droneCallCount++;
      if (droneCallCount === 2) {
        // The second drone fails with a malformed response
        route.fulfill({ status: 200, contentType: 'text/html', body: '<html>This is not JSON</html>' });
      } else {
        // Other drones succeed
        const requestBody = JSON.parse(route.request().postData() || '{}');
        const summary = `Summary of: ${requestBody.contents[0].parts[0].text.substring(0, 30)}...`;
        route.fulfill({ status: 200, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: summary }] } }] }) });
      }
    });

    await setupForCondensation(page, { text: longText });
    await page.getByRole('button', { name: 'Condense' }).click();

    // Wait for the stats bar to appear, which indicates completion.
    const statsBar = page.locator('div[ref="statsRef"]');
    await expect(statsBar).toBeVisible({ timeout: 20000 });
    
    // The stats should reflect that one drone failed.
    const totalDrones = droneCallCount;
    const successfulDrones = totalDrones - 1;
    await expect(statsBar).toContainText(`${successfulDrones}/${totalDrones} drones successful`);
  });

  test('should handle a drone returning an empty but successful (200 OK) response', async ({ page }) => {
    const longText = 'First chunk is fine. '.repeat(500) + 'Second chunk is empty. '.repeat(500);
    let droneCallCount = 0;

    await page.route(googleApiEndpoint, async (route: Route) => {
      droneCallCount++;
      if (droneCallCount === 2) {
        // The second drone returns a valid but empty response
        route.fulfill({ status: 200, body: '{"candidates": [{"content": {"parts": [{"text": ""}]}}]}' });
      } else {
        route.fulfill({ status: 200, body: '{"candidates": [{"content": {"parts": [{"text": "Summary of first chunk."}]}}]}'});
      }
    });

    await setupForCondensation(page, { text: longText });
    await page.getByRole('button', { name: 'Condense' }).click();

    // The process should still complete.
    await expect(page.locator('textarea[readonly]')).toBeVisible({ timeout: 20000 });
    // The final output should contain the summary from the successful drone but not the failed one.
    await expect(page.locator('textarea[readonly]')).toHaveValue(/Summary of first chunk/);
    
    // The stats bar should show all drones as "successful" because an empty response isn't a network/API failure,
    // though it contributes 0 tokens. This tests the definition of "successful".
    const statsBar = page.locator('div[ref="statsRef"]');
    await expect(statsBar).toContainText(`${droneCallCount}/${droneCallCount} drones successful`);
  });
  
  test('should correctly assemble results from out-of-order drone responses', async ({ page }) => {
    const text = 'CHUNK_1_TEXT. '.repeat(300) + 'CHUNK_2_TEXT. '.repeat(300) + 'CHUNK_3_TEXT. '.repeat(300);
    
    await page.route(googleApiEndpoint, async (route: Route) => {
      const requestBody = route.request().postData()!;
      if (requestBody.includes('CHUNK_1_TEXT')) {
        setTimeout(() => route.fulfill({ status: 200, body: '{"candidates": [{"content": {"parts": [{"text": "SUMMARY_1"}]}}]}' }), 1500); // Slowest
      } else if (requestBody.includes('CHUNK_2_TEXT')) {
        setTimeout(() => route.fulfill({ status: 200, body: '{"candidates": [{"content": {"parts": [{"text": "SUMMARY_2"}]}}]}' }), 1000); // Medium
      } else if (requestBody.includes('CHUNK_3_TEXT')) {
        setTimeout(() => route.fulfill({ status: 200, body: '{"candidates": [{"content": {"parts": [{"text": "SUMMARY_3"}]}}]}' }), 500); // Fastest
      }
    });

    await setupForCondensation(page, { text });
    await page.getByRole('button', { name: 'Condense' }).click();

    const outputTextarea = page.locator('textarea[readonly]');
    await expect(outputTextarea).toBeVisible({ timeout: 20000 });
    
    const finalOutput = await outputTextarea.inputValue();
    // The final text must be in the correct logical order, not the order of completion.
    const summary1Pos = finalOutput.indexOf('SUMMARY_1');
    const summary2Pos = finalOutput.indexOf('SUMMARY_2');
    const summary3Pos = finalOutput.indexOf('SUMMARY_3');
    
    expect(summary1Pos).toBeGreaterThan(-1);
    expect(summary2Pos).toBeGreaterThan(-1);
    expect(summary3Pos).toBeGreaterThan(-1);
    expect(summary1Pos).toBeLessThan(summary2Pos);
    expect(summary2Pos).toBeLessThan(summary3Pos);
  });

  test('should show a pre-flight error for an overly long custom prompt', async ({ page }) => {
    await setupForCondensation(page, { text: 'Some user input' });

    // Open settings and enable custom prompt
    await page.getByRole('button', { name: 'Open settings' }).click();
    await page.getByRole('button', { name: 'Advanced Settings' }).click();
    // This is the toggle button next to "Custom System Prompt"
    const customPromptToggle = page.getByRole('button', { name: 'Custom System Prompt' });
    await customPromptToggle.click();
    
    // The editor opens. We enter a massive prompt.
    await expect(page.getByRole('heading', { name: 'FIRST TIME WARNING' })).toBeVisible();
    await page.getByRole('button', { name: 'I Accept All Risks' }).click();

    const massivePrompt = 'This is a very long prompt. '.repeat(10000); // ~200k chars
    await page.locator('textarea[placeholder="Enter your custom prompt..."]').fill(massivePrompt);
    await page.getByRole('button', { name: 'Apply & Close' }).click();
    
    // Close settings modal
    await page.getByRole('button', { name: 'Save' }).click();

    // Try to condense. The app should catch this before making an API call.
    await page.getByRole('button', { name: 'Condense' }).click();

    // Expect an immediate error in the main UI without a loading overlay.
    const errorDisplay = page.locator('div[ref="errorRef"]');
    await expect(errorDisplay).toBeVisible();
    await expect(errorDisplay).toContainText(/Custom prompt is too long/i);
    await expect(page.locator('.loading-overlay-container')).not.toBeVisible();
  });

  // Note: True stress tests are hard in E2E. This test verifies the app doesn't crash on large inputs.
  test('should not crash when processing a very long, unbroken paragraph', async ({ page }) => {
    // A 5M char string would make the test very slow/unreliable. 100k is a good proxy for E2E.
    const hugeParagraph = 'longword'.repeat(20000); // 160k characters
    
    // We will just mock the API to return success to test the *pre-processing* part.
    await page.route(googleApiEndpoint, route => route.fulfill({ status: 200, body: '{"candidates": [{"content": {"parts": [{"text": "summary"}]}}]}'}));

    await setupForCondensation(page, { text: hugeParagraph });
    await page.getByRole('button', { name: 'Condense' }).click();

    // The main assertion is that the process completes and the browser doesn't crash.
    // Seeing the stats bar is a good sign of successful completion.
    await expect(page.locator('div[ref="statsRef"]')).toBeVisible({ timeout: 30000 });
  });

});


