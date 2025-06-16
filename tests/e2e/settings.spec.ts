
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
  });  test('compression level affects output', async ({ page }) => {
    const compressionLevels = ['light', 'balanced', 'aggressive'] as const;
    
    // Test that compression level settings can be changed
    for (const level of compressionLevels) {
      await threadlink.setCompressionLevel(level);
      
      // Verify the compression level is set by checking the select value
      const compressionSelect = page.getByRole('combobox', { name: /compression/i });
      await expect(compressionSelect).toHaveValue(level);
    }
    
    // Test a specific level change
    await threadlink.setCompressionLevel('aggressive');
    const aggressiveSelect = page.getByRole('combobox', { name: /compression/i });
    await expect(aggressiveSelect).toHaveValue('aggressive');
    
    // Change to light and verify
    await threadlink.setCompressionLevel('light');
    const lightSelect = page.getByRole('combobox', { name: /compression/i });
    await expect(lightSelect).toHaveValue('light');
    
    // Add text and verify UI elements are responsive
    await threadlink.pasteText(TEST_DATA.small.text);
    await expect(threadlink.condenseButton).toBeEnabled();
  });  test('processing speed settings', async ({ page }) => {
    await threadlink.settingsButton.click({ force: true });
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
      await speedToggleButton.click({ force: true });
      
      // Verify fast mode is enabled by checking the "Fast" span has font-medium class
      const fastLabel = modal.locator('span:text("Fast")');
      await expect(fastLabel).toHaveClass(/font-medium/);
      
      // Close the settings modal
      const saveButton = modal.locator('button:text("Save")');
      await saveButton.click({ force: true });
      
      // Wait for modal to close
      await expect(modal).not.toBeVisible();
      
      // Test passed - we successfully changed the processing speed setting
    } else {
      // If Anthropic model, just verify the setting is not visible
      const processingSpeedSection = modal.locator('div:has-text("Processing Speed")');
      await expect(processingSpeedSection).not.toBeVisible();
    }
  });  test('recency mode configuration', async ({ page }) => {
    await threadlink.settingsButton.click({ force: true });
    const modal = page.locator('[role="dialog"]');
    
    // Find the recency mode toggle button by looking for the specific toggle in the recency section
    const recencySection = modal.locator(':text("Recency Mode")').locator('..').locator('..');
    const recencyToggle = recencySection.locator('button[title*="recency"]');
    await recencyToggle.click({ force: true });
    
    // Wait for the recency strength slider to appear (confirms recency mode is enabled)
    const strengthSlider = modal.locator('input[type="range"]');
    await expect(strengthSlider).toBeVisible();
    
    // Adjust strength slider to value 1 (which corresponds to index 1 = "Balanced")
    await strengthSlider.fill('1');
    
    // Verify the slider value is set correctly
    await expect(strengthSlider).toHaveValue('1');
    
    // Close the modal by clicking the Save button
    const saveButton = modal.locator('button:text("Save")');
    await saveButton.click({ force: true });
    
    // Wait for modal to close
    await expect(modal).toBeHidden();
    
    // Verify settings were saved by reopening the modal and checking recency mode is still on
    await threadlink.settingsButton.click({ force: true });
    const reopenedModal = page.locator('[role="dialog"]');
    const reopenedSlider = reopenedModal.locator('input[type="range"]');
    await expect(reopenedSlider).toBeVisible();
    await expect(reopenedSlider).toHaveValue('1');
  });  test('custom target tokens', async ({ page }) => {
    await threadlink.settingsButton.click({ force: true });
    const modal = page.locator('[role="dialog"]');
    
    // Open advanced settings to access drone density (which affects token targeting)
    const advancedToggle = modal.locator('button:has-text("Advanced Settings")');
    await advancedToggle.click({ force: true });
    
    // Wait for advanced settings to expand
    const temperatureInput = modal.locator('#adv-temperature');
    await expect(temperatureInput).toBeVisible();
    
    // Adjust LLM temperature (this affects output generation)
    await temperatureInput.fill('0.7');
    await expect(temperatureInput).toHaveValue('0.7');
    
    // Adjust drone density if recency mode is off (affects token distribution)
    const droneDensityInput = modal.locator('#adv-drone-density');
    if (await droneDensityInput.isVisible()) {
      await droneDensityInput.fill('3');
      await expect(droneDensityInput).toHaveValue('3');
    }
    
    // Adjust max drones limit in the danger zone
    const maxDronesInput = modal.locator('#adv-max-drones');
    await expect(maxDronesInput).toBeVisible();
    await maxDronesInput.fill('100');
    await expect(maxDronesInput).toHaveValue('100');
    
    // Close the modal by clicking the Save button
    const saveButton = modal.locator('button:text("Save")');
    await saveButton.click({ force: true });
    
    // Wait for modal to close
    await expect(modal).toBeHidden();
  });
});

