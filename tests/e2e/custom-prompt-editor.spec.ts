// tests/e2e/custom-prompt-editor.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';

test.describe('Custom Prompt Editor', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
  });

  test('custom prompt toggle hidden in advanced settings', async ({ page }) => {
    await threadlink.settingsButton.click();
    
    // Should not be visible initially
    const customPromptToggle = page.locator('text="Use Custom Prompt"');
    await expect(customPromptToggle).not.toBeVisible();
    
    // Expand advanced settings
    const advancedButton = page.getByRole('button', { name: '' });
    await advancedButton.click();
    
    // Now should see danger zone
    await expect(page.locator('text="DANGER ZONE"')).toBeVisible();
    await expect(customPromptToggle).toBeVisible();
    
    // Toggle should be OFF by default
    const toggle = page.locator('[data-testid="custom-prompt-toggle"]');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  test('entering custom prompt editor shows warnings', async ({ page }) => {
    await threadlink.settingsButton.click();
    await page.getByRole('button', { name: '' }).click();
    
    // Click the custom prompt toggle
    const toggle = page.locator('[data-testid="custom-prompt-toggle"]');
    await toggle.click();
    
    // Should transition to editor view
    await expect(page.locator('text="WARNING: CORE LOGIC OVERRIDE"')).toBeVisible();
    await expect(page.locator('text=/unstable results.*higher costs.*failures/i')).toBeVisible();
    
    // Should show warning icons
    const warningIcons = page.locator('text="⚠️"');
    await expect(warningIcons).toHaveCount(1);
    
    // Should have back button
    const backButton = page.getByRole('button', { name: '' });
    await expect(backButton).toBeVisible();
  });

  test('editor pre-populated with default prompt', async ({ page }) => {
    await threadlink.settingsButton.click();
    await page.getByRole('button', { name: '' }).click();
    await page.locator('[data-testid="custom-prompt-toggle"]').click();
    
    const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
    const defaultPrompt = await editor.inputValue();
    
    // Should contain the default prompt template
    expect(defaultPrompt).toContain('{TARGET_TOKENS}');
    expect(defaultPrompt).toContain('summarize');
    expect(defaultPrompt.length).toBeGreaterThan(100);
  });

  test('custom prompt must include {TARGET_TOKENS} placeholder', async ({ page }) => {
    await threadlink.settingsButton.click();
    await page.getByRole('button', { name: '' }).click();
    await page.locator('[data-testid="custom-prompt-toggle"]').click();
    
    const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
    
    // Clear and enter invalid prompt without placeholder
    await editor.clear();
    await editor.fill('Just summarize this text please');
    
    // Try to apply
    const applyButton = page.getByRole('button', { name: '' });
    await applyButton.click();
    
    // Should show validation error
    await expect(page.locator('text=/must include.*TARGET_TOKENS/i')).toBeVisible();
    
    // Should not close the modal
    await expect(editor).toBeVisible();
  });

  test('custom prompt affects processing behavior', async ({ page }) => {
    // Set up API mock to capture the prompt
    let capturedPrompt = '';
    await page.route('**/v1beta/models/*/generateContent', async (route, request) => {
      const body = await request.postDataJSON();
      capturedPrompt = body.contents[0].parts[0].text;
      
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{ text: 'CUSTOM PROMPT RESPONSE' }]
            }
          }]
        })
      });
    });

    // Set custom prompt
    await threadlink.settingsButton.click();
    await page.getByRole('button', { name: '' }).click();
    await page.locator('[data-testid="custom-prompt-toggle"]').click();
    
    const customPromptText = 'Extract only action items from this text. Target: {TARGET_TOKENS} tokens.';
    const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
    await editor.clear();
    await editor.fill(customPromptText);
    
    await page.getByRole('button', { name: '' }).click();
    
    // Process some text
    await threadlink.pasteText('Meeting notes: TODO: Update docs. ACTION: Review PR.');
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    // Verify custom prompt was used
    expect(capturedPrompt).toContain('Extract only action items');
    expect(capturedPrompt).toContain('Target:');
    expect(capturedPrompt).toContain('tokens');
  });

  test('back button discards changes', async ({ page }) => {
    await threadlink.settingsButton.click();
    await page.getByRole('button', { name: '' }).click();
    await page.locator('[data-testid="custom-prompt-toggle"]').click();
    
    // Make changes
    const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
    const originalPrompt = await editor.inputValue();
    await editor.clear();
    await editor.fill('This is a test prompt that should be discarded');
    
    // Click back
    await page.getByRole('button', { name: '' }).click();
    
    // Toggle should be OFF
    const toggle = page.locator('[data-testid="custom-prompt-toggle"]');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    
    // Re-enter editor
    await toggle.click();
    
    // Should show original prompt, not the changed one
    const currentPrompt = await editor.inputValue();
    expect(currentPrompt).toBe(originalPrompt);
  });

  test('custom prompt persists across sessions', async ({ page }) => {
    const customPrompt = 'My persistent custom prompt with {TARGET_TOKENS} tokens target.';
    
    // Set custom prompt
    await threadlink.settingsButton.click();
    await page.getByRole('button', { name: '' }).click();
    await page.locator('[data-testid="custom-prompt-toggle"]').click();
    
    const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
    await editor.clear();
    await editor.fill(customPrompt);
    await page.getByRole('button', { name: '' }).click();
    
    // Reload page
    await page.reload();
    
    // Check it persisted
    await threadlink.settingsButton.click();
    await page.getByRole('button', { name: '' }).click();
    
    // Toggle should be ON
    const toggle = page.locator('[data-testid="custom-prompt-toggle"]');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    
    // Enter editor
    await toggle.click();
    const savedPrompt = await editor.inputValue();
    expect(savedPrompt).toBe(customPrompt);
  });

  test('visual danger zone styling', async ({ page }) => {
    await threadlink.settingsButton.click();
    await page.getByRole('button', { name: '' }).click();
    
    // Check danger zone has appropriate styling
    const dangerZone = page.locator('text="DANGER ZONE"').locator('..');
    const styles = await dangerZone.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        borderColor: computed.borderColor,
        backgroundColor: computed.backgroundColor
      };
    });
    
    // Should have red/danger styling
    expect(styles.borderColor).toMatch(/rgb.*\(.*[2-9]\d{2}.*,.*\d+.*,.*\d+/); // High red value
  });

  test('prompt length affects cost warning', async ({ page }) => {
    await threadlink.settingsButton.click();
    await page.getByRole('button', { name: '' }).click();
    await page.locator('[data-testid="custom-prompt-toggle"]').click();
    
    const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
    
    // Enter a very long prompt
    const longPrompt = 'Please analyze the following text. ' + 
                      'Consider these aspects: '.repeat(50) + 
                      'Target tokens: {TARGET_TOKENS}';
    
    await editor.clear();
    await editor.fill(longPrompt);
    
    // Should show cost warning
    await expect(page.locator('text=/increased cost|expensive|token usage/i')).toBeVisible();
  });

  test('custom prompt error handling', async ({ page }) => {
    // Set custom prompt that causes LLM to fail
    await threadlink.settingsButton.click();
    await page.getByRole('button', { name: '' }).click();
    await page.locator('[data-testid="custom-prompt-toggle"]').click();
    
    const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
    await editor.clear();
    await editor.fill('INVALID INSTRUCTION {TARGET_TOKENS} THAT WILL FAIL');
    await page.getByRole('button', { name: '' }).click();
    
    // Mock API to simulate prompt rejection
    await page.route('**/v1beta/models/*/generateContent', async (route) => {
      await route.fulfill({
        status: 400,
        body: JSON.stringify({ 
          error: 'Invalid prompt format' 
        })
      });
    });
    
    // Try to process
    await threadlink.pasteText('Test text');
    await threadlink.startProcessing();
    
    // Should show error mentioning custom prompt
    await expect(page.locator('text=/custom prompt|prompt error/i')).toBeVisible({ timeout: 10000 });
  });
  test('toggle custom prompt during active session', async ({ page }) => {
    // Process with default prompt first
    await threadlink.pasteText(TEST_DATA.tiny.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    const defaultOutput = await threadlink.getOutputText();
    
    // Now enable custom prompt
    await threadlink.settingsButton.click();
    await page.getByRole('button', { name: '' }).click();
    await page.locator('[data-testid="custom-prompt-toggle"]').click();
    
    const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
    await editor.clear();
    await editor.fill('List only the nouns from this text. Target: {TARGET_TOKENS} tokens.');
    await page.getByRole('button', { name: '' }).click();
    
    // Reset and process again
    await threadlink.resetButton.click();
    await threadlink.pasteText(TEST_DATA.tiny.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    const customOutput = await threadlink.getOutputText();
    
    // Outputs should be different
    expect(customOutput).not.toBe(defaultOutput);
  });

  test.describe('Advanced Custom Prompt Features', () => {
    test('custom prompt toggle keyboard navigation', async ({ page }) => {
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: '' }).click();
      
      const toggle = page.locator('[data-testid="custom-prompt-toggle"]');
      
      // Focus toggle with Tab navigation
      await page.keyboard.press('Tab');
      await toggle.focus();
      
      // Should be able to activate with Enter or Space
      await page.keyboard.press('Enter');
      await expect(page.locator('text="WARNING: CORE LOGIC OVERRIDE"')).toBeVisible();
      
      // Close with Escape
      await page.keyboard.press('Escape');
      await expect(page.locator('text="WARNING: CORE LOGIC OVERRIDE"')).not.toBeVisible();
    });

    test('custom prompt editor keyboard shortcuts', async ({ page }) => {
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: '' }).click();
      await page.locator('[data-testid="custom-prompt-toggle"]').click();
      
      const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
      
      // Test Ctrl+A (select all)
      await editor.focus();
      await page.keyboard.press('Control+a');
      await page.keyboard.type('New prompt with {TARGET_TOKENS}');
      
      // Test Ctrl+Z (undo) - depends on browser support
      await page.keyboard.press('Control+z');
      
      // Content should be modified
      const value = await editor.inputValue();
      expect(value.length).toBeGreaterThan(0);
    });

    test('prompt editor drag and drop functionality', async ({ page }) => {
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: '' }).click();
      await page.locator('[data-testid="custom-prompt-toggle"]').click();
      
      const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
      
      // Clear editor and test drag/drop simulation
      await editor.clear();
      
      // Simulate dropping text (browser may prevent this, but test the handler)
      await editor.dispatchEvent('drop', {
        dataTransfer: {
          getData: () => 'Dropped prompt text with {TARGET_TOKENS}'
        }
      });
      
      // Should handle the drop event gracefully
      expect(editor).toBeVisible();
    });

    test('custom prompt with special characters and formatting', async ({ page }) => {
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: '' }).click();
      await page.locator('[data-testid="custom-prompt-toggle"]').click();
      
      const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
      
      // Test special characters and formatting
      const specialPrompt = `
        Extract information using these criteria:
        • Priority items (marked with *)
        • Action items (marked with @)
        • Questions (marked with ?)
        
        Format: JSON with {TARGET_TOKENS} tokens max.
        Use UTF-8: émojis 🚀, quotes "smart", and symbols ≤≥±
      `;
      
      await editor.clear();
      await editor.fill(specialPrompt);
      
      await page.getByRole('button', { name: '' }).click();
      
      // Verify it was saved
      await page.getByRole('button', { name: /edit prompt/i }).click();
      const savedValue = await editor.inputValue();
      expect(savedValue).toContain('UTF-8');
      expect(savedValue).toContain('🚀');
    });

    test('prompt editor performance with large text', async ({ page }) => {
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: '' }).click();
      await page.locator('[data-testid="custom-prompt-toggle"]').click();
      
      const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
      
      // Create a large prompt (test performance)
      const largePrompt = 'Analyze this text. '.repeat(1000) + 'Target: {TARGET_TOKENS} tokens.';
      
      const startTime = Date.now();
      await editor.clear();
      await editor.fill(largePrompt);
      const endTime = Date.now();
      
      // Should handle large text reasonably fast (< 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
      
      // Should still be functional
      await page.getByRole('button', { name: '' }).click();
      await expect(page.locator('text="WARNING: CORE LOGIC OVERRIDE"')).not.toBeVisible();
    });
  });

  test.describe('Settings Modal Integration', () => {
    test('settings modal toggle states', async ({ page }) => {
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: '' }).click();
      
      // Initially OFF
      const toggle = page.locator('[data-testid="custom-prompt-toggle"]');
      await expect(toggle).toHaveAttribute('aria-checked', 'false');
      
      // Click to enable
      await toggle.click();
      
      // Should open editor, not just toggle
      await expect(page.locator('text="WARNING: CORE LOGIC OVERRIDE"')).toBeVisible();
      
      // Go back without saving
      await page.getByRole('button', { name: '' }).click();
      
      // Should still be OFF
      await expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    test('custom prompt edit button appears when enabled', async ({ page }) => {
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: '' }).click();
      
      // Enable custom prompt
      await page.locator('[data-testid="custom-prompt-toggle"]').click();
      await page.locator('textarea[data-testid="custom-prompt-editor"]').fill('Test prompt {TARGET_TOKENS}');
      await page.getByRole('button', { name: '' }).click();
      
      // Should now show edit button
      await expect(page.getByRole('button', { name: /edit prompt/i })).toBeVisible();
      
      // Edit button should work
      await page.getByRole('button', { name: /edit prompt/i }).click();
      await expect(page.locator('text="WARNING: CORE LOGIC OVERRIDE"')).toBeVisible();
    });

    test('danger zone visual styling', async ({ page }) => {
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: '' }).click();
      
      const dangerZone = page.locator('text="DANGER ZONE"').locator('..');
      
      // Should have red/warning styling
      const borderColor = await dangerZone.evaluate(el => 
        window.getComputedStyle(el).borderColor
      );
      
      // Should contain red coloring (RGB values)
      expect(borderColor).toMatch(/rgb.*\([0-9,\s]*[1-9][0-9]{2}.*,.*[0-9,\s]*,.*[0-9,\s]*\)/);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('network error during prompt save', async ({ page }) => {
      // Simulate network issues
      await page.route('**/*', route => route.abort());
      
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: '' }).click();
      await page.locator('[data-testid="custom-prompt-toggle"]').click();
      
      const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
      await editor.fill('Network test prompt {TARGET_TOKENS}');
      
      await page.getByRole('button', { name: '' }).click();
      
      // Should handle gracefully (no crashes)
      expect(page.locator('text="WARNING: CORE LOGIC OVERRIDE"')).not.toBeVisible();
    });

    test('browser storage corruption handling', async ({ page }) => {
      // Corrupt localStorage
      await page.evaluate(() => {
        localStorage.setItem('threadlink_custom_prompt', 'invalid}json{data');
        localStorage.setItem('threadlink_use_custom_prompt', 'not_boolean');
      });
      
      await page.reload();
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: '' }).click();
      
      // Should handle corrupted data gracefully
      const toggle = page.locator('[data-testid="custom-prompt-toggle"]');
      await expect(toggle).toBeVisible();
      
      // Should default to OFF state
      await expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    test('concurrent prompt editor sessions', async ({ page, browser }) => {
      // Open second tab to simulate concurrent editing
      const secondPage = await browser.newPage();
      await secondPage.goto('/');
      
      // First tab: Open prompt editor
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: '' }).click();
      await page.locator('[data-testid="custom-prompt-toggle"]').click();
      
      // Second tab: Try to open settings
      const threadlink2 = new ThreadLinkPage(secondPage);
      await threadlink2.settingsButton.click();
      await secondPage.getByRole('button', { name: '' }).click();
      
      // Both should function independently
      await expect(page.locator('text="WARNING: CORE LOGIC OVERRIDE"')).toBeVisible();
      await expect(secondPage.locator('[data-testid="custom-prompt-toggle"]')).toBeVisible();
      
      await secondPage.close();
    });
  });
});


