-- CreateTable
CREATE TABLE "CoachReferral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "newCoachId" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "creditDays" INTEGER NOT NULL DEFAULT 30,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachReferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachReferral_code_key" ON "CoachReferral"("code");

-- CreateIndex
CREATE INDEX "CoachReferral_referrerId_idx" ON "CoachReferral"("referrerId");

-- CreateIndex
CREATE INDEX "CoachReferral_code_idx" ON "CoachReferral"("code");

-- AddForeignKey
ALTER TABLE "CoachReferral" ADD CONSTRAINT "CoachReferral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachReferral" ADD CONSTRAINT "CoachReferral_newCoachId_fkey" FOREIGN KEY ("newCoachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
