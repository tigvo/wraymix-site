-- CreateTable
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "songTitle" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "singerCount" INTEGER NOT NULL,
    "chorusCount" INTEGER NOT NULL DEFAULT 0,
    "requestNote" TEXT,
    "materialLinks" TEXT,
    "paymentMethod" TEXT,
    "costPoint" INTEGER NOT NULL,
    "deliveryDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "planLabel" TEXT,
    "quotedPrice" INTEGER,
    "adminNote" TEXT,
    "isExpress" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleDay" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "bookable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkAllocation" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "WorkAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "creatorName" TEXT,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "category" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleDay_date_key" ON "ScheduleDay"("date");

-- CreateIndex
CREATE INDEX "WorkAllocation_date_idx" ON "WorkAllocation"("date");

-- CreateIndex
CREATE UNIQUE INDEX "WorkAllocation_bookingId_date_key" ON "WorkAllocation"("bookingId", "date");

-- CreateIndex
CREATE INDEX "CalendarEvent_date_idx" ON "CalendarEvent"("date");

-- CreateIndex
CREATE INDEX "PortfolioItem_published_sortOrder_idx" ON "PortfolioItem"("published", "sortOrder");

-- AddForeignKey
ALTER TABLE "WorkAllocation" ADD CONSTRAINT "WorkAllocation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkAllocation" ADD CONSTRAINT "WorkAllocation_date_fkey" FOREIGN KEY ("date") REFERENCES "ScheduleDay"("date") ON DELETE RESTRICT ON UPDATE CASCADE;
