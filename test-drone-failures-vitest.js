#!/usr/bin/env node

/**
 * Comprehensive test runner for drone failure messages
 * This script runs all the Vitest tests for drone failures
 * and provides a summary report.
 */

import { execSync } from 'child_process';
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
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Run all drone failure tests
 */
async function runDroneFailureTests() {
  try {
    log('bold', '🧪 Running Drone Failure Message Tests...');
    log('blue', '=========================================');
    
    const testFiles = [
      'tests/drone-failure-messages.test.js',
      'tests/drone-error-classification.test.js',
      'tests/drone-payload-processing.test.js'
    ];
    
    // Run all tests with Vitest
    log('yellow', `\nRunning ${testFiles.length} test files:`);
    testFiles.forEach(file => log('cyan', `- ${file}`));
    
    const testCommand = `npm run test -- ${testFiles.join(' ')} --reporter=verbose`;
    
    const result = execSync(testCommand, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: path.resolve(__dirname)
    });
    
    console.log(result);
    
    log('green', '\n✅ All drone failure message tests passed!');
    log('bold', '\nSummary:');
    log('green', '- ✅ Drone failure messages are correctly formatted');
    log('green', '- ✅ Error classification is working properly');
    log('green', '- ✅ Payload processing with token counting works');
    log('green', '- ✅ All edge cases are handled appropriately');
    
    log('bold', '\n🚀 Drone failure messaging system is reliable and working as expected.');
    
    return 0;
  } catch (error) {
    log('red', '\n❌ Some tests failed:');
    
    if (error.stdout) {
      console.log(error.stdout);
    }
    
    if (error.stderr) {
      console.log(error.stderr);
    }
    
    log('red', '\n💥 Drone failure message tests failed - see details above.');
    log('yellow', '\nPossible issues:');
    log('yellow', '- Failure message formatting in createContextCard function');
    log('yellow', '- Error classification in classifyError function');
    log('yellow', '- Token counting or payload processing');
    
    log('blue', '\nRecommendation:');
    log('blue', '- Check orchestrator.js implementation of failure handling');
    log('blue', '- Ensure token counting is correct in the createContextCard function');
    log('blue', '- Verify error classification logic in classifyError function');
    
    return 1;
  }
}

// Run the tests and exit with appropriate code
runDroneFailureTests()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('Failed to run tests:', err);
    process.exit(1);
  });
