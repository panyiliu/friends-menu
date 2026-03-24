-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SystemSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activeInviteId" TEXT,
    "adminTitle" TEXT NOT NULL DEFAULT '朋友聚餐点餐后台',
    "refreshIntervalSec" INTEGER NOT NULL DEFAULT 8,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailSender" TEXT,
    "emailPassword" TEXT,
    "emailReceiver" TEXT,
    "smtpServer" TEXT DEFAULT 'smtp.qq.com',
    "smtpPort" INTEGER DEFAULT 587,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SystemSetting" ("activeInviteId", "adminTitle", "createdAt", "id", "updatedAt") SELECT "activeInviteId", "adminTitle", "createdAt", "id", "updatedAt" FROM "SystemSetting";
DROP TABLE "SystemSetting";
ALTER TABLE "new_SystemSetting" RENAME TO "SystemSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
