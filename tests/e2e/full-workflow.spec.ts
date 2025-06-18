// tests/e2e/full-workflow.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';
import { expectCompressionRatio, expectTokenCount } from './helpers/assertions';

test.describe('Complete End-to-End User Workflow', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    // Visit the application
    await page.goto('/');
    
    // Initialize page object
    threadlink = new ThreadLinkPage(page);
    
    // Setup API mocks
    await setupAPIMocks(page);
  });

  test('full user journey from setup to output and reset', async ({ page }) => {
    // 1. Initial page load - verify core elements
    await expect(page).toHaveTitle(/ThreadLink/);
    await expect(threadlink.textEditor).toBeVisible();
    await expect(threadlink.apiKeyButton).toBeVisible();
    
    // 2. API key configuration
    await threadlink.apiKeyButton.click();
    
    // API key modal should be visible
    const apiKeyModal = page.getByRole('dialog').filter({ hasText: /API Keys/i });
    await expect(apiKeyModal).toBeVisible();
    
    // Add API keys for Google and Anthropic for testing different models
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    await threadlink.addApiKey('anthropic', TEST_KEYS.valid.anthropic);
    
    // Close the modal
    const closeButton = apiKeyModal.getByRole('button', { name: /close|done/i });
    await closeButton.click();
    
    // 3. Settings configuration
    await threadlink.settingsButton.click();
    
    // Settings modal should be visible
    const settingsModal = page.getByRole('dialog').filter({ hasText: /Settings/i });
    await expect(settingsModal).toBeVisible();
    
    // Set compression level
    await threadlink.setCompressionLevel('balanced');
    
    // Select model (try to use Anthropic if available)
    const modelSelector = page.getByLabel(/Model/i, { exact: false });
    if (await modelSelector.isVisible()) {      try {
        // Try to select Anthropic/Claude model if available - first find available options
        const options = await modelSelector.evaluate((select) => {
          if (select instanceof HTMLSelectElement) {
            return Array.from(select.options).map(option => option.text || option.textContent);
          }
          return [];
        });
        
        // Find Claude model option if it exists
        const claudeOption = options.find(option => option && option.toLowerCase().includes('claude'));
        if (claudeOption) {
          await modelSelector.selectOption({ label: claudeOption });
        } else {
          // Try to select any Anthropic model since we added the key
          await modelSelector.selectOption({ index: 1 }); // Try selecting the second option
          console.log('⚠️ Test: Claude model not found in options, trying second option');
        }
      } catch (e) {
        // Fall back to default model if selection fails
        console.log('⚠️ Test: Could not select model, using default');
      }
    }
    
    // Close settings modal
    const settingsCloseButton = settingsModal.getByRole('button', { name: /close|done/i });
    await settingsCloseButton.click();
    
    // 4. Input text for processing
    await threadlink.pasteText(TEST_DATA.small.text);
    
    // Verify token count is displayed
    await expectTokenCount(page, '[data-testid="token-count"], .token-count', 
      TEST_DATA.small.tokens * 0.8, TEST_DATA.small.tokens * 1.2);
    
    // Take screenshot before processing
    await page.screenshot({ path: './test-results/full-workflow-before.png' });
    
    // 5. Start processing
    await expect(threadlink.condenseButton).toBeEnabled({ timeout: 5000 });
    await threadlink.startProcessing();
    
    // 6. Monitor processing stages
    await expect(threadlink.loadingOverlay).toBeVisible({ timeout: 10000 });
    
    // Take screenshot during processing
    await page.screenshot({ path: './test-results/full-workflow-processing.png' });
    
    // 7. Wait for processing to complete
    await threadlink.waitForProcessingComplete(120000);
    
    // 8. Verify output
    const output = await threadlink.getOutputText();
    expect(output.length).toBeGreaterThan(0);
    
    // 9. Check compression ratio
    if (TEST_DATA.small.expectedRatio) {
      await expectCompressionRatio(
        page, 
        TEST_DATA.small.expectedRatio.min, 
        TEST_DATA.small.expectedRatio.max
      );
    }
    
    // Take screenshot of output
    await page.screenshot({ path: './test-results/full-workflow-output.png' });
    
    // 10. Copy output to clipboard
    await threadlink.copyButton.click();
    
    // 11. Reset to input state
    await threadlink.resetButton.click();
    
    // Verify we're back to input mode
    await expect(threadlink.textEditor).toBeVisible();
    await expect(threadlink.textEditor).toBeEmpty();
    await expect(threadlink.condenseButton).toBeVisible();
    
    // 12. Check info/documentation access
    if (await threadlink.infoButton.isVisible()) {
      await threadlink.infoButton.click();
      
      // Info modal/panel should be visible
      const infoPanel = page.locator('[data-testid="info-panel"], .info-panel, .documentation');
      await expect(infoPanel).toBeVisible();
      
      // Close info panel if there's a close button
      const infoCloseButton = infoPanel.getByRole('button', { name: /close/i });
      if (await infoCloseButton.isVisible()) {
        await infoCloseButton.click();
      }
    }
  });
});
