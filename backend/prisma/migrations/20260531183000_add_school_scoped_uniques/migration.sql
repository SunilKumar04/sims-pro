-- Add tenant columns to existing school-scoped tables.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "notices" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "homework" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "marks" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "class_subject_teachers" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "timetable_slots" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "subject_attendance" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "date_sheet_entries" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "assignment_submissions" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "exam_invigilators" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;

-- Backfill schoolId from existing relationships where it can be inferred safely.
UPDATE "users" u
SET "schoolId" = s."schoolId"
FROM "students" s
WHERE u."id" = s."userId"
  AND u."schoolId" IS NULL
  AND s."schoolId" IS NOT NULL;

UPDATE "users" u
SET "schoolId" = t."schoolId"
FROM "teachers" t
WHERE u."id" = t."userId"
  AND u."schoolId" IS NULL
  AND t."schoolId" IS NOT NULL;

UPDATE "students" s
SET "schoolId" = u."schoolId"
FROM "users" u
WHERE s."userId" = u."id"
  AND s."schoolId" IS NULL
  AND u."schoolId" IS NOT NULL;

UPDATE "teachers" t
SET "schoolId" = u."schoolId"
FROM "users" u
WHERE t."userId" = u."id"
  AND t."schoolId" IS NULL
  AND u."schoolId" IS NOT NULL;

UPDATE "fees" f
SET "schoolId" = s."schoolId"
FROM "students" s
WHERE f."studentId" = s."id"
  AND f."schoolId" IS NULL
  AND s."schoolId" IS NOT NULL;

UPDATE "attendance" a
SET "schoolId" = s."schoolId"
FROM "students" s
WHERE a."studentId" = s."id"
  AND a."schoolId" IS NULL
  AND s."schoolId" IS NOT NULL;

UPDATE "marks" m
SET "schoolId" = s."schoolId"
FROM "students" s
WHERE m."studentId" = s."id"
  AND m."schoolId" IS NULL
  AND s."schoolId" IS NOT NULL;

UPDATE "homework" h
SET "schoolId" = t."schoolId"
FROM "teachers" t
WHERE h."teacherId" = t."id"
  AND h."schoolId" IS NULL
  AND t."schoolId" IS NOT NULL;

UPDATE "class_subject_teachers" cst
SET "schoolId" = t."schoolId"
FROM "teachers" t
WHERE cst."teacherId" = t."id"
  AND cst."schoolId" IS NULL
  AND t."schoolId" IS NOT NULL;

UPDATE "timetable_slots" ts
SET "schoolId" = t."schoolId"
FROM "teachers" t
WHERE ts."teacherId" = t."id"
  AND ts."schoolId" IS NULL
  AND t."schoolId" IS NOT NULL;

UPDATE "attendance_sessions" ats
SET "schoolId" = t."schoolId"
FROM "teachers" t
WHERE ats."teacherId" = t."id"
  AND ats."schoolId" IS NULL
  AND t."schoolId" IS NOT NULL;

UPDATE "subject_attendance" sa
SET "schoolId" = ats."schoolId"
FROM "attendance_sessions" ats
WHERE sa."sessionId" = ats."id"
  AND sa."schoolId" IS NULL
  AND ats."schoolId" IS NOT NULL;

-- Classes can be inferred from any school-scoped activity tied to the class name.
UPDATE "classes" c
SET "schoolId" = src."schoolId"
FROM (
  SELECT DISTINCT ON (x."className") x."className", x."schoolId"
  FROM (
    SELECT "className", "schoolId" FROM "students" WHERE "schoolId" IS NOT NULL
    UNION ALL
    SELECT "className", "schoolId" FROM "timetable_slots" WHERE "schoolId" IS NOT NULL
    UNION ALL
    SELECT "className", "schoolId" FROM "attendance_sessions" WHERE "schoolId" IS NOT NULL
    UNION ALL
    SELECT "className", "schoolId" FROM "assignments" WHERE "schoolId" IS NOT NULL
    UNION ALL
    SELECT "className", "schoolId" FROM "class_subject_teachers" WHERE "schoolId" IS NOT NULL
  ) x
  ORDER BY x."className", x."schoolId"
) src
WHERE c."name" = src."className"
  AND c."schoolId" IS NULL;

UPDATE "exams" e
SET "schoolId" = c."schoolId"
FROM "classes" c
WHERE e."className" = c."name"
  AND e."schoolId" IS NULL
  AND c."schoolId" IS NOT NULL;

UPDATE "date_sheet_entries" dse
SET "schoolId" = e."schoolId"
FROM "exams" e
WHERE dse."examId" = e."id"
  AND dse."schoolId" IS NULL
  AND e."schoolId" IS NOT NULL;

UPDATE "assignments" a
SET "schoolId" = t."schoolId"
FROM "teachers" t
WHERE a."teacherId" = t."id"
  AND a."schoolId" IS NULL
  AND t."schoolId" IS NOT NULL;

UPDATE "assignment_submissions" s
SET "schoolId" = a."schoolId"
FROM "assignments" a
WHERE s."assignmentId" = a."id"
  AND s."schoolId" IS NULL
  AND a."schoolId" IS NOT NULL;

UPDATE "exam_invigilators" ei
SET "schoolId" = dse."schoolId"
FROM "date_sheet_entries" dse
WHERE ei."dateSheetEntryId" = dse."id"
  AND ei."schoolId" IS NULL
  AND dse."schoolId" IS NOT NULL;

DO $$
DECLARE sole_school_id TEXT;
BEGIN
  IF (SELECT COUNT(*) FROM "schools") = 1 THEN
    SELECT "id" INTO sole_school_id FROM "schools" LIMIT 1;
    UPDATE "notices"
    SET "schoolId" = sole_school_id
    WHERE "schoolId" IS NULL;
  END IF;
END $$;

-- Drop old global unique constraints that block multi-school data.
DROP INDEX IF EXISTS "students_roll_key";
DROP INDEX IF EXISTS "teachers_employeeCode_key";
DROP INDEX IF EXISTS "classes_name_key";
DROP INDEX IF EXISTS "attendance_studentId_date_key";
DROP INDEX IF EXISTS "marks_studentId_subject_examType_year_key";
DROP INDEX IF EXISTS "class_subject_teachers_className_subject_key";
DROP INDEX IF EXISTS "timetable_slots_className_dayOfWeek_period_key";
DROP INDEX IF EXISTS "attendance_sessions_className_subject_date_period_key";
DROP INDEX IF EXISTS "subject_attendance_sessionId_studentId_key";
DROP INDEX IF EXISTS "exams_className_examType_key";
DROP INDEX IF EXISTS "date_sheet_entries_examId_subject_key";
DROP INDEX IF EXISTS "assignment_submissions_assignmentId_studentId_key";
DROP INDEX IF EXISTS "exam_invigilators_dateSheetEntryId_teacherId_key";

-- Add school-scoped unique indexes. Partial indexes keep legacy NULL school rows valid.
CREATE UNIQUE INDEX IF NOT EXISTS "students_schoolId_roll_key" ON "students" ("schoolId", "roll") WHERE "schoolId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "teachers_schoolId_employeeCode_key" ON "teachers" ("schoolId", "employeeCode") WHERE "schoolId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "classes_schoolId_name_key" ON "classes" ("schoolId", "name") WHERE "schoolId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_schoolId_studentId_date_key" ON "attendance" ("schoolId", "studentId", "date") WHERE "schoolId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "marks_schoolId_studentId_subject_examType_year_key" ON "marks" ("schoolId", "studentId", "subject", "examType", "year") WHERE "schoolId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "class_subject_teachers_schoolId_className_subject_key" ON "class_subject_teachers" ("schoolId", "className", "subject") WHERE "schoolId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "timetable_slots_schoolId_className_dayOfWeek_period_key" ON "timetable_slots" ("schoolId", "className", "dayOfWeek", "period") WHERE "schoolId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_sessions_schoolId_className_subject_date_period_key" ON "attendance_sessions" ("schoolId", "className", "subject", "date", "period") WHERE "schoolId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "subject_attendance_schoolId_sessionId_studentId_key" ON "subject_attendance" ("schoolId", "sessionId", "studentId") WHERE "schoolId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "exams_schoolId_className_examType_key" ON "exams" ("schoolId", "className", "examType") WHERE "schoolId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "date_sheet_entries_schoolId_examId_subject_key" ON "date_sheet_entries" ("schoolId", "examId", "subject") WHERE "schoolId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "assignment_submissions_schoolId_assignmentId_studentId_key" ON "assignment_submissions" ("schoolId", "assignmentId", "studentId") WHERE "schoolId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "exam_invigilators_schoolId_dateSheetEntryId_teacherId_key" ON "exam_invigilators" ("schoolId", "dateSheetEntryId", "teacherId") WHERE "schoolId" IS NOT NULL;

-- Helpful lookup indexes for tenant filtering.
CREATE INDEX IF NOT EXISTS "users_schoolId_role_idx" ON "users" ("schoolId", "role");
CREATE INDEX IF NOT EXISTS "fees_schoolId_status_idx" ON "fees" ("schoolId", "status");
CREATE INDEX IF NOT EXISTS "notices_schoolId_isPublished_idx" ON "notices" ("schoolId", "isPublished");
CREATE INDEX IF NOT EXISTS "homework_schoolId_dueDate_idx" ON "homework" ("schoolId", "dueDate");
CREATE INDEX IF NOT EXISTS "attendance_schoolId_date_idx" ON "attendance" ("schoolId", "date");
CREATE INDEX IF NOT EXISTS "marks_schoolId_className_year_idx" ON "marks" ("schoolId", "className", "year");
CREATE INDEX IF NOT EXISTS "class_subject_teachers_schoolId_className_idx" ON "class_subject_teachers" ("schoolId", "className");
CREATE INDEX IF NOT EXISTS "timetable_slots_schoolId_className_idx" ON "timetable_slots" ("schoolId", "className");
CREATE INDEX IF NOT EXISTS "attendance_sessions_schoolId_className_date_idx" ON "attendance_sessions" ("schoolId", "className", "date");
CREATE INDEX IF NOT EXISTS "subject_attendance_schoolId_studentId_idx" ON "subject_attendance" ("schoolId", "studentId");
CREATE INDEX IF NOT EXISTS "exams_schoolId_className_examType_idx" ON "exams" ("schoolId", "className", "examType");
CREATE INDEX IF NOT EXISTS "date_sheet_entries_schoolId_date_idx" ON "date_sheet_entries" ("schoolId", "date");
CREATE INDEX IF NOT EXISTS "assignment_submissions_schoolId_status_idx" ON "assignment_submissions" ("schoolId", "status");
CREATE INDEX IF NOT EXISTS "exam_invigilators_schoolId_teacherId_idx" ON "exam_invigilators" ("schoolId", "teacherId");
