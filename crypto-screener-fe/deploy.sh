#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Crypto Screener FE deployment script (runs on VPS)
# =============================================================================
# Called by the GitHub Actions workflow after SSH-ing into the VPS.
# Assumes:
#   - The repo is cloned at ~/crypto-screener-fe
#   - A .env file exists at ~/crypto-screener-fe/.env with production values
#   - Docker and Docker Compose v2 are installed
# =============================================================================

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE="docker compose"

echo "==> [1/4] Pulling latest code from main..."
git -C "$REPO_DIR" fetch --prune origin
git -C "$REPO_DIR" reset --hard origin/main

echo "==> [2/4] Building new image (no cache)..."
$COMPOSE -f "$REPO_DIR/docker-compose.yml" build --no-cache app

echo "==> [3/4] Restarting container..."
$COMPOSE -f "$REPO_DIR/docker-compose.yml" up -d --force-recreate --remove-orphans app

echo "==> [4/4] Cleaning up dangling images..."
docker image prune -f

echo ""
echo "✓ Deployment complete."
echo "  Container : $($COMPOSE -f "$REPO_DIR/docker-compose.yml" ps --format 'table {{.Name}}\t{{.Status}}' app)"
