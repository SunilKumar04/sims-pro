ALTER TABLE "users"
ADD COLUMN "resetToken" TEXT,
ADD COLUMN "resetTokenExpiry" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_resetToken_key" ON "users"("resetToken");
