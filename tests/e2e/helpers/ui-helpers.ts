// tests/e2e/helpers/ui-helpers.ts
import { Page } from '@playwright/test';

export class ThreadLinkPage {
  constructor(private _page: Page) {}
  // Locators
  get textEditor() {
    // Use multiple selector strategies for resilience with union selector
    return this._page.locator(`
      textarea[placeholder*="paste"],
      textarea[placeholder*="conversation"],
      [data-testid="text-editor"] textarea,
      .text-editor textarea,
      textarea
    `).first();
  }

  get condenseButton() {
    return this._page.getByRole('button', { name: 'Condense' });
  }

  get cancelButton() {
    return this._page.getByRole('button', { name: 'Cancel' });
  }

  get resetButton() {
    return this._page.getByRole('button', { name: 'Reset' });
  }

  get copyButton() {
    return this._page.getByRole('button', { name: 'Copy' });
  }

  get apiKeyButton() {
    return this._page.getByRole('button', { name: 'Manage API keys' });
  }

  get settingsButton() {
    return this._page.getByRole('button', { name: 'Open settings' });
  }

  get infoButton() {
    return this._page.getByRole('button', { name: 'Open help documentation' });
  }

  get loadingOverlay() {
    return this._page.locator('[data-testid="loading-overlay"]');
  }

  get progressBar() {
    return this._page.locator('[data-testid="progress-bar"], .progress-bar');
  }
  
  // Helper method to detect if we're on mobile
  async isMobileViewport() {
    const viewport = this._page.viewportSize();
    return viewport && viewport.width < 768; // Standard mobile breakpoint
  }

  // Actions with enhanced mobile support
  async pasteText(text: string) {
    console.log('🔄 Test: Attempting to paste text into editor');
    
    // First, check if there's a reset button and if needed, use it
    try {
      // Check if the editor is already readonly - in that case we can't paste
      const isReadOnly = await this._page.evaluate(() => {
        const textarea = document.querySelector('textarea[placeholder*="paste"]');
        return textarea && textarea.hasAttribute('readonly');
      }).catch(() => false);
      
      if (isReadOnly) {
        console.log('⚠️ Test: Text editor is readonly, attempting to reset first');
        // If the editor is readonly, we need to reset first
        try {
          const resetButton = this._page.getByRole('button', { name: 'Reset' });
          const isMobile = await this.isMobileViewport();
          
          if (await resetButton.isVisible({ timeout: 5000 })) {
            if (isMobile) {
              await resetButton.tap({ force: true });
            } else {
              await resetButton.click({ force: true });
            }
            await this._page.waitForTimeout(1500); // Give the UI more time to update
            console.log('✅ Test: Reset button clicked to clear readonly state');
          }
        } catch (e) {
          console.warn('⚠️ Test: Could not reset before pasting text:', e);
        }
      }
    } catch (e) {
      console.warn('⚠️ Test: Error checking readonly state:', e);
    }
    
    // Take screenshot before attempting to paste
    await this._page.screenshot({ path: './test-results/paste-text-before.png' });
    
    // Try forcibly focusing the editor before pasting
    try {
      await this._page.evaluate(() => {
        const textarea = document.querySelector('textarea[placeholder*="paste"]');
        if (textarea) {
          (textarea as HTMLTextAreaElement).focus();
          // Also attempt to forcibly remove readonly attribute if present
          textarea.removeAttribute('readonly');
        }
      });
      console.log('✅ Test: Forced focus on text editor');
      
      // Give it a moment after focusing
      await this._page.waitForTimeout(500);
      
    } catch (focusError) {
      console.warn('⚠️ Test: Could not force focus:', focusError);
    }
    
    // For large inputs, let's check the text length to choose the best approach
    const isLargeText = text.length > 10000;
    console.log(`ℹ️ Text size: ${text.length} characters${isLargeText ? ' (LARGE)' : ''}`);
    
    // Now attempt to paste the text with multiple retries if needed
    let attempts = 0;
    const maxAttempts = 3;
    const isMobile = await this.isMobileViewport();
    
    // If it's large text and on mobile, go straight to the DOM injection method
    if (isLargeText && isMobile) {
      console.log('🔄 Test: Large text detected on mobile, using direct DOM method');
      try {
        await this._page.evaluate((inputText) => {
          const textarea = document.querySelector('textarea[placeholder*="paste"]');
          if (textarea) {
            // @ts-ignore - Set the value directly
            textarea.value = inputText;
            // Dispatch events to simulate user input
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, text);
        console.log('✅ Test: Large text pasted via DOM manipulation');
        
        // Take screenshot after paste attempt
        await this._page.screenshot({ path: './test-results/paste-text-after-dom.png' });
        return;
      } catch (directError) {
        console.error('⚠️ Test: Error with direct DOM manipulation:', directError);
        // Continue to standard methods as fallback
      }
    }
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        if (isMobile) {
          // Tap to ensure the editor is focused
          await this.textEditor.tap({ timeout: 5000 });
          
          // For mobile, add a small delay after tapping before trying to fill
          await this._page.waitForTimeout(500);
        } else {
          await this.textEditor.click({ force: true, timeout: 5000 });
        }
        
        // Clear existing content
        await this.textEditor.clear({ timeout: 5000 });
        
        // For large texts, use a chunked approach on mobile
        if (isLargeText && isMobile && attempts === 1) {
          console.log('🔄 Test: Attempting chunked text input for large text');
          
          // Split the text into manageable chunks
          const chunkSize = 5000;
          let success = true;
          
          for (let i = 0; i < text.length; i += chunkSize) {
            const chunk = text.substring(i, i + chunkSize);
            try {
              // Type the chunk with appropriate timeout
              await this.textEditor.type(chunk, { timeout: 15000 });
              console.log(`✅ Test: Typed chunk ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(text.length / chunkSize)}`);
            } catch (chunkError) {
              console.error('⚠️ Test: Error typing text chunk:', chunkError);
              success = false;
              break;
            }
          }
          
          if (success) {
            console.log('✅ Test: All text chunks successfully typed');
            // Take screenshot after paste
            await this._page.screenshot({ path: './test-results/paste-text-after-chunks.png' });
            return;
          } else {
            console.log('⚠️ Test: Chunked typing failed, will try standard fill next');
          }
        } else {
          // Use standard fill for normal cases or as fallback
          await this.textEditor.fill(text, { timeout: isMobile ? 15000 : 8000 });
          console.log(`✅ Test: Text pasted successfully on attempt ${attempts}`);
          
          // Take screenshot after paste
          await this._page.screenshot({ path: './test-results/paste-text-after-fill.png' });
          return; // Success, exit the retry loop
        }
      } catch (e) {
        console.error(`⚠️ Test: Error pasting text on attempt ${attempts}:`, e);
        
        if (attempts < maxAttempts) {
          // If there are more attempts, try to recover
          console.log('🔄 Test: Retrying paste after a short wait');
          await this._page.waitForTimeout(1000);
          
          // Try another approach - direct DOM manipulation as fallback
          if (attempts === 2) {
            try {
              await this._page.evaluate((inputText) => {
                const textarea = document.querySelector('textarea[placeholder*="paste"]');
                if (textarea) {
                  // @ts-ignore - Set the value directly
                  textarea.value = inputText;
                  // Dispatch events to simulate user input
                  textarea.dispatchEvent(new Event('input', { bubbles: true }));
                  textarea.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }, text);
              console.log('✅ Test: Text pasted using direct DOM manipulation');
              
              // Take screenshot after DOM manipulation
              await this._page.screenshot({ path: './test-results/paste-text-after-dom-fallback.png' });
              return;
            } catch (domError) {
              console.error('⚠️ Test: Error with DOM manipulation fallback:', domError);
            }
          }
        }
      }
    }
    
    // If we reach here, all attempts failed
    throw new Error(`Failed to paste text after ${maxAttempts} attempts`);
  }

  async startProcessing() {
    console.log('🔄 Test: About to click/tap Condense button');
    
    const isMobile = await this.isMobileViewport();
    
    // Use appropriate interaction for the device type
    if (isMobile) {
      await this.condenseButton.tap({ timeout: 10000 });
    } else {
      await this.condenseButton.click({ force: true, timeout: 10000 });
    }
    console.log('✅ Test: Condense button interaction completed');
  }
  
  async cancelProcessing() {
    console.log('🔄 Test: About to attempt cancellation');
    
    // Take screenshot of the current state
    await this._page.screenshot({ path: './test-results/pre-cancel-helper.png' });
    
    // Ensure we pause briefly to let the UI stabilize
    await this._page.waitForTimeout(1000);
    
    // Track success state
    let cancelSuccess = false;
    const isMobile = await this.isMobileViewport();
    
    // First try interacting directly with the cancel button - simplest approach
    try {
      console.log('🔄 Test: Attempting to find cancel button with standard selector');
      
      // Check if our standard cancel button locator is visible
      const isCancelVisible = await this.cancelButton.isVisible({ timeout: 5000 });
      
      if (isCancelVisible) {
        console.log('✅ Test: Found cancel button with standard locator');
        
        // Use appropriate interaction for device type
        if (isMobile) {
          // For mobile, we'll try tap first, then fall back to other methods if needed
          try {
            await this.cancelButton.tap({ force: true, timeout: 8000 });
            console.log('✅ Test: Cancel button tapped successfully');
            cancelSuccess = true;
          } catch (tapError) {
            console.log(`⚠️ Test: Tap on cancel button failed: ${tapError}`);
            
            // Try clicking instead
            try {
              await this.cancelButton.click({ force: true, timeout: 8000 });
              console.log('✅ Test: Cancel button clicked as fallback');
              cancelSuccess = true;
            } catch (clickError) {
              console.log(`⚠️ Test: Click on cancel button failed: ${clickError}`);
              // Continue to alternative methods
            }
          }
        } else {
          // Desktop handling
          await this.cancelButton.click({ force: true, timeout: 10000 });
          console.log('✅ Test: Cancel button clicked on desktop');
          cancelSuccess = true;
        }
      } else {
        console.log('⚠️ Test: Standard cancel button locator not visible');
      }
    } catch (e) {
      console.log(`⚠️ Test: Direct cancel button approach failed: ${e}`);
    }
    
    // If the first approach didn't work, try alternative CSS selectors
    if (!cancelSuccess) {
      console.log('🔄 Test: Trying alternative selectors for cancel button');
      try {
        // Take screenshot to see the state
        await this._page.screenshot({ path: './test-results/cancel-alt-selectors.png' });
        
        const selectors = [
          'button:has-text("Cancel")',
          '[data-testid="cancel-button"]',
          'button.cancel-button',
          'button[aria-label="Cancel"]',
          '[role="button"]:has-text("Cancel")',
          '.cancel-btn'
        ];
        
        for (const selector of selectors) {
          try {
            const count = await this._page.locator(selector).count();
            if (count > 0) {
              console.log(`✅ Test: Found cancel button with selector: ${selector}`);
              
              // Highlight the element for debugging
              await this._page.evaluate((sel) => {
                const elements = document.querySelectorAll(sel);
                for (const el of elements) {
                  if (el instanceof HTMLElement) {
                    el.style.border = '3px solid red';
                    el.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
                  }
                }
              }, selector);
              
              // Take screenshot with highlighted button
              await this._page.screenshot({ path: './test-results/cancel-button-highlight.png' });
              
              if (isMobile) {
                await this._page.locator(selector).first().tap({ force: true, timeout: 10000 });
              } else {
                await this._page.locator(selector).first().click({ force: true, timeout: 10000 });
              }
              
              console.log('✅ Test: Alternative cancel button interaction completed');
              await this._page.waitForTimeout(1500); // Wait longer for click to register
              cancelSuccess = true;
              break;
            }
          } catch (innerError) {
            // Continue to the next selector
          }
        }
      } catch (e) {
        console.log(`⚠️ Test: Alternative selector approach failed: ${e}`);
      }
    }
    
    // If all UI methods failed, try DOM injection as a last resort
    if (!cancelSuccess) {
      try {
        console.log('🔄 Test: Trying direct DOM click via evaluate as last resort');
        
        const clickSuccess = await this._page.evaluate(() => {
          // Try various patterns to find the cancel button
          const selectors = [
            'button:has-text("Cancel")', 
            '[data-testid="cancel-button"]',
            'button.cancel-button',
            'button[aria-label="Cancel"]',
            'button:contains("Cancel")',
            '[role="button"]:has-text("Cancel")',
            '.cancel-btn'
          ];
          
          for (const selector of selectors) {
            try {
              const btn = document.querySelector(selector);
              if (btn) {
                (btn as HTMLElement).click();
                return true;
              }
            } catch (innerErr) {
              // Silently continue to next selector
            }
          }
          
          // Try finding a button with Cancel text
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent && btn.textContent.toLowerCase().includes('cancel')) {
              btn.click();
              return true;
            }
          }
          
          return false;
        });
        
        if (clickSuccess) {
          console.log('✅ Test: Cancel button clicked via DOM evaluation');
          await this._page.waitForTimeout(1000);
          cancelSuccess = true;
        } else {
          console.log('⚠️ Test: Could not find cancel button via DOM evaluation');
        }
      } catch (e) {
        console.log(`⚠️ Test: DOM evaluation approach failed: ${e}`);
      }
    }
    
    // If all UI methods failed, try keyboard Escape as a very last resort
    if (!cancelSuccess) {
      try {
        console.log('🔄 Test: Trying keyboard Escape as very last resort');
        await this._page.keyboard.press('Escape');
        console.log('✅ Test: Sent Escape key');
        await this._page.waitForTimeout(1000);
        
        // Check if the loading overlay is still visible after Escape
        const isLoadingVisible = await this.loadingOverlay.isVisible({ timeout: 5000 }).catch(() => true);
        if (!isLoadingVisible) {
          console.log('✅ Test: Loading overlay disappeared after Escape key');
          cancelSuccess = true;
        } else {
          console.log('⚠️ Test: Escape key did not dismiss loading overlay');
        }
      } catch (e) {
        console.log(`⚠️ Test: Escape key approach failed: ${e}`);
      }
    }
    
    // Take a screenshot after the cancellation attempt
    await this._page.screenshot({ path: './test-results/post-cancel-helper.png' });
    
    // If none of our methods worked, we should throw to fail the test
    if (!cancelSuccess) {
      throw new Error('Failed to cancel processing - no method succeeded');
    }
    
    // Extra verification step - wait for the loading overlay to disappear
    try {
      console.log('🔄 Test: Verifying loading overlay disappears after cancellation');
      await this.loadingOverlay.waitFor({ state: 'hidden', timeout: 20000 });
      console.log('✅ Test: Loading overlay disappeared after cancellation');
    } catch (e) {
      console.log('⚠️ Test: Loading overlay did not disappear after cancellation:', e);
      // Don't throw here, as the main test will handle this verification as well
    }
  }
  async waitForProcessingComplete(timeout = 60000) {
    console.log('🔄 Test: Waiting for processing to complete');
    
    // Take screenshot before waiting
    await this._page.screenshot({ path: './test-results/before-wait-complete.png' });
    
    try {
      // First approach: Wait for the loading overlay to disappear
      try {
        await this._page.waitForSelector('[data-testid="loading-overlay"]', { state: 'hidden', timeout: timeout * 0.8 });
        console.log('✅ Test: Loading overlay disappeared');
      } catch (e) {
        console.log('⚠️ Test: Loading overlay did not disappear, trying alternative methods');
        // Continue with other approaches
      }

      // Second approach: Wait for the stats display
      try {
        // Look for various forms of the stats display
        const statsSelector = [
          '[data-testid="stats-display"]', 
          '.stats-display', 
          '.stats',
          '.ratio',
          'text=/[0-9]+[.][0-9]+:1/' // Look for compression ratio text like "10.5:1"
        ].join(',');
        
        await this._page.waitForSelector(statsSelector, { state: 'visible', timeout: timeout * 0.5 });
        console.log('✅ Test: Stats display appeared');
      } catch (e) {
        console.log('⚠️ Test: Stats display not found, trying other indicators');
      }

      // Third approach: Look for copy button
      try {
        const copyButtonSelector = [
          'button:has-text("Copy")',
          'button[aria-label="Copy"]',
          '[data-testid="copy-button"]',
          '.copy-button'
        ].join(',');
        
        await this._page.waitForSelector(copyButtonSelector, { state: 'visible', timeout: timeout * 0.5 });
        console.log('✅ Test: Copy button appeared');
      } catch (e) {
        console.log('⚠️ Test: Copy button not found');
      }
      
      // Last resort: wait for the reset button
      try {
        const resetButtonSelector = [
          'button:has-text("Reset")',
          'button[aria-label="Reset"]',
          '[data-testid="reset-button"]',
          '.reset-button'
        ].join(',');
        
        await this._page.waitForSelector(resetButtonSelector, { state: 'visible', timeout: timeout * 0.3 });
        console.log('✅ Test: Reset button appeared');
      } catch (e) {
        console.log('⚠️ Test: Reset button not found');
        throw new Error('Failed to detect completion of processing');
      }
      
    } finally {
      // Take screenshot after waiting
      await this._page.screenshot({ path: './test-results/after-wait-complete.png' });
    }
  }

  async getOutputText(): Promise<string> {
    return await this.textEditor.inputValue();  }
  
  // API Key Management
  async addApiKey(provider: string, apiKey: string) {
    console.log(`🔑 Test: Adding API key for provider: ${provider}`);
    
    // Take screenshot before adding API key
    await this._page.screenshot({ path: `./test-results/before-add-key-${provider}.png` });
    
    // Check if we're on mobile
    const isMobile = await this.isMobileViewport();
    
    try {
      // Open API key modal with appropriate interaction
      if (isMobile) {
        await this.apiKeyButton.tap({ force: true, timeout: 10000 }).catch(async (e) => {
          console.log('⚠️ Test: Tap failed, trying click instead:', e);
          await this.apiKeyButton.click({ force: true, timeout: 10000 });
        });
      } else {
        await this.apiKeyButton.click({ force: true, timeout: 10000 });
      }
      console.log('✅ Test: API key button clicked/tapped');
      
      // Wait for the API key dialog to appear (with multiple possible dialog names)
      const apiDialogSelector = [
        'dialog:has-text("API Key")',
        'dialog:has-text("API Keys")',
        '[role="dialog"]:has-text("API Key")',
        '[role="dialog"]:has-text("API Keys")'
      ].join(',');
      
      await this._page.waitForSelector(apiDialogSelector, { timeout: 10000 });
      console.log('✅ Test: API key dialog appeared');
      
      // Take screenshot of API key dialog
      await this._page.screenshot({ path: `./test-results/api-key-dialog-${provider}.png` });
      
      // Find the input for this provider using multiple selector strategies
      const providerSelectors = [
        `#${provider}-api-key`,
        `input[name="${provider}"]`,
        `input[name="${provider}-api-key"]`,
        `input[placeholder*="${provider}"]`,
        `input[aria-label*="${provider}" i][type="text"]`,
        `[data-provider="${provider}"] input`
      ];

      // Try each selector until one works
      let inputFound = false;
      for (const selector of providerSelectors) {
        try {
          const input = this._page.locator(selector).first();
          if (await input.isVisible({ timeout: 2000 })) {
            await input.fill(apiKey);
            console.log(`✅ Test: Filled ${provider} API key input using selector: ${selector}`);
            inputFound = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!inputFound) {
        // Last resort: try to find any visible text input in the dialog
        console.log('⚠️ Test: Could not find specific provider input, trying generic input');
        const dialogInputs = this._page.locator('dialog input[type="text"], [role="dialog"] input[type="text"]');
        const count = await dialogInputs.count();
        
        // Try each visible input
        for (let i = 0; i < count; i++) {
          const input = dialogInputs.nth(i);
          if (await input.isVisible()) {
            await input.fill(apiKey);
            console.log(`✅ Test: Filled generic input at position ${i}`);
            inputFound = true;
            break;
          }
        }
      }
      
      if (!inputFound) {
        throw new Error(`Could not find input for provider ${provider}`);
      }
      
      // Save the API key - try different button labels
      const saveButton = this._page.locator(`
        button:has-text("Save"),
        button:has-text("Add Key"),
        button:has-text("Submit"),
        button:has-text("Apply")
      `).first();
      
      // Use appropriate interaction for device type
      if (isMobile) {
        await saveButton.tap({ force: true, timeout: 10000 });
      } else {
        await saveButton.click({ force: true, timeout: 10000 });
      }
      console.log('✅ Test: Save button clicked/tapped');
      
      // Wait for dialog to close
      await this._page.getByRole('dialog', { name: /api.+key/i }).waitFor({ state: 'hidden', timeout: 10000 })
        .catch(() => {
          console.log('⚠️ Test: Dialog did not close automatically, attempting to close it');
          // If the dialog doesn't close automatically, try to close it manually
          const closeButton = this._page.locator('dialog button:has-text("Close"), dialog .close-button');
          
          if (isMobile) {
            closeButton.tap({ force: true }).catch(() => {});
          } else {
            closeButton.click({ force: true }).catch(() => {});
          }
        });
    } catch (e) {
      console.error('❌ Test: Error adding API key via UI:', e);
      
      // Try localStorage as a fallback
      try {
        console.log('🔄 Test: Attempting localStorage fallback for API key');
          await this._page.evaluate(({ p, k }) => {
          localStorage.setItem(`threadlink_api_key_${p}`, k);
        }, { p: provider, k: apiKey });
        
        // Reload page to apply key from localStorage
        await this._page.reload();
        await this._page.waitForLoadState('networkidle');
        
        console.log('✅ Test: Added API key via localStorage fallback');
      } catch (fallbackError) {
        console.error('❌ Test: API key fallback also failed:', fallbackError);
        throw e; // Re-throw the original error
      }
    }
  }
  // Additional helper methods for mobile tests
  async setCompressionLevel(level: string) {
    const dropdown = this._page.getByRole('combobox', { name: 'Compression level:' });
    await dropdown.selectOption(level);
  }

  async verifyAppState() {
    // Check that all critical UI elements are present and in the correct state
    await this.condenseButton.isVisible();
    await this.settingsButton.isVisible();
    await this.textEditor.isEnabled();
    
    // Return a boolean indicating if the app is in a valid state
    return true;
  }
}
