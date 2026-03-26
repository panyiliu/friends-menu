#!/usr/bin/env sh
set -eu

DATA_DIR="/app/data"
UPLOAD_DIR="/app/public/uploads"
DB_TARGET="${DATA_DIR}/dev.db"
DB_LINK="/app/prisma/dev.db"
SECRET_FILE="${DATA_DIR}/admin-session-secret"

echo "[entrypoint] preparing persistent paths..."
mkdir -p "$DATA_DIR" "$UPLOAD_DIR"

echo "[entrypoint] ensuring sqlite db symlink..."
# If an old non-symlink db file exists inside the image layer, preserve it into the persistent volume once.
if [ -e "$DB_LINK" ] && [ ! -L "$DB_LINK" ]; then
  if [ ! -e "$DB_TARGET" ]; then
    echo "[entrypoint] migrating existing db file into volume..."
    cp "$DB_LINK" "$DB_TARGET" || true
  fi
  rm -f "$DB_LINK" || true
fi

if [ ! -e "$DB_LINK" ]; then
  ln -s "$DB_TARGET" "$DB_LINK"
fi

echo "[entrypoint] ensuring ADMIN_SESSION_SECRET..."
ADMIN_SESSION_SECRET="${ADMIN_SESSION_SECRET:-}"
needs_secret=false
if [ -z "$ADMIN_SESSION_SECRET" ] || [ "$ADMIN_SESSION_SECRET" = "dev-secret" ] || [ "${#ADMIN_SESSION_SECRET}" -lt 24 ]; then
  needs_secret=true
fi

if [ "$needs_secret" = "true" ]; then
  if [ -f "$SECRET_FILE" ]; then
    ADMIN_SESSION_SECRET="$(node -e "process.stdout.write(require('fs').readFileSync('$SECRET_FILE','utf8').trim())")"
  fi
fi

if [ -z "$ADMIN_SESSION_SECRET" ]; then
  ADMIN_SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  echo "$ADMIN_SESSION_SECRET" > "$SECRET_FILE"
fi

export ADMIN_SESSION_SECRET
echo "[entrypoint] ADMIN_SESSION_SECRET ready (len=${#ADMIN_SESSION_SECRET})"

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
