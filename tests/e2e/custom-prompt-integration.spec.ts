// tests/e2e/custom-prompt-integration.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';

test.describe('Custom Prompt Editor - Full Integration', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
  });

  test.describe('End-to-End Custom Prompt Workflow', () => {
    test('complete custom prompt setup and processing workflow', async ({ page }) => {
      // Step 1: Verify initial state - custom prompt should be disabled
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: 'Advanced Settings' }).click();
      
      const customPromptToggle = page.getByRole('button', { name: /custom system prompt/i });
      await expect(customPromptToggle).toHaveAttribute('title', /enable custom system prompt/i);
      
      // Step 2: Enable custom prompt and configure it
      await customPromptToggle.click();
      
      // Should open the prompt editor with warnings
      await expect(page.getByText('WARNING: CORE LOGIC OVERRIDE')).toBeVisible();
      await expect(page.getByText(/unstable results.*failures are likely/i)).toBeVisible();
      
      // Step 3: Configure a specific custom prompt
      const customPromptText = `
        Analyze the conversation and extract:
        1. Key decisions made
        2. Action items assigned
        3. Unresolved questions
        
        Format as numbered list. Limit to {TARGET_TOKENS} tokens.
      `;
      
      const promptEditor = page.locator('textarea[placeholder="Enter your custom prompt..."]');
      await promptEditor.clear();
      await promptEditor.fill(customPromptText);
      
      // Step 4: Save and apply the custom prompt
      await page.getByRole('button', { name: 'Apply & Close' }).click();
      
      // Should return to settings with toggle now ON
      await expect(customPromptToggle).toHaveAttribute('title', /disable custom system prompt/i);
      await expect(page.getByRole('button', { name: /edit prompt/i })).toBeVisible();
      
      // Step 5: Close settings and test processing
      await page.getByRole('button', { name: 'Save' }).click();
      
      // Step 6: Process text with custom prompt
      const testConversation = `
        User: We need to decide on the database migration strategy.
        Assistant: I recommend using blue-green deployment for zero downtime.
        User: Agreed. Who will handle the implementation?
        Assistant: The backend team should lead this. Timeline?
        User: Let's target next month. Any risks we should consider?
        Assistant: Main risk is data consistency during migration.
      `;
      
      await threadlink.pasteText(testConversation);
      
      // Mock API to capture the actual prompt sent
      let capturedPrompt = '';
      await page.route('**/v1beta/models/*/generateContent', async (route, request) => {
        const body = await request.postDataJSON();
        capturedPrompt = body.contents[0].parts[0].text;
        
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            candidates: [{
              content: {
                parts: [{ 
                  text: `1. Database migration using blue-green deployment decided
2. Backend team assigned to implementation
3. Timeline set for next month
4. Unresolved: Data consistency risk mitigation needed` 
                }]
              }
            }]
          })
        });
      });
      
      await threadlink.startProcessing();
      await threadlink.waitForProcessingComplete();
      
      // Step 7: Verify custom prompt was used
      expect(capturedPrompt).toContain('Key decisions made');
      expect(capturedPrompt).toContain('Action items assigned');
      expect(capturedPrompt).toContain('Unresolved questions');
      expect(capturedPrompt).toContain('numbered list');
      
      // Step 8: Verify output reflects custom prompt behavior
      const output = await threadlink.getOutputText();
      expect(output).toContain('1.');
      expect(output).toContain('2.');
      expect(output).toContain('backend team');
      expect(output).toContain('migration');
    });

    test('custom prompt persistence across browser sessions', async ({ page }) => {
      const customPrompt = 'Extract main topics only. Format: bullet points. Max {TARGET_TOKENS} tokens.';
      
      // Set up custom prompt
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: 'Advanced Settings' }).click();
      await page.getByRole('button', { name: /custom system prompt/i }).click();
      
      const promptEditor = page.locator('textarea[placeholder="Enter your custom prompt..."]');
      await promptEditor.clear();
      await promptEditor.fill(customPrompt);
      await page.getByRole('button', { name: 'Apply & Close' }).click();
      await page.getByRole('button', { name: 'Save' }).click();
      
      // Reload page (simulate new session)
      await page.reload();
      await threadlink.addApiKey('google', TEST_KEYS.valid.google); // Re-add API key after reload
      
      // Check that custom prompt persisted
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: 'Advanced Settings' }).click();
      
      const toggle = page.getByRole('button', { name: /custom system prompt/i });
      await expect(toggle).toHaveAttribute('title', /disable custom system prompt/i);
      
      // Check the prompt content
      await page.getByRole('button', { name: /edit prompt/i }).click();
      const savedPrompt = await promptEditor.inputValue();
      expect(savedPrompt).toBe(customPrompt);
    });

    test('switching between default and custom prompts', async ({ page }) => {
      let capturedPrompts: string[] = [];
      
      // Mock API to capture prompts
      await page.route('**/v1beta/models/*/generateContent', async (route, request) => {
        const body = await request.postDataJSON();
        capturedPrompts.push(body.contents[0].parts[0].text);
        
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            candidates: [{
              content: {
                parts: [{ text: 'Test response' }]
              }
            }]
          })
        });
      });
      
      const testText = 'This is a test conversation for processing.';
      
      // Process with default prompt
      await threadlink.pasteText(testText);
      await threadlink.startProcessing();
      await threadlink.waitForProcessingComplete();
      
      const defaultPrompt = capturedPrompts[0];
      
      // Enable custom prompt
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: 'Advanced Settings' }).click();
      await page.getByRole('button', { name: /custom system prompt/i }).click();
      
      const promptEditor = page.locator('textarea[placeholder="Enter your custom prompt..."]');
      await promptEditor.clear();
      await promptEditor.fill('CUSTOM: Extract keywords only. Target: {TARGET_TOKENS} tokens.');
      await page.getByRole('button', { name: 'Apply & Close' }).click();
      await page.getByRole('button', { name: 'Save' }).click();
      
      // Process with custom prompt
      await threadlink.resetButton.click();
      await threadlink.pasteText(testText);
      await threadlink.startProcessing();
      await threadlink.waitForProcessingComplete();
      
      const customPrompt = capturedPrompts[1];
      
      // Disable custom prompt
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: 'Advanced Settings' }).click();
      await page.getByRole('button', { name: /custom system prompt/i }).click();
      await page.getByRole('button', { name: 'Save' }).click();
      
      // Process with default prompt again
      await threadlink.resetButton.click();
      await threadlink.pasteText(testText);
      await threadlink.startProcessing();
      await threadlink.waitForProcessingComplete();
      
      const backToDefaultPrompt = capturedPrompts[2];
      
      // Verify different prompts were used
      expect(defaultPrompt).not.toContain('CUSTOM:');
      expect(customPrompt).toContain('CUSTOM:');
      expect(customPrompt).toContain('Extract keywords only');
      expect(backToDefaultPrompt).not.toContain('CUSTOM:');
      expect(backToDefaultPrompt).toBe(defaultPrompt);
    });
  });

  test.describe('Custom Prompt Error Scenarios', () => {
    test('handling invalid custom prompt gracefully', async ({ page }) => {
      // Set up custom prompt without TARGET_TOKENS placeholder
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: 'Advanced Settings' }).click();
      await page.getByRole('button', { name: /custom system prompt/i }).click();
      
      const promptEditor = page.locator('textarea[placeholder="Enter your custom prompt..."]');
      await promptEditor.clear();
      await promptEditor.fill('Invalid prompt without placeholder');
      
      await page.getByRole('button', { name: 'Apply & Close' }).click();
      
      // Should show validation error
      await expect(page.getByText(/must include.*TARGET_TOKENS/i)).toBeVisible();
      
      // Should not close the editor
      await expect(page.getByText('WARNING: CORE LOGIC OVERRIDE')).toBeVisible();
      
      // Fix the prompt
      await promptEditor.clear();
      await promptEditor.fill('Valid prompt with {TARGET_TOKENS} placeholder');
      await page.getByRole('button', { name: 'Apply & Close' }).click();
      
      // Should close successfully
      await expect(page.getByText('WARNING: CORE LOGIC OVERRIDE')).not.toBeVisible();
    });

    test('custom prompt causing API errors', async ({ page }) => {
      // Set up custom prompt
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: 'Advanced Settings' }).click();
      await page.getByRole('button', { name: /custom system prompt/i }).click();
      
      const promptEditor = page.locator('textarea[placeholder="Enter your custom prompt..."]');
      await promptEditor.clear();
      await promptEditor.fill('Problematic prompt that causes API error. Target: {TARGET_TOKENS}');
      await page.getByRole('button', { name: 'Apply & Close' }).click();
      await page.getByRole('button', { name: 'Save' }).click();
      
      // Mock API to return error
      await page.route('**/v1beta/models/*/generateContent', async (route) => {
        await route.fulfill({
          status: 400,
          body: JSON.stringify({
            error: {
              message: 'Invalid prompt format',
              code: 400
            }
          })
        });
      });
      
      // Try to process
      await threadlink.pasteText('Test text');
      await threadlink.startProcessing();
      
      // Should show error related to custom prompt
      await expect(page.locator('[data-testid="error-display"]')).toBeVisible({ timeout: 10000 });
      const errorText = await page.locator('[data-testid="error-display"]').textContent();
      expect(errorText).toMatch(/error|failed|problem/i);
    });
  });

  test.describe('Custom Prompt Advanced Features', () => {
    test('custom prompt with variable token targets', async ({ page }) => {
      let capturedPrompts: string[] = [];
      
      await page.route('**/v1beta/models/*/generateContent', async (route, request) => {
        const body = await request.postDataJSON();
        capturedPrompts.push(body.contents[0].parts[0].text);
        
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            candidates: [{
              content: {
                parts: [{ text: 'Response' }]
              }
            }]
          })
        });
      });
      
      // Set up custom prompt
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: 'Advanced Settings' }).click();
      await page.getByRole('button', { name: /custom system prompt/i }).click();
      
      const promptEditor = page.locator('textarea[placeholder="Enter your custom prompt..."]');
      await promptEditor.clear();
      await promptEditor.fill('Summarize in exactly {TARGET_TOKENS} tokens - be precise about length.');
      await page.getByRole('button', { name: 'Apply & Close' }).click();
      await page.getByRole('button', { name: 'Save' }).click();
      
      // Process text
      await threadlink.pasteText('Long text that needs summarization');
      await threadlink.startProcessing();
      await threadlink.waitForProcessingComplete();
      
      // Verify TARGET_TOKENS was replaced with actual number
      const prompt = capturedPrompts[0];
      expect(prompt).toContain('exactly');
      expect(prompt).toMatch(/\d+.*tokens/); // Should contain actual number
      expect(prompt).not.toContain('{TARGET_TOKENS}'); // Placeholder should be replaced
    });

    test('custom prompt interaction with other settings', async ({ page }) => {
      // Set advanced temperature
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: 'Advanced Settings' }).click();
      
      const tempSlider = page.getByLabel('LLM Temperature');
      await tempSlider.fill('1.2');
      
      // Enable custom prompt
      await page.getByRole('button', { name: /custom system prompt/i }).click();
      
      const promptEditor = page.locator('textarea[placeholder="Enter your custom prompt..."]');
      await promptEditor.clear();
      await promptEditor.fill('Creative analysis with {TARGET_TOKENS} tokens');
      await page.getByRole('button', { name: 'Apply & Close' }).click();
      await page.getByRole('button', { name: 'Save' }).click();
      
      // Mock API to capture request details
      let capturedRequest: any;
      await page.route('**/v1beta/models/*/generateContent', async (route, request) => {
        capturedRequest = await request.postDataJSON();
        
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            candidates: [{
              content: {
                parts: [{ text: 'Creative response' }]
              }
            }]
          })
        });
      });
      
      await threadlink.pasteText('Test input');
      await threadlink.startProcessing();
      await threadlink.waitForProcessingComplete();
      
      // Verify both custom prompt and temperature setting are applied
      expect(capturedRequest.contents[0].parts[0].text).toContain('Creative analysis');
      expect(capturedRequest.generationConfig.temperature).toBe(1.2);
    });
  });

  test.describe('Mobile and Responsive Behavior', () => {
    test('custom prompt editor on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await threadlink.settingsButton.click();
      await page.getByRole('button', { name: 'Advanced Settings' }).click();
      await page.getByRole('button', { name: /custom system prompt/i }).click();
      
      // Check mobile-responsive elements
      const modal = page.locator('text="WARNING: CORE LOGIC OVERRIDE"').locator('..');
      await expect(modal).toBeVisible();
      
      // Back button should work on mobile
      const backButton = page.getByRole('button', { name: /back/i });
      await expect(backButton).toBeVisible();
      
      // Text should be properly sized for mobile
      const warningText = page.getByText(/unstable results.*failures/i);
      await expect(warningText).toBeVisible();
      
      // Editor should be scrollable
      const editor = page.locator('textarea[placeholder="Enter your custom prompt..."]');
      await expect(editor).toBeVisible();
    });
  });
});
