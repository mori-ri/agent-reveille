#!/bin/bash
# PostToolUse hook: auto-format files after Write/Edit
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Only format TypeScript/TSX files
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx)
    cd "$CLAUDE_PROJECT_DIR" && npx biome check --write "$FILE_PATH" 2>/dev/null || true
    ;;
esac

exit 0
