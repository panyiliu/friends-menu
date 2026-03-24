const fs = require("fs");
const path = require("path");

const backupDir = process.argv[2];
if (!backupDir) {
  console.error("Usage: npm run restore -- <backupDir>");
  process.exit(1);
}

const root = process.cwd();
const srcDb = path.join(backupDir, "dev.db");
const srcUploads = path.join(backupDir, "uploads");
const dstDb = path.join(root, "prisma", "dev.db");
const dstUploads = path.join(root, "public", "uploads");
const snapshotDir = path.join(root, "backup-before-restore", `${Date.now()}`);

if (!fs.existsSync(srcDb) || !fs.existsSync(srcUploads)) {
  console.error("Backup directory must include dev.db and uploads/");
  process.exit(1);
}

fs.mkdirSync(path.join(snapshotDir, "uploads"), { recursive: true });
if (fs.existsSync(dstDb)) fs.copyFileSync(dstDb, path.join(snapshotDir, "dev.db"));
if (fs.existsSync(dstUploads)) fs.cpSync(dstUploads, path.join(snapshotDir, "uploads"), { recursive: true });

fs.copyFileSync(srcDb, dstDb);
fs.rmSync(dstUploads, { recursive: true, force: true });
fs.mkdirSync(dstUploads, { recursive: true });
fs.cpSync(srcUploads, dstUploads, { recursive: true });

console.log("Restore complete.");
console.log("Snapshot saved at:", snapshotDir);
