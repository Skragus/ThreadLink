// tests/e2e/helpers/ui-helpers.ts
import { Page } from '@playwright/test';

export class ThreadLinkPage {
  constructor(private page: Page) {}

  // Locators
  get textEditor() {
    return this.page.locator('textarea[placeholder="Paste your AI conversation here..."]');
  }

  get condenseButton() {
    return this.page.locator('button:has-text("Condense")');
  }

  get cancelButton() {
    return this.page.locator('button:has-text("Cancel")');
  }

  get resetButton() {
    return this.page.locator('button:has-text("Reset")');
  }

  get copyButton() {
    return this.page.locator('button:has-text("Copy")');
  }

  get apiKeyButton() {
    return this.page.locator('button[aria-label="Manage API keys"]');
  }

  get settingsButton() {
    return this.page.locator('button[aria-label="Open settings"]');
  }

  get infoButton() {
    return this.page.locator('button[aria-label="Open help documentation"]');
  }

  get loadingOverlay() {
    return this.page.locator('[data-testid="loading-overlay"]');
  }

  get progressBar() {
    return this.page.locator('[data-testid="progress-bar"], .progress-bar');
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
    await this.page.waitForSelector('[data-testid="api-key-dialog"]', { timeout: 5000 });
    
    // Select the provider
    const providerSelect = this.page.locator(`select[data-provider="${provider}"], input[data-provider="${provider}"]`);
    await providerSelect.fill(apiKey);
    
    // Save the API key
    const saveButton = this.page.locator('button:has-text("Save"), button:has-text("Add")');
    await saveButton.click();
    
    // Wait for dialog to close
    await this.page.waitForSelector('[data-testid="api-key-dialog"]', { state: 'hidden', timeout: 5000 });
  }

  // Settings Management
  async setCompressionLevel(level: string) {
    // Click settings button
    await this.settingsButton.click();
    
    // Wait for settings dialog
    await this.page.waitForSelector('[data-testid="settings-dialog"]', { timeout: 5000 });
    
    // Select compression level
    const compressionSelect = this.page.locator('select[data-setting="compression"], [data-testid="compression-level"]');
    await compressionSelect.selectOption(level);
    
    // Save settings
    const saveButton = this.page.locator('button:has-text("Save")');
    await saveButton.click();
    
    // Wait for dialog to close
    await this.page.waitForSelector('[data-testid="settings-dialog"]', { state: 'hidden', timeout: 5000 });
  }

  async selectModel(model: string) {
    // Click settings button
    await this.settingsButton.click();
    
    // Wait for settings dialog
    await this.page.waitForSelector('[data-testid="settings-dialog"]', { timeout: 5000 });
    
    // Select model
    const modelSelect = this.page.locator('select[data-setting="model"], [data-testid="model-select"]');
    await modelSelect.selectOption(model);
    
    // Save settings
    const saveButton = this.page.locator('button:has-text("Save")');
    await saveButton.click();
    
    // Wait for dialog to close
    await this.page.waitForSelector('[data-testid="settings-dialog"]', { state: 'hidden', timeout: 5000 });
  }

  // Performance and Analytics
  async getTokenCounts() {
    // Look for token count display elements
    const inputTokens = await this.page.locator('[data-testid="input-tokens"], .token-count-input').textContent();
    const outputTokens = await this.page.locator('[data-testid="output-tokens"], .token-count-output').textContent();
    
    return {
      input: parseInt(inputTokens?.replace(/\D/g, '') || '0'),
      output: parseInt(outputTokens?.replace(/\D/g, '') || '0')
    };
  }
}