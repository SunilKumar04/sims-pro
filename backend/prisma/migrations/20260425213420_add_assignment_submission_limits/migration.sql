-- AlterTable
ALTER TABLE "assignment_submissions" ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "maxSubmissions" INTEGER NOT NULL DEFAULT 1;
