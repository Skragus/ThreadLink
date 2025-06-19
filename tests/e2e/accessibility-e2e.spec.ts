// accessibility-e2e.spec.ts - End-to-End Accessibility Test Suite

import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

test.describe('E2E Accessibility Tests', () => {  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5174');

    // Inject axe-core for accessibility testing
    await injectAxe(page);
  });
  test('Homepage should have no accessibility violations', async ({ page }) => {
    // Check the main page for accessibility violations
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  });

  test('Header navigation should be accessible', async ({ page }) => {
    // Test header buttons accessibility
    const infoButton = page.getByRole('button', { name: 'Open help documentation' });
    const apiKeysButton = page.getByRole('button', { name: 'Manage API keys' });
    const settingsButton = page.getByRole('button', { name: 'Open settings' });

    // Check that buttons are focusable and accessible
    await infoButton.focus();
    await expect(infoButton).toBeFocused();
    
    await apiKeysButton.focus();
    await expect(apiKeysButton).toBeFocused();
    
    await settingsButton.focus();
    await expect(settingsButton).toBeFocused();

    // Check for accessibility violations in header area
    await checkA11y(page, 'header, .header, [role="banner"]', {
      detailedReport: true
    });
  });

  test('Text editor should be accessible', async ({ page }) => {
    const textarea = page.getByRole('textbox');
    
    // Check textarea accessibility
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute('placeholder', 'Paste your AI conversation here...');
    
    // Test keyboard interaction
    await textarea.focus();
    await expect(textarea).toBeFocused();
    
    await textarea.fill('Test accessibility content');
    await expect(textarea).toHaveValue('Test accessibility content');

    // Check for accessibility violations in the editor area
    await checkA11y(page, 'textarea, .text-editor', {
      detailedReport: true
    });
  });

  test('Footer controls should be accessible', async ({ page }) => {
    const compressionSelect = page.getByRole('combobox', { name: /compression level/i });
    const condenseButton = page.getByRole('button', { name: /condense/i });

    // Test form controls accessibility
    await compressionSelect.focus();
    await expect(compressionSelect).toBeFocused();
    
    await condenseButton.focus();
    await expect(condenseButton).toBeFocused();

    // Check for accessibility violations in footer
    await checkA11y(page, 'footer, .footer', {
      detailedReport: true
    });
  });

  test('Settings modal should be accessible', async ({ page }) => {
    // Open settings modal
    await page.getByRole('button', { name: 'Open settings' }).click();
    
    // Wait for modal to appear
    const modal = page.getByRole('dialog', { name: /settings/i });
    await expect(modal).toBeVisible();

    // Check modal accessibility
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby', 'settings-title');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    
    // Modal should close on escape
    await expect(modal).not.toBeVisible();

    // Reopen for accessibility check
    await page.getByRole('button', { name: 'Open settings' }).click();
    await expect(modal).toBeVisible();

    // Check for accessibility violations in modal
    await checkA11y(page, '[role="dialog"]', {
      detailedReport: true
    });

    // Close modal
    await page.getByRole('button', { name: /save/i }).click();
  });

  test('API Keys modal should be accessible', async ({ page }) => {
    // Open API keys modal
    await page.getByRole('button', { name: 'Manage API keys' }).click();
    
    // Wait for modal to appear
    const modal = page.getByRole('dialog', { name: /api key management/i });
    await expect(modal).toBeVisible();

    // Check modal accessibility
    await expect(modal).toHaveAttribute('aria-labelledby', 'api-keys-title');

    // Test form inputs
    const passwordInputs = page.getByRole('textbox', { name: /api key/i });
    const firstInput = passwordInputs.first();
    
    await firstInput.focus();
    await expect(firstInput).toBeFocused();

    // Check for accessibility violations in API keys modal
    await checkA11y(page, '[role="dialog"]', {
      detailedReport: true
    });

    // Close modal
    await page.getByRole('button', { name: /save/i }).click();
  });

  test('Custom prompt editor should be accessible', async ({ page }) => {
    // Navigate to settings
    await page.getByRole('button', { name: 'Open settings' }).click();
    
    // Click on Advanced Settings to expand
    await page.getByText('Advanced Settings').click();
    
    // Look for custom prompt toggle and click it
    const customPromptToggle = page.locator('[title*="custom system prompt"]').first();
    await customPromptToggle.click();

    // Wait for custom prompt editor to appear
    const editor = page.locator('.fixed.inset-0').filter({ hasText: 'WARNING: CORE LOGIC OVERRIDE' });
    await expect(editor).toBeVisible();

    // Check editor accessibility
    const textarea = editor.getByRole('textbox');
    await expect(textarea).toBeVisible();
    await textarea.focus();
    await expect(textarea).toBeFocused();

    // Check for accessibility violations in custom prompt editor
    await checkA11y(page, '.fixed', {
      detailedReport: true
    });

    // Close editor
    await page.getByText('Back').click();
  });

  test('Error states should be accessible', async ({ page }) => {
    // Try to process without any input to trigger error
    const textarea = page.getByRole('textbox');
    await textarea.fill('');
    
    const condenseButton = page.getByRole('button', { name: /condense/i });
    await condenseButton.click();

    // Wait for error message
    const errorElement = page.getByTestId('error-display');
    await expect(errorElement).toBeVisible();

    // Check that error is accessible
    await checkA11y(page, '[data-testid="error-display"]', {
      detailedReport: true
    });
  });

  test('Focus management should work correctly', async ({ page }) => {
    // Test tab order through the interface
    await page.keyboard.press('Tab'); // Should focus first interactive element
    const focusedElement1 = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'TEXTAREA', 'SELECT']).toContain(focusedElement1);

    await page.keyboard.press('Tab');
    const focusedElement2 = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'TEXTAREA', 'SELECT']).toContain(focusedElement2);

    // Test shift+tab to go backwards
    await page.keyboard.press('Shift+Tab');
    const focusedElement3 = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'TEXTAREA', 'SELECT']).toContain(focusedElement3);
  });
  test('Color contrast should be sufficient', async ({ page }) => {
    // Check for color contrast violations
    const violations = await getViolations(page, undefined, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });

    // Filter for color contrast specific violations
    const contrastViolations = violations.filter(v => v.id === 'color-contrast');
    
    if (contrastViolations.length > 0) {
      console.log('Color contrast violations found:', contrastViolations);
    }
    
    expect(contrastViolations.length).toBe(0);
  });

  test('Images should have appropriate alt text', async ({ page }) => {
    // Check for images without proper alt text
    const violations = await getViolations(page, undefined, {
      rules: {
        'image-alt': { enabled: true }
      }
    });

    const imageViolations = violations.filter(v => v.id === 'image-alt');
    expect(imageViolations.length).toBe(0);
  });

  test('Form labels should be properly associated', async ({ page }) => {
    // Open settings to access form controls
    await page.getByRole('button', { name: 'Open settings' }).click();
    
    // Check for form labeling violations
    const violations = await getViolations(page, '[role="dialog"]', {
      rules: {
        'label': { enabled: true },
        'label-title-only': { enabled: true }
      }
    });

    const labelViolations = violations.filter(v => ['label', 'label-title-only'].includes(v.id));
    expect(labelViolations.length).toBe(0);

    // Close modal
    await page.getByRole('button', { name: /save/i }).click();
  });
  test('ARIA attributes should be valid', async ({ page }) => {
    // Check for invalid ARIA usage
    const violations = await getViolations(page, undefined, {
      rules: {
        'aria-valid-attr': { enabled: true },
        'aria-valid-attr-value': { enabled: true },
        'aria-required-attr': { enabled: true }
      }
    });

    const ariaViolations = violations.filter(v => 
      ['aria-valid-attr', 'aria-valid-attr-value', 'aria-required-attr'].includes(v.id)
    );
    
    expect(ariaViolations.length).toBe(0);
  });

  test('Heading structure should be logical', async ({ page }) => {
    // Check for proper heading hierarchy
    const violations = await getViolations(page, undefined, {
      rules: {
        'heading-order': { enabled: true }
      }
    });

    const headingViolations = violations.filter(v => v.id === 'heading-order');
    expect(headingViolations.length).toBe(0);
  });

  test('Interactive elements should be keyboard accessible', async ({ page }) => {
    // Check that all interactive elements are keyboard accessible
    const violations = await getViolations(page, undefined, {
      rules: {
        'keyboard': { enabled: true },
        'focus-order-semantics': { enabled: true }
      }
    });

    const keyboardViolations = violations.filter(v => 
      ['keyboard', 'focus-order-semantics'].includes(v.id)
    );
    
    expect(keyboardViolations.length).toBe(0);
  });
});
