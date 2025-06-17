// tests/e2e/helpers/api-mock.ts
import { Page } from '@playwright/test';

export async function setupAPIMocks(page: Page) {
  // Mock Google AI responses using regex pattern
  await page.route(/generativelanguage\.googleapis\.com/, async (route) => {
    const url = route.request().url();
    console.log(`✅ Google AI API intercepted: ${url}`);
    
    if (url.includes('invalid')) {
      console.log(`❌ Google AI: Invalid API key detected`);
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'API key not valid' } })
      });
    } else {
      console.log(`✅ Google AI: Returning mock response`);
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

  // Mock OpenAI API responses
  await page.route(/api\.openai\.com/, async (route) => {
    const request = route.request();
    console.log(`✅ OpenAI API intercepted: ${request.url()}`);
    
    if (request.headers()['authorization']?.includes('invalid')) {
      console.log(`❌ OpenAI: Invalid API key detected`);
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Invalid API key' } })
      });
    } else {
      console.log(`✅ OpenAI: Returning mock response`);
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

  // Mock Anthropic responses
  await page.route(/api\.anthropic\.com/, async (route) => {
    const request = route.request();
    console.log(`✅ Anthropic API intercepted: ${request.url()}`);
    
    if (request.headers()['x-api-key']?.includes('invalid')) {
      console.log(`❌ Anthropic: Invalid API key detected`);
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { type: 'authentication_error' } })
      });
    } else {
      console.log(`✅ Anthropic: Returning mock response`);
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
  
  // Add comprehensive network logging for unmatched requests  
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    
    // Only log external API requests to avoid noise
    if (url.includes('api.openai.com') || 
        url.includes('generativelanguage.googleapis.com') || 
        url.includes('api.anthropic.com')) {
      console.log(`⚠️  UNMOCKED API request: ${method} ${url}`);
    }
    
    // Continue with the request normally
    route.continue();
  });
}
