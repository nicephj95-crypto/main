CREATE TABLE IF NOT EXISTS "SiteSettings" (
  "key"       TEXT NOT NULL PRIMARY KEY,
  "value"     TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "SiteSettings" ("key", "value", "updatedAt")
VALUES ('showQuotedPrice', 'true', NOW())
ON CONFLICT ("key") DO NOTHING;
