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
    // TODO: [Test Flakiness] Replace this hardcoded wait with a specific web assertion. Ex: await expect(page.locator('...')).toBeVisible();
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
  test('ARIA live regions for dynamic UI updates', async ({ page }) => {
    // Set up a valid API key first
    await threadlink.addApiKey('google', 'test-api-key');
    
    // Type some content to trigger processing
    await threadlink.textEditor.fill('Test content for live region updates');
    await threadlink.condenseButton.click();
    
    // Wait for processing to start
    await expect(page.locator('text=/processing/i')).toBeVisible({ timeout: 5000 });
    
    // Verify live region updates for screen readers
    const liveRegionContent = await page.evaluate(async () => {
      const liveElements = document.querySelectorAll('[aria-live]');
      const updates: string[] = [];
      
      // Monitor live region changes
      liveElements.forEach(el => {
        if (el.textContent?.includes('Processing') || 
            el.textContent?.includes('Complete') ||
            el.textContent?.includes('Error')) {
          updates.push(el.textContent);
        }
      });
      
      return updates;
    });
    
    // Should have status updates for screen readers
    expect(liveRegionContent.length).toBeGreaterThan(0);
    
    // Wait for completion
    await expect(page.locator('text=/processing/i')).not.toBeVisible({ timeout: 30000 });
    
    // Check final live region state
    const finalLiveState = await page.evaluate(() => {
      const liveElements = document.querySelectorAll('[aria-live]');
      return Array.from(liveElements).some(el => 
        el.textContent?.includes('Complete') || el.textContent?.includes('finished')
      );
    });
    
    expect(finalLiveState).toBe(true);
  });

  test('form input label associations', async ({ page }) => {
    // Test API key modal form associations
    await threadlink.apiKeyButton.click();
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Check all form inputs have proper labels
    const formAccessibility = await page.evaluate(() => {
      const issues: string[] = [];
      const modal = document.querySelector('[role="dialog"]');
      const inputs = modal?.querySelectorAll('input, textarea, select');
      
      inputs?.forEach((input, index) => {
        const element = input as HTMLInputElement;
          // Check for explicit label association
        const labelledBy = element.getAttribute('aria-labelledby');
        const ariaLabel = element.getAttribute('aria-label');
        const explicitLabel = document.querySelector(`label[for="${element.id}"]`);
        
        if (!labelledBy && !ariaLabel && !explicitLabel) {
          issues.push(`Input ${index} has no accessible label`);
        }
        
        // Check for required field indication
        if (element.required) {
          const hasRequiredIndicator = 
            ariaLabel?.includes('required') ||
            element.getAttribute('aria-required') === 'true';
          
          if (!hasRequiredIndicator) {
            issues.push(`Required input ${index} not properly indicated to screen readers`);
          }
        }
      });
      
      return issues;
    });
    
    expect(formAccessibility).toHaveLength(0);
    
    // Close modal
    await page.keyboard.press('Escape');
  });

  test('logical focus order when tabbing', async ({ page }) => {
    // Map out the expected tab order
    const expectedTabOrder = [
      'API Key button',
      'Settings button', 
      'Help/Info button',
      'Text editor',
      'Condense button'
    ];
    
    // Start from beginning
    await page.keyboard.press('Tab');
    
    const actualTabOrder: string[] = [];
    
    for (let i = 0; i < expectedTabOrder.length; i++) {
      const elementInfo = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active) return 'No focus';
        
        // Identify the focused element
        const ariaLabel = active.getAttribute('aria-label');
        const text = active.textContent?.trim();
        const tagName = active.tagName.toLowerCase();
        const type = active.getAttribute('type');
        
        if (ariaLabel?.includes('API')) return 'API Key button';
        if (ariaLabel?.includes('Settings')) return 'Settings button';
        if (ariaLabel?.includes('help') || ariaLabel?.includes('info')) return 'Help/Info button';
        if (tagName === 'textarea') return 'Text editor';
        if (text?.includes('Condense') || text?.includes('Process')) return 'Condense button';
        
        return `${tagName}${type ? `[${type}]` : ''}: ${text?.substring(0, 20)}`;
      });
      
      actualTabOrder.push(elementInfo);
      
      if (i < expectedTabOrder.length - 1) {
        await page.keyboard.press('Tab');
        // TODO: [Test Flakiness] Replace this hardcoded wait with a specific web assertion. Ex: await expect(page.locator('...')).toBeVisible(); // Allow focus to settle
      }
    }
    
    console.log('Expected tab order:', expectedTabOrder);
    console.log('Actual tab order:', actualTabOrder);
    
    // Verify the tab order is logical (main interactive elements are reachable)
    expect(actualTabOrder).toContain('Text editor');
    expect(actualTabOrder).toContain('Condense button');
    
    // Verify no elements are skipped in keyboard navigation
    const keyboardInaccessible = await page.evaluate(() => {
      const interactiveElements = document.querySelectorAll(
        'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
      );
      
      const issues: string[] = [];
      
      interactiveElements.forEach((el, index) => {
        const element = el as HTMLElement;
        const tabIndex = element.tabIndex;
        const isHidden = element.style.display === 'none' || 
                        element.style.visibility === 'hidden' ||
                        element.hasAttribute('hidden') ||
                        element.getAttribute('aria-hidden') === 'true';
        
        // Skip if element is intentionally hidden
        if (isHidden) return;
        
        // Check if element is keyboard accessible
        if (tabIndex === -1 && !element.hasAttribute('role')) {
          issues.push(`Interactive element ${index} (${element.tagName}) is not keyboard accessible`);
        }
      });
      
      return issues;
    });
    
    expect(keyboardInaccessible).toHaveLength(0);
  });
  test('error states are announced to screen readers', async ({ page }) => {
    // Test error announcement for missing API key
    await threadlink.textEditor.fill('Test content');
    await threadlink.condenseButton.click();
    
    // Wait for error to appear
    await expect(page.locator('text=/API key/i')).toBeVisible();
    
    // Check error has proper ARIA attributes
    const errorAccessibility = await page.evaluate(() => {
      const errors = document.querySelectorAll('[role="alert"], .error, [aria-live="assertive"]');
      const issues: string[] = [];
      
      if (errors.length === 0) {
        issues.push('No error elements found with proper ARIA roles');
      }
      
      errors.forEach((error, index) => {
        const element = error as HTMLElement;
        const role = element.getAttribute('role');
        const ariaLive = element.getAttribute('aria-live');
        
        if (!role && !ariaLive) {
          issues.push(`Error ${index} missing proper ARIA announcement attributes`);
        }
        
        if (!element.textContent?.trim()) {
          issues.push(`Error ${index} has no text content for screen readers`);
        }
      });
      
      return { issues, errorCount: errors.length };
    });
    
    expect(errorAccessibility.issues).toHaveLength(0);
    expect(errorAccessibility.errorCount).toBeGreaterThan(0);
  });

  test('modal dialogs have proper ARIA attributes', async ({ page }) => {
    // Test settings modal
    await threadlink.settingsButton.click();
    
    const modalAccessibility = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      const issues: string[] = [];
      
      if (!modal) {
        issues.push('No element with role="dialog" found');
        return issues;
      }
        // Check required attributes
      const ariaLabel = modal.getAttribute('aria-label');
      const ariaLabelledBy = modal.getAttribute('aria-labelledby');
      
      if (!ariaLabel && !ariaLabelledBy) {
        issues.push('Modal missing aria-label or aria-labelledby');
      }
      
      // Check for close button accessibility
      const closeButtons = modal.querySelectorAll('button[aria-label*="close"], button[aria-label*="Close"]');
      if (closeButtons.length === 0) {
        issues.push('Modal missing accessible close button');
      }
      
      // Check modal is properly announced as modal
      const ariaModal = modal.getAttribute('aria-modal');
      if (ariaModal !== 'true') {
        issues.push('Modal missing aria-modal="true"');
      }
      
      return issues;
    });
    
    expect(modalAccessibility).toHaveLength(0);
    
    // Close modal
    await page.keyboard.press('Escape');
  });

  test('text content is properly structured with headings', async ({ page }) => {
    const headingStructure = await page.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const structure: { level: number; text: string }[] = [];
      
      headings.forEach(heading => {
        const level = parseInt(heading.tagName.charAt(1));
        const text = heading.textContent?.trim() || '';
        structure.push({ level, text });
      });
      
      return structure;
    });
    
    // Check if page has any headings for screen reader navigation
    expect(headingStructure.length).toBeGreaterThan(0);
    
    // Check heading hierarchy is logical (no skipping levels)
    for (let i = 1; i < headingStructure.length; i++) {
      const current = headingStructure[i];
      const previous = headingStructure[i - 1];
      
      // Should not skip more than one heading level
      if (current.level > previous.level + 1) {
        throw new Error(`Heading level skip: h${previous.level} followed by h${current.level}`);
      }
    }
  });
  test('dynamic content changes are accessible', async ({ page }) => {
    // Set up valid API key
    await threadlink.addApiKey('google', 'test-api-key');
    
    // Trigger content change
    await threadlink.textEditor.fill('Test content for accessibility monitoring');
    await threadlink.condenseButton.click();
    
    // Wait for processing state
    await expect(page.locator('text=/processing/i')).toBeVisible({ timeout: 5000 });
    
    // Check that dynamic changes are properly announced
    const duringProcessing = await page.evaluate(() => {
      const liveRegions = document.querySelectorAll('[aria-live]');
      const statusElements = document.querySelectorAll('[role="status"]');
      const alerts = document.querySelectorAll('[role="alert"]');
      
      return {
        liveRegions: liveRegions.length,
        statusElements: statusElements.length,
        alerts: alerts.length,
        hasProcessingAnnouncement: Array.from(liveRegions).some(el => 
          el.textContent?.toLowerCase().includes('processing') ||
          el.textContent?.toLowerCase().includes('working')
        )
      };
    });
    
    // Should have accessibility announcements during processing
    expect(duringProcessing.liveRegions + duringProcessing.statusElements).toBeGreaterThan(0);
    
    // Wait for completion
    await expect(page.locator('text=/processing/i')).not.toBeVisible({ timeout: 30000 });
    
    // Check completion is also announced
    const afterProcessing = await page.evaluate(() => {
      const liveRegions = document.querySelectorAll('[aria-live]');
      return Array.from(liveRegions).some(el => 
        el.textContent?.toLowerCase().includes('complete') ||
        el.textContent?.toLowerCase().includes('finished') ||
        el.textContent?.toLowerCase().includes('done')
      );
    });
    
    expect(afterProcessing).toBe(true);
  });
});