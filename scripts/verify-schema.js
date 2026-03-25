/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function uniq(arr) {
  return Array.from(new Set(arr));
}

async function getTableNames() {
  // SQLite introspection: sqlite_master + PRAGMA.
  const rows = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
  return Array.isArray(rows) ? rows.map((r) => String(r.name)) : [];
}

async function tableExists(tableName) {
  const names = await getTableNames();
  return names.includes(tableName);
}

async function getColumnNames(tableName) {
  // PRAGMA table_info returns empty array when table doesn't exist.
  const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info("${tableName}")`);
  return Array.isArray(rows) ? rows.map((r) => String(r.name)) : [];
}

async function main() {
  const required = {
    SystemSetting: [
      "debugUiEnabled",
      "guestTitle",
      "guestSubtitle",
      "guestBannerUrl",
      "welcomeAlwaysShow",
    ],
    InviteLink: [
      "label",
      "inviteGuestName",
      "showPrice",
      "welcomeEnabled",
      "welcomeTitle",
      "welcomeSubtitle",
      "welcomeButtonText",
      "welcomeFontSize",
      "welcomeFontWeight",
      "welcomeTextAlign",
      "welcomeButtonColor",
      "welcomeBackdropOpacity",
    ],
  };

  const optional = {
    Order: ["inviteId", "eta"],
  };

  const errors = [];

  // Mandatory tables/columns.
  for (const [tableName, requiredCols] of Object.entries(required)) {
    const exists = await tableExists(tableName);
    const currentCols = exists ? await getColumnNames(tableName) : [];
    const missingCols = requiredCols.filter((c) => !currentCols.includes(c));

    if (!exists) {
      errors.push({
        tableName,
        status: "missing_table",
        missingColumns: requiredCols,
        currentColumns: [],
      });
      continue;
    }

    if (missingCols.length > 0) {
      errors.push({
        tableName,
        status: "missing_columns",
        missingColumns: missingCols,
        currentColumns: currentCols,
      });
    }
  }

  // Optional tables/columns: warn only, don't block boot.
  const optionalWarnings = [];
  for (const [tableName, requiredCols] of Object.entries(optional)) {
    const exists = await tableExists(tableName);
    const currentCols = exists ? await getColumnNames(tableName) : [];
    const missingCols = requiredCols.filter((c) => !currentCols.includes(c));

    if (!exists) {
      optionalWarnings.push({
        tableName,
        status: "missing_table",
        missingColumns: requiredCols,
        currentColumns: [],
      });
      continue;
    }

    if (missingCols.length > 0) {
      optionalWarnings.push({
        tableName,
        status: "missing_columns",
        missingColumns: missingCols,
        currentColumns: currentCols,
      });
    }
  }

  if (optionalWarnings.length > 0) {
    console.warn("[verify-schema] Optional schema warnings detected:");
    for (const w of optionalWarnings) {
      console.warn(
        `- ${w.tableName}: ${w.status}. missing=[${uniq(w.missingColumns).join(", ")}], current=[${uniq(
          w.currentColumns,
        ).join(", ")}]`,
      );
    }
  }

  if (errors.length > 0) {
    console.error("[verify-schema] Required schema mismatch detected. Boot blocked.");
    for (const e of errors) {
      console.error(`- Table: ${e.tableName}`);
      console.error(`  Status: ${e.status}`);
      console.error(`  Missing columns: [${uniq(e.missingColumns).join(", ")}]`);
      console.error(`  Current columns: [${uniq(e.currentColumns).join(", ")}]`);
    }

    console.error("");
    console.error("Suggested commands:");
    console.error("  docker compose exec app npx prisma migrate deploy");
    console.error("  docker compose exec app node scripts/schema-self-heal.cjs  # temporary, only if you accept self-heal");
    console.error("  docker compose exec app npx prisma migrate dev --name init  # (Stage2) DB align");

    process.exit(1);
  }

  console.log("[verify-schema] OK: required schema is present.");
}

main()
  .catch((e) => {
    console.error("[verify-schema] failed:", e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

