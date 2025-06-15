// tests/e2e/providers.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { TEST_DATA, TEST_KEYS } from './helpers/test-data';
import { setupAPIMocks } from './helpers/api-mock';

test.describe('Multi-Provider Testing', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await setupAPIMocks(page);
  });

  test('Google Gemini models', async ({ page: _page }) => {
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    
    for (const model of models) {
      await threadlink.selectModel(model);
      await threadlink.pasteText(TEST_DATA.tiny.text);
      await threadlink.startProcessing();
      await threadlink.waitForProcessingComplete();
      
      const output = await threadlink.getOutputText();
      expect(output).toBeTruthy();
      
      await threadlink.resetButton.click();
    }
  });

  test('OpenAI models', async ({ page: _page }) => {
    await threadlink.addApiKey('openai', TEST_KEYS.valid.openai);
    
    const models = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
    
    for (const model of models) {
      await threadlink.selectModel(model);
      await threadlink.pasteText(TEST_DATA.tiny.text);
      await threadlink.startProcessing();
      await threadlink.waitForProcessingComplete();
      
      const output = await threadlink.getOutputText();
      expect(output).toBeTruthy();
      
      await threadlink.resetButton.click();
    }
  });

  test('Anthropic models', async ({ page: _page }) => {
    await threadlink.addApiKey('anthropic', TEST_KEYS.valid.anthropic);
    
    const models = ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'];
    
    for (const model of models) {
      await threadlink.selectModel(model);
      await threadlink.pasteText(TEST_DATA.tiny.text);
      await threadlink.startProcessing();
      await threadlink.waitForProcessingComplete();
      
      const output = await threadlink.getOutputText();
      expect(output).toBeTruthy();
      
      await threadlink.resetButton.click();
    }
  });

  test('provider switching mid-session', async ({ page: _page }) => {
    // Add all keys
    await threadlink.addApiKey('google', TEST_KEYS.valid.google);
    await threadlink.addApiKey('openai', TEST_KEYS.valid.openai);
    
    // Start with Google
    await threadlink.selectModel('gemini-1.5-flash');
    await threadlink.pasteText(TEST_DATA.small.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    const googleOutput = await threadlink.getOutputText();
    
    // Switch to OpenAI
    await threadlink.resetButton.click();
    await threadlink.selectModel('gpt-4o-mini');
    await threadlink.pasteText(TEST_DATA.small.text);
    await threadlink.startProcessing();
    await threadlink.waitForProcessingComplete();
    
    const openaiOutput = await threadlink.getOutputText();
    
    // Both should work
    expect(googleOutput).toBeTruthy();
    expect(openaiOutput).toBeTruthy();
  });
});