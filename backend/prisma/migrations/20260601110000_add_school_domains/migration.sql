-- Add custom domain support to schools.
ALTER TABLE "schools"
ADD COLUMN IF NOT EXISTS "subdomain" TEXT,
ADD COLUMN IF NOT EXISTS "customDomain" TEXT;

-- Enforce uniqueness for tenant hostnames.
CREATE UNIQUE INDEX IF NOT EXISTS "schools_subdomain_key" ON "schools" ("subdomain");
CREATE UNIQUE INDEX IF NOT EXISTS "schools_customDomain_key" ON "schools" ("customDomain");

