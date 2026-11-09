-- CreateTable
CREATE TABLE "ExerciseRestConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "defaultRestSeconds" INTEGER NOT NULL,

    CONSTRAINT "ExerciseRestConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestTimerDefaults" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "autoStart" BOOLEAN NOT NULL DEFAULT true,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "vibrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultCompoundSeconds" INTEGER NOT NULL DEFAULT 120,
    "defaultIsolationSeconds" INTEGER NOT NULL DEFAULT 60,

    CONSTRAINT "RestTimerDefaults_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExerciseRestConfig_userId_idx" ON "ExerciseRestConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseRestConfig_userId_exerciseId_key" ON "ExerciseRestConfig"("userId", "exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "RestTimerDefaults_userId_key" ON "RestTimerDefaults"("userId");

-- AddForeignKey
ALTER TABLE "ExerciseRestConfig" ADD CONSTRAINT "ExerciseRestConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestTimerDefaults" ADD CONSTRAINT "RestTimerDefaults_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
