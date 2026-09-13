-- CreateTable
CREATE TABLE "HazardRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "runawayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "runawayMaxRequests" INTEGER NOT NULL DEFAULT 50,
    "runawayMaxTokens" INTEGER NOT NULL DEFAULT 500000,
    "highCostEnabled" BOOLEAN NOT NULL DEFAULT true,
    "highCostThreshold" REAL NOT NULL DEFAULT 1.0,
    "spikeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "spikeFactor" REAL NOT NULL DEFAULT 3.0,
    CONSTRAINT "HazardRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HazardRule_userId_key" ON "HazardRule"("userId");
