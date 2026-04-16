ALTER TABLE "AuditLog"
  ADD COLUMN "target" TEXT;

UPDATE "AuditLog"
SET "target" = NULLIF(("detail"::jsonb ->> 'target'), '')
WHERE "detail" IS NOT NULL
  AND "target" IS NULL;

CREATE INDEX "AuditLog_resource_resourceId_target_createdAt_idx"
  ON "AuditLog"("resource", "resourceId", "target", "createdAt");
