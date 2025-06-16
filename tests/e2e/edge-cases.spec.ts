// tests/e2e/edge-cases.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_KEYS, TEST_DATA } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';

test.describe('Edge Cases', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await setupAPIMocks(page);
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
  });

  test('empty paragraphs handling', async ({ page: _page }) => {
    const emptyParagraphs = '\n\n\n\n\nSome text\n\n\n\n\nMore text\n\n\n\n\n';
    
    await threadlink.pasteText(emptyParagraphs);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    const output = await threadlink.getOutputText();
    expect(output).toContain('Some text');
    expect(output).toContain('More text');
  });

  test('single character input', async ({ page }) => {
    await threadlink.pasteText('A');
    await threadlink.startProcessing();
    
    // Should show error about minimum content
    const error = page.locator('text=/too short|minimum|quality/i');
    await expect(error).toBeVisible();
  });

  test('10MB paste handling', async ({ page }) => {
    // Generate 10MB of text
    const chunk = 'Lorem ipsum dolor sit amet. '.repeat(1000);
    const largeText = chunk.repeat(400); // ~10MB
    
    // This should not crash the browser
    await threadlink.textEditor.fill(largeText);
    
    // UI should remain responsive
    await expect(threadlink.condenseButton).toBeEnabled();
    
    // Token count should update (eventually)
    // TODO: [Test Flakiness] Replace this hardcoded wait with a specific web assertion. Ex: await expect(page.locator('...')).toBeVisible();
    const tokens = await threadlink.getTokenCounts();
    expect(tokens.input).toBeGreaterThan(1000000);
  });

  test('rapid action sequences', async ({ page }) => {
    // Rapid setting changes
    for (let i = 0; i < 10; i++) {
      await threadlink.settingsButton.click();
      await page.keyboard.press('Escape');
    }
    
    // Should not break UI
    await expect(threadlink.settingsButton).toBeEnabled();
    
    // Rapid text changes
    for (let i = 0; i < 10; i++) {
      await threadlink.pasteText(`Test ${i}`);
    }
    
    // Final text should be correct
    await expect(threadlink.textEditor).toHaveValue('Test 9');
    
    // Rapid process/cancel
    for (let i = 0; i < 5; i++) {
      await threadlink.startProcessing();
      // TODO: [Test Flakiness] Replace this hardcoded wait with a specific web assertion. Ex: await expect(page.locator('...')).toBeVisible();
      await threadlink.cancelProcessing();
      // TODO: [Test Flakiness] Replace this hardcoded wait with a specific web assertion. Ex: await expect(page.locator('...')).toBeVisible();
    }
    
    // Should be in stable state
    await expect(threadlink.condenseButton).toBeEnabled();
  });

  test('browser limit testing', async ({ page }) => {
    // Test localStorage limits
    const bigData = 'x'.repeat(5 * 1024 * 1024); // 5MB
    
    try {
      await page.evaluate((data) => {
        localStorage.setItem('test_big_data', data);
      }, bigData);
    } catch (e) {
      // Should handle quota exceeded gracefully
    }
    
    // App should still work
    await threadlink.pasteText('Test after storage limit');
    await expect(threadlink.textEditor).toHaveValue('Test after storage limit');
  });

  test('mixed line endings', async ({ page: _page }) => {
    const mixedEndings = 'Line 1\r\nLine 2\rLine 3\nLine 4';
    
    await threadlink.pasteText(mixedEndings);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    const output = await threadlink.getOutputText();
    // Should normalize and process correctly
    expect(output).toBeTruthy();
    expect(output.length).toBeGreaterThan(10);
  });

  test('recursive ThreadLink output', async ({ page: _page }) => {
    // First pass
    await threadlink.pasteText(TEST_DATA.medium.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    const firstOutput = await threadlink.getOutputText();
    
    // Second pass - process the output again
    await threadlink.resetButton.click();
    await threadlink.pasteText(firstOutput);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    const secondOutput = await threadlink.getOutputText();
    
    // Should be shorter than first output
    expect(secondOutput.length).toBeLessThan(firstOutput.length);
    expect(secondOutput).toContain('ThreadLink Context Card');
  });
});