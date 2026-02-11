/*
  Warnings:

  - You are about to drop the column `teacherId` on the `Schedule` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_teacherId_fkey";

-- AlterTable
ALTER TABLE "Schedule" DROP COLUMN "teacherId";

-- CreateTable
CREATE TABLE "_TeacherSchedules" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TeacherSchedules_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TeacherSchedules_B_index" ON "_TeacherSchedules"("B");

-- AddForeignKey
ALTER TABLE "_TeacherSchedules" ADD CONSTRAINT "_TeacherSchedules_A_fkey" FOREIGN KEY ("A") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeacherSchedules" ADD CONSTRAINT "_TeacherSchedules_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
