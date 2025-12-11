-- CreateEnum
CREATE TYPE "PositionEmployee" AS ENUM ('Admin', 'Teacher');

-- CreateTable
CREATE TABLE "Employees" (
    "emp_no" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "position" "PositionEmployee" NOT NULL DEFAULT 'Teacher',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employees_pkey" PRIMARY KEY ("emp_no")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employees_email_key" ON "Employees"("email");
