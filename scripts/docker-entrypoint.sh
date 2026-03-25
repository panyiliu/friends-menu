#!/usr/bin/env sh
set -eu

echo "[entrypoint] applying migrations..."
npx prisma migrate deploy

echo "[entrypoint] verifying required sqlite schema hard-gate..."
node scripts/verify-schema.js

SCHEMA_SELF_HEAL="${SCHEMA_SELF_HEAL:-false}"
if [ "$SCHEMA_SELF_HEAL" = "true" ]; then
  echo "[entrypoint] healing legacy sqlite schema (DISASTER RECOVERY MODE)..."
  node scripts/schema-self-heal.cjs
else
  echo "[entrypoint] skipping schema-self-heal (SCHEMA_SELF_HEAL=$SCHEMA_SELF_HEAL)"
fi

AUTO_SEED="${AUTO_SEED_IF_EMPTY:-true}"
if [ "$AUTO_SEED" = "true" ]; then
  echo "[entrypoint] checking seed condition..."
  node scripts/seed-if-empty.cjs
else
  echo "[entrypoint] AUTO_SEED_IF_EMPTY=$AUTO_SEED, skip seed."
fi

echo "[entrypoint] starting app..."
exec npm run start
