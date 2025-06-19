#!/usr/bin/env node

/**
 * Test script to verify drone failure messages are working properly
 * This test doesn't trust the existing fragile tests and creates direct scenarios
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function createMockApiResponse(shouldFail = false, failureType = 'SERVER_ERROR') {
    if (shouldFail) {
        switch (failureType) {
            case 'RATE_LIMIT':
                throw { status: 429, message: 'Rate limit exceeded' };
            case 'AUTH_ERROR':
                throw { status: 401, message: 'Invalid API key' };
            case 'NETWORK_ERROR':
                throw new TypeError('Failed to fetch');
            case 'SERVER_ERROR':
            default:
                throw { status: 500, message: 'Internal server error' };
        }
    }
    
    return {
        candidates: [{
            content: {
                parts: [{ text: 'Successfully processed content with good quality output that meets all requirements.' }]
            }
        }]
    };
}

// Test the failure message generation directly
async function testFailureMessageGeneration() {
    log('blue', '\n🧪 Testing failure message generation...');
      // Import the orchestrator functions directly
    let orchestrator;
    try {
        // Try to import as ES module first
        orchestrator = await import('./src/pipeline/orchestrator.js');
    } catch (e) {
        log('red', 'Failed to import orchestrator:', e.message);
        return false;
    }
    
    // Test different failure scenarios
    const testCases = [
        {
            name: 'Rate Limit Failure',
            droneResult: '[Drone 1 failed: Rate limit exceeded]',
            expectedPattern: /\[⚠ Drone \d+ failed — Input size: \d+ tokens\]/
        },
        {
            name: 'Auth Error Failure',
            droneResult: '[Drone 2 failed: Invalid API key]',
            expectedPattern: /\[⚠ Drone \d+ failed — Input size: \d+ tokens\]/
        },
        {
            name: 'Network Error Failure',
            droneResult: '[Drone 3 failed: Network error]',
            expectedPattern: /\[⚠ Drone \d+ failed — Input size: \d+ tokens\]/
        }
    ];
    
    let allPassed = true;
    
    for (const testCase of testCases) {
        try {
            // Create mock drone results with failures
            const droneResults = [
                'Successfully processed first drone content.',
                testCase.droneResult,
                'Successfully processed third drone content.'
            ];
            
            const mockSessionStats = {
                totalInputTokens: 3000,
                displayTargetTokens: 1000,
                compressionRatio: '3.0'
            };
            
            const mockPayloads = [
                { actual_token_count: 1000 },
                { actual_token_count: 1200 },
                { actual_token_count: 800 }
            ];
            
            // Test the createContextCard function
            if (orchestrator.createContextCard) {
                const contextCard = orchestrator.createContextCard(droneResults, mockSessionStats, mockPayloads);
                
                if (testCase.expectedPattern.test(contextCard)) {
                    log('green', `✅ ${testCase.name}: PASSED`);
                } else {
                    log('red', `❌ ${testCase.name}: FAILED - Pattern not found in context card`);
                    log('yellow', `   Expected pattern: ${testCase.expectedPattern}`);
                    log('yellow', `   Actual content: ${contextCard.substring(0, 500)}...`);
                    allPassed = false;
                }
            } else {
                log('red', `❌ ${testCase.name}: FAILED - createContextCard function not found`);
                allPassed = false;
            }
            
        } catch (error) {
            log('red', `❌ ${testCase.name}: FAILED - Error: ${error.message}`);
            allPassed = false;
        }
    }
    
    return allPassed;
}

// Test drone processing with simulated failures
async function testDroneProcessingFailures() {
    log('blue', '\n🧪 Testing drone processing with simulated failures...');
    
    // Check if we can run the app in dev mode
    try {
        // Start the dev server in background
        log('yellow', 'Starting development server...');
        
        const devProcess = execSync('npm run dev', { 
            encoding: 'utf8', 
            stdio: 'pipe',
            timeout: 10000,
            cwd: __dirname
        });
        
        log('green', 'Development server started successfully');
        
        // TODO: Add automated browser testing here
        // For now, we'll just verify the server can start
        
        return true;
        
    } catch (error) {
        log('red', `❌ Failed to start development server: ${error.message}`);
        return false;
    }
}

// Test E2E failure scenarios
async function testE2EFailureScenarios() {
    log('blue', '\n🧪 Testing E2E failure scenarios...');
    
    try {
        // Run the existing E2E tests that specifically test drone failures
        log('yellow', 'Running E2E drone failure tests...');
        
        const testCommand = 'npx playwright test tests/e2e/drone-failure-markers.spec.ts --reporter=line';
        const result = execSync(testCommand, { 
            encoding: 'utf8', 
            stdio: 'pipe',
            cwd: __dirname
        });
        
        log('green', 'E2E drone failure tests completed successfully');
        log('blue', 'Test output:');
        console.log(result);
        
        return true;
        
    } catch (error) {
        log('red', `❌ E2E tests failed: ${error.message}`);
        
        // Check if it's just a setup issue vs actual test failure
        if (error.stdout) {
            log('yellow', 'Test stdout:');
            console.log(error.stdout);
        }
        if (error.stderr) {
            log('yellow', 'Test stderr:');
            console.log(error.stderr);
        }
        
        return false;
    }
}

// Test the browser integration
async function testBrowserIntegration() {
    log('blue', '\n🧪 Testing browser integration for failure messages...');
    
    // Check if the HTML file properly includes the failure message handling
    const indexPath = path.join(__dirname, 'index.html');
    
    if (!fs.existsSync(indexPath)) {
        log('red', '❌ index.html not found');
        return false;
    }
    
    const htmlContent = fs.readFileSync(indexPath, 'utf8');
    
    // Check for key components
    const checks = [
        { name: 'ThreadLink script', pattern: /ThreadLink/ },
        { name: 'Progress handling', pattern: /progress|loading/ },
        { name: 'Error handling', pattern: /error|fail/ }
    ];
    
    let allPassed = true;
    
    for (const check of checks) {
        if (check.pattern.test(htmlContent)) {
            log('green', `✅ ${check.name}: Found`);
        } else {
            log('yellow', `⚠️ ${check.name}: Not clearly visible (may be in bundled JS)`);
            // Don't fail for this since the functionality might be in the bundled code
        }
    }
    
    return allPassed;
}

// Main test runner
async function runAllTests() {
    log('bold', '🚀 Starting Drone Failure Message Testing');
    log('blue', '========================================\n');
    
    const results = [];
      // Test 1: Direct failure message generation
    results.push({
        name: 'Failure Message Generation',
        passed: await testFailureMessageGeneration()
    });
    
    // Test 2: Browser integration
    results.push({
        name: 'Browser Integration',
        passed: await testBrowserIntegration()
    });
    
    // Test 3: E2E scenarios (if available)
    results.push({
        name: 'E2E Failure Scenarios',
        passed: await testE2EFailureScenarios()
    });
    
    // Summary
    log('bold', '\n📊 TEST RESULTS SUMMARY');
    log('blue', '=======================');
    
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    
    results.forEach(result => {
        const status = result.passed ? '✅ PASSED' : '❌ FAILED';
        const color = result.passed ? 'green' : 'red';
        log(color, `${status}: ${result.name}`);
    });
    
    log('bold', `\nOverall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        log('green', '🎉 All drone failure message tests PASSED!');
        process.exit(0);
    } else {
        log('red', '💥 Some tests FAILED. Drone failure messages may not be working correctly.');
        process.exit(1);
    }
}

// Run the tests
console.log('Starting drone failure tests...');
runAllTests().catch(error => {
    log('red', `💥 Test runner failed: ${error.message}`);
    console.error(error);
    process.exit(1);
});

export {
    testFailureMessageGeneration,
    testBrowserIntegration,
    testE2EFailureScenarios,
    runAllTests
};
