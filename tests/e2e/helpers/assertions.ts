// tests/e2e/helpers/assertions.ts
import { expect, Page } from '@playwright/test';

export async function expectNoConsoleErrors(page: Page) {
  const errors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Wait a bit to catch any async errors
  await page.waitForTimeout(1000);
  
  expect(errors).toHaveLength(0);
}

export async function expectProgressPhase(page: Page, phase: string) {
  const phaseElement = page.locator('.progress-phase, [data-testid="progress-phase"]');
  await expect(phaseElement).toContainText(phase, { timeout: 10000 });
}

export async function expectTokenCount(page: Page, selector: string, min: number, max: number) {
  const element = page.locator(selector);
  const text = await element.textContent();
  const tokens = parseInt(text?.replace(/[^\d]/g, '') || '0');
  
  expect(tokens).toBeGreaterThanOrEqual(min);
  expect(tokens).toBeLessThanOrEqual(max);
}

export async function expectCompressionRatio(page: Page, min: number, max: number) {
  const ratioElement = page.locator('text=/\\d+\\.\\d+:1/');
  const text = await ratioElement.textContent();
  const ratio = parseFloat(text?.replace(':1', '') || '0');
  
  expect(ratio).toBeGreaterThanOrEqual(min);
  expect(ratio).toBeLessThanOrEqual(max);
}