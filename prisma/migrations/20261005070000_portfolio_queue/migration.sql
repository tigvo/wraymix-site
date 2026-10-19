-- AlterTable
ALTER TABLE "Booking"
ADD COLUMN "portfolioPermission" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN "portfolioQueued" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Booking_portfolioQueued_portfolioPermission_idx"
ON "Booking"("portfolioQueued", "portfolioPermission");
