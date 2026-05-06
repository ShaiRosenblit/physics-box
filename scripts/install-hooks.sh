#!/bin/sh
# Copies repo-managed hooks into .git/hooks so they run automatically.
set -e
HOOKS_SRC="$(dirname "$0")/hooks"
HOOKS_DST="$(git rev-parse --git-dir)/hooks"
for hook in "$HOOKS_SRC"/*; do
  name="$(basename "$hook")"
  cp "$hook" "$HOOKS_DST/$name"
  chmod +x "$HOOKS_DST/$name"
  echo "installed hook: $name"
done
