-- AlterTable
ALTER TABLE "transfer_requests" ADD COLUMN     "durationDays" INTEGER,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "originalToUserRoleId" TEXT,
ADD COLUMN     "revertedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "transferred_items" (
    "id" TEXT NOT NULL,
    "transferRequestId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,

    CONSTRAINT "transferred_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transferred_items_transferRequestId_idx" ON "transferred_items"("transferRequestId");

-- AddForeignKey
ALTER TABLE "transferred_items" ADD CONSTRAINT "transferred_items_transferRequestId_fkey" FOREIGN KEY ("transferRequestId") REFERENCES "transfer_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
