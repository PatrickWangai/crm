/*
  Warnings:

  - A unique constraint covering the columns `[receiptNumber]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `receiptNumber` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('DRAFT', 'PAID');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "isReconciled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receiptNumber" TEXT NOT NULL,
ADD COLUMN     "reconciledAt" TIMESTAMP(3),
ADD COLUMN     "reconciledById" TEXT;

-- CreateTable
CREATE TABLE "disbursements" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "propertyId" TEXT,
    "periodLabel" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "DisbursementStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disbursements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disbursements_code_key" ON "disbursements"("code");

-- CreateIndex
CREATE INDEX "disbursements_landlordId_idx" ON "disbursements"("landlordId");

-- CreateIndex
CREATE INDEX "disbursements_status_idx" ON "disbursements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receiptNumber_key" ON "payments"("receiptNumber");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_reconciledById_fkey" FOREIGN KEY ("reconciledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "stakeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
