#!/bin/bash
# Coffeebook deploy script - run from project root
# Usage: ./deploy.sh

set -e

echo "=== Coffeebook Deploy ==="

# Build and restart via Docker Compose
echo "Building and restarting..."
docker compose down
docker compose up -d --build

echo ""
echo "=== Done! ==="
echo "App running on http://localhost:3456"
echo "Cloudflare tunnel proxies coffeebook.thescale.in -> localhost:3456"
