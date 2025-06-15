// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import { ThreadLinkPage } from './helpers/ui-helpers';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility', () => {
  let threadlink: ThreadLinkPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    threadlink = new ThreadLinkPage(page);
    await injectAxe(page);
  });

  test('passes automated accessibility checks', async ({ page }) => {
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: {
        html: true
      }
    });
  });

  test('keyboard navigation', async ({ page }) => {
    // Tab through main elements
    await page.keyboard.press('Tab'); // Should focus first interactive element
    
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
    
    // Tab to text editor
    let reachedTextEditor = false;
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const isTextEditor = await page.evaluate(() => 
        document.activeElement?.tagName === 'TEXTAREA'
      );
      if (isTextEditor) {
        reachedTextEditor = true;
        break;
      }
    }
    expect(reachedTextEditor).toBe(true);
    
    // Type in text editor
    await page.keyboard.type('Keyboard test');
    await expect(threadlink.textEditor).toHaveValue('Keyboard test');
    
    // Tab to condense button
    let reachedCondenseButton = false;
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const buttonText = await page.evaluate(() => 
        document.activeElement?.textContent
      );
      if (buttonText?.includes('Condense')) {
        reachedCondenseButton = true;
        break;
      }
    }
    expect(reachedCondenseButton).toBe(true);
    
    // Enter to activate button
    await page.keyboard.press('Enter');
    
    // Should show error (no API key)
    const error = page.locator('text=/API key/i');
    await expect(error).toBeVisible();
  });

  test('screen reader labels', async ({ page }) => {
    // Check ARIA labels
    const apiKeyButton = await page.locator('button[aria-label*="API"]');
    expect(await apiKeyButton.getAttribute('aria-label')).toBeTruthy();
    
    const settingsButton = await page.locator('button[aria-label*="Settings"]');
    expect(await settingsButton.getAttribute('aria-label')).toBeTruthy();
    
    const infoButton = await page.locator('button[aria-label*="help"]');
    expect(await infoButton.getAttribute('aria-label')).toBeTruthy();
  });

  test('focus management in modals', async ({ page }) => {
    // Open settings modal
    await threadlink.settingsButton.click();
    
    // Focus should be trapped in modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // First focusable element in modal should have focus
    await page.waitForTimeout(100);
    const focusedInModal = await page.evaluate(() => {
      const activeEl = document.activeElement;
      const modal = document.querySelector('[role="dialog"]');
      return modal?.contains(activeEl);
    });
    expect(focusedInModal).toBe(true);
    
    // Tab cycling should stay within modal
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
    }
    
    const stillInModal = await page.evaluate(() => {
      const activeEl = document.activeElement;
      const modal = document.querySelector('[role="dialog"]');
      return modal?.contains(activeEl);
    });
    expect(stillInModal).toBe(true);
    
    // Escape closes modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('color contrast', async ({ page }) => {
    // Check specific color contrast ratios
    const contrastIssues = await page.evaluate(() => {
      const issues: string[] = [];
      
      // Check text elements
      const elements = document.querySelectorAll('p, span, button, label');
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const bg = styles.backgroundColor;
        const fg = styles.color;
        
        // Simple check - in real tests, calculate actual contrast ratio
        if (fg === bg) {
          issues.push(`Same foreground and background color on ${el.tagName}`);
        }
      });
      
      return issues;
    });
    
    expect(contrastIssues).toHaveLength(0);
  });
});
