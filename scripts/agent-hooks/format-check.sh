#!/usr/bin/env bash
set -euo pipefail

file_path="${1:-${CLAUDE_TOOL_INPUT_FILE_PATH:-}}"

if [ -z "$file_path" ]; then
  exit 0
fi

if [[ ! "$file_path" =~ \.(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

if [ ! -f "$file_path" ]; then
  exit 0
fi

pnpm exec eslint "$file_path"
