// E2E Test: Settings Modal & Advanced Configuration. Ideal file: tests/e2e/settings-modal.spec.ts
import { test, expect, Page, Route } from '@playwright/test';

// Helper to open the settings modal and navigate to the advanced section
async function openAdvancedSettings(page: Page) {
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Advanced Settings' }).click();
  await expect(page.getByLabel('LLM Temperature')).toBeVisible();
}

// Helper to enable the custom prompt editor and accept the warning
async function enableAndOpenCustomPromptEditor(page: Page) {
  // The toggle is a button next to the label
  const customPromptToggle = page.locator('label:has-text("Custom System Prompt") + div > button');
  await customPromptToggle.click();
  
  // Handle the first-time warning modal
  const warningModal = page.getByRole('heading', { name: 'FIRST TIME WARNING' });
  if (await warningModal.isVisible()) {
      await page.getByRole('button', { name: 'I Accept All Risks' }).click();
  }
  
  await expect(page.getByRole('heading', { name: /CORE LOGIC OVERRIDE/ })).toBeVisible();
}

// Mocked Gemini API endpoint
const googleApiEndpoint = 'https://generativelanguage.googleapis.com/**';

test.describe('Settings Modal & Advanced Configuration', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Set a dummy API key to ensure condense button is always available for pipeline tests
    await page.evaluate(() => localStorage.setItem('threadlink_api_key_google', 'DUMMY_KEY'));
    await page.reload();
  });

  test('should prevent non-numeric characters in number inputs', async ({ page }) => {
    await openAdvancedSettings(page);

    const tempInput = page.getByLabel('LLM Temperature');
    const dronesInput = page.getByLabel('Max Drones Limit');

    // Attempt to fill with non-numeric text
    await tempInput.fill('abc');
    await dronesInput.fill('xyz');

    // type="number" inputs should reject this, resulting in an empty value
    expect(await tempInput.inputValue()).toBe('');
    expect(await dronesInput.inputValue()).toBe('');
  });

  test('should handle out-of-range values in number inputs', async ({ page }) => {
    await openAdvancedSettings(page);
    const tempInput = page.getByLabel('LLM Temperature');
    
    // The input has a max="2". We test entering a value above that.
    await tempInput.fill('5');
    
    // HTML5 validation should mark the input as invalid.
    // We can check the validity property of the input element.
    const isInvalid = await tempInput.evaluate(el => !(el as HTMLInputElement).checkValidity());
    expect(isInvalid).toBe(true);

    // Some frameworks might show a visible error message, but checking validity is a reliable-enough test.
    // For an even more robust test, we could check that trying to "Save" keeps the modal open, but
    // the current implementation closes on save regardless. The key is that the browser knows it's invalid.
  });

  test('should show a pre-flight error if condensing with an empty custom prompt', async ({ page }) => {
    await openAdvancedSettings(page);
    await enableAndOpenCustomPromptEditor(page);

    // Clear the prompt textarea and save
    const promptTextarea = page.locator('textarea[placeholder="Enter your custom prompt..."]');
    await promptTextarea.fill('');
    await page.getByRole('button', { name: 'Apply & Close' }).click();
    await page.getByRole('button', { name: 'Save' }).click(); // Close main settings modal

    // Attempt to condense
    await page.getByPlaceholder('Paste your AI conversation here...').fill('Some text');
    await page.getByRole('button', { name: 'Condense' }).click();

    // The application should catch this invalid state before making an API call.
    const errorDisplay = page.locator('div[ref="errorRef"]');
    await expect(errorDisplay).toBeVisible();
    await expect(errorDisplay).toContainText(/Custom prompt cannot be empty/i);
    await expect(page.locator('.loading-overlay-container')).not.toBeVisible();
  });

  test('should correctly toggle custom prompt state between processing runs', async ({ page }) => {
    let lastReceivedPrompt = '';

    await page.route(googleApiEndpoint, async (route: Route) => {
      const requestBody = JSON.parse(route.request().postData()!);
      // The system prompt is the first element in the 'contents' array.
      lastReceivedPrompt = requestBody.contents[0].parts[0].text;
      route.fulfill({ status: 200, body: '{"candidates": [{"content": {"parts": [{"text": "Mocked response"}]}}]}'});
    });
    
    const textInput = page.getByPlaceholder('Paste your AI conversation here...');
    await textInput.fill('Test run 1');

    // --- Run 1: Custom Prompt OFF (Default) ---
    await page.getByRole('button', { name: 'Condense' }).click();
    await expect(page.locator('div[ref="statsRef"]')).toBeVisible();
    expect(lastReceivedPrompt).not.toContain('MY_CUSTOM_PROMPT');
    expect(lastReceivedPrompt).toContain('You are a drone'); // Part of the default prompt

    // --- State Change: Enable Custom Prompt ---
    await openAdvancedSettings(page);
    await enableAndOpenCustomPromptEditor(page);
    await page.locator('textarea[placeholder="Enter your custom prompt..."]').fill('MY_CUSTOM_PROMPT');
    await page.getByRole('button', { name: 'Apply & Close' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    // --- Run 2: Custom Prompt ON ---
    await textInput.fill('Test run 2');
    await page.getByRole('button', { name: 'Condense' }).click();
    await expect(page.locator('div[ref="statsRef"]')).toBeVisible();
    expect(lastReceivedPrompt).toBe('MY_CUSTOM_PROMPT');
    
    // --- State Change: Disable Custom Prompt ---
    await openAdvancedSettings(page);
    const customPromptToggle = page.locator('label:has-text("Custom System Prompt") + div > button');
    await customPromptToggle.click(); // This disables it
    await page.getByRole('button', { name: 'Save' }).click();

    // --- Run 3: Custom Prompt OFF again ---
    await textInput.fill('Test run 3');
    await page.getByRole('button', { name: 'Condense' }).click();
    await expect(page.locator('div[ref="statsRef"]')).toBeVisible();
    expect(lastReceivedPrompt).not.toContain('MY_CUSTOM_PROMPT');
    expect(lastReceivedPrompt).toContain('You are a drone');
  });
});
