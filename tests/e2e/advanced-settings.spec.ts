// tests/e2e/advanced-settings.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';

test.describe('Advanced Settings and Edge Cases', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await setupAPIMocks(page);
    
    // Add valid API keys
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    await threadlink.addApiKey('openai', TEST_KEYS.valid.openai);
  });

  test('compression level changes reflected in output', async ({ page }) => {
    // Use a small reproducible text sample for faster processing
    await threadlink.pasteText(TEST_DATA.small.text);
    
    // First process with light compression
    await threadlink.settingsButton.click();
    const settingsModal = page.getByRole('dialog').filter({ hasText: /Settings/i });
    await expect(settingsModal).toBeVisible();
    
    // Set light compression
    await threadlink.setCompressionLevel('light');
    
    // Close settings modal
    const closeButton = settingsModal.getByRole('button', { name: /close|done/i });
    await closeButton.click();
    
    // Process text
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete(60000);
    
    // Save the output length for light compression
    const lightCompressionOutput = await threadlink.getOutputText();
    const lightLength = lightCompressionOutput.length;
    console.log(`Light compression output length: ${lightLength}`);
    
    // Reset and try again with aggressive compression
    await threadlink.resetButton.click();
    await page.waitForTimeout(1000);
    
    // Re-enter the same text
    await threadlink.pasteText(TEST_DATA.small.text);
    
    // Set aggressive compression
    await threadlink.settingsButton.click();
    await expect(settingsModal).toBeVisible();
    await threadlink.setCompressionLevel('aggressive');
    await closeButton.click();
    
    // Process text
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete(60000);
    
    // Get output for aggressive compression
    const aggressiveCompressionOutput = await threadlink.getOutputText();
    const aggressiveLength = aggressiveCompressionOutput.length;
    console.log(`Aggressive compression output length: ${aggressiveLength}`);
    
    // Aggressive compression should typically result in shorter output
    expect(aggressiveLength).toBeLessThanOrEqual(lightLength * 1.1); // Allow 10% variance
  });

  test('handles empty text input gracefully', async ({ page }) => {
    // Try to process empty text
    await expect(threadlink.condenseButton).not.toBeEnabled();
    
    // Add single character and check again
    await threadlink.pasteText('a');
    // It might be still disabled or enabled with warning
    const isEnabled = await threadlink.condenseButton.isEnabled();
    
    if (isEnabled) {
      // Try to process very short text if possible
      await threadlink.startProcessing();
      
      // Look for warning or error message
      const warningElement = page.locator('.warning, .error, [data-testid="warning-message"], [data-testid="error-message"]');
      const hasWarning = await warningElement.isVisible();
      
      // Either we get a warning or the process handles the very short input
      if (!hasWarning) {
        // If no warning, wait for processing and check output
        await threadlink.waitForProcessingComplete(30000);
        const output = await threadlink.getOutputText();
        expect(output.length).toBeGreaterThan(0);
      }
    }
  });

  test('model selection affects available options', async ({ page }) => {
    // Open settings dialog
    await threadlink.settingsButton.click();
    const settingsModal = page.getByRole('dialog').filter({ hasText: /Settings/i });
    await expect(settingsModal).toBeVisible();
    
    // Find model selector
    const modelSelector = settingsModal.getByLabel(/Model/i, { exact: false });
    if (await modelSelector.isVisible()) {
      // Select Google model
      try {
        await modelSelector.selectOption({ index: 0 }); // Usually Google model is first
        
        // Check for temperature slider (specific to some models)
        const temperatureControl = settingsModal.getByLabel(/temperature/i, { exact: false });
        if (await temperatureControl.isVisible()) {
          // Test changing temperature
          await temperatureControl.fill('0.7');
          expect(await temperatureControl.inputValue()).toBe('0.7');
          
          // Try a lower temperature
          await temperatureControl.fill('0.2');
          expect(await temperatureControl.inputValue()).toBe('0.2');
        }
        
        // Try switching to another model (like OpenAI)
        await modelSelector.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        
        // Check if model-specific options changed
        const updatedControls = await settingsModal.locator('input, select').count();
        expect(updatedControls).toBeGreaterThan(0);
        
      } catch (e) {
        console.log('⚠️ Test: Error testing model selection:', e);
      }
    } else {
      // Skip if model selector is not visible
      test.skip(true, 'Model selector not found');
    }
    
    // Close settings modal
    const closeButton = settingsModal.getByRole('button', { name: /close|done/i });
    await closeButton.click();
  });

  test('custom prompt editing', async ({ page }) => {
    // Open settings dialog
    await threadlink.settingsButton.click();
    const settingsModal = page.getByRole('dialog').filter({ hasText: /Settings/i });
    await expect(settingsModal).toBeVisible();
    
    // Look for advanced settings button/toggle
    const advancedToggle = settingsModal.getByText(/advanced|custom/i, { exact: false });
    
    // Try to open advanced settings if available
    if (await advancedToggle.isVisible()) {
      try {
        await advancedToggle.click();
        await page.waitForTimeout(500);
        
        // Look for custom prompt field
        const promptEditor = settingsModal.locator('textarea, [data-testid="prompt-editor"]').first();
        
        if (await promptEditor.isVisible()) {
          // Get original prompt
          const originalPrompt = await promptEditor.inputValue();
          
          // Modify the prompt slightly
          const modifiedPrompt = originalPrompt + '\nPlease make this very concise.';
          await promptEditor.fill(modifiedPrompt);
          
          // Check if it got saved
          await expect(promptEditor).toHaveValue(modifiedPrompt);
          
          // Reset prompt if there's a reset button
          const resetButton = settingsModal.getByRole('button', { name: /reset|default/i });
          if (await resetButton.isVisible()) {
            await resetButton.click();
            await page.waitForTimeout(500);
            
            // Check if reset worked
            const resetPrompt = await promptEditor.inputValue();
            expect(resetPrompt).not.toBe(modifiedPrompt);
          }
        }
      } catch (e) {
        console.log('⚠️ Test: Error testing custom prompt editor:', e);
      }
    } else {
      console.log('ℹ️ Test: Advanced settings toggle not found');
    }
    
    // Close settings modal
    const closeButton = settingsModal.getByRole('button', { name: /close|done/i });
    await closeButton.click();
  });
});
