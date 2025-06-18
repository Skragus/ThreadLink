// tests/e2e/text-processing-complete.spec.ts
import { test, expect } from '@playwright/test';

/**
 * This test file tests the complete text processing functionality
 * with proper API key setup and error handling.
 */

test.describe('Complete Text Processing', () => {
  
  // Mock API key for testing
  const TEST_KEY = 'AIzaSyD-valid-test-key-xxxxx';
  
  test.beforeEach(async ({ page }) => {
    // Setup API mocking
    await page.route(/generativelanguage\.googleapis\.com/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: "This is a condensed summary of the conversation. It preserves key information while reducing length."
              }]
            }
          }]
        })
      });
    });
    
    await page.goto('/');
  });
  
  test('end-to-end text processing workflow', async ({ page }) => {
    // 1. Setup API key
    const apiKeyButton = page.locator([
      'button[aria-label="Manage API keys"]',
      'button:has-text("API")',
      '[data-testid="api-key-button"]'
    ].join(', ')).first();
    
    await apiKeyButton.click({ force: true });
    
    const dialog = page.locator([
      'dialog:has-text("API Key")',
      'dialog:has-text("API Keys")',
      '[role="dialog"]:has-text("API Key")',
      '[role="dialog"]:has-text("API Keys")'
    ].join(', ')).first();
    
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Find all inputs in dialog
    const inputs = dialog.locator('input[type="text"], input[type="password"]');
    const firstInput = inputs.first();
    
    // Add API key
    await firstInput.fill(TEST_KEY);
    
    // Find save button
    const saveButton = dialog.locator([
      'button:has-text("Save")',
      'button:has-text("Add")',
      'button:has-text("Submit")'
    ].join(', ')).first();
    
    if (await saveButton.isVisible()) {
      await saveButton.click({ force: true }).catch(() => console.log('Save button click failed'));
    }
    
    // Close dialog - using multiple methods for reliability
    try {
      // Try clicking escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      
      // If dialog still visible, try clicking a close button
      if (await dialog.isVisible()) {
        const closeButton = dialog.locator('button:has-text("Close"), button:has-text("Done")').first();
        await closeButton.click({ force: true }).catch(() => {});
      }
      
      // If still visible, try clicking outside
      if (await dialog.isVisible()) {
        await page.mouse.click(10, 10);
      }
    } catch (e) {
      console.log('Error closing dialog:', e);
    }
    
    // 2. Enter text
    const textArea = page.locator('textarea').first();
    await textArea.fill('This is a test conversation. It contains multiple sentences that should be condensed into a shorter summary. The text processing system should analyze this content and produce a shorter version that preserves the key information.');
    
    // 3. Find and click condense button
    const condenseButton = page.locator([
      'button:has-text("Condense")',
      'button:has-text("Process")',
      '[data-testid="condense-button"]'
    ].join(', ')).first();
    
    await expect(condenseButton).toBeEnabled({ timeout: 10000 });
    await condenseButton.click();
      // 4. Wait for processing to complete using multiple approaches
    
    // First approach: Check for copy button to appear (this is the most reliable indicator)
    try {
      // Look for indicators of processing completion
      const copyButton = page.locator([
        'button:has-text("Copy")',
        '[data-testid="copy-button"]',
        'button[aria-label="Copy"]'
      ].join(', ')).first();
      
      // Wait for copy button to appear with generous timeout
      await expect(copyButton).toBeVisible({ timeout: 45000 });
      console.log('Processing complete - copy button appeared');
    } catch (e) {
      console.log('Could not detect copy button:', e);
      
      // If copy button detection failed, try looking for other completion indicators
      try {
        // Wait for loading indicator to disappear (if it exists)
        await page.waitForSelector('[data-testid="loading-overlay"], .loading-overlay', { 
          state: 'hidden', 
          timeout: 10000 
        }).catch(() => console.log('No loading overlay found or already hidden'));
      } catch (e) {
        console.log('Loading indicator approach failed:', e);
      }
      
      // Give a bit more time for UI to stabilize
      await page.waitForTimeout(5000);
    }
    
    // 5. Verify output
    // Wait for result to appear - first look for copy button which indicates completion
    const copyButton = page.locator([
      'button:has-text("Copy")',
      '[data-testid="copy-button"]',
      'button[aria-label="Copy"]'
    ].join(', ')).first();
    
    await expect(copyButton).toBeVisible({ timeout: 20000 });
    
    // Check text area for output
    const outputText = await textArea.inputValue();
    expect(outputText).not.toBe(''); // Output should not be empty
    expect(outputText.length).toBeGreaterThan(10); // Output should have reasonable length
    
    // 6. Reset to try again
    const resetButton = page.locator([
      'button:has-text("Reset")',
      'button[aria-label="Reset"]',
      '[data-testid="reset-button"]'
    ].join(', ')).first();
    
    await resetButton.click();
    
    // Text area should be empty after reset
    await expect(textArea).toHaveValue('');
  });
});
