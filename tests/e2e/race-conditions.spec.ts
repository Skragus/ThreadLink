// tests/e2e/race-conditions.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';

test.describe('Race Conditions and Concurrent Operations', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await setupAPIMocks(page);
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
  });

  test('handles text change during active processing', async ({ page }) => {
    // Start processing large text
    await threadlink.pasteText(TEST_DATA.large.text);
    await threadlink.startProcessing();
    
    // Wait for processing to actually start
    await expect(threadlink.loadingOverlay).toBeVisible();
    await page.waitForTimeout(500); // Let some drones start
    
    // Try to paste new text while processing
    const newText = 'This is completely different text that should not corrupt the state';
    await threadlink.textEditor.fill(newText);
    
    // Check state consistency
    // Either: processing continues with original text, or it's cleanly canceled
    
    // Option 1: Processing continues (text area should be read-only)
    const isReadOnly = await threadlink.textEditor.getAttribute('readonly');
    if (isReadOnly !== null) {
      // Text area is locked, wait for completion
      await threadlink.waitForProcessingComplete();
      
      // Output should be from original text, not new text
      const output = await threadlink.getOutputText();
      expect(output).not.toContain('completely different text');
      expect(output).toContain('ThreadLink Context Card');
      
      // After completion, text area should show output, not the attempted new text
      const displayedText = await threadlink.textEditor.inputValue();
      expect(displayedText).toBe(output);
    } else {
      // Option 2: Processing was canceled
      // UI should be in a clean state ready for new processing
      await expect(threadlink.condenseButton).toBeEnabled();
      await expect(threadlink.loadingOverlay).not.toBeVisible();
      
      // New text should be preserved
      const currentText = await threadlink.textEditor.inputValue();
      expect(currentText).toBe(newText);
    }
  });

  test('prevents double-click processing', async ({ page }) => {
    await threadlink.pasteText(TEST_DATA.small.text);
    
    // Track API calls
    let apiCallCount = 0;
    await page.route('**/v1beta/models/*/generateContent', async (route) => {
      apiCallCount++;
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{ text: `Response ${apiCallCount}` }]
            }
          }]
        })
      });
    });
    
    // Double-click condense button rapidly
    await threadlink.condenseButton.dblclick();
    
    // Wait a bit for any duplicate processing to start
    await page.waitForTimeout(1000);
    
    // Should only process once
    await threadlink.waitForProcessingComplete();
    
    // API should not be called twice for the same chunks
    expect(apiCallCount).toBeLessThan(TEST_DATA.small.expectedDrones * 2);
  });

  test('handles rapid cancel and restart', async ({ page }) => {
    await threadlink.pasteText(TEST_DATA.medium.text);
    
    // Start, cancel, restart multiple times rapidly
    for (let i = 0; i < 3; i++) {
      await threadlink.startProcessing();
      await page.waitForTimeout(200); // Let it start
      await threadlink.cancelProcessing();
      await page.waitForTimeout(100); // Brief pause
    }
    
    // Final processing attempt
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    // Should complete successfully without corruption
    const output = await threadlink.getOutputText();
    expect(output).toContain('ThreadLink Context Card');
    
    // Stats should be coherent
    const stats = await page.locator('[data-testid="stats"]').textContent();
    expect(stats).toMatch(/\d+\/\d+ drones successful/);
  });

  test('handles settings change during processing', async ({ page }) => {
    await threadlink.pasteText(TEST_DATA.medium.text);
    await threadlink.startProcessing();
    
    // Wait for processing to start
    await expect(threadlink.loadingOverlay).toBeVisible();
    await page.waitForTimeout(500);
    
    // Try to change settings mid-process
    await threadlink.settingsButton.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
      // Try to change model
    const modelSelect = page.locator('select[id="model-select"]');
    // Store original model (not used in this test, but available if needed)
    await modelSelect.inputValue();
    await modelSelect.selectOption('gpt-4o-mini');
    
    // Close settings
    await page.keyboard.press('Escape');
    
    // Wait for processing to complete
    await threadlink.waitForProcessingComplete();
    
    // Check that the process completed with original settings
    // (changing settings mid-process shouldn't affect current run)
    const output = await threadlink.getOutputText();
    expect(output).toBeTruthy();
    
    // New processing should use new settings
    await threadlink.resetButton.click();
    await threadlink.pasteText('Test with new model');
    
    // Verify new model is selected
    await threadlink.settingsButton.click();
    const currentModel = await modelSelect.inputValue();
    expect(currentModel).toBe('gpt-4o-mini');
    await page.keyboard.press('Escape');
  });

  test('handles browser back button during processing', async ({ page }) => {
    await threadlink.pasteText(TEST_DATA.small.text);
    await threadlink.startProcessing();
    
    // Wait for processing to start
    await expect(threadlink.loadingOverlay).toBeVisible();
    
    // Try to navigate back
    await page.goBack();
    
    // Should either prevent navigation or handle gracefully
    // Check if we're still on the same page
    const url = page.url();
    if (url.includes('localhost') || url.includes('threadlink')) {
      // Still on ThreadLink, processing should continue or be canceled cleanly
      const isProcessing = await threadlink.loadingOverlay.isVisible();
      if (isProcessing) {
        await threadlink.waitForProcessingComplete();
      }
      
      // UI should be in a valid state
      await expect(threadlink.textEditor).toBeVisible();
      await expect(threadlink.condenseButton).toBeVisible();
    }
  });

  test('handles concurrent API key changes', async ({ page }) => {
    await threadlink.pasteText(TEST_DATA.small.text);
    await threadlink.startProcessing();
    
    // Immediately try to change API key
    await threadlink.apiKeyButton.click();
    
    // Modal should open even during processing
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Try to delete the API key being used
    const deleteButton = page.locator('button[title*="Clear Google API Key"]');
    await deleteButton.click();
    
    // Save changes
    await page.locator('button:has-text("Save")').click();
    
    // Processing should either:
    // 1. Continue with the key that was already in use
    // 2. Fail gracefully with clear error
    
    const result = await Promise.race([
      threadlink.waitForProcessingComplete().then(() => 'completed'),
      page.waitForSelector('text=/API key/i', { timeout: 30000 }).then(() => 'error')
    ]);
    
    if (result === 'completed') {
      // If it completed, output should be valid
      const output = await threadlink.getOutputText();
      expect(output).toContain('ThreadLink Context Card');
    } else {
      // If it errored, should show API key error
      await expect(page.locator('text=/API key/i')).toBeVisible();
      
      // UI should be ready for retry after adding key back
      await threadlink.addApiKey('google', TEST_KEYS.valid.google);
      await expect(threadlink.condenseButton).toBeEnabled();
    }
  });

  test('handles window close attempt during processing', async ({ page, context: _context }) => {
    await threadlink.pasteText(TEST_DATA.large.text);
    await threadlink.startProcessing();
    
    // Wait for processing to start
    await expect(threadlink.loadingOverlay).toBeVisible();
    
    // Listen for dialog events (beforeunload)
    page.on('dialog', async dialog => {
      // Should show warning about ongoing processing
      expect(dialog.message()).toContain(/leave|processing|cancel/i);
      await dialog.dismiss(); // Stay on page
    });
    
    // Try to close/reload
    await page.evaluate(() => {
      window.onbeforeunload = () => 'Processing in progress';
      window.dispatchEvent(new Event('beforeunload'));
    });
    
    // Should still be processing
    await expect(threadlink.loadingOverlay).toBeVisible();
    
    // Cancel processing cleanly
    await threadlink.cancelProcessing();
    await expect(threadlink.loadingOverlay).not.toBeVisible();
  });
});
