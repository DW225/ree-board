#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
"$repo_root/scripts/agent-hooks/format-check.sh" "${CLAUDE_TOOL_INPUT_FILE_PATH:-}" || true
