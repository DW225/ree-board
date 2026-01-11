#!/bin/bash
# Type Check Hook - Runs TypeScript compiler without emitting files
# Exit code 0: Success (non-blocking)
# Returns JSON feedback

# Only exit on unset variables, but allow commands to fail so we can report errors
set -u

# Get the file path from Claude's environment variable
FILE_PATH="${CLAUDE_TOOL_INPUT_FILE_PATH:-}"

# Only run on TS/TSX files
if [[ -n "$FILE_PATH" ]] && [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

echo '{"feedback": "🔍 Checking TypeScript types..."}' >&2

# Run tsc --noEmit to check for type errors
if output=$(npx tsc --noEmit 2>&1); then
  echo '{"feedback": "✅ No TypeScript errors.", "suppressOutput": true}'
else
  # Get first 30 lines of errors
  errors=$(echo "$output" | grep -A 2 "error TS" | head -30)
  if [ -n "$errors" ]; then
    echo '{"feedback": "⚠️ TypeScript errors found:"}' >&2
    echo "$errors" >&2
  fi
fi

# Always exit 0 (non-blocking)
exit 0
