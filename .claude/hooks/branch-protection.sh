#!/bin/bash
# Branch Protection Hook - Blocks edits on master branch
# Exit code 2: Blocks operation

current_branch=$(git branch --show-current)

if [ "$current_branch" = "master" ]; then
  echo '{"block": true, "message": "Cannot edit files on master branch. Create a feature branch first."}' >&2
  exit 2
fi

exit 0