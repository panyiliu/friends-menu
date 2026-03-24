#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"
BACKUP_DIR="${2:-}"

if [[ -z "$BACKUP_DIR" ]]; then
  echo "usage: $0 <project_dir> <backup_dir>"
  exit 1
fi

cd "$PROJECT_DIR"

if [[ ! -f "$BACKUP_DIR/dev.db" ]]; then
  echo "[restore] missing: $BACKUP_DIR/dev.db"
  exit 1
fi

cp "$BACKUP_DIR/dev.db" "prisma/dev.db"
mkdir -p "public/uploads"
if [[ -d "$BACKUP_DIR/uploads" ]]; then
  rm -rf "public/uploads"/*
  cp -r "$BACKUP_DIR/uploads"/. "public/uploads/"
fi

echo "[restore] done from: $BACKUP_DIR"
