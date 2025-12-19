#!/bin/bash
# Wrapper script to run port-content.js with timeout
# Usage: ./port-with-timeout.sh [timeout_seconds] [--build|--no-server]

TIMEOUT=${1:-600}  # Default 10 minutes
ARGS="${@:2}"      # All remaining arguments

echo "⏱️  Running port script with ${TIMEOUT}s timeout..."
echo "   Arguments: ${ARGS:-none}"
echo ""

# Use timeout command (available on Linux/Mac)
if command -v timeout &> /dev/null; then
  timeout ${TIMEOUT}s npm run port -- ${ARGS}
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo ""
    echo "❌ Script timed out after ${TIMEOUT}s"
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
    exit 1
  fi
  exit $EXIT_CODE
else
  echo "⚠️  timeout command not found, running without timeout..."
  npm run port -- ${ARGS}
fi

