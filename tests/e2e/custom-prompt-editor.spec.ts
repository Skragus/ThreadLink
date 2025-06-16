// tests/e2e/custom-prompt-editor.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';

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
    const advancedButton = page.locator('button.getByRole('button', { name: 'Advanced Settings' })');
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
    await page.locator('button.getByRole('button', { name: 'Advanced Settings' })').click();
    
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
    const backButton = page.locator('button.getByRole('button', { name: '< Back' })');
    await expect(backButton).toBeVisible();
  });

  test('editor pre-populated with default prompt', async ({ page }) => {
    await threadlink.settingsButton.click();
    await page.locator('button.getByRole('button', { name: 'Advanced Settings' })').click();
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
    await page.locator('button.getByRole('button', { name: 'Advanced Settings' })').click();
    await page.locator('[data-testid="custom-prompt-toggle"]').click();
    
    const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
    
    // Clear and enter invalid prompt without placeholder
    await editor.clear();
    await editor.fill('Just summarize this text please');
    
    // Try to apply
    const applyButton = page.locator('button.getByRole('button', { name: 'Apply & Close' })');
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
    await page.locator('button.getByRole('button', { name: 'Advanced Settings' })').click();
    await page.locator('[data-testid="custom-prompt-toggle"]').click();
    
    const customPromptText = 'Extract only action items from this text. Target: {TARGET_TOKENS} tokens.';
    const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
    await editor.clear();
    await editor.fill(customPromptText);
    
    await page.locator('button.getByRole('button', { name: 'Apply & Close' })').click();
    
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
    await page.locator('button.getByRole('button', { name: 'Advanced Settings' })').click();
    await page.locator('[data-testid="custom-prompt-toggle"]').click();
    
    // Make changes
    const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
    const originalPrompt = await editor.inputValue();
    await editor.clear();
    await editor.fill('This is a test prompt that should be discarded');
    
    // Click back
    await page.locator('button.getByRole('button', { name: '< Back' })').click();
    
    // Toggle should be OFF
    const toggle = page.locator('[data-testid="custom-prompt-toggle"]');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    
    // Re-enter editor
    await toggle.click();
    
    // Should show original prompt, not the changed one
    const currentPrompt = await editor.inputValue();
    expect(currentPrompt).toBe(originalPrompt);
  });

  test('custom prompt persists across sessions', async ({ page, context }) => {
    const customPrompt = 'My persistent custom prompt with {TARGET_TOKENS} tokens target.';
    
    // Set custom prompt
    await threadlink.settingsButton.click();
    await page.locator('button.getByRole('button', { name: 'Advanced Settings' })').click();
    await page.locator('[data-testid="custom-prompt-toggle"]').click();
    
    const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
    await editor.clear();
    await editor.fill(customPrompt);
    await page.locator('button.getByRole('button', { name: 'Apply & Close' })').click();
    
    // Reload page
    await page.reload();
    
    // Check it persisted
    await threadlink.settingsButton.click();
    await page.locator('button.getByRole('button', { name: 'Advanced Settings' })').click();
    
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
    await page.locator('button.getByRole('button', { name: 'Advanced Settings' })').click();
    
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
    await page.locator('button.getByRole('button', { name: 'Advanced Settings' })').click();
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
    await page.locator('button.getByRole('button', { name: 'Advanced Settings' })').click();
    await page.locator('[data-testid="custom-prompt-toggle"]').click();
    
    const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
    await editor.clear();
    await editor.fill('INVALID INSTRUCTION {TARGET_TOKENS} THAT WILL FAIL');
    await page.locator('button.getByRole('button', { name: 'Apply & Close' })').click();
    
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
    await page.locator('button.getByRole('button', { name: 'Advanced Settings' })').click();
    await page.locator('[data-testid="custom-prompt-toggle"]').click();
    
    const editor = page.locator('textarea[data-testid="custom-prompt-editor"]');
    await editor.clear();
    await editor.fill('List only the nouns from this text. Target: {TARGET_TOKENS} tokens.');
    await page.locator('button.getByRole('button', { name: 'Apply & Close' })').click();
    
    // Reset and process again
    await threadlink.resetButton.click();
    await threadlink.pasteText(TEST_DATA.tiny.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    const customOutput = await threadlink.getOutputText();
    
    // Outputs should be different
    expect(customOutput).not.toBe(defaultOutput);
  });
});