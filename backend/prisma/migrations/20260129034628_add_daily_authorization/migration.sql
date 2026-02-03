/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AuthSource" AS ENUM ('SCHEDULE', 'MANUAL');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'RESERVED';

-- AlterTable
ALTER TABLE "PenaltyConfig" ADD COLUMN     "restoreDays" INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "sectionId" TEXT;

-- CreateTable
CREATE TABLE "Major" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Major_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "majorId" TEXT NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyAuthorization" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "AuthSource" NOT NULL DEFAULT 'MANUAL',
    "scheduleId" TEXT,
    "subjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "DailyAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StudentSchedules" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StudentSchedules_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Major_code_key" ON "Major"("code");

-- CreateIndex
CREATE INDEX "DailyAuthorization_roomCode_date_idx" ON "DailyAuthorization"("roomCode", "date");

-- CreateIndex
CREATE INDEX "DailyAuthorization_userId_date_idx" ON "DailyAuthorization"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAuthorization_userId_roomCode_date_startTime_key" ON "DailyAuthorization"("userId", "roomCode", "date", "startTime");

-- CreateIndex
CREATE INDEX "_StudentSchedules_B_index" ON "_StudentSchedules"("B");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAuthorization" ADD CONSTRAINT "DailyAuthorization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAuthorization" ADD CONSTRAINT "DailyAuthorization_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAuthorization" ADD CONSTRAINT "DailyAuthorization_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentSchedules" ADD CONSTRAINT "_StudentSchedules_A_fkey" FOREIGN KEY ("A") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentSchedules" ADD CONSTRAINT "_StudentSchedules_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
