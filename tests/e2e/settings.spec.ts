
// tests/e2e/settings.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';

test.describe('Settings Configuration', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await setupAPIMocks(page);
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
  });

  test('compression level affects output', async ({ page: _page }) => {
    const compressionLevels = ['light', 'balanced', 'aggressive'] as const;
    const outputs: string[] = [];
    
    for (const level of compressionLevels) {
      await threadlink.setCompressionLevel(level);
      await threadlink.pasteText(TEST_DATA.small.text);
      await threadlink.startProcessing();
      await threadlink.waitForProcessingComplete();
      
      const output = await threadlink.getOutputText();
      outputs.push(output);
      
      await threadlink.resetButton.click();
    }
    
    // Aggressive should produce shorter output than light
    expect(outputs[2].length).toBeLessThan(outputs[0].length);
  });  test('processing speed settings', async ({ page }) => {
    await threadlink.settingsButton.click();
    const modal = page.locator('[role="dialog"]');
    
    // Wait for modal to be visible
    await expect(modal).toBeVisible();
    
    // Check what model is selected (might be Anthropic which hides processing speed)
    const modelSelect = modal.locator('#model-select');
    const currentModel = await modelSelect.inputValue();
    
    // If it's not an Anthropic model, processing speed should be visible
    if (!currentModel.includes('claude')) {
      // Find the processing speed toggle button (has a title with "Switch to")
      const processingSpeedSection = modal.locator('div:has-text("Processing Speed")');
      const speedToggleButton = processingSpeedSection.locator('button[title*="Switch to"]');
      
      await expect(speedToggleButton).toBeVisible();
      
      // Enable fast mode
      await speedToggleButton.click();
      
      // Verify fast mode is enabled by checking the "Fast" span has font-medium class
      const fastLabel = modal.locator('span:text("Fast")');
      await expect(fastLabel).toHaveClass(/font-medium/);
      
      // Close the settings modal
      const saveButton = modal.locator('button:text("Save")');
      await saveButton.click();
      
      // Wait for modal to close
      await expect(modal).not.toBeVisible();
      
      // Test passed - we successfully changed the processing speed setting
    } else {
      // If Anthropic model, just verify the setting is not visible
      const processingSpeedSection = modal.locator('div:has-text("Processing Speed")');
      await expect(processingSpeedSection).not.toBeVisible();
    }
  });

  test('recency mode configuration', async ({ page }) => {
    await threadlink.settingsButton.click();
    const modal = page.locator('[role="dialog"]');
    
    // Enable recency mode
    const recencyToggle = modal.locator('input[type="checkbox"]:near(:text("Recency"))');
    await recencyToggle.click();
    
    // Adjust strength slider
    const strengthSlider = modal.locator('input[type="range"]');
    await strengthSlider.fill('75');
    
    await page.keyboard.press('Escape');
    
    // Process and verify recency affects output
    await threadlink.pasteText(TEST_DATA.medium.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    const output = await threadlink.getOutputText();
    // Recent content should be more prominent
    expect(output).toContain('exchange 500'); // Last exchange
  });

  test('custom target tokens', async ({ page }) => {
    await threadlink.settingsButton.click();
    const modal = page.locator('[role="dialog"]');
    
    // Set custom target
    const targetInput = modal.locator('input[type="number"]:near(:text("Target"))');
    await targetInput.fill('5000');
    
    await page.keyboard.press('Escape');
    
    await threadlink.pasteText(TEST_DATA.large.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    // Output should be around 5000 tokens
    const outputTokens = await threadlink.getTokenCounts();
    expect(outputTokens.output).toBeGreaterThan(4000);
    expect(outputTokens.output).toBeLessThan(6000);
  });
});

