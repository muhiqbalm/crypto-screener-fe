#!/bin/bash
# Rebuild bmtm-web on the VPS and restart it through PM2.
set -euo pipefail
cd "$(dirname "$0")"

git pull --ff-only
npm ci
npm run build
pm2 restart bmtm-web

for _ in {1..15}; do
  if curl -fs -m 3 -o /dev/null http://127.0.0.1:3000/login; then
    echo "bmtm-web healthy"
    exit 0
  fi
  sleep 2
done

echo "bmtm-web failed its health check" >&2
exit 1
