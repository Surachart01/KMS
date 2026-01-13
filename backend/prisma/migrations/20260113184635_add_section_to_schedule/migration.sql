-- AlterTable
ALTER TABLE "ClassSchedule" ADD COLUMN     "section_id" INTEGER;

-- AddForeignKey
ALTER TABLE "ClassSchedule" ADD CONSTRAINT "ClassSchedule_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Section"("section_id") ON DELETE SET NULL ON UPDATE CASCADE;
