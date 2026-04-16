ALTER TABLE "Request"
  ADD COLUMN IF NOT EXISTS "orderNumber" TEXT;

CREATE INDEX IF NOT EXISTS "Request_orderNumber_idx"
  ON "Request"("orderNumber");
