// tests/e2e/api-keys.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_KEYS } from './helpers/test-data';
import { getStorage, clearAllStorage } from './helpers/storage';

test.describe('API Key Management', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await clearAllStorage(page);
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
  });

  test('add API keys for each provider', async ({ page }) => {
    // Add Google API key
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    
    // Add OpenAI API key
    await threadlink.addApiKey('openai', TEST_KEYS.valid.openai);
    
    // Add Anthropic API key
    await threadlink.addApiKey('anthropic', TEST_KEYS.valid.anthropic);
    
    // Verify keys are stored
    const googleKey = await getStorage(page, 'threadlink_google_api_key');
    const openaiKey = await getStorage(page, 'threadlink_openai_api_key');
    const anthropicKey = await getStorage(page, 'threadlink_anthropic_api_key');
    
    expect(googleKey).toBeTruthy();
    expect(openaiKey).toBeTruthy();
    expect(anthropicKey).toBeTruthy();
  });

  test('toggle save to browser storage', async ({ page }) => {
    await threadlink.apiKeyButton.click();
    
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });
    
    // Find save toggle
    const saveToggle = modal.locator('input[type="checkbox"]');
    
    // Should be unchecked by default
    await expect(saveToggle).not.toBeChecked();
    
    // Toggle on
    await saveToggle.click();
    await expect(saveToggle).toBeChecked();
    
    // Add a key
    const googleInput = modal.locator('input[placeholder*="Google"]');
    await googleInput.fill(TEST_KEYS.valid.google);
    
    // Close modal
    await page.keyboard.press('Escape');
    
    // Verify key was saved
    const savedKey = await getStorage(page, 'threadlink_google_api_key');
    expect(savedKey).toBe(TEST_KEYS.valid.google);
  });

  test('delete individual keys', async ({ page }) => {
    // First add a key
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    
    // Open modal again
    await threadlink.apiKeyButton.click();
    const modal = page.locator('[role="dialog"]');
    
    // Find delete button for Google
    const deleteButton = modal.locator('button[aria-label*="Delete"]:near(input[placeholder*="Google"])');
    await deleteButton.click();
    
    // Verify input is cleared
    const googleInput = modal.locator('input[placeholder*="Google"]');
    await expect(googleInput).toHaveValue('');
    
    // Close and verify storage is cleared
    await page.keyboard.press('Escape');
    const savedKey = await getStorage(page, 'threadlink_google_api_key');
    expect(savedKey).toBeNull();
  });

  test('validate invalid key format', async ({ page }) => {
    await threadlink.apiKeyButton.click();
    const modal = page.locator('[role="dialog"]');
    
    // Try invalid Google key
    const googleInput = modal.locator('input[placeholder*="Google"]');
    await googleInput.fill(TEST_KEYS.invalid.google);
    
    // Should show validation error
    const errorMessage = modal.locator('text=/invalid|error/i');
    await expect(errorMessage).toBeVisible();
  });
});
