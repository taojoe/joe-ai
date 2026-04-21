#!/bin/bash

# Define environment variables to ensure cron finds node and pnpm
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin

echo "set PATH"
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$HOME/.local/bin:$HOME/.opencode/bin:$PATH"
echo "set PATH DONE"

WORKSPACE="$(cd "$(dirname "$0")/.." && pwd)"
echo "current workspace $WORKSPACE"

# Exit immediately if a command exits with a non-zero status, handling failures automatically
set -e

# Log file for debugging if something goes wrong
LOG_FILE="$WORKSPACE/producthunt-daily.log"
echo "--- Starting scheduled task at $(date) ---" >> "$LOG_FILE"

# Step 1: agents/follow
cd "$WORKSPACE/agents/follow"
echo "Running agents/follow tasks..." >> "$LOG_FILE"
pnpm run producthunt-daily >> "$LOG_FILE" 2>&1
pnpm run producthunt-daily-translate >> "$LOG_FILE" 2>&1

# Step 2: apps/follow
cd "$WORKSPACE/apps/follow"
echo "Running apps/follow tasks..." >> "$LOG_FILE"
pnpm run prepare-db >> "$LOG_FILE" 2>&1
pnpm run upload:remote >> "$LOG_FILE" 2>&1

# If execution reaches here, all tasks succeeded
# osascript -e 'display notification "所有的任务都执行完毕了！" with title "ProductHunt 定时任务" sound name "Glass"' >> "$LOG_FILE" 2>&1
echo "--- Completed successfully at $(date) ---" >> "$LOG_FILE"
