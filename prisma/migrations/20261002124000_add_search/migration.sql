-- CreateTable
CREATE TABLE "search" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "limit" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_userId_updatedAt_idx" ON "search"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "search_userId_niche_location_key" ON "search"("userId", "niche", "location");

-- AddForeignKey
ALTER TABLE "search" ADD CONSTRAINT "search_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
