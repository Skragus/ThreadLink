// tests/e2e/api-key-management.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_KEYS } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';

test.describe('API Key Management', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await setupAPIMocks(page);
  });

  test('add, verify and remove API keys for all providers', async ({ page }) => {
    // Open API key modal
    await threadlink.apiKeyButton.click();
    
    // Wait for modal to appear
    const apiKeyModal = page.getByRole('dialog').filter({ hasText: /API Keys/i });
    await expect(apiKeyModal).toBeVisible();
    
    // Take screenshot of modal
    await page.screenshot({ path: './test-results/api-key-modal.png' });
    
    // Add Google API key
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    
    // Verify Google API key is set (masked)
    const googleKeyField = apiKeyModal.getByLabel(/Google API/i);
    await expect(googleKeyField).toHaveValue(/^•+$/);
    
    // Add OpenAI API key
    await threadlink.addApiKey('openai', TEST_KEYS.valid.openai);
    
    // Verify OpenAI API key is set (masked)
    const openaiKeyField = apiKeyModal.getByLabel(/OpenAI API/i);
    await expect(openaiKeyField).toHaveValue(/^•+$/);
    
    // Add Anthropic API key
    await threadlink.addApiKey('anthropic', TEST_KEYS.valid.anthropic);
    
    // Verify Anthropic API key is set (masked)
    const anthropicKeyField = apiKeyModal.getByLabel(/Anthropic API/i);
    await expect(anthropicKeyField).toHaveValue(/^•+$/);
    
    // Close API key modal
    const closeButton = apiKeyModal.getByRole('button', { name: /close|done/i });
    await closeButton.click();
    
    // Verify API key button shows keys are set
    const apiKeyIndicator = page.locator('[data-testid="api-key-status"], .api-key-status');
    await expect(apiKeyIndicator).toHaveClass(/has-keys/);
    
    // Reopen modal to test key removal
    await threadlink.apiKeyButton.click();
      // Clear Google API key
    const googleInput = apiKeyModal.getByLabel(/Google API/i);
    await googleInput.click({ clickCount: 3 }); // Select all text
    await googleInput.press('Backspace'); // Delete content
    await googleInput.press('Tab'); // Trigger blur event
    
    // Verify Google API key is cleared
    const googleKeyFieldAfterClear = apiKeyModal.getByLabel(/Google API/i);
    await expect(googleKeyFieldAfterClear).toHaveValue('');
    
    // Close modal
    await closeButton.click();
  });

  test('validate API key format validation', async ({ page }) => {
    // Open API key modal
    await threadlink.apiKeyButton.click();
    
    // Wait for modal to appear
    const apiKeyModal = page.getByRole('dialog').filter({ hasText: /API Keys/i });
    
    // Try to add invalid Google API key
    await threadlink.addApiKey('google', TEST_KEYS.invalid.google);
    
    // Check for validation error
    const googleError = apiKeyModal.locator('.error-message, [data-testid="error-message"]').filter({ hasText: /invalid|format/i });
    await expect(googleError).toBeVisible();
    
    // Try to add invalid OpenAI API key
    await threadlink.addApiKey('openai', TEST_KEYS.invalid.openai);
    
    // Check for validation error
    const openaiError = apiKeyModal.locator('.error-message, [data-testid="error-message"]').filter({ hasText: /invalid|format/i });
    await expect(openaiError).toBeVisible();
    
    // Try to add valid key to clear error
    await threadlink.addApiKey('openai', TEST_KEYS.valid.openai);
    
    // Error should be gone
    await expect(openaiError).not.toBeVisible();
    
    // Close modal
    const closeButton = apiKeyModal.getByRole('button', { name: /close|done/i });
    await closeButton.click();
  });

  test('API keys persist between sessions', async ({ page }) => {
    // Add Google API key
    await threadlink.apiKeyButton.click();
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    
    // Close modal
    const apiKeyModal = page.getByRole('dialog');
    const closeButton = apiKeyModal.getByRole('button', { name: /close|done/i });
    await closeButton.click();
    
    // Reload page
    await page.reload();
    
    // Reopen API key modal
    await threadlink.apiKeyButton.click();
    
    // Verify Google API key still exists (masked)
    const newModal = page.getByRole('dialog');
    const googleKeyField = newModal.getByLabel(/Google API/i);
    await expect(googleKeyField).toHaveValue(/^•+$/);
    
    // Close modal
    const newCloseButton = newModal.getByRole('button', { name: /close|done/i });
    await newCloseButton.click();
  });
});
