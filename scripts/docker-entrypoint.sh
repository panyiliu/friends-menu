#!/usr/bin/env sh
set -eu

echo "[entrypoint] applying migrations..."
npx prisma migrate deploy

echo "[entrypoint] healing legacy sqlite schema (if needed)..."
node scripts/schema-self-heal.cjs

AUTO_SEED="${AUTO_SEED_IF_EMPTY:-true}"
if [ "$AUTO_SEED" = "true" ]; then
  echo "[entrypoint] checking seed condition..."
  node scripts/seed-if-empty.cjs
else
  echo "[entrypoint] AUTO_SEED_IF_EMPTY=$AUTO_SEED, skip seed."
fi

echo "[entrypoint] starting app..."
exec npm run start
