// tests/e2e/helpers/storage.ts
import { Page } from '@playwright/test';

export async function getStorage(page: Page, key: string) {
  try {
    return await page.evaluate((k) => {
      if (typeof localStorage !== 'undefined') {
        const value = localStorage.getItem(k);
        if (value === null) return null;
        
        // Try JSON.parse first (for complex objects), fall back to raw string
        try {
          return JSON.parse(value);
        } catch {
          // Return raw string value (for API keys stored as plain strings)
          return value;
        }
      }
      return null;
    }, key);
  } catch (error) {
    console.log('Storage access not available');
    return null;
  }
}

export async function setStorage(page: Page, key: string, value: any) {
  try {
    await page.evaluate(({ k, v }) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(k, JSON.stringify(v));
      }
    }, { k: key, v: value });
  } catch (error) {
    console.log('Storage access not available, skipping set');
  }
}

export async function clearAllStorage(page: Page) {
  try {
    await page.evaluate(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    });
  } catch (error) {
    console.log('Storage access not available, skipping clear');
  }
}