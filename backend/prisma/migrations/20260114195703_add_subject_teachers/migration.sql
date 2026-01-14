-- CreateTable
CREATE TABLE "SubjectTeacher" (
    "subject_code" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,

    CONSTRAINT "SubjectTeacher_pkey" PRIMARY KEY ("subject_code","teacher_id")
);

-- CreateIndex
CREATE INDEX "SubjectTeacher_teacher_id_idx" ON "SubjectTeacher"("teacher_id");

-- AddForeignKey
ALTER TABLE "SubjectTeacher" ADD CONSTRAINT "SubjectTeacher_subject_code_fkey" FOREIGN KEY ("subject_code") REFERENCES "Subject"("subject_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectTeacher" ADD CONSTRAINT "SubjectTeacher_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
