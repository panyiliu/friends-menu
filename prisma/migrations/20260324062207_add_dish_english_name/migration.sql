-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Dish" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "englishName" TEXT NOT NULL DEFAULT '',
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
INSERT INTO "new_Dish" ("categoryId", "createdAt", "description", "id", "ingredients", "isAvailable", "isPublished", "method", "name", "price", "seasonings", "tags", "updatedAt") SELECT "categoryId", "createdAt", "description", "id", "ingredients", "isAvailable", "isPublished", "method", "name", "price", "seasonings", "tags", "updatedAt" FROM "Dish";
DROP TABLE "Dish";
ALTER TABLE "new_Dish" RENAME TO "Dish";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
