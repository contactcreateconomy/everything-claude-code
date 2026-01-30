#!/usr/bin/env node
/**
 * Strategic Compact Suggester
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs on PreToolUse or periodically to suggest manual compaction at logical intervals
 *
 * Why manual over auto-compact:
 * - Auto-compact happens at arbitrary points, often mid-task
 * - Strategic compacting preserves context through logical phases
 * - Compact after exploration, before execution
 * - Compact after completing a milestone, before starting next
 */

const path = require('path');
const fs = require('fs');
const {
  getTempDir,
  readFile,
  writeFile,
  log
} = require('../lib/utils');

async function main() {
  // Track tool call count (increment in a temp file)
  // Use a session-specific counter file based on PID from parent process
  // or session ID from environment
  const sessionId = process.env.CLAUDE_SESSION_ID || process.ppid || 'default';
  const counterFile = path.join(getTempDir(), `claude-tool-count-${sessionId}`);
  const threshold = parseInt(process.env.COMPACT_THRESHOLD || '20', 10);

  let count = 1;

  // Read existing count or start at 1
  const existing = readFile(counterFile);
  if (existing) {
    count = parseInt(existing.trim(), 10) + 1;
  }

  // Save updated count
  writeFile(counterFile, String(count));

  // Suggest compact at multiple checkpoints
  if (count === threshold) {
    log(`[StrategicCompact] ${threshold} tool calls - consider /compact to preserve context`);
  }

  // Suggest at regular intervals after threshold (every 10 calls)
  if (count > threshold && count % 10 === 0) {
    log(`[StrategicCompact] ${count} tool calls - use /compact if transitioning to new task`);
  }

  // Also suggest at very high counts (every 25 after 50)
  if (count >= 50 && count % 25 === 0) {
    log(`[StrategicCompact] ${count} tool calls - strongly recommend /compact to reduce token usage`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('[StrategicCompact] Error:', err.message);
  process.exit(0);
});
