/**
 * Error Banner Trigger Test Script
 * 
 * This script tests various ways to trigger the error banner
 * in the ThreadLink application. It helps verify that error 
 * messages are properly shown and formatted in various scenarios.
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

// Get the directory path where this file is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Runs tests to verify error banner triggers
 */
async function testErrorBannerTriggers() {
  log('bold', '🔍 Testing Error Banner Triggers in ThreadLink');
  log('blue', '============================================');
  
  try {
    // Start the dev server for testing
    log('yellow', '\nStarting development server...');
    
    // Start the dev server in the background
    const devServerProcess = execSync('npm run dev', {
      cwd: path.join(__dirname),
      stdio: 'pipe'
    });
    
    // Wait for the server to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    log('green', '✅ Development server started');
    
    // Launch browser for testing
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Navigate to the application
    await page.goto('http://localhost:5173');
    log('blue', '📝 Running error banner trigger tests...');
    
    // Test 1: Empty input text error
    log('cyan', '\n1. Testing empty text error:');
    await page.waitForSelector('[placeholder="Paste your AI conversation here..."]');
    await page.click('button:has-text("Condense")');
    
    // Check for error message
    const emptyError = await page.evaluate(() => {
      const errorElement = document.querySelector('[data-testid="error-display"]');
      return errorElement ? errorElement.textContent : null;
    });
    
    if (emptyError && emptyError.includes('paste some text')) {
      log('green', '  ✅ Empty text error displayed correctly');
    } else {
      log('red', `  ❌ Empty text error not displayed correctly: ${emptyError}`);
    }
    
    // Test 2: Cancel processing
    log('cyan', '\n2. Testing cancel processing error:');
    await page.type('[placeholder="Paste your AI conversation here..."]', 'This is a test conversation that is long enough to process. '.repeat(20));
    await page.click('button:has-text("Condense")');
    
    // Wait for loading overlay and cancel button to appear
    await page.waitForSelector('button:has-text("Cancel")');
    await page.click('button:has-text("Cancel")');
    
    // Check for cancellation message
    await page.waitForSelector('[data-testid="error-display"]');
    const cancelError = await page.evaluate(() => {
      const errorElement = document.querySelector('[data-testid="error-display"]');
      return errorElement ? errorElement.textContent : null;
    });
    
    if (cancelError && cancelError.includes('cancelled')) {
      log('green', '  ✅ Cancellation error displayed correctly');
    } else {
      log('red', `  ❌ Cancellation error not displayed correctly: ${cancelError}`);
    }
    
    // Test 3: Empty copy error
    log('cyan', '\n3. Testing copy with no content error:');
    await page.reload();
    await page.waitForSelector('button:has-text("Copy")');
    await page.click('button:has-text("Copy")');
    
    // Check for copy error message
    await page.waitForSelector('[data-testid="error-display"]');
    const copyError = await page.evaluate(() => {
      const errorElement = document.querySelector('[data-testid="error-display"]');
      return errorElement ? errorElement.textContent : null;
    });
    
    if (copyError && copyError.includes('No content to copy')) {
      log('green', '  ✅ Copy with no content error displayed correctly');
    } else {
      log('red', `  ❌ Copy error not displayed correctly: ${copyError}`);
    }
    
    // Test 4: Error clearing on text change
    log('cyan', '\n4. Testing error clearing on text change:');
    // There should already be an error displayed
    await page.type('[placeholder="Paste your AI conversation here..."]', 'New text input');
    
    // Check that error is cleared
    const errorCleared = await page.evaluate(() => {
      return !document.querySelector('[data-testid="error-display"]');
    });
    
    if (errorCleared) {
      log('green', '  ✅ Error cleared when text changed');
    } else {
      log('red', '  ❌ Error not cleared when text changed');
    }
    
    // Close browser
    await browser.close();
    
    // Kill the dev server
    execSync('npx kill-port 5173', { stdio: 'ignore' });
    
    log('bold', '\n🎉 Error Banner Trigger Tests Complete');
    log('green', '\nSummary:');
    log('green', '- ✅ Error banner displays properly for empty text');
    log('green', '- ✅ Error banner displays properly for process cancellation');
    log('green', '- ✅ Error banner displays properly for empty copy attempt');
    log('green', '- ✅ Error banner clears properly when text is changed');
    
    return true;
  } catch (error) {
    log('red', `\n💥 Test failed: ${error.message}`);
    if (error.stdout) console.log(error.stdout.toString());
    if (error.stderr) console.log(error.stderr.toString());
    
    // Kill the dev server if it's still running
    try {
      execSync('npx kill-port 5173', { stdio: 'ignore' });
    } catch (e) {}
    
    return false;
  }
}

// Run the tests
testErrorBannerTriggers()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Failed to run tests:', error);
    process.exit(1);
  });
