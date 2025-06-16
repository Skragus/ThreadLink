/**
 * Main runner for the autonomous test-fix loop.
 * This script executes Playwright tests, and if they fail, it triggers
 * the diagnosis and fix application process.
 */

require('dotenv').config();
const { execSync } = require('child_process');
const { diagnoseFailure } = require('./claude_diagnoser.js');
const { applyFix } = require('./code_fixer.js');

const MAX_ITERATIONS = parseInt(process.env.MAX_ITERATIONS, 10) || 10;

// Placeholder for running Playwright tests and capturing the output
async function runTests() {
  console.log('▶️  Running Playwright tests...');
  try {
    // This command will run Playwright and throw an error if tests fail.
    const output = execSync('npx playwright test', { encoding: 'utf-8' });
    console.log('✅ All tests passed!');
    return { failed: 0, output };
  } catch (error) {
    console.error('❌ Tests failed. Capturing output for diagnosis...');
    return { failed: error.status, output: error.stdout + error.stderr };
  }
}

async function main() {
  let iteration = 0;
  let results;

  do {
    iteration++;
    console.log(`\n--- Iteration ${iteration}/${MAX_ITERATIONS} ---`);

    results = await runTests();

    if (results.failed > 0) {
      if (iteration >= MAX_ITERATIONS) {
        console.error('🚨 MAX_ITERATIONS reached. Aborting loop to prevent infinite runs.');
        break;
      }

      const diagnosis = await diagnoseFailure(results.output);

      if (diagnosis && diagnosis.fix) {
        await applyFix(diagnosis.fix);
      } else {
        console.error('🚨 Diagnosis failed or provided no fix. Aborting.');
        break;
      }
    }
  } while (results.failed > 0);

  if (results.failed === 0) {
    console.log('\n🎉 Autonomous loop complete. All tests are passing.');
  } else {
    console.log('\n⏹️  Autonomous loop finished with failing tests.');
  }
}

main();
