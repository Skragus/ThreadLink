// tests/e2e/drone-failure-markers.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';

test.describe('Drone Failure Markers', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
  });

  test('shows failure marker for single drone failure', async ({ page }) => {
    // Mock API to fail for specific drone
    await page.route('**/v1beta/models/*/generateContent', async (route, request) => {
      const body = await request.postDataJSON();
      const text = body.contents[0].parts[0].text;
      
      // Fail if it's drone #2 (check for specific content pattern)
      if (text.includes('chunk_002') || text.includes('drone 2')) {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        });
      } else {
        // Normal response for other drones
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            candidates: [{
              content: {
                parts: [{ text: `Processed: ${text.slice(0, 50)}...` }]
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
    
    // Should contain the failure marker
    expect(output).toMatch(/\[⚠ Drone \d+ failed — Input size: \d+ tokens\]/);
    
    // Should still contain successful summaries from other drones
    expect(output).toContain('Processed:');
    expect(output).toContain('ThreadLink Context Card');
  });

  test('shows multiple failure markers for multiple drone failures', async ({ page }) => {
    // Mock API to fail for drones 2 and 4
    await page.route('**/v1beta/models/*/generateContent', async (route, request) => {
      const body = await request.postDataJSON();
      const text = body.contents[0].parts[0].text;
      
      if (text.includes('chunk_002') || text.includes('chunk_004')) {
        await route.fulfill({
          status: 429,
          body: JSON.stringify({ error: 'Rate limit exceeded' })
        });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            candidates: [{
              content: {
                parts: [{ text: `Summary of chunk` }]
              }
            }]
          })
        });
      }
    });

    await threadlink.pasteText(TEST_DATA.large.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();

    const output = await threadlink.getOutputText();
    
    // Count failure markers
    const failureMarkers = output.match(/\[⚠ Drone \d+ failed — Input size: \d+ tokens\]/g);
    expect(failureMarkers).toBeTruthy();
    expect(failureMarkers!.length).toBeGreaterThanOrEqual(2);
    
    // Verify specific drone indices
    expect(output).toMatch(/\[⚠ Drone 2 failed/);
    expect(output).toMatch(/\[⚠ Drone 4 failed/);
  });

  test('failure marker includes accurate token count', async ({ page }) => {
    // Create a known-size input
    const specificText = 'Test sentence. '.repeat(100); // ~300 tokens
    
    await page.route('**/v1beta/models/*/generateContent', async (route) => {
      await route.fulfill({
        status: 403,
        body: JSON.stringify({ error: 'Invalid API key' })
      });
    });

    await threadlink.pasteText(specificText);
    await threadlink.startProcessing();
    
    // Wait for error state
    await page.waitForSelector('text=/failed/i', { timeout: 30000 });
    
    const output = await threadlink.getOutputText();
    
    // Extract token count from failure marker
    const tokenMatch = output.match(/Input size: (\d+) tokens/);
    expect(tokenMatch).toBeTruthy();
    
    const reportedTokens = parseInt(tokenMatch![1]);
    expect(reportedTokens).toBeGreaterThan(250);
    expect(reportedTokens).toBeLessThan(350);
  });

  test('partial failures show in stats', async ({ page }) => {
    // Mock 1 out of 3 drones to fail
    let droneCount = 0;
    await page.route('**/v1beta/models/*/generateContent', async (route) => {
      droneCount++;
      if (droneCount === 2) {
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
                parts: [{ text: 'Processed successfully' }]
              }
            }]
          })
        });
      }
    });

    await threadlink.pasteText(TEST_DATA.small.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();

    // Check stats show partial success
    const statsElement = page.locator('[data-testid="stats"]');
    const statsText = await statsElement.textContent();
    
    expect(statsText).toMatch(/2\/3 drones successful/);
  });

  test('failure markers preserved in copy/download', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Force a failure
    await page.route('**/v1beta/models/*/generateContent', async (route, request) => {
      const body = await request.postDataJSON();
      if (body.contents[0].parts[0].text.includes('specific text')) {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Processing failed' })
        });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            candidates: [{
              content: {
                parts: [{ text: 'Other content processed' }]
              }
            }]
          })
        });
      }
    });

    await threadlink.pasteText('Some text\n\nspecific text that will fail\n\nMore text');
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();

    // Copy
    await threadlink.copyButton.click();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('[⚠ Drone');
    
    // Download
    const downloadPromise = page.waitForEvent('download');
    const downloadButton = page.locator('button:has-text("Download")');
    await downloadButton.click();
    const download = await downloadPromise;
    const content = await download.path().then(path => require('fs').readFileSync(path, 'utf8'));
    expect(content).toContain('[⚠ Drone');
  });
});
