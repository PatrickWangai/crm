-- CreateTable
CREATE TABLE "help_page_visits" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ticketNumber" TEXT,
    "pageViews" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "help_page_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "help_page_visits_sessionId_key" ON "help_page_visits"("sessionId");

-- CreateIndex
CREATE INDEX "help_page_visits_lastSeenAt_idx" ON "help_page_visits"("lastSeenAt");
