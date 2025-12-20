#!/bin/bash
# Wrapper script to run port-content.js with timeout
# This provides a process-level timeout (entire npm run port execution)
# Individual commands within port-content.js have their own timeouts (see COMMAND_TIMEOUT_MS)
# 
# Usage: ./port-with-timeout.sh [timeout_seconds] [--build|--no-server]
# Example: ./port-with-timeout.sh 600 --build  # 10 minutes with build check

TIMEOUT=${1:-300}  # Default 5 minutes (300 seconds)
ARGS="${@:2}"      # All remaining arguments

echo "⏱️  Running port script with ${TIMEOUT}s timeout..."
echo "   Arguments: ${ARGS:-none}"
echo "   To adjust timeout, pass seconds as first argument or edit default in: scripts/pipeline/port-with-timeout.sh"
echo ""

# Use timeout command (available on Linux/Mac)
if command -v timeout &> /dev/null; then
  timeout ${TIMEOUT}s npm run port -- ${ARGS}
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo ""
    echo "❌ Script timed out after ${TIMEOUT}s"
    echo "   To increase timeout, run: ./scripts/pipeline/port-with-timeout.sh <seconds> ${ARGS}"
    echo "   Or edit TIMEOUT default in: scripts/pipeline/port-with-timeout.sh"
    exit 1
  fi
  exit $EXIT_CODE
# Fallback for systems without timeout (use gtimeout on Mac with coreutils)
elif command -v gtimeout &> /dev/null; then
  gtimeout ${TIMEOUT}s npm run port -- ${ARGS}
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo ""
    echo "❌ Script timed out after ${TIMEOUT}s"
    echo "   To increase timeout, run: ./scripts/pipeline/port-with-timeout.sh <seconds> ${ARGS}"
    echo "   Or edit TIMEOUT default in: scripts/pipeline/port-with-timeout.sh"
    exit 1
  fi
  exit $EXIT_CODE
else
  echo "⚠️  timeout command not found, running without timeout..."
  echo "   Install timeout command or use: npm run port -- ${ARGS}"
  npm run port -- ${ARGS}
fi

