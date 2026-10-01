-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "songTitle" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "singerCount" INTEGER NOT NULL,
    "chorusCount" INTEGER NOT NULL DEFAULT 0,
    "requestNote" TEXT,
    "costPoint" INTEGER NOT NULL,
    "deliveryDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "planLabel" TEXT,
    "quotedPrice" INTEGER,
    "adminNote" TEXT,
    "isExpress" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Booking" ("contact", "costPoint", "createdAt", "deliveryDate", "id", "name", "serviceType", "singerCount", "songTitle", "status") SELECT "contact", "costPoint", "createdAt", "deliveryDate", "id", "name", "serviceType", "singerCount", "songTitle", "status" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
