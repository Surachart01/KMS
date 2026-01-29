/*
  Warnings:

  - The primary key for the `Key` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cabinet_slot` on the `Key` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Key` table. All the data in the column will be lost.
  - You are about to drop the column `key_id` on the `Key` table. All the data in the column will be lost.
  - You are about to drop the column `nfc_uid` on the `Key` table. All the data in the column will be lost.
  - You are about to drop the column `room_id` on the `Key` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Key` table. All the data in the column will be lost.
  - The primary key for the `Subject` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `subject_code` on the `Subject` table. All the data in the column will be lost.
  - You are about to drop the column `subject_name` on the `Subject` table. All the data in the column will be lost.
  - The primary key for the `SubjectTeacher` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `subject_code` on the `SubjectTeacher` table. All the data in the column will be lost.
  - You are about to drop the column `teacher_id` on the `SubjectTeacher` table. All the data in the column will be lost.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `major_id` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `section_id` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `user_no` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `AccessLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BorrowReason` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BorrowTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClassSchedule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Major` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Room` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Section` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[code]` on the table `Subject` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[subjectId,teacherId]` on the table `SubjectTeacher` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `Key` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `roomCode` to the `Key` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slotNumber` to the `Key` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `Subject` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `Subject` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `name` to the `Subject` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `SubjectTeacher` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `subjectId` to the `SubjectTeacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacherId` to the `SubjectTeacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `User` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studentCode` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `role` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('BORROWED', 'RETURNED', 'LATE');

-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('LATE_RETURN', 'MANUAL');

-- DropForeignKey
ALTER TABLE "AccessLog" DROP CONSTRAINT "AccessLog_user_id_fkey";

-- DropForeignKey
ALTER TABLE "BorrowTransaction" DROP CONSTRAINT "BorrowTransaction_key_id_fkey";

-- DropForeignKey
ALTER TABLE "BorrowTransaction" DROP CONSTRAINT "BorrowTransaction_reason_id_fkey";

-- DropForeignKey
ALTER TABLE "BorrowTransaction" DROP CONSTRAINT "BorrowTransaction_room_id_fkey";

-- DropForeignKey
ALTER TABLE "BorrowTransaction" DROP CONSTRAINT "BorrowTransaction_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ClassSchedule" DROP CONSTRAINT "ClassSchedule_room_id_fkey";

-- DropForeignKey
ALTER TABLE "ClassSchedule" DROP CONSTRAINT "ClassSchedule_section_id_fkey";

-- DropForeignKey
ALTER TABLE "ClassSchedule" DROP CONSTRAINT "ClassSchedule_subject_code_fkey";

-- DropForeignKey
ALTER TABLE "Key" DROP CONSTRAINT "Key_room_id_fkey";

-- DropForeignKey
ALTER TABLE "Section" DROP CONSTRAINT "Section_major_id_fkey";

-- DropForeignKey
ALTER TABLE "SubjectTeacher" DROP CONSTRAINT "SubjectTeacher_subject_code_fkey";

-- DropForeignKey
ALTER TABLE "SubjectTeacher" DROP CONSTRAINT "SubjectTeacher_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_major_id_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_section_id_fkey";

-- DropIndex
DROP INDEX "Key_nfc_uid_key";

-- DropIndex
DROP INDEX "SubjectTeacher_teacher_id_idx";

-- DropIndex
DROP INDEX "User_user_no_key";

-- AlterTable
ALTER TABLE "Key" DROP CONSTRAINT "Key_pkey",
DROP COLUMN "cabinet_slot",
DROP COLUMN "created_at",
DROP COLUMN "key_id",
DROP COLUMN "nfc_uid",
DROP COLUMN "room_id",
DROP COLUMN "status",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "roomCode" TEXT NOT NULL,
ADD COLUMN     "slotNumber" INTEGER NOT NULL,
ADD CONSTRAINT "Key_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Subject" DROP CONSTRAINT "Subject_pkey",
DROP COLUMN "subject_code",
DROP COLUMN "subject_name",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD CONSTRAINT "Subject_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "SubjectTeacher" DROP CONSTRAINT "SubjectTeacher_pkey",
DROP COLUMN "subject_code",
DROP COLUMN "teacher_id",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "subjectId" TEXT NOT NULL,
ADD COLUMN     "teacherId" TEXT NOT NULL,
ADD CONSTRAINT "SubjectTeacher_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "created_at",
DROP COLUMN "email",
DROP COLUMN "first_name",
DROP COLUMN "last_name",
DROP COLUMN "major_id",
DROP COLUMN "password",
DROP COLUMN "section_id",
DROP COLUMN "status",
DROP COLUMN "user_id",
DROP COLUMN "user_no",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "isBanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "studentCode" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "AccessLog";

-- DropTable
DROP TABLE "BorrowReason";

-- DropTable
DROP TABLE "BorrowTransaction";

-- DropTable
DROP TABLE "ClassSchedule";

-- DropTable
DROP TABLE "Major";

-- DropTable
DROP TABLE "Room";

-- DropTable
DROP TABLE "Section";

-- DropEnum
DROP TYPE "BorrowStatus";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "subjectId" TEXT,
    "borrowAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "returnAt" TIMESTAMP(3),
    "status" "BookingStatus" NOT NULL DEFAULT 'BORROWED',
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "penaltyScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenaltyConfig" (
    "id" TEXT NOT NULL,
    "graceMinutes" INTEGER NOT NULL,
    "scorePerInterval" INTEGER NOT NULL,
    "intervalMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PenaltyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenaltyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" "PenaltyType" NOT NULL,
    "scoreCut" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PenaltyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectTeacher_subjectId_teacherId_key" ON "SubjectTeacher"("subjectId", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentCode_key" ON "User"("studentCode");

-- AddForeignKey
ALTER TABLE "SubjectTeacher" ADD CONSTRAINT "SubjectTeacher_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectTeacher" ADD CONSTRAINT "SubjectTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "Key"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyLog" ADD CONSTRAINT "PenaltyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyLog" ADD CONSTRAINT "PenaltyLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
