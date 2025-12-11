/*
  Warnings:

  - You are about to drop the `Employees` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Students` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PositionUser" AS ENUM ('Student', 'Teacher', 'Admin');

-- CreateEnum
CREATE TYPE "StatusUser" AS ENUM ('Active', 'Inactive');

-- DropTable
DROP TABLE "Employees";

-- DropTable
DROP TABLE "Students";

-- DropEnum
DROP TYPE "PositionEmployee";

-- DropEnum
DROP TYPE "StatusStudent";

-- CreateTable
CREATE TABLE "Users" (
    "user_no" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "year_study" TEXT NOT NULL,
    "position" "PositionUser" NOT NULL DEFAULT 'Student',
    "status" "StatusUser" NOT NULL DEFAULT 'Active',
    "is_reset_password" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("user_no")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");
