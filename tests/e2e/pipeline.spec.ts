
// tests/e2e/pipeline.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';
import { expectProgressPhase, expectCompressionRatio } from './helpers/assertions';

test.describe('Core Processing Pipeline', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await setupAPIMocks(page);
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
  });

  test('process small text with progress tracking', async ({ page }) => {
    await threadlink.pasteText(TEST_DATA.small.text);
    await threadlink.startProcessing();
    
    // Check progress phases
    await expectProgressPhase(page, 'Cleaning');
    await expectProgressPhase(page, 'Processing');
    
    // Progress bar should update
    const progressBar = threadlink.progressBar;
    await expect(progressBar).toBeVisible();
    
    // Wait for completion
    await threadlink.waitForProcessingComplete();
    
    // Check compression ratio
    await expectCompressionRatio(page, 
      TEST_DATA.small.expectedRatio.min, 
      TEST_DATA.small.expectedRatio.max
    );
  });

  test('process medium text efficiently', async ({ page: _page }) => {
    await threadlink.pasteText(TEST_DATA.medium.text);
    
    const startTime = Date.now();
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    const endTime = Date.now();
    
    // Should complete in reasonable time
    const processingTime = (endTime - startTime) / 1000;
    expect(processingTime).toBeLessThan(60); // Less than 60 seconds
    
    // Check output quality
    const output = await threadlink.getOutputText();
    expect(output.length).toBeGreaterThan(100);
    expect(output.length).toBeLessThan(TEST_DATA.medium.text.length);
  });

  test('accurate token counting', async ({ page: _page }) => {
    await threadlink.pasteText(TEST_DATA.small.text);
    
    // Get initial token count
    const initialTokens = await threadlink.getTokenCounts();
    expect(initialTokens.input).toBeCloseTo(TEST_DATA.small.tokens, -2); // Within 100 tokens
    
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    // Get final token count
    const finalTokens = await threadlink.getTokenCounts();
    expect(finalTokens.output).toBeGreaterThan(0); // Should have output tokens
  });
});
