#!/bin/bash
# Format Check Hook - Runs ESLint on modified TypeScript/JavaScript files
# Exit code 0: Success (non-blocking)
# Returns JSON feedback

set -euo pipefail

# Get the file path from Claude's environment variable
FILE_PATH="$CLAUDE_TOOL_INPUT_FILE_PATH"

# Only run on JS/TS files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
  echo "{\"feedback\": \"File not found: $FILE_PATH\"}" >&2
  exit 0
fi

# Run ESLint on the file
if pnpm exec eslint "$FILE_PATH" >/dev/null 2>&1; then
  echo '{"feedback": "✅ Linting passed.", "suppressOutput": true}'
else
  echo '{"feedback": "⚠️ Linting issues found. Run \"pnpm lint\" to see details."}' >&2
fi

# Always exit 0 (non-blocking)
exit 0
