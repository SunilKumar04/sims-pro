-- AlterTable: add new optional fields to students
ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "admissionNo"  TEXT,
  ADD COLUMN IF NOT EXISTS "fatherName"   TEXT,
  ADD COLUMN IF NOT EXISTS "motherName"   TEXT,
  ADD COLUMN IF NOT EXISTS "gender"       TEXT;

-- CreateTable: report_card_templates
CREATE TABLE IF NOT EXISTS "report_card_templates" (
    "id"                       TEXT NOT NULL,
    "schoolId"                 TEXT NOT NULL,
    "name"                     TEXT NOT NULL,
    "description"              TEXT,
    "isDefault"                BOOLEAN NOT NULL DEFAULT false,
    "isActive"                 BOOLEAN NOT NULL DEFAULT true,
    "logoUrl"                  TEXT,
    "schoolName"               TEXT,
    "schoolAddress"            TEXT,
    "schoolPhone"              TEXT,
    "schoolEmail"              TEXT,
    "schoolWebsite"            TEXT,
    "affiliationNo"            TEXT,
    "academicSession"          TEXT,
    "schoolMotto"              TEXT,
    "reportTitle"              TEXT NOT NULL DEFAULT 'REPORT CARD',
    "headerBgColor"            TEXT NOT NULL DEFAULT '#1a3a6b',
    "headerTextColor"          TEXT NOT NULL DEFAULT '#ffffff',
    "fontFamily"               TEXT NOT NULL DEFAULT 'Arial, sans-serif',
    "headerAlignment"          TEXT NOT NULL DEFAULT 'center',
    "paperSize"                TEXT NOT NULL DEFAULT 'A4',
    "orientation"              TEXT NOT NULL DEFAULT 'PORTRAIT',
    "marginTop"                INTEGER NOT NULL DEFAULT 15,
    "marginBottom"             INTEGER NOT NULL DEFAULT 15,
    "marginLeft"               INTEGER NOT NULL DEFAULT 15,
    "marginRight"              INTEGER NOT NULL DEFAULT 15,
    "studentFields"            JSONB,
    "tableColumns"             JSONB,
    "sectionLayout"            JSONB,
    "gradingSystem"            JSONB,
    "showTotal"                BOOLEAN NOT NULL DEFAULT true,
    "showPercentage"           BOOLEAN NOT NULL DEFAULT true,
    "showGrade"                BOOLEAN NOT NULL DEFAULT true,
    "showRank"                 BOOLEAN NOT NULL DEFAULT true,
    "showResult"               BOOLEAN NOT NULL DEFAULT true,
    "showAttendance"           BOOLEAN NOT NULL DEFAULT false,
    "showPromotion"            BOOLEAN NOT NULL DEFAULT false,
    "showTeacherRemarks"       BOOLEAN NOT NULL DEFAULT true,
    "showPrincipalRemarks"     BOOLEAN NOT NULL DEFAULT true,
    "passingPercentage"        INTEGER NOT NULL DEFAULT 40,
    "principalSignatureUrl"    TEXT,
    "classTeacherSignatureUrl" TEXT,
    "schoolSealUrl"            TEXT,
    "footerNote"               TEXT,
    "showQrCode"               BOOLEAN NOT NULL DEFAULT false,
    "showGeneratedDate"        BOOLEAN NOT NULL DEFAULT true,
    "showWatermark"            BOOLEAN NOT NULL DEFAULT false,
    "watermarkText"            TEXT,
    "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_card_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "report_card_templates_schoolId_isDefault_idx"
  ON "report_card_templates"("schoolId", "isDefault");

-- AddForeignKey
ALTER TABLE "report_card_templates"
  DROP CONSTRAINT IF EXISTS "report_card_templates_schoolId_fkey";
ALTER TABLE "report_card_templates"
  ADD CONSTRAINT "report_card_templates_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: generated_marksheets
CREATE TABLE IF NOT EXISTS "generated_marksheets" (
    "id"            TEXT NOT NULL,
    "schoolId"      TEXT NOT NULL,
    "studentId"     TEXT NOT NULL,
    "templateId"    TEXT,
    "examType"      TEXT NOT NULL,
    "academicYear"  INTEGER NOT NULL,
    "className"     TEXT,
    "pdfUrl"        TEXT,
    "includePhoto"  BOOLEAN NOT NULL DEFAULT true,
    "includeQrCode" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_marksheets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "generated_marksheets_schoolId_studentId_idx"
  ON "generated_marksheets"("schoolId", "studentId");
CREATE INDEX IF NOT EXISTS "generated_marksheets_schoolId_examType_idx"
  ON "generated_marksheets"("schoolId", "examType");

-- AddForeignKey
ALTER TABLE "generated_marksheets"
  DROP CONSTRAINT IF EXISTS "generated_marksheets_schoolId_fkey";
ALTER TABLE "generated_marksheets"
  ADD CONSTRAINT "generated_marksheets_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "generated_marksheets"
  DROP CONSTRAINT IF EXISTS "generated_marksheets_studentId_fkey";
ALTER TABLE "generated_marksheets"
  ADD CONSTRAINT "generated_marksheets_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "generated_marksheets"
  DROP CONSTRAINT IF EXISTS "generated_marksheets_templateId_fkey";
ALTER TABLE "generated_marksheets"
  ADD CONSTRAINT "generated_marksheets_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "report_card_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
