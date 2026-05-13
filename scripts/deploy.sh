#!/bin/bash
# Coffeebook deploy script - called by webhook or run manually.
# Hard-syncs to origin/main so untracked or locally-modified tracked files
# never block deploys. `data/` is gitignored so SQLite + uploads survive.

set -e

cd "$(dirname "$0")/.."

git fetch origin main
git reset --hard origin/main
git clean -fd -e data -e .env.local

docker compose down
docker compose up -d --build
