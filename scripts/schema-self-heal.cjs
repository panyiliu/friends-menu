/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function hasColumn(tableName, columnName) {
  const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info("${tableName}")`);
  return Array.isArray(rows) && rows.some((r) => String(r.name) === columnName);
}

async function ensureColumn(tableName, columnName, sqlTypeAndDefault) {
  const ok = await hasColumn(tableName, columnName);
  if (ok) return false;
  await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${sqlTypeAndDefault}`);
  console.log(`[schema-heal] added ${tableName}.${columnName}`);
  return true;
}

async function main() {
  let changed = 0;

  // SystemSetting additions
  if (await ensureColumn("SystemSetting", "guestTitle", "TEXT NOT NULL DEFAULT '朋友·聚'")) changed++;
  if (await ensureColumn("SystemSetting", "guestSubtitle", "TEXT NOT NULL DEFAULT '欢聚时刻 · 臻选风味'")) changed++;
  if (await ensureColumn("SystemSetting", "guestBannerUrl", "TEXT NOT NULL DEFAULT ''")) changed++;
  if (await ensureColumn("SystemSetting", "welcomeAlwaysShow", "BOOLEAN NOT NULL DEFAULT false")) changed++;
  if (await ensureColumn("SystemSetting", "debugUiEnabled", "BOOLEAN NOT NULL DEFAULT false")) changed++;

  // InviteLink additions
  if (await ensureColumn("InviteLink", "label", "TEXT NOT NULL DEFAULT ''")) changed++;
  if (await ensureColumn("InviteLink", "inviteGuestName", "TEXT NOT NULL DEFAULT ''")) changed++;
  if (await ensureColumn("InviteLink", "showPrice", "BOOLEAN NOT NULL DEFAULT false")) changed++;
  if (await ensureColumn("InviteLink", "welcomeEnabled", "BOOLEAN NOT NULL DEFAULT true")) changed++;
  if (await ensureColumn("InviteLink", "welcomeTitle", "TEXT NOT NULL DEFAULT '欢迎光临'")) changed++;
  if (await ensureColumn("InviteLink", "welcomeSubtitle", "TEXT NOT NULL DEFAULT '请开始点餐'")) changed++;
  if (await ensureColumn("InviteLink", "welcomeButtonText", "TEXT NOT NULL DEFAULT '开始点餐'")) changed++;
  if (await ensureColumn("InviteLink", "welcomeFontSize", "TEXT NOT NULL DEFAULT 'md'")) changed++;
  if (await ensureColumn("InviteLink", "welcomeFontWeight", "TEXT NOT NULL DEFAULT 'semibold'")) changed++;
  if (await ensureColumn("InviteLink", "welcomeTextAlign", "TEXT NOT NULL DEFAULT 'center'")) changed++;
  if (await ensureColumn("InviteLink", "welcomeButtonColor", "TEXT NOT NULL DEFAULT '#111827'")) changed++;
  if (await ensureColumn("InviteLink", "welcomeBackdropOpacity", "INTEGER NOT NULL DEFAULT 35")) changed++;

  // Order additions
  if (await ensureColumn("Order", "inviteId", "TEXT")) changed++;
  if (await ensureColumn("Order", "eta", "TEXT NOT NULL DEFAULT ''")) changed++;

  console.log(changed > 0 ? `[schema-heal] completed with ${changed} changes` : "[schema-heal] no changes needed");
}

main()
  .catch((e) => {
    console.error("[schema-heal] failed:", e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

