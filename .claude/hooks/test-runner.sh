#!/bin/bash
# Test Runner Hook - Runs Jest tests for modified test files
# Exit code 0: Success (non-blocking)
# Returns JSON feedback

set -euo pipefail

# Get the file path from Claude's environment variable
FILE_PATH="$CLAUDE_TOOL_INPUT_FILE_PATH"

# Only run on test files
if [[ ! "$FILE_PATH" =~ \.test\.(ts|tsx)$ ]]; then
  exit 0
fi

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
  echo "{\"feedback\": \"Test file not found: $FILE_PATH\"}" >&2
  exit 0
fi

echo '{"feedback": "🧪 Running tests..."}' >&2

# Run jest for the specific test file
pnpm test "$FILE_PATH" --passWithNoTests 2>&1 | tail -30
exit_code=${PIPESTATUS[0]}

if [ "$exit_code" -eq 0 ]; then
  echo '{"feedback": "✅ Tests passed."}'
else
  echo '{"feedback": "❌ Tests failed. See output above."}' >&2
fi

# Always exit 0 (non-blocking)
exit 0
