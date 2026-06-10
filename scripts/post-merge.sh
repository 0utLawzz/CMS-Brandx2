#!/bin/bash
set -e

# Install root dependencies (server.js, api/)
npm install --yes 2>/dev/null || true

# Install API dependencies
if [ -f api/package.json ]; then
  cd api && npm install --yes 2>/dev/null || true
  cd ..
fi

# Install mobile dependencies (skip postinstall to stay fast)
if [ -f mobile/package.json ]; then
  cd mobile && npm install --yes --ignore-scripts 2>/dev/null || true
  cd ..
fi

echo "✅ Post-merge setup complete"
