-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "departmentId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_ticketId_key" ON "reviews"("ticketId");

-- CreateIndex
CREATE INDEX "reviews_departmentId_idx" ON "reviews"("departmentId");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "stakeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
