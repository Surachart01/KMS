-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('student', 'teacher', 'staff');

-- CreateEnum
CREATE TYPE "BorrowStatus" AS ENUM ('borrowed', 'returned');

-- CreateTable
CREATE TABLE "Major" (
    "major_id" SERIAL NOT NULL,
    "major_name" TEXT NOT NULL,

    CONSTRAINT "Major_pkey" PRIMARY KEY ("major_id")
);

-- CreateTable
CREATE TABLE "Section" (
    "section_id" SERIAL NOT NULL,
    "section_name" TEXT NOT NULL,
    "major_id" INTEGER NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("section_id")
);

-- CreateTable
CREATE TABLE "User" (
    "user_id" TEXT NOT NULL,
    "user_no" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "role" "UserRole" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "major_id" INTEGER,
    "section_id" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Room" (
    "room_id" TEXT NOT NULL,
    "room_name" TEXT,
    "building" TEXT,
    "floor" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'available',

    CONSTRAINT "Room_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "subject_code" TEXT NOT NULL,
    "subject_name" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("subject_code")
);

-- CreateTable
CREATE TABLE "ClassSchedule" (
    "schedule_id" TEXT NOT NULL,
    "subject_code" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "semester" TEXT NOT NULL,
    "academic_year" INTEGER NOT NULL,

    CONSTRAINT "ClassSchedule_pkey" PRIMARY KEY ("schedule_id")
);

-- CreateTable
CREATE TABLE "Key" (
    "key_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "cabinet_slot" INTEGER,
    "nfc_uid" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_cabinet',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Key_pkey" PRIMARY KEY ("key_id")
);

-- CreateTable
CREATE TABLE "BorrowReason" (
    "reason_id" TEXT NOT NULL,
    "reason_name" TEXT NOT NULL,
    "require_note" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BorrowReason_pkey" PRIMARY KEY ("reason_id")
);

-- CreateTable
CREATE TABLE "BorrowTransaction" (
    "transaction_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "key_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "reason_id" TEXT,
    "reason_note" TEXT,
    "borrow_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "return_time" TIMESTAMP(3),
    "status" "BorrowStatus" NOT NULL,
    "verify_method" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BorrowTransaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "AccessLog" (
    "log_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "room_id" TEXT,
    "action_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remark" TEXT,

    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_user_no_key" ON "User"("user_no");

-- CreateIndex
CREATE UNIQUE INDEX "Key_nfc_uid_key" ON "Key"("nfc_uid");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "Major"("major_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "Major"("major_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Section"("section_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSchedule" ADD CONSTRAINT "ClassSchedule_subject_code_fkey" FOREIGN KEY ("subject_code") REFERENCES "Subject"("subject_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSchedule" ADD CONSTRAINT "ClassSchedule_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Key" ADD CONSTRAINT "Key_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowTransaction" ADD CONSTRAINT "BorrowTransaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowTransaction" ADD CONSTRAINT "BorrowTransaction_key_id_fkey" FOREIGN KEY ("key_id") REFERENCES "Key"("key_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowTransaction" ADD CONSTRAINT "BorrowTransaction_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowTransaction" ADD CONSTRAINT "BorrowTransaction_reason_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "BorrowReason"("reason_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
