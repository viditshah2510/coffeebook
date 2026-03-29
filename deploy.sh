#!/bin/bash
# Coffeebook deploy script - run from project root
# Usage: ./deploy.sh

set -e

echo "=== Coffeebook Deploy ==="

# Build
echo "Building..."
npm run build

# Restart the app process
echo "Restarting app..."
pm2 delete coffeebook 2>/dev/null || true
pm2 start npm --name coffeebook -- start
pm2 save

echo ""
echo "=== Done! ==="
echo "App running on http://localhost:3456"
echo "Caddy should proxy coffeebook.thescale.in -> localhost:3456"
echo ""
echo "If Caddy isn't set up yet:"
echo "  1. Install: sudo apt install caddy"
echo "  2. Copy Caddyfile: sudo cp Caddyfile /etc/caddy/Caddyfile"
echo "  3. Restart: sudo systemctl restart caddy"
echo "  4. Point DNS: CNAME coffeebook.thescale.in -> your-server-ip"
