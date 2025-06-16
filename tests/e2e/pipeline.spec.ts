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
  test('multi-phase progress tracking', async ({ page }) => {
    await threadlink.pasteText(TEST_DATA.small.text);
    
    const progressPhases: string[] = [];
    
    // Monitor progress updates by checking the loading message periodically
    const checkProgress = async () => {
      const progressElement = page.locator('[data-testid="loading-message"]');
      if (await progressElement.isVisible()) {
        const phase = await progressElement.textContent();
        if (phase && !progressPhases.includes(phase)) {
          progressPhases.push(phase);
        }
      }
    };
    
    await threadlink.startProcessing();
    
    // Check progress multiple times during processing
    const progressChecker = setInterval(checkProgress, 100);
    
    await threadlink.waitForProcessingComplete();
    clearInterval(progressChecker);
    
    // Should have gone through multiple phases
    expect(progressPhases.length).toBeGreaterThan(1);
    expect(progressPhases.some(p => p.includes('Preparing'))).toBe(true);
    expect(progressPhases.some(p => p.includes('Processing'))).toBe(true);
  });

  test('ensures chunks are stitched in the correct sequence', async ({ page: _page }) => {
    // Create test input with clear sequential markers
    const sequentialText = `CHUNK ALPHA: This section is about apples. The sky is blue. Apples are a popular fruit.

CHUNK BRAVO: This section is about bananas. Cars are fast. Bananas are yellow and sweet.

CHUNK CHARLIE: This section is about cherries. Water is wet. Cherries grow on trees.

CHUNK DELTA: This section is about dates. Mountains are tall. Dates are often dried.`;

    await threadlink.pasteText(sequentialText);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    const output = await threadlink.getOutputText();
    
    // Find positions of fruit references in the output
    const applePos = output.toLowerCase().indexOf('apple');
    const bananaPos = output.toLowerCase().indexOf('banana');
    const cherryPos = output.toLowerCase().indexOf('cherr'); // 'cherr' to catch cherry/cherries
    const datePos = output.toLowerCase().indexOf('date');
    
    // Verify all fruits are mentioned
    expect(applePos).toBeGreaterThan(-1);
    expect(bananaPos).toBeGreaterThan(-1);
    expect(cherryPos).toBeGreaterThan(-1);
    expect(datePos).toBeGreaterThan(-1);
    
    // Verify correct sequence
    expect(applePos).toBeLessThan(bananaPos);
    expect(bananaPos).toBeLessThan(cherryPos);
    expect(cherryPos).toBeLessThan(datePos);
    
    // Additional check: verify chunk markers are processed (not in output)
    expect(output).not.toContain('CHUNK ALPHA:');
    expect(output).not.toContain('CHUNK BRAVO:');
    expect(output).not.toContain('CHUNK CHARLIE:');
    expect(output).not.toContain('CHUNK DELTA:');
  });
});


