-- CreateTable
CREATE TABLE "Booking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "songTitle" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "singerCount" INTEGER NOT NULL,
    "costPoint" INTEGER NOT NULL,
    "deliveryDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
