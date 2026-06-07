#!/usr/bin/env bash
set -euo pipefail

file_path="${1:-${CLAUDE_TOOL_INPUT_FILE_PATH:-}}"

if [ -n "$file_path" ]; then
  if [[ ! "$file_path" =~ \.(ts|tsx)$ ]]; then
    exit 0
  fi

  if [ ! -f "$file_path" ]; then
    exit 0
  fi
fi

npx tsc --noEmit
