-- CreateEnum
CREATE TYPE "StatusStudent" AS ENUM ('Studying', 'Graduated', 'Expelled');

-- CreateTable
CREATE TABLE "Students" (
    "user_no" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "year_study" TEXT NOT NULL,
    "status" "StatusStudent" NOT NULL DEFAULT 'Studying',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Students_pkey" PRIMARY KEY ("user_no")
);

-- CreateIndex
CREATE UNIQUE INDEX "Students_email_key" ON "Students"("email");
