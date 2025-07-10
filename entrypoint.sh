#!/bin/bash
set -e

echo "👋 Hello $INPUT_WHO_TO_GREET"

npm install

if [ -f /github/workspace/package.json ]; then
  echo "📦 Detected package.json in target repo, installing dependencies..."
  cd /github/workspace
  # npm install
  yarn install
else
  echo "📦 No package.json found in target repo, skipping install."
fi

cd /app
node main.js
