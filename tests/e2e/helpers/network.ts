
// tests/e2e/helpers/network.ts
import { Page } from '@playwright/test';

export async function simulateSlowNetwork(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 50 * 1024, // 50kb/s
    uploadThroughput: 20 * 1024,   // 20kb/s
    latency: 500  // 500ms latency
  });
}

export async function simulateOffline(page: Page) {
  await page.context().setOffline(true);
}

export async function simulateOnline(page: Page) {
  await page.context().setOffline(false);
}

export async function interceptAPICall(page: Page, provider: string, response: any, statusCode = 200) {
  const urlPattern = {
    'openai': '**/api.openai.com/**',
    'google': '**/generativelanguage.googleapis.com/**',
    'anthropic': '**/api.anthropic.com/**'
  }[provider];

  if (!urlPattern) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status: statusCode,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
}