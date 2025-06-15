
// tests/e2e/helpers/api-mock.ts
import { Page } from '@playwright/test';

export async function setupAPIMocks(page: Page) {
  // Mock successful API responses
  await page.route('**/api.openai.com/**', async (route) => {
    const request = route.request();
    
    if (request.headers()['authorization']?.includes('invalid')) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Invalid API key' } })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{
            message: {
              content: 'This is a condensed version of the input text focusing on key points.'
            }
          }]
        })
      });
    }
  });

  // Mock Google AI responses
  await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
    const url = route.request().url();
    
    if (url.includes('invalid')) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'API key not valid' } })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: 'This is a condensed summary from Gemini model.'
              }]
            }
          }]
        })
      });
    }
  });

  // Mock Anthropic responses
  await page.route('**/api.anthropic.com/**', async (route) => {
    const request = route.request();
    
    if (request.headers()['x-api-key']?.includes('invalid')) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { type: 'authentication_error' } })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [{
            type: 'text',
            text: 'This is a condensed response from Claude.'
          }]
        })
      });
    }
  });
}