#!/usr/bin/env bash
set -euo pipefail

current_branch="$(git branch --show-current)"

if [[ "$current_branch" == "master" || "$current_branch" == "main" ]]; then
  echo "Cannot edit files on $current_branch. Create a feature branch first." >&2
  exit 2
fi
