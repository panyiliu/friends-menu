#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"
TARGET_SHA="${2:-}"

if [[ -z "$TARGET_SHA" ]]; then
  echo "usage: $0 <project_dir> <target_sha>"
  exit 1
fi

cd "$PROJECT_DIR"
echo "[rollback] project: $PROJECT_DIR"
echo "[rollback] target: $TARGET_SHA"

git fetch --all --tags
git reset --hard "$TARGET_SHA"

docker compose up -d --build
docker compose ps

echo "[rollback] done."
