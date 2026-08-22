-- AlterTable
ALTER TABLE "visitor_messages" ADD COLUMN     "staffId" TEXT;

-- AddForeignKey
ALTER TABLE "visitor_messages" ADD CONSTRAINT "visitor_messages_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
