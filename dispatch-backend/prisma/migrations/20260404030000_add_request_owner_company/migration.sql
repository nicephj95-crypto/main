ALTER TABLE "Request"
ADD COLUMN "ownerCompanyId" INTEGER;

INSERT INTO "CompanyName" ("name", "createdAt")
SELECT DISTINCT source."companyName", CURRENT_TIMESTAMP
FROM (
  SELECT NULLIF(BTRIM(COALESCE(r."targetCompanyName", u."companyName")), '') AS "companyName"
  FROM "Request" r
  LEFT JOIN "User" u ON u."id" = r."createdById"
) AS source
WHERE source."companyName" IS NOT NULL
ON CONFLICT ("name") DO NOTHING;

WITH resolved AS (
  SELECT
    r."id" AS "requestId",
    c."id" AS "companyId",
    c."name" AS "companyName"
  FROM "Request" AS r
  LEFT JOIN "User" AS u ON u."id" = r."createdById"
  JOIN "CompanyName" AS c
    ON c."name" = NULLIF(BTRIM(COALESCE(r."targetCompanyName", u."companyName")), '')
  WHERE r."ownerCompanyId" IS NULL
)
UPDATE "Request" AS r
SET
  "ownerCompanyId" = resolved."companyId",
  "targetCompanyName" = COALESCE(NULLIF(BTRIM(r."targetCompanyName"), ''), resolved."companyName")
FROM resolved
WHERE resolved."requestId" = r."id";

CREATE INDEX "Request_ownerCompanyId_idx" ON "Request"("ownerCompanyId");

ALTER TABLE "Request"
ADD CONSTRAINT "Request_ownerCompanyId_fkey"
FOREIGN KEY ("ownerCompanyId") REFERENCES "CompanyName"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
