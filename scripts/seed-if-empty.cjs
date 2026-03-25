const { PrismaClient } = require("@prisma/client");
const { spawnSync } = require("child_process");

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.adminUser.count();
    if (count > 0) {
      console.log(`[init] adminUser exists (${count}), skip seed.`);
      return;
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("[init] empty database detected, running prisma seed...");
  const r = spawnSync("node", ["prisma/seed.cjs"], { stdio: "inherit" });
  if (r.status !== 0) {
    process.exit(r.status || 1);
  }
  console.log("[init] seed completed.");
}

main().catch((e) => {
  console.error("[init] seed-if-empty failed:", e);
  process.exit(1);
});
