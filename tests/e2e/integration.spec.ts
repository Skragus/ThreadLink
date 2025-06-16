// tests/e2e/integration.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';

test.describe('Integration Scenarios', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await setupAPIMocks(page);
  });

  test('full workflow: paste → process → copy', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Add API key
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    
    // Paste text
    await threadlink.pasteText(TEST_DATA.medium.text);
    
    // Configure settings
    await threadlink.setCompressionLevel('balanced');
    
    // Process
    await threadlink.startProcessing();
    
    // Monitor progress
    let progressUpdates = 0;
    page.on('console', (msg) => {
      if (msg.text().includes('progress') || msg.text().includes('drone')) {
        progressUpdates++;
      }
    });
    
    await threadlink.waitForProcessingComplete();
    
    // Verify output
    const output = await threadlink.getOutputText();
    expect(output).toContain('ThreadLink Context Card');
    expect(progressUpdates).toBeGreaterThan(0);
    
    // Copy result
    await threadlink.copyButton.click();
    
    // Verify clipboard
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('ThreadLink Context Card');
  });

  test('multi-model comparison workflow', async ({ page }) => {
    // Add all API keys
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    await threadlink.addApiKey('openai', TEST_KEYS.valid.openai);
    
    const testText = TEST_DATA.small.text;
    const results: { model: string; output: string; ratio: string }[] = [];
    
    // Test with Gemini
    await threadlink.selectModel('gemini-1.5-flash');
    await threadlink.pasteText(testText);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    results.push({
      model: 'gemini-1.5-flash',
      output: await threadlink.getOutputText(),
      ratio: await page.locator('.compression-ratio').textContent() || ''
    });
    
    // Reset and test with GPT
    await threadlink.resetButton.click();
    await threadlink.selectModel('gpt-4o-mini');
    await threadlink.pasteText(testText);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    results.push({
      model: 'gpt-4o-mini',
      output: await threadlink.getOutputText(),
      ratio: await page.locator('.compression-ratio').textContent() || ''
    });
    
    // Compare results
    expect(results).toHaveLength(2);
    expect(results[0].output).not.toBe(results[1].output);
    
    // Both should produce valid output
    results.forEach(result => {
      expect(result.output).toBeTruthy();
      expect(result.output.length).toBeGreaterThan(100);
    });
  });

  test('error recovery workflow', async ({ page }) => {
    // Start with invalid key
    await threadlink.addApiKey('google', TEST_KEYS.invalid.google);
    
    await threadlink.pasteText(TEST_DATA.tiny.text);
    await threadlink.startProcessing();
    
    // Should show error
    const errorMessage = page.locator('text=/Invalid API key/i');
    await expect(errorMessage).toBeVisible();
    
    // Fix API key
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    
    // Retry processing
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    // Should succeed
    const output = await threadlink.getOutputText();
    expect(output).toBeTruthy();
  });

  test('settings change mid-process', async ({ page }) => {
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    await threadlink.pasteText(TEST_DATA.large.text);
    
    // Start with light compression
    await threadlink.setCompressionLevel('light');
    await threadlink.startProcessing();
    
    // Quickly open settings while processing
    // TODO: [Test Flakiness] Replace this hardcoded wait with a specific web assertion. Ex: await expect(page.locator('...')).toBeVisible();
    await threadlink.settingsButton.click();
    
    // Modal should open even during processing
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Close modal
    await page.keyboard.press('Escape');
    
    // Processing should continue
    await threadlink.waitForProcessingComplete();
    
    const output = await threadlink.getOutputText();
    expect(output).toBeTruthy();
  });
});
