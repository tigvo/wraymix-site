-- CreateTable
CREATE TABLE "WorkAllocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bookingId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    CONSTRAINT "WorkAllocation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkAllocation_date_fkey" FOREIGN KEY ("date") REFERENCES "ScheduleDay" ("date") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScheduleDay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "bookable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ScheduleDay" ("capacity", "createdAt", "date", "id", "updatedAt") SELECT "capacity", "createdAt", "date", "id", "updatedAt" FROM "ScheduleDay";
DROP TABLE "ScheduleDay";
ALTER TABLE "new_ScheduleDay" RENAME TO "ScheduleDay";
CREATE UNIQUE INDEX "ScheduleDay_date_key" ON "ScheduleDay"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "WorkAllocation_date_idx" ON "WorkAllocation"("date");

-- CreateIndex
CREATE UNIQUE INDEX "WorkAllocation_bookingId_date_key" ON "WorkAllocation"("bookingId", "date");
