-- CreateTable
CREATE TABLE "visitor_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitor_messages_sessionId_idx" ON "visitor_messages"("sessionId");
