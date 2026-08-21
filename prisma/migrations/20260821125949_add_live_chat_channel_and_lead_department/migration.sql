-- AlterEnum
ALTER TYPE "CommunicationChannel" ADD VALUE 'LIVE_CHAT';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "departmentId" TEXT;

-- CreateIndex
CREATE INDEX "leads_departmentId_idx" ON "leads"("departmentId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
