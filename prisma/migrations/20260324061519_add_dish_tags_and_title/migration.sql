-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Dish" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "ingredients" TEXT NOT NULL,
    "seasonings" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Dish_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Dish" ("categoryId", "createdAt", "description", "id", "ingredients", "isAvailable", "isPublished", "method", "name", "price", "seasonings", "updatedAt") SELECT "categoryId", "createdAt", "description", "id", "ingredients", "isAvailable", "isPublished", "method", "name", "price", "seasonings", "updatedAt" FROM "Dish";
DROP TABLE "Dish";
ALTER TABLE "new_Dish" RENAME TO "Dish";
CREATE TABLE "new_SystemSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activeInviteId" TEXT,
    "adminTitle" TEXT NOT NULL DEFAULT '点餐系统',
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
INSERT INTO "new_SystemSetting" ("activeInviteId", "adminTitle", "createdAt", "emailEnabled", "emailPassword", "emailReceiver", "emailSender", "id", "refreshIntervalSec", "smtpPort", "smtpServer", "updatedAt") SELECT "activeInviteId", "adminTitle", "createdAt", "emailEnabled", "emailPassword", "emailReceiver", "emailSender", "id", "refreshIntervalSec", "smtpPort", "smtpServer", "updatedAt" FROM "SystemSetting";
DROP TABLE "SystemSetting";
ALTER TABLE "new_SystemSetting" RENAME TO "SystemSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
