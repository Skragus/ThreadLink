/**
 * Code fixer module.
 * Safely applies code changes suggested by the diagnosis module.
 */

const fs = require('fs');
const { execSync } = require('child_process');
const parser = require('@babel/parser');

function applyFix(fix) {
  const { filePath, suggestedCode, explanation } = fix;
  console.log(`🩹 Applying fix to ${filePath}...`);
  console.log(`   Explanation: ${explanation}`);

  // --- SAFETY PROTOCOL: Pre-commit test backup (git stash) ---
  try {
    console.log('   Saving current work with "git stash"...');
    execSync('git stash push -m "Pre-autofix backup"');
    console.log('   Backup successful.');
  } catch (error) {
    console.error('🚨 CRITICAL: Failed to create git stash backup. Aborting fix.');
    return;
  }

  // --- SAFETY PROTOCOL: AST validation before file overwrite ---
  try {
    console.log('   Validating syntax with AST parser...');
    parser.parse(suggestedCode, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'], // Add plugins as needed for your codebase
    });
    console.log('   AST validation passed.');
  } catch (error) {
    console.error('🚨 CRITICAL: Suggested code has invalid syntax. Aborting fix.');
    console.error(error.message);
    // Restore the stashed changes since we are aborting
    execSync('git stash pop');
    return;
  }

  // --- File Write Operation ---
  try {
    fs.writeFileSync(filePath, suggestedCode, 'utf-8');
    console.log(`   ✅ Successfully wrote fix to ${filePath}.`);
  } catch (error) {
    console.error(`🚨 CRITICAL: Failed to write to file ${filePath}.`);
    execSync('git stash pop'); // Restore on failure
  }
}

module.exports = { applyFix };
