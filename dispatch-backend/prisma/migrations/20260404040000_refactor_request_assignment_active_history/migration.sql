ALTER TABLE "RequestDriverAssignment"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "endedAt" TIMESTAMP(3),
ADD COLUMN "endedReason" TEXT;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "requestId"
      ORDER BY "assignedAt" DESC, "id" DESC
    ) AS rn
  FROM "RequestDriverAssignment"
)
UPDATE "RequestDriverAssignment" AS rda
SET
  "isActive" = false,
  "endedAt" = COALESCE(rda."endedAt", CURRENT_TIMESTAMP),
  "endedReason" = COALESCE(rda."endedReason", 'LEGACY_REPLACED')
FROM ranked
WHERE ranked."id" = rda."id"
  AND ranked.rn > 1;

CREATE INDEX "RequestDriverAssignment_requestId_isActive_idx"
ON "RequestDriverAssignment"("requestId", "isActive");

CREATE INDEX "RequestDriverAssignment_requestId_assignedAt_idx"
ON "RequestDriverAssignment"("requestId", "assignedAt");

CREATE UNIQUE INDEX "RequestDriverAssignment_one_active_per_request_idx"
ON "RequestDriverAssignment"("requestId")
WHERE "isActive" = true;
