#!/usr/bin/env node

/**
 * Stop Hook: Check for console.log statements in modified files
 *
 * This hook runs after each response and checks if any modified
 * JavaScript/TypeScript files contain console.log statements.
 * It provides warnings to help developers remember to remove
 * debug statements before committing.
 */

const { execSync } = require('child_process');
const fs = require('fs');

function main() {
  let data = '';
  let timedOut = false;

  // Set a timeout to exit if stdin doesn't close (fixes hanging hook)
  const timeout = setTimeout(() => {
    timedOut = true;
    process.exit(0);
  }, 100);

  // Read stdin
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', chunk => {
    data += chunk;
  });

  process.stdin.on('end', () => {
    clearTimeout(timeout);

    if (timedOut) return;

    try {
      // Check if we're in a git repository
      try {
        execSync('git rev-parse --git-dir', { stdio: 'pipe' });
      } catch {
        // Not in a git repo, just pass through the data
        console.log(data);
        process.exit(0);
      }

      // Get list of modified files
      const files = execSync('git diff --name-only HEAD', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      })
        .split('\n')
        .filter(f => /\.(ts|tsx|js|jsx)$/.test(f) && fs.existsSync(f));

      let hasConsole = false;

      // Check each file for console.log
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('console.log')) {
          console.error(`[Hook] WARNING: console.log found in ${file}`);
          hasConsole = true;
        }
      }

      if (hasConsole) {
        console.error('[Hook] Remove console.log statements before committing');
      }
    } catch (_error) {
      // Silently ignore errors (git might not be available, etc.)
    }

    // Always output the original data
    console.log(data);
  });

  // If stdin is a TTY (interactive), no data will come - exit immediately
  if (process.stdin.isTTY) {
    process.exit(0);
  }
}

main();
