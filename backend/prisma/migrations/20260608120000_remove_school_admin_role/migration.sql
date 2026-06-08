-- Convert legacy SCHOOL_ADMIN users to ADMIN and rebuild the Role enum without SCHOOL_ADMIN.
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'ACCOUNTANT', 'SUPER_ADMIN');

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role"
  USING (
    CASE
      WHEN "role"::text = 'SCHOOL_ADMIN' THEN 'ADMIN'
      ELSE "role"::text
    END
  )::"Role";

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'STUDENT';

DROP TYPE "Role_old";
