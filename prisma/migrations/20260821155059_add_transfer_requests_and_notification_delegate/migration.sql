-- CreateEnum
CREATE TYPE "TransferRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notificationDelegateId" TEXT;

-- CreateTable
CREATE TABLE "transfer_requests" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "promotesRole" BOOLEAN NOT NULL DEFAULT false,
    "status" "TransferRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transfer_requests_toUserId_status_idx" ON "transfer_requests"("toUserId", "status");

-- CreateIndex
CREATE INDEX "transfer_requests_fromUserId_idx" ON "transfer_requests"("fromUserId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_notificationDelegateId_fkey" FOREIGN KEY ("notificationDelegateId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
