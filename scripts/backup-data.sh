#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"
BACKUP_BASE="${2:-$PROJECT_DIR/backups}"
TS="$(date +%Y%m%d-%H%M%S)"
TARGET="$BACKUP_BASE/$TS"

cd "$PROJECT_DIR"
mkdir -p "$TARGET"

if [[ ! -f "prisma/dev.db" ]]; then
  echo "[backup] prisma/dev.db not found"
  exit 1
fi

cp "prisma/dev.db" "$TARGET/dev.db"
mkdir -p "$TARGET/uploads"
if [[ -d "public/uploads" ]]; then
  cp -r public/uploads/. "$TARGET/uploads/"
fi

echo "[backup] done: $TARGET"
