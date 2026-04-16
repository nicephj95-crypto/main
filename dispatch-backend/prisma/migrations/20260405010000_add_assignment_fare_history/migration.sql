ALTER TABLE "RequestDriverAssignment"
  ADD COLUMN "actualFare" INTEGER,
  ADD COLUMN "billingPrice" INTEGER;

UPDATE "RequestDriverAssignment" AS rda
SET
  "actualFare" = req."actualFare",
  "billingPrice" = req."billingPrice"
FROM "Request" AS req
WHERE req."id" = rda."requestId"
  AND rda."isActive" = true
  AND (
    rda."actualFare" IS DISTINCT FROM req."actualFare"
    OR rda."billingPrice" IS DISTINCT FROM req."billingPrice"
  );
