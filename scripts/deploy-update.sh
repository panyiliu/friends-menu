#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"
BRANCH="${2:-main}"

cd "$PROJECT_DIR"
echo "[deploy] project: $PROJECT_DIR"
echo "[deploy] branch: $BRANCH"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

docker compose up -d --build
docker compose ps

echo "[deploy] done."
