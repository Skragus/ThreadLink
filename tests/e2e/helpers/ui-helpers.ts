// tests/e2e/helpers/ui-helpers.ts
import { Page } from '@playwright/test';

export class ThreadLinkPage {
  constructor(private _page: Page) {}
  // Locators
  get textEditor() {
    return this._page.getByPlaceholder(/paste.*conversation/i);
  }

  get condenseButton() {
    return this._page.getByRole('button', { name: 'Condense' });
  }

  get cancelButton() {
    return this._page.getByRole('button', { name: 'Cancel' });
  }

  get resetButton() {
    return this._page.getByRole('button', { name: 'Reset' });
  }

  get copyButton() {
    return this._page.getByRole('button', { name: 'Copy' });
  }

  get apiKeyButton() {
    return this._page.getByRole('button', { name: 'Manage API keys' });
  }

  get settingsButton() {
    return this._page.getByRole('button', { name: 'Open settings' });
  }

  get infoButton() {
    return this._page.getByRole('button', { name: 'Open help documentation' });
  }

  get loadingOverlay() {
    return this._page.locator('[data-testid="loading-overlay"]');
  }

  get progressBar() {
    return this._page.locator('[data-testid="progress-bar"], .progress-bar');
  }

  // Actions
  async pasteText(text: string) {
    await this.textEditor.clear();
    await this.textEditor.fill(text);
  }  async startProcessing() {
    console.log('🔄 Test: About to click Condense button');
    // Try force clicking for Mobile Safari compatibility
    await this.condenseButton.click({ force: true });
    console.log('✅ Test: Condense button clicked');
  }

  async cancelProcessing() {
    await this.cancelButton.click();
  }  async waitForProcessingComplete() {
    // Wait for the stats display to appear (indicates completion)
    await this._page.locator('[data-testid="stats-display"]').waitFor({ state: 'visible', timeout: 60000 });
    // Also wait for the copy button as a secondary confirmation
    await this.copyButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  async getOutputText(): Promise<string> {
    return await this.textEditor.inputValue();
  }  // API Key Management
  async addApiKey(provider: string, apiKey: string) {
    console.log(`🔑 Test: Adding API key for provider: ${provider}`);
    
    // Click API key button to open dialog
    await this.apiKeyButton.click();
    console.log('✅ Test: API key button clicked');
    
    // Wait for the API key dialog to appear
    await this._page.getByRole('dialog', { name: /api.+key/i }).waitFor({ timeout: 5000 });
    console.log('✅ Test: API key dialog appeared');
    
    // Find the input by id (e.g., "google-api-key", "openai-api-key", "anthropic-api-key")
    const providerInput = this._page.locator(`#${provider}-api-key`);
    await providerInput.fill(apiKey);
    console.log(`✅ Test: Filled ${provider} API key input`);
      // Save the API key (cache will be auto-enabled for testing)
    const saveButton = this._page.getByRole('button', { name: 'Save' });
    // Use force: true to bypass any overlapping elements
    await saveButton.click({ force: true });
    console.log('✅ Test: Save button clicked');
    
    // Wait for dialog to close
    await this._page.getByRole('dialog', { name: /api.+key/i }).waitFor({ state: 'hidden', timeout: 5000 });
    console.log('✅ Test: API key dialog closed');
  }
  // Settings Management
  async setCompressionLevel(level: string) {
    // Compression level is on the main page, not in settings
    const compressionSelect = this._page.getByRole('combobox', { name: /compression/i });
    await compressionSelect.selectOption(level);
  }

  async selectModel(model: string) {
    // Click settings button
    await this.settingsButton.click();
    
    // Wait for settings dialog
    await this._page.getByRole('dialog', { name: /settings/i }).waitFor({ timeout: 5000 });
    
    // Select model
    const modelSelect = this._page.getByRole('combobox', { name: /model/i });
    await modelSelect.selectOption(model);
    
    // Save settings
    const saveButton = this._page.getByRole('button', { name: 'Save' });
    await saveButton.click();
    
    // Wait for dialog to close
    await this._page.getByRole('dialog', { name: /settings/i }).waitFor({ state: 'hidden', timeout: 5000 });
  }

  // Performance and Analytics
  async getTokenCounts() {
    // Look for token count display elements
    const inputTokens = await this._page.locator('[data-testid="input-tokens"], .token-count-input').textContent();
    const outputTokens = await this._page.locator('[data-testid="output-tokens"], .token-count-output').textContent();
    
    return {
      input: parseInt(inputTokens?.replace(/\D/g, '') || '0'),
      output: parseInt(outputTokens?.replace(/\D/g, '') || '0')
    };
  }
}