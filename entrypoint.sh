#!/bin/bash
set -e

echo "👋 Hello $INPUT_WHO_TO_GREET"

if [ -f "/github/workspace/package.json" ]; then
  echo "📦 Detected package.json in target repo, installing dependencies..."
  cd /github/workspace

  if command -v npm &> /dev/null; then
    npm install
  fi

  if command -v yarn &> /dev/null; then
    yarn install
  fi
else
  echo "📦 No package.json found in target repo, skipping install."
fi

cd /app
node main.js
