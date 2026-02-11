/*
  Warnings:

  - A unique constraint covering the columns `[roomCode]` on the table `Key` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Key_roomCode_key" ON "Key"("roomCode");

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_roomCode_fkey" FOREIGN KEY ("roomCode") REFERENCES "Key"("roomCode") ON DELETE RESTRICT ON UPDATE CASCADE;
