-- DropForeignKey
ALTER TABLE "communications" DROP CONSTRAINT "communications_stakeholderId_fkey";

-- AlterTable
ALTER TABLE "communications" ALTER COLUMN "stakeholderId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "stakeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
