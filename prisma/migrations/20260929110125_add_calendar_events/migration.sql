/*
  Warnings:

  - You are about to drop the column `note` on the `CalendarEvent` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `CalendarEvent` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CalendarEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_CalendarEvent" ("createdAt", "date", "id", "title") SELECT "createdAt", "date", "id", "title" FROM "CalendarEvent";
DROP TABLE "CalendarEvent";
ALTER TABLE "new_CalendarEvent" RENAME TO "CalendarEvent";
CREATE INDEX "CalendarEvent_date_idx" ON "CalendarEvent"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
