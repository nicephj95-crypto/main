WITH ranked AS (
  SELECT
    "id",
    "requestId",
    ROW_NUMBER() OVER (
      PARTITION BY "requestId"
      ORDER BY "assignedAt" DESC, "id" DESC
    ) AS rn
  FROM "RequestDriverAssignment"
  WHERE "isActive" = true
)
UPDATE "RequestDriverAssignment" AS rda
SET
  "isActive" = false,
  "endedAt" = COALESCE(rda."endedAt", CURRENT_TIMESTAMP),
  "endedReason" = COALESCE(rda."endedReason", 'MIGRATION_DEDUPED')
FROM ranked
WHERE ranked."id" = rda."id"
  AND ranked.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'RequestDriverAssignment_one_active_per_request_idx'
  ) THEN
    CREATE UNIQUE INDEX "RequestDriverAssignment_one_active_per_request_idx"
      ON "RequestDriverAssignment"("requestId")
      WHERE "isActive" = true;
  END IF;
END $$;
