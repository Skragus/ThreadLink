// test-api-mock.js - Simple test script
const { chromium } = require('playwright');

async function testMocks() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Setup mock
  await page.route(/generativelanguage\.googleapis\.com/, async (route) => {
    console.log('✅ Route intercepted!', route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ test: 'mocked' })
    });
  });
  
  // Try making a request
  const response = await page.evaluate(async () => {
    const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });
    return resp.json();
  });
  
  console.log('Response:', response);
  await browser.close();
}

testMocks().catch(console.error);
