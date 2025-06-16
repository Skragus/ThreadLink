// tests/e2e/helpers/ui-helpers.ts
import { Page } from '@playwright/test';

export class ThreadLinkPage {
  constructor(private _page: Page) {}

  // Locators
  get textEditor() {
    return this._page.getByRole('textbox', { name: /paste.*conversation/i });
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
  }

  async startProcessing() {
    await this.condenseButton.click();
  }

  async cancelProcessing() {
    await this.cancelButton.click();
  }

  async waitForProcessingComplete() {
    // Wait for the copy button to appear (indicates completion)
    await this.copyButton.waitFor({ state: 'visible', timeout: 300000 });
  }

  async getOutputText(): Promise<string> {
    return await this.textEditor.inputValue();
  }

  // API Key Management
  async addApiKey(provider: string, apiKey: string) {
    // Click API key button to open dialog
    await this.apiKeyButton.click();
    
    // Wait for the API key dialog to appear
    await this._page.getByRole('dialog', { name: /api.+key/i }).waitFor({ timeout: 5000 });
    
    // Find the input by id (e.g., "google-api-key", "openai-api-key", "anthropic-api-key")
    const providerInput = this._page.locator(`#${provider}-api-key`);
    await providerInput.fill(apiKey);
    
    // Save the API key
    const saveButton = this._page.getByRole('button', { name: 'Save' });
    await saveButton.click();
    
    // Wait for dialog to close
    await this._page.getByRole('dialog', { name: /api.+key/i }).waitFor({ state: 'hidden', timeout: 5000 });
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