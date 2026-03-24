const fs = require("fs");
const path = require("path");

const root = process.cwd();
const dbPath = path.join(root, "prisma", "dev.db");
const uploads = path.join(root, "public", "uploads");
const outDir = path.join(root, "backup-before-migrate", `${Date.now()}`);

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, path.join(outDir, "dev.db"));
if (fs.existsSync(uploads)) fs.cpSync(uploads, path.join(outDir, "uploads"), { recursive: true });

console.log("pre-migrate backup done:", outDir);
