/*
  Warnings:

  - You are about to drop the `_TeacherSchedules` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_TeacherSchedules" DROP CONSTRAINT "_TeacherSchedules_A_fkey";

-- DropForeignKey
ALTER TABLE "_TeacherSchedules" DROP CONSTRAINT "_TeacherSchedules_B_fkey";

-- DropTable
DROP TABLE "_TeacherSchedules";
