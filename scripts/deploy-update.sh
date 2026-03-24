#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"
BRANCH="${2:-main}"

cd "$PROJECT_DIR"
echo "[deploy] project: $PROJECT_DIR"
echo "[deploy] branch: $BRANCH"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
PREV_SHA="$(git rev-parse --short HEAD)"
git pull --ff-only origin "$BRANCH"
NEW_SHA="$(git rev-parse --short HEAD)"
echo "[deploy] from $PREV_SHA -> $NEW_SHA"

docker compose up -d --build
docker compose ps

echo "[deploy] done."
echo "[deploy] rollback: bash scripts/rollback-release.sh \"$PROJECT_DIR\" \"$PREV_SHA\""
