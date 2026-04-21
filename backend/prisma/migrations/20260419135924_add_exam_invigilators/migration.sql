-- CreateEnum
CREATE TYPE "InvigilatorRole" AS ENUM ('HEAD_EXAMINER', 'INVIGILATOR', 'FLYING_SQUAD');

-- CreateTable
CREATE TABLE "exam_invigilators" (
    "id" TEXT NOT NULL,
    "dateSheetEntryId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "role" "InvigilatorRole" NOT NULL DEFAULT 'INVIGILATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_invigilators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_invigilators_dateSheetEntryId_teacherId_key" ON "exam_invigilators"("dateSheetEntryId", "teacherId");

-- AddForeignKey
ALTER TABLE "exam_invigilators" ADD CONSTRAINT "exam_invigilators_dateSheetEntryId_fkey" FOREIGN KEY ("dateSheetEntryId") REFERENCES "date_sheet_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_invigilators" ADD CONSTRAINT "exam_invigilators_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
