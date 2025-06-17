// tests/e2e/helpers/api-mock.ts
import { Page } from '@playwright/test';

export async function setupAPIMocks(page: Page) {  // Mock Google AI responses using regex pattern
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
    } else {      console.log(`✅ Google AI: Returning mock response`);
      
      // Get the request body to extract input content
      const requestBody = route.request().postData();
      let responseText = 'This is a condensed summary that preserves key information about apples, bananas, cherries, and dates. ';
      
      // Try to extract meaningful content from the request for more realistic responses
      if (requestBody) {
        try {
          const body = JSON.parse(requestBody);
          const inputText = body.contents?.[0]?.parts?.[0]?.text || '';
          
          // Check for fruit content and create response that preserves it
          if (inputText.includes('apple')) responseText += 'Apples are a popular fruit that people enjoy. ';
          if (inputText.includes('banana')) responseText += 'Bananas are yellow and sweet, making them nutritious. ';
          if (inputText.includes('cherr')) responseText += 'Cherries grow on trees and are delicious. ';
          if (inputText.includes('date')) responseText += 'Dates are often dried and used in cooking. ';
          
          // Add more content to meet minimum length requirements
          responseText += 'This summary maintains the important details while condensing the original content for better readability and understanding.';
        } catch (e) {
          // Fallback to generic response if parsing fails
          responseText = 'This is a substantial condensed summary that contains enough content to pass validation checks and demonstrate successful processing.';
        }
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: responseText
              }]
            }
          }]
        })
      });
    }
  });
}
